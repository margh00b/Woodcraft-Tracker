"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useForm } from "@mantine/form";
import { zodResolver } from "@/utils/zodResolver/zodResolver";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import {
  Container,
  Button,
  Group,
  Stack,
  TextInput,
  NumberInput,
  Select,
  Text,
  SimpleGrid,
  Fieldset,
  Paper,
  Loader,
  Center,
  ActionIcon,
  Table,
  Box,
  Switch,
  Divider,
  Modal,
  rem,
  Tooltip,
  Radio,
} from "@mantine/core";
import dayjs from "dayjs";
import { DateInput, DatePickerInput } from "@mantine/dates";
import {
  FaPlus,
  FaTrash,
  FaTools,
  FaSave,
  FaEye,
  FaCheck,
  FaCheckCircle,
  FaBoxOpen,
  FaBuilding,
  FaDesktop,
  FaDoorClosed,
  FaMapMarkerAlt,
  FaQuestionCircle,
  FaUndo,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import {
  ServiceOrderFormValues,
  ServiceOrderSchema,
} from "@/zod/serviceorder.schema";

import { useJobSearch } from "@/hooks/useJobSearch";
import { useInstallerSearch } from "@/hooks/useInstallerSearch";
import utc from "dayjs/plugin/utc";
import CustomRichTextEditor from "@/components/RichTextEditor/RichTextEditor";
import PdfPreview from "../PdfPreview/PdfPreview";
import CabinetSpecs from "@/components/Shared/CabinetSpecs/CabinetSpecs";
import ClientInfo from "@/components/Shared/ClientInfo/ClientInfo";
import { Enums, Tables } from "@/types/db";
import AddInstaller from "@/components/Installers/AddInstaller/AddInstaller";
import OrderDetails from "@/components/Shared/OrderDetails/OrderDetails";
import { useNavigationGuard } from "@/providers/NavigationGuardProvider";
import HomeOwnersInfo from "../HomeOwnersInfo/HomeOwnersInfo";
import {
  serviceorderLocationOptions,
  serviceorderStatusOptions,
} from "@/dropdowns/dropdownOptions";
import { IoIosWarning } from "react-icons/io";
import { linearGradients } from "@/theme";

dayjs.extend(utc);

interface EditServiceOrderProps {
  serviceOrderId: string;
}

type JoinedCabinet = Tables<"cabinets"> & {
  door_styles: { name: string } | null;
  species: { Species: string } | null;
  colors: { Name: string } | null;
};

type ServiceOrderData = Tables<"service_orders"> & {
  service_order_parts: Tables<"service_order_parts">[];
  installers: Tables<"installers"> | null;
  jobs:
    | (Tables<"jobs"> & {
        sales_orders: Tables<"sales_orders"> & {
          cabinet: JoinedCabinet | null;
        };
        homeowners_info: Tables<"homeowners_info">;
      })
    | null;
};

const mapServiceOrderToFormValues = (
  data: ServiceOrderData,
): ServiceOrderFormValues => {
  const hoInfo = data.jobs?.homeowners_info;

  return {
    job_id: String(data.job_id),
    service_order_number: data.service_order_number,
    due_date: data.due_date ? dayjs(data.due_date).toDate() : null,
    installer_id: data.installer_id ? String(data.installer_id) : null,
    service_type: data.service_type || "",
    service_type_detail: data.service_type_detail || "",
    service_by: data.service_by || "",
    service_by_detail: data.service_by_detail || "",
    hours_estimated: data.hours_estimated || 0,
    chargeable: data.chargeable,
    is_warranty_so: data.is_warranty_so || false,
    installer_requested: data.installer_requested || false,
    warranty_order_cost: data.warranty_order_cost || undefined,
    comments: data.comments || "",
    completed_at: data.completed_at ? new Date(data.completed_at) : null,
    parts: data.service_order_parts.map((p: any) => ({
      id: p.id,
      qty: p.qty,
      part: p.part,
      description: p.description || "",
      location: p.location || "",
      status: p.status || "",
      part_due_date: p.part_due_date ? dayjs(p.part_due_date).toDate() : null,
      _deleted: false,
    })),
    homeowner_name: hoInfo?.homeowner_name || "",
    homeowner_phone: hoInfo?.homeowner_phone || "",
    homeowner_email: hoInfo?.homeowner_email || "",
    homeowner_details: hoInfo?.homeowner_details || "",
  };
};

export default function EditServiceOrder({
  serviceOrderId,
}: EditServiceOrderProps) {
  const { supabase, isAuthenticated } = useSupabase();
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [previewOpened, { open: openPreview, close: closePreview }] =
    useDisclosure(false);
  const [
    addInstallerOpened,
    { open: openAddInstaller, close: closeAddInstaller },
  ] = useDisclosure(false);

  const getLocationIcon = (value: string | null) => {
    switch (value) {
      case "In Bin":
        return <FaBoxOpen size={14} />;
      case "At Wall":
        return <FaMapMarkerAlt size={14} />;
      case "On Desk":
        return <FaDesktop size={14} />;
      case "In Office":
        return <FaBuilding size={14} />;
      case "In Closet":
        return <FaDoorClosed size={14} />;
      case "Unknown":
        return <FaQuestionCircle size={14} />;
      default:
        return null;
    }
  };

  const form = useForm<ServiceOrderFormValues>({
    initialValues: {
      job_id: "",
      service_order_number: "",
      due_date: null,
      installer_id: null,
      service_type: "",
      service_type_detail: "",
      service_by: "",
      service_by_detail: "",
      hours_estimated: 0,
      chargeable: false,
      is_warranty_so: false,
      installer_requested: false,
      warranty_order_cost: undefined,
      comments: "",
      parts: [],
      homeowner_name: "",
      homeowner_phone: "",
      homeowner_email: "",
      homeowner_details: "",
    },
    validate: zodResolver(ServiceOrderSchema),
  });

  const {
    options: jobOptions,
    isLoading: jobsLoading,
    setSearch: setJobSearch,
    search: jobSearch,
  } = useJobSearch(form.values.job_id);

  const {
    options: installerOptions,
    isLoading: installersLoading,
    setSearch: setInstallerSearch,
    search: installerSearch,
  } = useInstallerSearch(form.values.installer_id);

  const { data: serviceOrderData, isLoading: soLoading } =
    useQuery<ServiceOrderData>({
      queryKey: ["service_order", serviceOrderId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("service_orders")
          .select(
            `
          *,
          service_order_parts (*),
          installers:installer_id (
            first_name,
            last_name,
            company_name
          ),
          jobs:job_id (
            job_number,
            homeowners_info (*),
            sales_orders:sales_orders (
              designer,
              shipping_street,
              shipping_city,
              shipping_province,
              shipping_zip,
              shipping_client_name,
              project_name,
              shipping_phone_1,
              shipping_phone_2,
              shipping_email_1,
              shipping_email_2,
              order_type,
              delivery_type,
              install,
              cabinet:cabinets (
                box,
                glass,
                interior,
                drawer_box,
                drawer_hardware,
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
          )
        `,
          )
          .eq("service_order_id", serviceOrderId)
          .single();

        if (error) throw error;
        return data as unknown as ServiceOrderData;
      },
      enabled: isAuthenticated,
    });

  const { setIsDirty } = useNavigationGuard();
  const isDirty = form.isDirty();
  useEffect(() => {
    setIsDirty(isDirty);
    return () => setIsDirty(false);
  }, [isDirty, setIsDirty]);

  useEffect(() => {
    if (serviceOrderData) {
      const mappedValues = mapServiceOrderToFormValues(serviceOrderData);
      form.initialize(mappedValues);
      form.resetDirty();
    }
  }, [serviceOrderData]);

  const submitMutation = useMutation({
    mutationFn: async (values: ServiceOrderFormValues) => {
      if (!user) throw new Error("User not authenticated");

      const { error: soError } = await supabase
        .from("service_orders")
        .update({
          job_id: Number(values.job_id),
          service_order_number: values.service_order_number,
          due_date: values.due_date,
          installer_id: values.installer_id
            ? Number(values.installer_id)
            : null,
          service_type: values.service_type,
          service_type_detail: values.service_type_detail,
          service_by: values.service_by,
          service_by_detail: values.service_by_detail,
          hours_estimated: values.hours_estimated,
          chargeable: values.chargeable ?? false,
          is_warranty_so: values.is_warranty_so,
          installer_requested: values.installer_requested,
          warranty_order_cost: values.warranty_order_cost,
          comments: values.comments,
          completed_at: values.completed_at,
        })
        .eq("service_order_id", serviceOrderId);

      if (soError) throw new Error(`Update Order Error: ${soError.message}`);

      if (
        values.homeowner_name ||
        values.homeowner_phone ||
        values.homeowner_email ||
        values.homeowner_details
      ) {
        const { error: hoError } = await supabase
          .from("homeowners_info")
          .upsert(
            {
              job_id: Number(values.job_id),
              homeowner_name: values.homeowner_name,
              homeowner_phone: values.homeowner_phone,
              homeowner_email: values.homeowner_email,
              homeowner_details: values.homeowner_details,
            },
            { onConflict: "job_id" },
          );
        if (hoError) throw hoError;
      }

      if (values.parts) {
        let parts = values.parts;

        if (values.completed_at && parts.length > 0) {
          parts = parts.map((part) => ({
            ...part,
            status: "completed" as Enums<"so_part_status">,
          }));
        }
        const partsToDelete = parts
          .filter((p) => p.id && p._deleted)
          .map((p) => p.id as number);

        if (partsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from("service_order_parts")
            .delete()
            .in("id", partsToDelete);

          if (deleteError)
            throw new Error(`Delete Parts Error: ${deleteError.message}`);
        }

        const partsToUpdate = parts
          .filter((p) => p.id && !p._deleted)
          .map((p) => ({
            id: p.id,
            service_order_id: Number(serviceOrderId),
            qty: p.qty,
            part: p.part,
            description: p.description || "",
            location: p.location || "Unknown",
            status: p.status || "pending",
            part_due_date: p.part_due_date
              ? dayjs(p.part_due_date).format("YYYY-MM-DD")
              : null,
          }));

        if (partsToUpdate.length > 0) {
          const { error: updateError } = await supabase
            .from("service_order_parts")
            .upsert(partsToUpdate);

          if (updateError)
            throw new Error(`Update Parts Error: ${updateError.message}`);
        }

        const partsToInsert = parts
          .filter((p) => !p.id && !p._deleted)
          .map((p) => ({
            service_order_id: Number(serviceOrderId),
            qty: p.qty,
            part: p.part,
            description: p.description || "",
            location: p.location || "Unknown",
            status: p.status || "pending",
            part_due_date: p.part_due_date
              ? dayjs(p.part_due_date).format("YYYY-MM-DD")
              : null,
          }));

        let newInsertedParts: Tables<"service_order_parts">[] = [];

        if (partsToInsert.length > 0) {
          const { data, error: insertError } = await supabase
            .from("service_order_parts")
            .insert(partsToInsert)
            .select();

          if (insertError)
            throw new Error(`Create Parts Error: ${insertError.message}`);
          if (data) newInsertedParts = data;
        }

        const finalParts = [
          ...partsToUpdate.map((p) => ({ ...p, _deleted: false })),
          ...newInsertedParts.map((p) => ({
            id: p.id,
            qty: p.qty,
            part: p.part,
            description: p.description,
            location: p.location,
            status: p.status,
            part_due_date: p.part_due_date,
            _deleted: false,
          })),
        ];

        return { parts: finalParts };
      }

      return { parts: [] };
    },
    onSuccess: async (data, variables) => {
      notifications.show({
        title: "Success",
        message: "Service Order updated successfully.",
        color: "green",
      });

      if (data.parts.length > 0 || variables.parts.length > 0) {
        const currentParts = form.values.parts;

        if (data && data.parts) {
          form.setFieldValue("parts", data.parts as any);
        }
      }

      form.resetDirty();

      await queryClient.invalidateQueries({
        queryKey: ["service_order", serviceOrderId],
      });

      queryClient.invalidateQueries({
        queryKey: ["service_orders_table_view"],
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const handleSubmit = (values: ServiceOrderFormValues) => {
    if (submitMutation.isPending) return;
    submitMutation.mutate(values);
  };

  const addPart = () => {
    const activeParts = form.values.parts.filter((p) => !p._deleted);
    if (activeParts.length === 0) {
      form.setFieldValue("chargeable", null);
    }

    form.insertListItem("parts", {
      qty: 1,
      part: "",
      description: "",
      location: "",
      status: "pending",
      part_due_date: null,
      _deleted: false,
    });
  };

  const markAllPartsCompleted = () => {
    const updatedParts = form.values.parts.map((part) => ({
      ...part,
      status: "completed" as Enums<"so_part_status">,
    }));
    form.setFieldValue("parts", updatedParts);
  };

  const handlePartDelete = (index: number) => {
    const part = form.values.parts?.[index];
    if (!part) return;

    if (part.id) {
      form.setFieldValue(`parts.${index}._deleted`, !part._deleted);
    } else {
      form.removeListItem("parts", index);
    }
  };

  if (soLoading) {
    return (
      <Center h="100vh">
        <Loader />
        <Text ml="md">Loading Service Order...</Text>
      </Center>
    );
  }
  const cabinet = serviceOrderData?.jobs?.sales_orders?.cabinet;
  const shipping = serviceOrderData?.jobs?.sales_orders
    ? {
        shipping_client_name:
          serviceOrderData.jobs.sales_orders.shipping_client_name,
        project_name: serviceOrderData.jobs.sales_orders.project_name,
        shipping_phone_1: serviceOrderData.jobs.sales_orders.shipping_phone_1,
        shipping_phone_2: serviceOrderData.jobs.sales_orders.shipping_phone_2,
        shipping_email_1: serviceOrderData.jobs.sales_orders.shipping_email_1,
        shipping_email_2: serviceOrderData.jobs.sales_orders.shipping_email_2,
        shipping_street: serviceOrderData.jobs.sales_orders.shipping_street,
        shipping_city: serviceOrderData.jobs.sales_orders.shipping_city,
        shipping_province: serviceOrderData.jobs.sales_orders.shipping_province,
        shipping_zip: serviceOrderData.jobs.sales_orders.shipping_zip,
      }
    : null;
  const orderDetails = serviceOrderData?.jobs?.sales_orders
    ? {
        order_type: serviceOrderData.jobs.sales_orders.order_type,
        delivery_type: serviceOrderData.jobs.sales_orders.delivery_type,
        install: serviceOrderData.jobs.sales_orders.install,
      }
    : null;

  const switchControls = (
    <Stack gap="md" mt="md">
      <Group align="center" wrap="nowrap">
        <Switch
          styles={{
            track: {
              cursor: "pointer",
            },
          }}
          size="md"
          color="violet"
          label="Warranty Order"
          {...form.getInputProps("is_warranty_so", {
            type: "checkbox",
          })}
        />
      </Group>

      <Group align="center" wrap="nowrap">
        <Switch
          styles={{
            track: {
              cursor: "pointer",
            },
          }}
          label="Mark as Completed"
          size="md"
          color="violet"
          checked={!!form.values.completed_at}
          onChange={(event) => {
            const isChecked = event.currentTarget.checked;
            form.setFieldValue("completed_at", isChecked ? new Date() : null);
          }}
        />

        <Box
          style={{
            transition: "all 0.3s ease",
            maxWidth: form.values.completed_at ? rem(200) : 0,
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {form.values.completed_at &&
            dayjs.utc(form.values.completed_at).year() !== 1999 && (
              <Text size="sm" c="dimmed">
                Completed on:{" "}
                {dayjs.utc(form.values.completed_at).format("YYYY-MM-DD")}
              </Text>
            )}
        </Box>
      </Group>
    </Stack>
  );

  return (
    <Container
      size="100%"
      pl={10}
      w="100%"
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingRight: 0,
        background: "linear-gradient(135deg, #DDE6F5 0%, #E7D9F0 100%)",
      }}
    >
      <form
        onSubmit={form.onSubmit(handleSubmit)}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          justifyContent: "space-between",
        }}
      >
        <Stack gap="md">
          <Paper p="md" radius="md" shadow="sm" bg="gray.1">
            {}
            <Group
              justify="space-between"
              align="center"
              bg="white"
              p="md"
              style={{ borderRadius: "6px" }}
            >
              <Stack>
                <Text
                  fw={600}
                  size="lg"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <FaTools
                    size={20}
                    style={{ marginRight: 8 }}
                    color="#4A00E0"
                  />
                  Service Order: {serviceOrderData?.service_order_number || "—"}
                </Text>
                <Text size="xs" c="dimmed">
                  Entered:{" "}
                  {dayjs
                    .utc(serviceOrderData?.date_entered)
                    .format("YYYY-MM-DD") || "—"}
                </Text>
              </Stack>

              <Group>
                {serviceOrderData && (
                  <>
                    <Button
                      variant="light"
                      color="white"
                      bg="linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%"
                      rightSection={<Text size="xs">PDF</Text>}
                      onClick={openPreview}
                    >
                      <FaEye />
                    </Button>
                  </>
                )}
                <Divider orientation="vertical" />
                <Text fw={600} size="md">
                  Job # {serviceOrderData?.jobs?.job_number || "—"}
                </Text>
              </Group>
            </Group>
            <Divider my="sm" color="violet" />

            <SimpleGrid cols={2}>
              <Stack>
                <ClientInfo shipping={shipping} />
                <OrderDetails orderDetails={orderDetails} />
              </Stack>
              {cabinet && <CabinetSpecs cabinet={cabinet} />}
            </SimpleGrid>
          </Paper>

          <Paper p="md" radius="md" shadow="xl" bg="gray.1">
            <Stack>
              <Fieldset legend="Job & Identifier" variant="filled" bg="white">
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <Select
                    label="Select Job"
                    placeholder="Search by Job Number..."
                    data={jobOptions}
                    searchable
                    withAsterisk
                    searchValue={jobSearch}
                    onSearchChange={setJobSearch}
                    nothingFoundMessage={
                      jobsLoading ? "Searching..." : "No jobs found"
                    }
                    rightSection={jobsLoading ? <Loader size={16} /> : null}
                    {...form.getInputProps("job_id")}
                  />
                  <TextInput
                    label="Service Order Number"
                    placeholder="e.g. SO-40100-1"
                    withAsterisk
                    {...form.getInputProps("service_order_number")}
                  />
                </SimpleGrid>
              </Fieldset>

              <Fieldset legend="Details" variant="filled" bg="white">
                {}
                <Box mt="md">
                  <Group
                    visibleFrom="lg"
                    align="stretch"
                    wrap="nowrap"
                    gap="lg"
                  >
                    <Stack gap="sm" style={{ flex: 1 }}>
                      <Group align="flex-end" gap="xs" wrap="nowrap">
                        <Select
                          label="Assign Service Tech"
                          placeholder={
                            form.values.installer_requested
                              ? "Installer Requested"
                              : "Search Installer..."
                          }
                          data={installerOptions}
                          searchable
                          clearable
                          disabled={form.values.installer_requested}
                          searchValue={installerSearch}
                          onSearchChange={setInstallerSearch}
                          nothingFoundMessage={
                            installersLoading
                              ? "Searching..."
                              : "No installer found"
                          }
                          rightSection={
                            installersLoading ? <Loader size={16} /> : null
                          }
                          style={{ flex: 1 }}
                          {...form.getInputProps("installer_id")}
                        />
                        {}
                        <Tooltip label="Create New Installer">
                          <ActionIcon
                            variant="filled"
                            color="#4A00E0"
                            size="lg"
                            mb={1}
                            onClick={openAddInstaller}
                          >
                            <FaPlus size={12} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip
                          label={
                            form.values.installer_requested
                              ? "Installer Requested"
                              : "Request Installer"
                          }
                        >
                          <ActionIcon
                            variant="filled"
                            color={
                              form.values.installer_requested
                                ? "#00722cff"
                                : "gray"
                            }
                            size="lg"
                            mb={1}
                            onClick={() =>
                              form.setFieldValue(
                                "installer_requested",
                                !form.values.installer_requested,
                              )
                            }
                          >
                            {form.values.installer_requested ? (
                              <FaCheck size={12} />
                            ) : (
                              <FaTools size={12} />
                            )}
                          </ActionIcon>
                        </Tooltip>
                      </Group>

                      <DateInput
                        label="Service Date"
                        placeholder="YYYY-MM-DD"
                        clearable
                        valueFormat="YYYY-MM-DD"
                        {...form.getInputProps("due_date")}
                      />
                    </Stack>

                    <Divider orientation="vertical" />

                    <Box style={{ flex: 1 }}>
                      <HomeOwnersInfo form={form} />
                    </Box>

                    <Divider orientation="vertical" />

                    <Box style={{ flex: 1 }}>
                      <Text fw={500} size="sm" mb="xs" c="dimmed">
                        Order Status & Type
                      </Text>
                      {switchControls}
                    </Box>
                  </Group>

                  {}
                  <Stack hiddenFrom="lg" gap="xl">
                    <Stack gap="sm">
                      <Group align="flex-end" gap="xs" wrap="nowrap">
                        <Select
                          label="Assign Service Tech"
                          data={installerOptions}
                          {...form.getInputProps("installer_id")}
                          searchable
                          searchValue={installerSearch}
                          onSearchChange={setInstallerSearch}
                          style={{ flex: 1 }}
                        />
                      </Group>
                      <SimpleGrid cols={2}>
                        <DateInput
                          label="Service Date"
                          {...form.getInputProps("due_date")}
                        />
                      </SimpleGrid>
                    </Stack>

                    <HomeOwnersInfo form={form} />

                    <Box>
                      <Divider
                        mb="md"
                        label="Status & Type"
                        labelPosition="center"
                      />
                      {switchControls}
                    </Box>
                  </Stack>
                </Box>

                <Box mt="md">
                  <CustomRichTextEditor
                    label="Comments"
                    content={form.values.comments || ""}
                    onChange={(html) => form.setFieldValue("comments", html)}
                  />
                </Box>
              </Fieldset>
            </Stack>
          </Paper>

          <Paper p="md" radius="md" shadow="xl">
            {}
            <Group justify="space-between" mb="md">
              <Text fw={600}>Required Parts</Text>
              <Group>
                <Radio.Group
                  withAsterisk={
                    form.values.parts &&
                    form.values.parts.length > 0 &&
                    form.values.parts.some((p) => !p._deleted)
                  }
                  value={
                    form.values.chargeable === true
                      ? "true"
                      : form.values.chargeable === false
                        ? "false"
                        : ""
                  }
                  onChange={(val) =>
                    form.setFieldValue("chargeable", val === "true")
                  }
                  error={form.errors.chargeable}
                >
                  <Group>
                    <Radio value="true" label="Chargeable" color="#4a00e0" />
                    <Radio
                      value="false"
                      label="Not Chargeable"
                      color="#4a00e0"
                    />
                  </Group>
                </Radio.Group>
                <NumberInput
                  w={rem(250)}
                  size="sm"
                  placeholder="Associated Cost"
                  leftSection="$"
                  {...form.getInputProps("warranty_order_cost")}
                />
              </Group>
              <Group>
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<FaCheckCircle />}
                  onClick={markAllPartsCompleted}
                  color="white"
                  bg={linearGradients.success}
                >
                  Mark All as Completed
                </Button>
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<FaPlus />}
                  onClick={addPart}
                  color="white"
                  bg="linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%"
                >
                  Add Part
                </Button>
              </Group>
            </Group>

            {form.values.parts && form.values.parts.length > 0 ? (
              <Table withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={80}>Qty</Table.Th>
                    <Table.Th w={200}>Part</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th w={200}>Location</Table.Th>
                    <Table.Th w={160}>Due Date</Table.Th>
                    <Table.Th w={200}>Status</Table.Th>
                    <Table.Th w={50} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {form.values.parts.map((part, index) => {
                    const isDeleted = part._deleted;
                    return (
                      <Table.Tr
                        key={index}
                        bg={isDeleted ? "gray.0" : undefined}
                        style={{
                          textDecoration: isDeleted ? "line-through" : "none",
                        }}
                      >
                        {}
                        <Table.Td>
                          <NumberInput
                            min={1}
                            hideControls
                            disabled={isDeleted}
                            {...form.getInputProps(`parts.${index}.qty`)}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            placeholder="Part Name"
                            disabled={isDeleted}
                            {...form.getInputProps(`parts.${index}.part`)}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            placeholder="Details..."
                            disabled={isDeleted}
                            {...form.getInputProps(
                              `parts.${index}.description`,
                            )}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Select
                            placeholder="Location..."
                            disabled={isDeleted}
                            data={serviceorderLocationOptions}
                            {...form.getInputProps(`parts.${index}.location`)}
                            leftSection={getLocationIcon(
                              form.values.parts[index].location,
                            )}
                            renderOption={({ option }) => (
                              <Group gap="sm">
                                {getLocationIcon(option.value)}
                                <Text size="sm">{option.label}</Text>
                              </Group>
                            )}
                            comboboxProps={{
                              position: "top",
                              middlewares: { flip: false, shift: false },
                            }}
                            allowDeselect={false}
                          />
                        </Table.Td>
                        <Table.Td>
                          <DatePickerInput
                            presets={
                              form.values.due_date
                                ? [
                                    {
                                      label: "Service minus 2",
                                      value: dayjs(form.values.due_date)
                                        .subtract(2, "day")
                                        .format("YYYY-MM-DD"),
                                    },
                                  ]
                                : undefined
                            }
                            placeholder="Due Date"
                            valueFormat="YYYY-MM-DD"
                            clearable
                            disabled={isDeleted}
                            {...form.getInputProps(
                              `parts.${index}.part_due_date`,
                            )}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Select
                            placeholder="Status..."
                            disabled={isDeleted}
                            data={serviceorderStatusOptions}
                            {...form.getInputProps(`parts.${index}.status`)}
                            comboboxProps={{
                              position: "top",
                              middlewares: { flip: false, shift: false },
                            }}
                            rightSection={
                              form.values.parts[index].status ===
                              "completed" ? (
                                <FaCheckCircle size={12} color="green" />
                              ) : (
                                <IoIosWarning size={14} color="orange" />
                              )
                            }
                            allowDeselect={false}
                          />
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon
                            color={isDeleted ? "gray" : "red"}
                            variant="subtle"
                            onClick={() => handlePartDelete(index)}
                          >
                            {isDeleted ? (
                              <FaUndo size={14} />
                            ) : (
                              <FaTrash size={14} />
                            )}
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            ) : (
              <Center p="lg" bg="gray.0" style={{ borderRadius: 8 }}>
                <Text c="dimmed" size="sm">
                  No parts added. Click "Add Part" to list required items.
                </Text>
              </Center>
            )}
          </Paper>

          <Box h={80} />
        </Stack>

        <Paper
          withBorder
          p="md"
          radius="md"
          pos="sticky"
          bottom={0}
          style={{ zIndex: 10 }}
        >
          <Group justify="flex-end">
            <Button
              size="md"
              variant="outline"
              style={{
                background: "linear-gradient(135deg, #FF6B6B 0%, #FF3B3B 100%)",
                color: "white",
                border: "none",
              }}
              onClick={() => window.close()}
            >
              Back
            </Button>
            <Button
              type="submit"
              size="md"
              loading={submitMutation.isPending}
              disabled={submitMutation.isPending || !form.isDirty()}
              leftSection={<FaSave />}
              style={{
                background:
                  !submitMutation.isPending && !form.isDirty()
                    ? undefined
                    : "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)",
                color: "white",
                border: "none",
              }}
            >
              Save Changes
            </Button>
          </Group>
        </Paper>
      </form>

      <Modal
        opened={previewOpened}
        onClose={closePreview}
        title="Service Order Preview"
        fullScreen
        styles={{
          body: { height: "80vh" },
        }}
      >
        <PdfPreview data={serviceOrderData} />
      </Modal>

      <AddInstaller
        opened={addInstallerOpened}
        onClose={() => {
          closeAddInstaller();
          queryClient.invalidateQueries({ queryKey: ["installers-list"] });
          queryClient.invalidateQueries({ queryKey: ["installer-search"] });
        }}
      />
    </Container>
  );
}
