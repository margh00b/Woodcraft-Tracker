"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@mantine/form";
import { useSupabase } from "@/hooks/useSupabase";
import { Tables, TablesUpdate } from "@/types/db";
import {
  Container,
  Paper,
  Group,
  Text,
  Switch,
  Button,
  SimpleGrid,
  Loader,
  Center,
  Divider,
  Select,
  Box,
  Timeline,
  TimelineItem,
  Grid,
  Textarea,
  Badge,
  Modal,
  Tooltip,
  ThemeIcon,
  ActionIcon,
  Stack,
  Collapse,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { DateInput } from "@mantine/dates";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import {
  FaCalendarCheck,
  FaCheckCircle,
  FaCogs,
  FaCut,
  FaDoorOpen,
  FaIndustry,
  FaPaintBrush,
  FaTools,
  FaPlus,
  FaTruckLoading,
  FaShippingFast,
  FaBoxOpen,
} from "react-icons/fa";

import CabinetSpecs from "@/components/Shared/CabinetSpecs/CabinetSpecs";
import ClientInfo from "@/components/Shared/ClientInfo/ClientInfo";
import RelatedServiceOrders from "@/components/Shared/RelatedServiceOrders/RelatedServiceOrders";
import AddBackorderModal from "../AddBOModal/AddBOModal";
import RelatedBackorders from "@/components/Shared/RelatedBO/RelatedBO";
import AddInstaller from "@/components/Installers/AddInstaller/AddInstaller";
import OrderDetails from "@/components/Shared/OrderDetails/OrderDetails";
import { useNavigationGuard } from "@/providers/NavigationGuardProvider";

type InstallationType = Tables<"installation"> & {
  partially_shipped?: boolean;
};
type ProductionScheduleType = Tables<"production_schedule">;

type CombinedInstallFormValues = Omit<
  TablesUpdate<"installation">,
  "wrap_date" | "installation_date" | "inspection_date"
> & {
  wrap_date: Date | null;
  installation_date: Date | null;
  inspection_date: Date | null;
  prod_id: number;
  ship_schedule: Date | null;
  ship_status: "unprocessed" | "tentative" | "confirmed";
  partially_shipped?: boolean;
  installation_report_received?: string | null;
  in_warehouse?: string | null;
};

type InstallerLookup = Tables<"installers">;

type JoinedCabinet = Tables<"cabinets"> & {
  door_styles: { name: string } | null;
  species: { Species: string } | null;
  colors: { Name: string } | null;
};

type JobData = Tables<"jobs"> & {
  installation: InstallationType | null;
  production_schedule: ProductionScheduleType | null;
  sales_orders: Tables<"sales_orders"> & {
    client: Tables<"client"> | null;
    cabinet: JoinedCabinet | null;
  };
};

export default function InstallationEditor({ jobId }: { jobId: number }) {
  const router = useRouter();
  const { supabase, isAuthenticated } = useSupabase();
  const queryClient = useQueryClient();

  const [isBackorderPromptOpen, setIsBackorderPromptOpen] = useState(false);
  const [isAddBackorderModalOpen, setIsAddBackorderModalOpen] = useState(false);
  const [
    isAddInstallerOpen,
    { open: openAddInstaller, close: closeAddInstaller },
  ] = useDisclosure(false);

  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [targetCompletionField, setTargetCompletionField] = useState<
    "installation_completed" | "inspection_completed" | null
  >(null);
  const [completionDateInput, setCompletionDateInput] = useState<Date | null>(
    new Date()
  );
  const { data: jobData, isLoading: isJobLoading } = useQuery<JobData>({
    queryKey: ["installation-editor", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
          id,
          job_number,
          installation:installation_id (*),
          production_schedule:production_schedule (*),
          sales_orders:sales_orders (
            shipping_street, shipping_city, shipping_province, shipping_zip,
            shipping_client_name,
            shipping_phone_1,
            shipping_phone_2,
            shipping_email_1,
            shipping_email_2,
            order_type,
            delivery_type,
            install,
            cabinet:cabinets (
              id,
              box,
              glass,
              interior,
              drawer_box,
              glass_type,
              piece_count,
              doors_parts_only,
              handles_selected,
              handles_supplied,
              top_drawer_front,
              door_styles(name),
              species(Species),
              colors(Name)
            )
          )
        `
        )
        .eq("id", jobId)
        .single();
      if (error) throw error;
      return data as unknown as JobData;
    },
    enabled: isAuthenticated && !!jobId,
  });

  const { data: installers, isLoading: isInstallersLoading } = useQuery<
    InstallerLookup[]
  >({
    queryKey: ["installers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installers")
        .select("installer_id, company_name, first_name, last_name")
        .eq("is_active", true)
        .order("company_name");
      if (error) throw error;
      return data as InstallerLookup[];
    },
    enabled: isAuthenticated,
  });

  const installerOptions = useMemo(() => {
    return (installers || []).map((i) => ({
      value: String(i.installer_id),
      label: i.company_name || `${i.first_name} ${i.last_name}`,
    }));
  }, [installers]);

  const form = useForm<CombinedInstallFormValues>({
    initialValues: {
      installer_id: null,
      installation_notes: "",
      wrap_date: null,
      wrap_completed: null,
      has_shipped: false,
      partially_shipped: false,
      installation_date: null,
      installation_completed: null,
      inspection_date: null,
      inspection_completed: null,
      legacy_ref: "",
      prod_id: 0,
      ship_schedule: null,
      ship_status: "unprocessed",
      installation_report_received: null,
      in_warehouse: null,
    },
  });

  const { setIsDirty } = useNavigationGuard();
  const isDirty = form.isDirty();
  useEffect(() => {
    setIsDirty(isDirty);
    return () => setIsDirty(false);
  }, [isDirty, setIsDirty]);

  useEffect(() => {
    if (jobData) {
      const install = jobData.installation;
      const prod = jobData.production_schedule;

      if (install) {
        form.setValues({
          installer_id: install.installer_id,
          installation_notes: install.installation_notes ?? "",
          wrap_date: install.wrap_date
            ? dayjs(install.wrap_date).toDate()
            : null,
          wrap_completed: install.wrap_completed,
          has_shipped: install.has_shipped,
          partially_shipped: install.partially_shipped || false,
          installation_date: install.installation_date
            ? dayjs(install.installation_date).toDate()
            : null,
          installation_completed: install.installation_completed,
          inspection_date: install.inspection_date
            ? dayjs(install.inspection_date).toDate()
            : null,
          inspection_completed: install.inspection_completed,
          legacy_ref: install.legacy_ref ?? "",
          prod_id: prod?.prod_id || 0,
          ship_schedule: prod?.ship_schedule
            ? dayjs(prod.ship_schedule).toDate()
            : null,
          ship_status: prod?.ship_status || "unprocessed",
          installation_report_received: install.installation_report_received,
          in_warehouse: install.in_warehouse,
        });
        form.resetDirty();
      }
    }
  }, [jobData]);

  const actualSteps = useMemo(() => {
    const schedule = jobData?.production_schedule;
    if (!schedule) return [];

    const stepsData: {
      key: keyof ProductionScheduleType;
      label: string;
      icon: React.ReactNode;
    }[] = [
      {
        key: "in_plant_actual",
        label: "In Plant Entry",
        icon: <FaIndustry size={12} />,
      },
      {
        key: "doors_completed_actual",
        label: "Doors",
        icon: <FaDoorOpen size={12} />,
      },
      {
        key: "cut_finish_completed_actual",
        label: "Cut Finishing",
        icon: <FaCut size={12} />,
      },
      {
        key: "custom_finish_completed_actual",
        label: "Custom Finish",
        icon: <FaCut size={12} />,
      },
      {
        key: "drawer_completed_actual",
        label: "Drawers",
        icon: <FaDoorOpen size={12} />,
      },
      {
        key: "cut_melamine_completed_actual",
        label: "Melamine Cut",
        icon: <FaCut size={12} />,
      },
      {
        key: "paint_completed_actual",
        label: "Paint",
        icon: <FaPaintBrush size={12} />,
      },
      {
        key: "assembly_completed_actual",
        label: "Assembly",
        icon: <FaCogs size={12} />,
      },
    ];

    return stepsData.map((step) => ({
      ...step,
      isCompleted: !!schedule[step.key],
      date: schedule[step.key] as string | null,
    }));
  }, [jobData]);

  const updateMutation = useMutation({
    mutationFn: async (values: CombinedInstallFormValues) => {
      if (!jobData?.installation?.installation_id) {
        throw new Error("Installation record not found for this job.");
      }
      if (!values.prod_id) {
        throw new Error("Production Schedule record not found for this job.");
      }

      const { prod_id, ship_schedule, ship_status, ...installValues } = values;

      const installPayload = {
        ...installValues,
        wrap_date: installValues.wrap_date
          ? dayjs(installValues.wrap_date).format("YYYY-MM-DD")
          : null,
        installation_date: installValues.installation_date
          ? dayjs(installValues.installation_date).format("YYYY-MM-DD")
          : null,
        inspection_date: installValues.inspection_date
          ? dayjs(installValues.inspection_date).format("YYYY-MM-DD")
          : null,
        installation_notes: installValues.installation_notes || null,
        legacy_ref: installValues.legacy_ref || null,
        partially_shipped: installValues.partially_shipped,
      };

      const { error: installError } = await supabase
        .from("installation")
        .update(installPayload as any)
        .eq("installation_id", jobData.installation.installation_id);
      if (installError) throw installError;

      const prodPayload = {
        ship_schedule: ship_schedule
          ? dayjs(ship_schedule).format("YYYY-MM-DD")
          : null,
        ship_status: ship_status,
      };

      const { error: prodError } = await supabase
        .from("production_schedule")
        .update(prodPayload)
        .eq("prod_id", prod_id);
      if (prodError) throw prodError;
    },
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Installation updated successfully",
        color: "green",
      });
      queryClient.invalidateQueries({
        queryKey: ["installation-editor", jobId],
      });
      queryClient.invalidateQueries({
        queryKey: ["installation_schedule_list"],
      });
      queryClient.invalidateQueries({
        queryKey: ["production_schedule_list"],
      });
      queryClient.invalidateQueries({
        queryKey: ["installation_table_view"],
      });
      router.push(`/dashboard/installation`);
    },
    onError: (err: any) =>
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      }),
  });

  if (isJobLoading || isInstallersLoading || !jobData)
    return (
      <Center h="100vh">
        <Loader />
        <Text ml="md">Loading Installation Editor...</Text>
      </Center>
    );

  const cabinet = jobData.sales_orders?.cabinet;
  const shipping = jobData.sales_orders
    ? {
        shipping_client_name: jobData.sales_orders.shipping_client_name,
        shipping_phone_1: jobData.sales_orders.shipping_phone_1,
        shipping_phone_2: jobData.sales_orders.shipping_phone_2,
        shipping_email_1: jobData.sales_orders.shipping_email_1,
        shipping_email_2: jobData.sales_orders.shipping_email_2,
        shipping_street: jobData.sales_orders.shipping_street,
        shipping_city: jobData.sales_orders.shipping_city,
        shipping_province: jobData.sales_orders.shipping_province,
        shipping_zip: jobData.sales_orders.shipping_zip,
      }
    : null;
  const orderDetails = jobData?.sales_orders
    ? {
        order_type: jobData.sales_orders.order_type,
        delivery_type: jobData.sales_orders.delivery_type,
        install: jobData.sales_orders.install,
      }
    : null;
  const prodSchedule = jobData.production_schedule;
  const installRecordId = jobData.installation?.installation_id;

  if (!installRecordId) {
    return (
      <Center h="100vh">
        <Text c="red">
          Error: No installation record found for Job #{jobData.job_number}.
        </Text>
      </Center>
    );
  }

  const handleBackorderPromptDecision = (isCompleteShipment: boolean) => {
    setIsBackorderPromptOpen(false);

    if (isCompleteShipment) {
      form.setFieldValue("has_shipped", true);
      form.setFieldValue("partially_shipped", false);
    } else {
      setIsAddBackorderModalOpen(true);
    }
  };

  const handleShippedChange = (isChecked: boolean) => {
    if (isChecked) {
      setIsBackorderPromptOpen(true);
    } else {
      form.setFieldValue("has_shipped", false);
      form.setFieldValue("partially_shipped", false);
    }
  };

  const handleSubmit = (values: CombinedInstallFormValues) => {
    if (Object.keys(form.errors).length > 0) {
      notifications.show({
        title: "Validation Failed",
        message: "Please correct the highlighted fields before submitting.",
        color: "red",
      });
      return;
    }
    updateMutation.mutate(values);
  };

  const handleCompletionToggle = (
    field: "installation_completed" | "inspection_completed"
  ) => {
    const currentValue = form.values[field];

    if (currentValue) {
      form.setFieldValue(field, null);
    } else {
      setTargetCompletionField(field);
      setCompletionDateInput(new Date());
      setCompletionModalOpen(true);
    }
  };

  const confirmCompletionDate = () => {
    if (targetCompletionField && completionDateInput) {
      form.setFieldValue(
        targetCompletionField,
        dayjs(completionDateInput).toISOString()
      );
      setCompletionModalOpen(false);
      setTargetCompletionField(null);
    }
  };

  const productionScheduledSteps: {
    key: keyof ProductionScheduleType;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "placement_date",
      label: "Placement Date",
      icon: <FaIndustry size={12} />,
    },
    {
      key: "doors_in_schedule",
      label: "Doors In",
      icon: <FaDoorOpen size={12} />,
    },
    {
      key: "doors_out_schedule",
      label: "Doors Out",
      icon: <FaDoorOpen size={12} />,
    },
    {
      key: "cut_finish_schedule",
      label: "Cut Finish",
      icon: <FaCut size={12} />,
    },
    {
      key: "cut_melamine_schedule",
      label: "Cut Melamine",
      icon: <FaCut size={12} />,
    },
    {
      key: "paint_in_schedule",
      label: "Paint In",
      icon: <FaPaintBrush size={12} />,
    },
    {
      key: "paint_out_schedule",
      label: "Paint Out",
      icon: <FaPaintBrush size={12} />,
    },
    { key: "assembly_schedule", label: "Assembly", icon: <FaCogs size={12} /> },
  ];

  return (
    <Container
      size="100%"
      pl={10}
      w="100%"
      style={{
        paddingRight: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <form
        onSubmit={form.onSubmit(handleSubmit)}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <Grid gutter="xs">
          <Grid.Col span={10}>
            <Stack>
              <Paper p="md" radius="md" shadow="sm" mb="md" bg={"gray.1"}>
                <Paper
                  p="md"
                  radius={0}
                  shadow="sm"
                  style={{
                    borderBottom: "1px solid #e0e0e0",
                    zIndex: 10,
                    background: "white",
                  }}
                >
                  <Group justify="space-between" align="center">
                    <Group gap="md">
                      <ThemeIcon
                        size={48}
                        radius="md"
                        variant="gradient"
                        gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
                      >
                        <FaTools size={22} />
                      </ThemeIcon>
                      <Stack gap={0}>
                        <Text fw={700} size="xl" style={{ color: "#343a40" }}>
                          Installation Job #{jobData.job_number}
                        </Text>
                        <Text size="sm" c="dimmed">
                          Status Overview
                        </Text>
                      </Stack>
                    </Group>
                  </Group>
                </Paper>
                <Divider my="sm" color="violet" />
                <SimpleGrid cols={3}>
                  <Stack>
                    <ClientInfo shipping={shipping} />
                    <OrderDetails orderDetails={orderDetails} />
                  </Stack>

                  <CabinetSpecs cabinet={cabinet} />
                  <Paper
                    p="md"
                    radius="md"
                    shadow="xs"
                    style={{ background: "#ffffffff" }}
                  >
                    {prodSchedule && (
                      <Box>
                        <Text
                          fw={600}
                          size="lg"
                          mb="md"
                          c="#4A00E0"
                          style={{ display: "flex", alignItems: "center" }}
                        >
                          <FaCogs style={{ marginRight: 8 }} /> Production
                          Schedule
                        </Text>
                        <Stack gap="xs">
                          {productionScheduledSteps.map((step) => (
                            <Group
                              key={step.key}
                              justify="space-between"
                              wrap="nowrap"
                            >
                              <Group gap="xs" wrap="nowrap">
                                {step.icon}
                                <Text size="sm" fw={500}>
                                  {step.label}:
                                </Text>
                              </Group>
                              <Text
                                size="sm"
                                c={prodSchedule[step.key] ? "dark" : "dimmed"}
                                style={{ whiteSpace: "nowrap" }}
                              >
                                {prodSchedule[step.key]
                                  ? dayjs(
                                      prodSchedule[step.key] as string
                                    ).format("YYYY-MM-DD")
                                  : "—"}
                              </Text>
                            </Group>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Paper>
                </SimpleGrid>
              </Paper>
            </Stack>

            <Paper bg={"gray.1"} p="md" radius="md">
              <Paper p="md" radius="md" pb={30}>
                <Stack gap="xl">
                  {}
                  <Box>
                    <Group mb={8} style={{ color: "#4A00E0" }}>
                      <FaTools size={18} />
                      <Text fw={600}>Installer & Key Dates</Text>
                    </Group>
                    <SimpleGrid cols={3} spacing="md">
                      {}
                      <Group align="flex-end" gap="xs">
                        <Select
                          styles={{
                            label: {
                              fontWeight: "bold",
                            },
                          }}
                          label="Assigned Installer"
                          placeholder="Select Installer"
                          data={installerOptions}
                          searchable
                          clearable
                          value={String(form.values.installer_id)}
                          onChange={(val) =>
                            form.setFieldValue(
                              "installer_id",
                              val ? Number(val) : null
                            )
                          }
                          style={{ flex: 1 }}
                        />
                        <Tooltip label="Create New Installer">
                          <ActionIcon
                            variant="filled"
                            color="#4A00E0"
                            size="lg"
                            mb={2}
                            onClick={openAddInstaller}
                          >
                            <FaPlus size={12} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                      <DateInput
                        styles={{
                          label: {
                            fontWeight: "bold",
                          },
                        }}
                        label="Scheduled Installation Date"
                        placeholder="Start Date"
                        clearable
                        valueFormat="YYYY-MM-DD"
                        {...form.getInputProps("installation_date")}
                      />
                      <DateInput
                        styles={{
                          label: {
                            fontWeight: "bold",
                          },
                        }}
                        label="Scheduled Inspection Date"
                        placeholder="Date"
                        clearable
                        valueFormat="YYYY-MM-DD"
                        {...form.getInputProps("inspection_date")}
                      />
                    </SimpleGrid>
                  </Box>

                  <Divider />

                  {}
                  <Box>
                    <Group mb="md" style={{ color: "#218838" }}>
                      <FaTruckLoading size={18} />
                      <Text fw={600}>Shipping Management</Text>
                    </Group>

                    <Stack gap="lg">
                      {}
                      <SimpleGrid cols={{ base: 1, sm: 5 }} spacing="md">
                        <DateInput
                          styles={{
                            label: {
                              fontWeight: "bold",
                            },
                          }}
                          label="Wrap Date"
                          placeholder="Scheduled Wrap Date"
                          clearable
                          valueFormat="YYYY-MM-DD"
                          {...form.getInputProps("wrap_date")}
                        />
                        <Box style={{ alignSelf: "flex-end" }}>
                          <Switch
                            size="xl"
                            onLabel="WRAPPED"
                            offLabel="Not Wrapped"
                            thumbIcon={<FaBoxOpen size={12} />}
                            checked={!!form.values.wrap_completed}
                            onChange={(e) =>
                              form.setFieldValue(
                                "wrap_completed",
                                e.currentTarget.checked
                                  ? new Date().toISOString()
                                  : null
                              )
                            }
                            styles={{
                              track: {
                                padding: "0 12px",
                                height: "36px",
                                cursor: "pointer",
                                border: "none",
                                backgroundColor: form.values.wrap_completed
                                  ? undefined
                                  : "#e9ecef",
                                backgroundImage: form.values.wrap_completed
                                  ? "linear-gradient(135deg, #ae3ec9 0%, #7048e8 100%)"
                                  : "linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)",
                                transition: "background 200ms ease",
                              },
                              thumb: {
                                height: "28px",
                                width: "28px",
                                backgroundColor: "#fff",
                                color: form.values.wrap_completed
                                  ? "#ae3ec9"
                                  : "#adb5bd",
                              },
                              trackLabel: {
                                color: form.values.wrap_completed
                                  ? "white"
                                  : "gray",
                                fontWeight: 600,
                                fontSize: "12px",
                              },
                            }}
                          />
                        </Box>
                        <DateInput
                          styles={{
                            label: {
                              fontWeight: "bold",
                            },
                          }}
                          label="Scheduled Ship Date"
                          placeholder="Ship Date"
                          clearable
                          valueFormat="YYYY-MM-DD"
                          {...form.getInputProps("ship_schedule")}
                        />

                        <Select
                          styles={{
                            label: {
                              fontWeight: "bold",
                            },
                          }}
                          label="Shipping Date Status"
                          data={[
                            { value: "unprocessed", label: "Unprocessed" },
                            { value: "tentative", label: "Tentative" },
                            { value: "confirmed", label: "Confirmed" },
                          ]}
                          {...form.getInputProps("ship_status")}
                          rightSection={
                            form.values.ship_status === "confirmed" ? (
                              <FaCheckCircle size={12} color="green" />
                            ) : null
                          }
                        />

                        <Box style={{ alignSelf: "flex-end" }}>
                          <Switch
                            size="xl"
                            onLabel="SHIPPED"
                            offLabel="Not Shipped"
                            thumbIcon={<FaTruckLoading size={12} />}
                            checked={form.values.has_shipped}
                            onChange={(e) =>
                              handleShippedChange(e.currentTarget.checked)
                            }
                            styles={{
                              track: {
                                padding: "0 12px",
                                height: "36px",
                                cursor: "pointer",
                                border: "none",
                                backgroundColor: form.values.has_shipped
                                  ? undefined
                                  : "#e9ecef",
                                backgroundImage: form.values.has_shipped
                                  ? "linear-gradient(135deg, #28a745 0%, #218838 100%)"
                                  : "linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)",
                                transition: "background 200ms ease",
                              },
                              thumb: {
                                height: "28px",
                                width: "28px",
                                backgroundColor: "#fff",
                                color: form.values.has_shipped
                                  ? "#218838"
                                  : "#adb5bd",
                              },
                              trackLabel: {
                                color: form.values.has_shipped
                                  ? "white"
                                  : "gray",
                                fontWeight: 600,
                                fontSize: "12px",
                              },
                            }}
                          />
                        </Box>
                      </SimpleGrid>

                      {form.values.partially_shipped && (
                        <Group mt={-10}>
                          <Tooltip label="This job has been partially shipped. Check Related Backorders for more information.">
                            <Badge color="orange" size="sm" variant="light">
                              Partially Shipped
                            </Badge>
                          </Tooltip>
                        </Group>
                      )}
                    </Stack>
                  </Box>
                  <Group gap={50}>
                    <Stack gap={10}>
                      <Switch
                        size="md"
                        color="violet"
                        label="Inst. Report Received"
                        checked={!!form.values.installation_report_received}
                        onChange={(event) => {
                          const isChecked = event.currentTarget.checked;
                          form.setFieldValue(
                            "installation_report_received",
                            isChecked ? dayjs().toISOString() : null
                          );
                        }}
                        styles={{
                          label: {
                            fontWeight: "bold",
                            fontSize: "14px",
                          },
                          track: {
                            cursor: "pointer",
                          },
                        }}
                      />
                      <Box style={{ minHeight: 20 }}>
                        <Collapse
                          in={!!form.values.installation_report_received}
                        >
                          <Text
                            c="dimmed"
                            style={{ textAlign: "center", fontSize: "12px" }}
                          >
                            (Received on :{" "}
                            {dayjs(
                              form.values.installation_report_received
                            ).format("YYYY-MM-DD")}
                            )
                          </Text>
                        </Collapse>
                      </Box>
                    </Stack>
                    <Stack gap={10}>
                      <Switch
                        size="md"
                        color="violet"
                        label="In Warehouse"
                        checked={!!form.values.in_warehouse}
                        onChange={(event) => {
                          const isChecked = event.currentTarget.checked;
                          form.setFieldValue(
                            "in_warehouse",
                            isChecked ? dayjs().toISOString() : null
                          );
                        }}
                        styles={{
                          label: {
                            fontWeight: "bold",
                            fontSize: "14px",
                          },
                          track: {
                            cursor: "pointer",
                          },
                        }}
                      />
                      <Box style={{ minHeight: 20 }}>
                        <Collapse in={!!form.values.in_warehouse}>
                          <Text
                            c="dimmed"
                            style={{ textAlign: "center", fontSize: "12px" }}
                          >
                            (Sent on :{" "}
                            {dayjs(form.values.in_warehouse).format(
                              "YYYY-MM-DD"
                            )}
                            )
                          </Text>
                        </Collapse>
                      </Box>
                    </Stack>
                  </Group>
                  <Divider />

                  <Box>
                    <Group mb={8}>
                      <FaCalendarCheck size={18} />
                      <Text fw={600}>Notes & Reference</Text>
                    </Group>
                    <Stack>
                      <Textarea
                        minRows={10}
                        styles={{ input: { minHeight: "200px" } }}
                        label="Installation/Site Notes"
                        placeholder="Document site conditions, issues, or specific instructions here."
                        {...form.getInputProps("installation_notes")}
                      />
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            </Paper>
            {jobId && (
              <RelatedBackorders
                jobId={String(jobId)}
                onAddBackorder={() => setIsAddBackorderModalOpen(true)}
              />
            )}
            {jobId && <RelatedServiceOrders jobId={jobId} />}
          </Grid.Col>

          {}
          <Grid.Col span={2} style={{ borderLeft: "1px solid #ccc" }}>
            {}
            <Box pt="md" pos="sticky" style={{ justifyItems: "center" }}>
              <Text
                fw={600}
                size="lg"
                mb="md"
                c="violet"
                display={"flex"}
                style={{ alignItems: "center" }}
              >
                <FaTools size={14} style={{ marginRight: "4px" }} />
                Installation Phase
              </Text>
              <Paper p="md" radius="md" w={"100%"}>
                <Timeline
                  bulletSize={24}
                  lineWidth={2}
                  active={-1}
                  styles={{ root: { "--tl-color": "green" } }}
                >
                  <TimelineItem
                    title="Installation Complete"
                    lineVariant="solid"
                    bullet={
                      <Box
                        style={{
                          backgroundColor: form.values.installation_completed
                            ? "#28a745"
                            : "#6b6b6b",
                          borderRadius: "50%",
                          width: 24,
                          height: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          aspectRatio: "1 / 1",
                        }}
                      >
                        <FaCheckCircle size={10} color="white" />
                      </Box>
                    }
                    styles={{
                      item: {
                        "--tl-color": form.values.installation_completed
                          ? "#28a745"
                          : "#e0e0e0",
                      },
                      itemTitle: {
                        color: form.values.installation_completed
                          ? "#28a745"
                          : "#6b6b6b",
                        fontSize: "12px",
                      },
                    }}
                  >
                    <Text size="xs" c="dimmed">
                      {form.values.installation_completed
                        ? "Signed Off:"
                        : "Pending Sign-off"}
                    </Text>
                    <Text size="xs" fw={500}>
                      {form.values.installation_completed
                        ? form.values.installation_completed ===
                          "1999-09-19T00:00:00+00:00"
                          ? "Completed"
                          : dayjs(form.values.installation_completed).format(
                              "YYYY-MM-DD"
                            )
                        : "—"}
                    </Text>
                    <Button
                      size="xs"
                      mt={2}
                      variant="light"
                      color={
                        form.values.installation_completed ? "red" : "green"
                      }
                      onClick={() =>
                        handleCompletionToggle("installation_completed")
                      }
                    >
                      {form.values.installation_completed
                        ? "Reset"
                        : "Complete"}
                    </Button>
                  </TimelineItem>

                  <TimelineItem
                    title="Inspection Date"
                    lineVariant="solid"
                    bullet={
                      <Box
                        style={{
                          backgroundColor: form.values.inspection_completed
                            ? "#28a745"
                            : "#6b6b6b",
                          borderRadius: "50%",
                          width: 24,
                          height: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          aspectRatio: "1 / 1",
                        }}
                      >
                        <FaCheckCircle size={10} color="white" />
                      </Box>
                    }
                    styles={{
                      item: {
                        "--tl-color": form.values.inspection_completed
                          ? "#28a745"
                          : "#e0e0e0",
                      },
                      itemTitle: {
                        color: form.values.inspection_completed
                          ? "#28a745"
                          : "#6b6b6b",
                        fontSize: "12px",
                      },
                    }}
                  >
                    <Text size="xs" fw={500}>
                      {form.values.inspection_date
                        ? dayjs(form.values.inspection_date).format(
                            "YYYY-MM-DD"
                          )
                        : "—"}
                    </Text>
                  </TimelineItem>
                </Timeline>
              </Paper>
            </Box>
            <Box pt="md" style={{ justifyItems: "center" }}>
              <Text
                fw={600}
                size="lg"
                mb="md"
                c="violet"
                display={"flex"}
                style={{ alignItems: "center" }}
              >
                <FaCalendarCheck style={{ marginRight: 8 }} /> Actual Progress
              </Text>
              <Paper p="md" radius="md" w={"100%"}>
                <Timeline
                  bulletSize={24}
                  lineWidth={2}
                  active={-1}
                  styles={{ root: { "--tl-color": "green" } }}
                >
                  {actualSteps.map((step, idx) => {
                    const bulletColor = step.isCompleted
                      ? "#28a745"
                      : "#6b6b6b";
                    const lineColor = step.isCompleted ? "#28a745" : "#e0e0e0";
                    return (
                      <Timeline.Item
                        key={idx}
                        title={step.label}
                        lineVariant="solid"
                        bullet={
                          <Box
                            style={{
                              backgroundColor: bulletColor,
                              borderRadius: "50%",
                              width: 24,
                              height: 24,
                              minWidth: 24,
                              minHeight: 24,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              aspectRatio: "1 / 1",
                            }}
                          >
                            {step.isCompleted ? (
                              <FaCheckCircle size={12} color="white" />
                            ) : (
                              step.icon
                            )}
                          </Box>
                        }
                        styles={{
                          item: { "--tl-color": lineColor },
                          itemTitle: {
                            color: step.isCompleted ? "#28a745" : "#6b6b6b",
                          },
                        }}
                      >
                        <Text size="xs" c="dimmed">
                          {step.isCompleted ? "Completed:" : "Pending"}
                        </Text>
                        {step.date === "1999-09-19T00:00:00+00:00" ? (
                          <Text size="sm" c="green.8" fw={600}>
                            Completed
                          </Text>
                        ) : (
                          <Text size="sm" fw={500}>
                            {step.date
                              ? dayjs(step.date).format("YYYY-MM-DD HH:mm")
                              : "—"}
                          </Text>
                        )}
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              </Paper>
            </Box>
          </Grid.Col>
        </Grid>
      </form>

      {}
      <Paper
        p="md"
        bg={"gray.1"}
        style={{ position: "sticky", bottom: 0, zIndex: 10 }}
      >
        <Group justify="flex-end">
          <Button
            variant="outline"
            style={{
              background: "linear-gradient(135deg, #FF6B6B 0%, #FF3B3B 100%)",
              color: "white",
              border: "none",
            }}
            size="md"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="md"
            color="blue"
            loading={updateMutation.isPending}
            disabled={!form.isDirty() || updateMutation.isPending}
            style={{
              background: !form.isDirty()
                ? "linear-gradient(135deg, #c6c6c6 0%, #9e9e9e 100%)"
                : "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
              color: "white",
              border: "none",
            }}
            onClick={() => form.onSubmit(handleSubmit)()}
          >
            Update Installation
          </Button>
        </Group>
      </Paper>

      {}
      <Modal
        opened={isBackorderPromptOpen}
        onClose={() => {
          setIsBackorderPromptOpen(false);
          if (!form.values.has_shipped && !form.values.partially_shipped) {
            form.setFieldValue("has_shipped", false);
          }
        }}
        withCloseButton={false}
        centered
        radius="lg"
        padding="lg"
        overlayProps={{ blur: 4, opacity: 0.55 }}
        transitionProps={{ transition: "pop", duration: 200 }}
      >
        <Stack align="center" gap="md">
          <ThemeIcon
            size={80}
            radius="100%"
            variant="light"
            color="blue"
            style={{ border: "1px solid var(--mantine-color-blue-2)" }}
          >
            <FaTruckLoading size={40} />
          </ThemeIcon>
          <Stack gap={4} align="center">
            <Text size="lg" fw={700} ta="center">
              Confirm Shipment Status
            </Text>
            <Text size="sm" c="dimmed" ta="center" style={{ maxWidth: 300 }}>
              Is this a complete shipment, or are items missing?
            </Text>
          </Stack>
          <Group w="100%" grow mt="md">
            <Button
              variant="outline"
              color="orange"
              size="md"
              radius="md"
              style={{ borderColor: "var(--mantine-color-orange-3)" }}
              onClick={() => handleBackorderPromptDecision(false)}
            >
              Partial
            </Button>
            <Button
              variant="gradient"
              gradient={{ from: "teal", to: "green", deg: 105 }}
              size="md"
              radius="md"
              leftSection={<FaCheckCircle />}
              onClick={() => handleBackorderPromptDecision(true)}
            >
              Complete
            </Button>
          </Group>
          <Text
            size="xs"
            c="dimmed"
            style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => {
              setIsBackorderPromptOpen(false);
              form.setFieldValue("has_shipped", false);
            }}
          >
            Cancel
          </Text>
        </Stack>
      </Modal>

      {jobData && (
        <AddBackorderModal
          opened={isAddBackorderModalOpen}
          onClose={() => setIsAddBackorderModalOpen(false)}
          jobId={String(jobData.id)}
          jobNumber={jobData.job_number}
          onSuccess={() => {
            const newValues = {
              ...form.values,
              has_shipped: false,
              partially_shipped: true,
            };
            form.setFieldValue("has_shipped", false);
            form.setFieldValue("partially_shipped", true);
          }}
        />
      )}

      <Modal
        opened={completionModalOpen}
        onClose={() => setCompletionModalOpen(false)}
        title="Set Completion Date"
        centered
        size="sm"
      >
        <Stack>
          <DateInput
            styles={{
              label: {
                fontWeight: "bold",
              },
            }}
            label="Select Date"
            placeholder="Pick a date"
            value={completionDateInput}
            onChange={(date) =>
              setCompletionDateInput(date ? dayjs(date).toDate() : null)
            }
            valueFormat="YYYY-MM-DD"
            allowDeselect={false}
            data-autofocus
          />
          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => setCompletionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmCompletionDate} color="green">
              Confirm
            </Button>
          </Group>
        </Stack>
      </Modal>

      <AddInstaller
        opened={isAddInstallerOpen}
        onClose={() => {
          closeAddInstaller();
          queryClient.invalidateQueries({ queryKey: ["installers-list"] });
        }}
      />
    </Container>
  );
}
