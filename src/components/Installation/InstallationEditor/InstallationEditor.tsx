"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@mantine/form";
import { useSupabase } from "@/hooks/useSupabase";
import { Tables, TablesUpdate } from "@/types/db";
import {
  Container,
  Paper,
  Stack,
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
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import {
  FaCalendarCheck,
  FaCheck,
  FaCheckCircle,
  FaCogs,
  FaCut,
  FaDoorOpen,
  FaIndustry,
  FaPaintBrush,
  FaTools,
  FaTruckLoading,
  FaUser,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { MdOutlineDoorSliding } from "react-icons/md";

import CabinetSpecs from "@/components/Shared/CabinetSpecs/CabinetSpecs";
import ClientInfo from "@/components/Shared/ClientInfo/ClientInfo";

// --- Type Definitions using Supabase Types ---
type InstallationType = Tables<"installation">;
type ProductionScheduleType = Tables<"production_schedule">;

// Combined form values for Installation + Production Schedule shipping fields
// Override date fields to use Date objects for form compatibility
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
};

type InstallerLookup = Tables<"installers">;

type JobData = Tables<"jobs"> & {
  installation: InstallationType | null;
  production_schedule: ProductionScheduleType | null;
  sales_orders: Tables<"sales_orders"> & {
    client: Tables<"client"> | null;
    cabinet: Tables<"cabinets"> | null;
  };
};

// --- Component ---
export default function InstallationEditor({ jobId }: { jobId: number }) {
  const router = useRouter();
  const { supabase, isAuthenticated } = useSupabase();
  const queryClient = useQueryClient();

  // --- 1. Fetch Job and Installation Data ---
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
            cabinet:cabinets (
              id,
              box,
              color,
              glass,
              glaze,
              finish,
              species,
              interior,
              door_style,
              drawer_box,
              glass_type,
              piece_count,
              doors_parts_only,
              handles_selected,
              handles_supplied,
              hinge_soft_close,
              top_drawer_front
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

  // --- 2. Fetch Installers Lookup Data ---
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

  // --- 3. Form Initialization ---
  const form = useForm<CombinedInstallFormValues>({
    initialValues: {
      installer_id: null,
      installation_notes: "",
      wrap_date: null,
      wrap_completed: null,
      has_shipped: false,
      installation_date: null,
      installation_completed: null,
      inspection_date: null,
      inspection_completed: null,
      legacy_ref: "",

      // Only Shipping Schedule fields are editable here now
      prod_id: 0,
      ship_schedule: null,
      ship_status: "unprocessed",
    },
  });

  // Prefill form when data is loaded
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
          has_shipped: install.has_shipped,
          installation_date: install.installation_date
            ? dayjs(install.installation_date).toDate()
            : null,
          installation_completed: install.installation_completed,
          inspection_date: install.inspection_date
            ? dayjs(install.inspection_date).toDate()
            : null,
          inspection_completed: install.inspection_completed,
          legacy_ref: install.legacy_ref ?? "",

          // Merge production fields (Shipping only)
          prod_id: prod?.prod_id || 0,
          ship_schedule: prod?.ship_schedule
            ? dayjs(prod.ship_schedule).toDate()
            : null,
          ship_status: prod?.ship_status || "unprocessed",
        });
        form.resetDirty();
      }
    }
  }, [jobData]);
  // ---------- Timeline / Progress Logic ----------
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

  // --- 4. Mutation (Multi-Table Update) ---
  const updateMutation = useMutation({
    mutationFn: async (values: CombinedInstallFormValues) => {
      if (!jobData?.installation?.installation_id) {
        throw new Error("Installation record not found for this job.");
      }
      if (!values.prod_id) {
        throw new Error("Production Schedule record not found for this job.");
      }

      const { prod_id, ship_schedule, ship_status, ...installValues } = values;

      // 4a. Update Installation Table
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
      };

      const { error: installError } = await supabase
        .from("installation")
        .update(installPayload)
        .eq("installation_id", jobData.installation.installation_id);
      if (installError) throw installError;

      // 4b. Update Production Schedule Table (Only Shipping info)
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
      router.push("/dashboard/installation");
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
  const shipping = jobData.sales_orders;
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
      form.setFieldValue(field, new Date().toISOString());
    }
  };

  // Array for Read-Only Production Schedule Dates (Context only)
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
              {/* HEADER: Job Number & Basic Info */}
              <Paper
                p="md"
                radius="md"
                shadow="sm"
                style={{ background: "#f0f0f0ff" }}
              >
                <Group justify="space-between" align="center">
                  <Text
                    fw={600}
                    size="lg"
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    Installation Job # {jobData.job_number}
                  </Text>
                </Group>
                <Divider my="sm" color="violet" />

                {/* DETAILED INFO: CLIENT, SHIPPING, CABINET */}
                <SimpleGrid cols={3}>
                  {/* CLIENT & CONTACTS */}
                  <ClientInfo shipping={shipping} />

                  {/* CABINET SPECS */}
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

            <Paper p="md" radius="md" pb={30}>
              <Stack gap="xl">
                {/* ---------------------------------------------------- */}
                {/* 1. INSTALLER & SCHEDULE */}
                {/* ---------------------------------------------------- */}
                <Box>
                  <Group mb={8} style={{ color: "#4A00E0" }}>
                    <FaTools size={18} />
                    <Text fw={600}>Installer & Key Dates</Text>
                  </Group>
                  <SimpleGrid cols={3} spacing="md">
                    <Select
                      label="Assigned Installer"
                      placeholder="Select Installer"
                      data={installerOptions}
                      searchable
                      clearable
                      value={String(form.values.installer_id)}
                      onChange={(val) => {
                        form.setFieldValue(
                          "installer_id",
                          val ? Number(val) : null
                        );
                      }}
                    />
                    <DateInput
                      label="Scheduled Installation Date"
                      placeholder="Start Date"
                      clearable
                      valueFormat="YYYY-MM-DD"
                      {...form.getInputProps("installation_date")}
                    />
                    <DateInput
                      label="Scheduled Inspection Date"
                      placeholder="Date"
                      clearable
                      valueFormat="YYYY-MM-DD"
                      {...form.getInputProps("inspection_date")}
                    />
                  </SimpleGrid>
                </Box>

                <Divider />

                {/* ---------------------------------------------------- */}
                {/* 2. SHIPPING MANAGEMENT */}
                {/* ---------------------------------------------------- */}
                <Box>
                  <Group mb={8} style={{ color: "#218838" }}>
                    <FaTruckLoading size={18} />
                    <Text fw={600}>Shipping Management</Text>
                  </Group>
                  <SimpleGrid cols={4} spacing="md">
                    <DateInput
                      label="Wrap Date"
                      placeholder="Date Cabinets Wrapped"
                      clearable
                      valueFormat="YYYY-MM-DD"
                      {...form.getInputProps("wrap_date")}
                    />

                    <DateInput
                      label="Scheduled Ship Date"
                      placeholder="Prod Ship Date"
                      clearable
                      valueFormat="YYYY-MM-DD"
                      {...form.getInputProps("ship_schedule")}
                    />
                    <Select
                      label="Shipping Date Status"
                      w={"200px"}
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
                    <Box style={{ display: "flex", alignItems: "flex-end" }}>
                      <Switch
                        size="lg"
                        offLabel="Not Shipped"
                        onLabel="SHIPPED"
                        color="green"
                        {...form.getInputProps("has_shipped", {
                          type: "checkbox",
                        })}
                        checked={form.values.has_shipped}
                        styles={{
                          track: {
                            padding: "5px",
                            cursor: "pointer",
                            background: form.values.has_shipped
                              ? "linear-gradient(135deg, #28a745 0%, #218838 100%)"
                              : "linear-gradient(135deg, #FF6B6B 0%, #FF3B3B 100%)",
                            border: "none",
                            color: form.values.has_shipped ? "white" : "black",
                            transition: "background 200ms ease",
                          },
                        }}
                      />
                    </Box>
                  </SimpleGrid>
                </Box>

                <Divider />

                {/* ---------------------------------------------------- */}
                {/* 3. NOTES & REFERENCE */}
                {/* ---------------------------------------------------- */}
                <Box>
                  <Group mb={8}>
                    <FaCalendarCheck size={18} />
                    <Text fw={600}>Notes & Reference</Text>
                  </Group>
                  <Stack>
                    <Textarea
                      label="Installation/Site Notes"
                      placeholder="Document site conditions, issues, or specific instructions here."
                      rows={4}
                      {...form.getInputProps("installation_notes")}
                    />
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          </Grid.Col>

          {/* RIGHT COLUMN: STICKY SIDEBAR FOR STATUS */}
          <Grid.Col span={2}>
            <Box pt="md" pos="sticky" style={{ justifyItems: "center" }}>
              <Stack gap="xl">
                <Text
                  fw={600}
                  size="lg"
                  c="violet"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <FaCalendarCheck style={{ marginRight: 8 }} /> Completion
                  Status
                </Text>

                {/* INSTALLATION PHASE TIMELINE */}
                <Paper p="md" radius="md">
                  <Timeline
                    bulletSize={20}
                    lineWidth={2}
                    active={-1}
                    styles={{ root: { "--tl-color": "green" } }}
                  >
                    <TimelineItem
                      key="install-header"
                      title="Installation Phase"
                      lineVariant="solid"
                      bullet={
                        <Box
                          style={{
                            backgroundColor: "#4A00E0",
                            borderRadius: "50%",
                            width: 20,
                            height: 20,
                            minWidth: 20,
                            minHeight: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            aspectRatio: "1 / 1",
                          }}
                        >
                          <FaTools size={10} color="white" />
                        </Box>
                      }
                      styles={{
                        item: {
                          "--tl-color": "#e0e0e0",
                        },
                        itemTitle: {
                          color: "#4A00E0",
                          fontWeight: 700,
                          fontSize: "14px",
                        },
                      }}
                    ></TimelineItem>
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
                            width: 20,
                            height: 20,
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
                          ? dayjs(form.values.installation_completed).format(
                              "YYYY-MM-DD HH:mm"
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
                      title="Final Inspection Completed"
                      lineVariant="solid"
                      bullet={
                        <Box
                          style={{
                            backgroundColor: form.values.inspection_completed
                              ? "#28a745"
                              : "#6b6b6b",
                            borderRadius: "50%",
                            width: 20,
                            height: 20,
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
                      <Text size="xs" c="dimmed">
                        {form.values.inspection_completed
                          ? "Signed Off:"
                          : "Pending Sign-off"}
                      </Text>
                      <Text size="xs" fw={500}>
                        {form.values.inspection_completed
                          ? dayjs(form.values.inspection_completed).format(
                              "YYYY-MM-DD HH:mm"
                            )
                          : "—"}
                      </Text>
                      <Button
                        size="xs"
                        mt={2}
                        variant="light"
                        color={
                          form.values.inspection_completed ? "red" : "green"
                        }
                        onClick={() =>
                          handleCompletionToggle("inspection_completed")
                        }
                      >
                        {form.values.inspection_completed
                          ? "Reset"
                          : "Complete"}
                      </Button>
                    </TimelineItem>
                  </Timeline>
                </Paper>
              </Stack>
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
              <Paper shadow="sm" p="md" radius="md" w={"100%"}>
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
                          item: {
                            "--tl-color": lineColor,
                          },
                          itemTitle: {
                            color: step.isCompleted ? "#28a745" : "#6b6b6b",
                          },
                        }}
                      >
                        <Text size="xs" c="dimmed">
                          {step.isCompleted ? "Completed:" : "Pending"}
                        </Text>
                        <Text size="sm" fw={500}>
                          {step.date
                            ? dayjs(step.date).format("YYYY-MM-DD HH:mm")
                            : "—"}
                        </Text>
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              </Paper>
            </Box>
          </Grid.Col>
        </Grid>
      </form>

      {/* Footer Buttons */}
      <Paper
        p="md"
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 10,
          background: "linear-gradient(135deg, #DDE6F5 0%, #E7D9F0 100%)",
        }}
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
    </Container>
  );
}
