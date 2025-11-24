"use client";

import { useEffect, useMemo } from "react";
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
  Grid,
  Modal,
} from "@mantine/core";
import dayjs from "dayjs";
import { DateInput } from "@mantine/dates";
import {
  FaPlus,
  FaTrash,
  FaTools,
  FaSave,
  FaUser,
  FaCheck,
  FaEye,
} from "react-icons/fa";
import { MdOutlineDoorSliding } from "react-icons/md";
import { useSupabase } from "@/hooks/useSupabase";
import {
  ServiceOrderFormValues,
  ServiceOrderSchema,
} from "@/zod/serviceorder.schema";
import { useJobs } from "@/hooks/useJobs";
import CustomRichTextEditor from "@/components/RichTextEditor/RichTextEditor";
import PdfPreview from "../PdfPreview/PdfPreview";

interface EditServiceOrderProps {
  serviceOrderId: string;
}

export default function EditServiceOrder({
  serviceOrderId,
}: EditServiceOrderProps) {
  const { supabase, isAuthenticated } = useSupabase();
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Modal State for Preview
  const [previewOpened, { open: openPreview, close: closePreview }] =
    useDisclosure(false);

  // 1. Fetch Jobs
  const { data: jobOptions, isLoading: jobsLoading } = useJobs(isAuthenticated);

  // 2. Fetch Installers
  const { data: installersData, isLoading: installersLoading } = useQuery({
    queryKey: ["installers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installers")
        .select("installer_id, company_name, first_name, last_name")
        .eq("is_active", true)
        .order("company_name");
      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated,
  });

  const installerOptions = useMemo(() => {
    return (installersData || []).map((i) => ({
      value: String(i.installer_id),
      label: i.company_name || `${i.first_name} ${i.last_name}`,
    }));
  }, [installersData]);

  // 3. Fetch Service Order Details
  const { data: serviceOrderData, isLoading: soLoading } = useQuery({
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
            sales_orders:sales_orders (
              designer,
              shipping_street,
              shipping_city,
              shipping_province,
              shipping_zip,
              client:client_id (
                firstName,
                lastName,
                phone1,
                phone2,
                email1,
                email2
              ),
              cabinet:cabinets (
                box,
                color,
                glass,
                glaze,
                finish,
                species,
                interior,
                door_style,
                drawer_box,
                drawer_hardware,
                glass_type,
                piece_count,
                doors_parts_only,
                handles_selected,
                handles_supplied,
                hinge_soft_close,
                top_drawer_front
              )
            )
          )
        `
        )
        .eq("service_order_id", serviceOrderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated,
  });

  // 4. Form Setup
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
      comments: "",
      parts: [],
    },
    validate: zodResolver(ServiceOrderSchema),
  });

  // Populate form
  useEffect(() => {
    if (serviceOrderData) {
      form.setValues({
        job_id: String(serviceOrderData.job_id),
        service_order_number: serviceOrderData.service_order_number,
        due_date: serviceOrderData.due_date
          ? new Date(serviceOrderData.due_date)
          : null,
        installer_id: serviceOrderData.installer_id
          ? String(serviceOrderData.installer_id)
          : null,
        service_type: serviceOrderData.service_type || "",
        service_type_detail: serviceOrderData.service_type_detail || "",
        service_by: serviceOrderData.service_by || "",
        service_by_detail: serviceOrderData.service_by_detail || "",
        hours_estimated: serviceOrderData.hours_estimated || 0,
        chargeable: serviceOrderData.chargeable || false,
        comments: serviceOrderData.comments || "",
        completed_at: serviceOrderData.completed_at
          ? new Date(serviceOrderData.completed_at)
          : null,
        parts: serviceOrderData.service_order_parts.map((p: any) => ({
          qty: p.qty,
          part: p.part,
          description: p.description || "",
        })),
      });
    }
  }, [serviceOrderData]);

  // 5. Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async (values: ServiceOrderFormValues) => {
      if (!user) throw new Error("User not authenticated");

      // Update SO
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
          chargeable: values.chargeable,
          comments: values.comments,
          completed_at: values.completed_at,
        })
        .eq("service_order_id", serviceOrderId);

      if (soError) throw new Error(`Update Order Error: ${soError.message}`);

      // Update Parts
      const { error: deleteError } = await supabase
        .from("service_order_parts")
        .delete()
        .eq("service_order_id", serviceOrderId);

      if (deleteError)
        throw new Error(`Delete Parts Error: ${deleteError.message}`);

      if (values.parts && values.parts.length > 0) {
        const partsPayload = values.parts.map((p) => ({
          service_order_id: Number(serviceOrderId),
          qty: p.qty,
          part: p.part,
          description: p.description || "",
        }));

        const { error: partsError } = await supabase
          .from("service_order_parts")
          .insert(partsPayload);

        if (partsError)
          throw new Error(`Create Parts Error: ${partsError.message}`);
      }
    },
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Service Order updated successfully.",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["service_orders_list"] });
      queryClient.invalidateQueries({
        queryKey: ["service_order", serviceOrderId],
      });
      router.push("/dashboard/serviceorders");
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
    submitMutation.mutate(values);
  };

  const addPart = () => {
    form.insertListItem("parts", { qty: 1, part: "", description: "" });
  };

  if (jobsLoading || installersLoading || soLoading) {
    return (
      <Center h="100vh">
        <Loader />
        <Text ml="md">Loading Service Order...</Text>
      </Center>
    );
  }

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
          {/* HEADER */}
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
                <FaTools size={20} style={{ marginRight: 8 }} color="#4A00E0" />
                Service Order: {serviceOrderData?.service_order_number || "—"}
              </Text>

              {/* ACTION BUTTONS: PREVIEW & DOWNLOAD */}
              <Group>
                {serviceOrderData && (
                  <>
                    <Button
                      variant="light"
                      color="blue"
                      rightSection={"PDF"}
                      onClick={openPreview}
                    >
                      <FaEye />
                    </Button>
                  </>
                )}
                <Divider orientation="vertical" />
                <Text fw={500} size="md" c="dimmed">
                  Job # {serviceOrderData?.jobs?.job_number || "—"}
                </Text>
              </Group>
            </Group>
            <Divider my="sm" color="violet" />

            {/* --- EXISTING DETAILS (Clients, Specs, Form) --- */}
            {/* ... (Client Info and Cabinet Specs Sections - SAME AS BEFORE) ... */}
            <SimpleGrid cols={2}>
              {/* CLIENT INFO */}
              <Paper
                p="md"
                radius="md"
                shadow="xs"
                style={{ background: "#ffffffff" }}
              >
                <Text
                  fw={600}
                  size="lg"
                  mb="md"
                  c="#4A00E0"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <FaUser style={{ marginRight: 8 }} /> Client Details
                </Text>
                <Stack gap={3}>
                  <Text size="sm">
                    <strong>Client:</strong>{" "}
                    {serviceOrderData?.jobs?.sales_orders?.client?.lastName ||
                      "—"}
                  </Text>
                  <Text size="sm">
                    <strong>Phone 1:</strong>{" "}
                    {serviceOrderData?.jobs?.sales_orders?.client?.phone1 ||
                      "—"}
                  </Text>
                  <Text size="sm">
                    <strong>Phone 2:</strong>{" "}
                    {serviceOrderData?.jobs?.sales_orders?.client?.phone2 ||
                      "—"}
                  </Text>
                  <Text size="sm">
                    <strong>Email 1:</strong>{" "}
                    {serviceOrderData?.jobs?.sales_orders?.client?.email1 ||
                      "—"}
                  </Text>
                  <Text size="sm">
                    <strong>Email 2:</strong>{" "}
                    {serviceOrderData?.jobs?.sales_orders?.client?.email2 ||
                      "—"}
                  </Text>
                </Stack>
              </Paper>

              {/* CABINET SPECS */}
              <Paper
                p="md"
                radius="md"
                shadow="xs"
                style={{ background: "#ffffffff" }}
              >
                <Text
                  fw={600}
                  size="lg"
                  mb="md"
                  c="#4A00E0"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <MdOutlineDoorSliding style={{ marginRight: 8 }} /> Cabinet
                  Specs
                </Text>

                <Grid>
                  <Grid.Col span={6}>
                    <Text size="sm">
                      <strong>Box:</strong>{" "}
                      {serviceOrderData?.jobs?.sales_orders?.cabinet?.box ||
                        "—"}
                    </Text>
                    <Text size="sm">
                      <strong>Color:</strong>{" "}
                      {serviceOrderData?.jobs?.sales_orders?.cabinet?.color ||
                        "—"}
                    </Text>
                    <Text size="sm">
                      <strong>Finish:</strong>{" "}
                      {serviceOrderData?.jobs?.sales_orders?.cabinet?.finish ||
                        "—"}
                    </Text>
                    <Text size="sm">
                      <strong>Species:</strong>{" "}
                      {serviceOrderData?.jobs?.sales_orders?.cabinet?.species ||
                        "—"}
                    </Text>
                    <Text size="sm">
                      <strong>Interior:</strong>{" "}
                      {serviceOrderData?.jobs?.sales_orders?.cabinet
                        ?.interior || "—"}
                    </Text>
                    <Text size="sm">
                      <strong>Piece Count:</strong>{" "}
                      {serviceOrderData?.jobs?.sales_orders?.cabinet
                        ?.piece_count || "—"}
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text
                      size="sm"
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      <strong>Glass:</strong>{" "}
                      {serviceOrderData?.jobs?.sales_orders?.cabinet?.glass && (
                        <FaCheck
                          color="#8e2de2"
                          size={12}
                          style={{ marginLeft: 10 }}
                        />
                      )}
                    </Text>
                    <Text
                      size="sm"
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      <strong>Doors Parts Only:</strong>{" "}
                      {serviceOrderData?.jobs?.sales_orders?.cabinet
                        ?.doors_parts_only && (
                        <FaCheck
                          color="#8e2de2"
                          size={12}
                          style={{ marginLeft: 10 }}
                        />
                      )}
                    </Text>
                    <Text
                      size="sm"
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      <strong>Handles Selected:</strong>{" "}
                      {serviceOrderData?.jobs?.sales_orders?.cabinet
                        ?.handles_selected && (
                        <FaCheck
                          color="#8e2de2"
                          size={12}
                          style={{ marginLeft: 10 }}
                        />
                      )}
                    </Text>
                    <Text
                      size="sm"
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      <strong>Handles Supplied:</strong>{" "}
                      {serviceOrderData?.jobs?.sales_orders?.cabinet
                        ?.handles_supplied && (
                        <FaCheck
                          color="#8e2de2"
                          size={12}
                          style={{ marginLeft: 10 }}
                        />
                      )}
                    </Text>
                    <Text
                      size="sm"
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      <strong>Hinge Soft Close:</strong>{" "}
                      {serviceOrderData?.jobs?.sales_orders?.cabinet
                        ?.hinge_soft_close && (
                        <FaCheck
                          color="#8e2de2"
                          size={12}
                          style={{ marginLeft: 10 }}
                        />
                      )}
                    </Text>
                  </Grid.Col>
                </Grid>
              </Paper>
            </SimpleGrid>
          </Paper>

          {/* MAIN FORM */}
          <Paper p="md" radius="md" shadow="xl">
            <Stack>
              <Fieldset legend="Job & Identifier" variant="filled" bg="gray.1">
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <Select
                    label="Select Job"
                    placeholder="Search by Job Number"
                    data={jobOptions || []}
                    searchable
                    withAsterisk
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

              <Fieldset legend="Logistics" variant="filled" bg="gray.1">
                <SimpleGrid cols={{ base: 1, sm: 3 }}>
                  <Select
                    label="Assign Installer"
                    placeholder="Select Installer"
                    data={installerOptions}
                    searchable
                    clearable
                    {...form.getInputProps("installer_id")}
                  />
                  <DateInput
                    label="Due Date"
                    placeholder="YYYY-MM-DD"
                    clearable
                    valueFormat="YYYY-MM-DD"
                    {...form.getInputProps("due_date")}
                  />
                  <NumberInput
                    label="Estimated Hours"
                    min={0}
                    {...form.getInputProps("hours_estimated")}
                  />
                </SimpleGrid>
                <SimpleGrid cols={2} mt="md">
                  <Stack gap={5}>
                    <TextInput
                      label="Service Type"
                      placeholder="e.g. Warranty, Deficiency"
                      {...form.getInputProps("service_type")}
                    />
                    <TextInput
                      placeholder="Detail..."
                      {...form.getInputProps("service_type_detail")}
                    />
                  </Stack>
                  <Stack gap={5}>
                    <TextInput
                      label="Service By"
                      placeholder="e.g. Internal, Contractor"
                      {...form.getInputProps("service_by")}
                    />
                    <TextInput
                      placeholder="Detail..."
                      {...form.getInputProps("service_by_detail")}
                    />
                  </Stack>
                </SimpleGrid>

                <Group mt="md">
                  <Switch
                    color="violet"
                    label="Chargeable"
                    {...form.getInputProps("chargeable", { type: "checkbox" })}
                  />
                </Group>

                <Box mt="md">
                  <CustomRichTextEditor
                    label="Comments"
                    content={form.values.comments || ""}
                    onChange={(html) => form.setFieldValue("comments", html)}
                  />
                </Box>

                <Group mt="md">
                  <Switch
                    label="Mark as Completed"
                    size="md"
                    color="violet"
                    checked={!!form.values.completed_at}
                    onChange={(event) => {
                      const isChecked = event.currentTarget.checked;
                      form.setFieldValue(
                        "completed_at",
                        isChecked ? new Date() : null
                      );
                    }}
                  />
                  {form.values.completed_at && (
                    <Text size="sm" c="dimmed">
                      Completed on:{" "}
                      {dayjs(form.values.completed_at).format(
                        "YYYY-MM-DD HH:mm"
                      )}
                    </Text>
                  )}
                </Group>
              </Fieldset>
            </Stack>
          </Paper>

          {/* PARTS TABLE */}
          <Paper p="md" radius="md" shadow="xl">
            <Group justify="space-between" mb="md">
              <Text fw={600}>Required Parts</Text>
              <Button
                variant="light"
                size="xs"
                leftSection={<FaPlus />}
                onClick={addPart}
                color="blue"
              >
                Add Part
              </Button>
            </Group>

            {form.values.parts && form.values.parts.length > 0 ? (
              <Table withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={80}>Qty</Table.Th>
                    <Table.Th>Part</Table.Th>
                    <Table.Th w={400}>Description</Table.Th>
                    <Table.Th w={50} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {form.values.parts.map((_, index) => (
                    <Table.Tr key={index}>
                      <Table.Td>
                        <NumberInput
                          min={1}
                          hideControls
                          {...form.getInputProps(`parts.${index}.qty`)}
                        />
                      </Table.Td>
                      <Table.Td>
                        <TextInput
                          placeholder="Part Name"
                          {...form.getInputProps(`parts.${index}.part`)}
                        />
                      </Table.Td>
                      <Table.Td>
                        <TextInput
                          placeholder="Details..."
                          {...form.getInputProps(`parts.${index}.description`)}
                        />
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => form.removeListItem("parts", index)}
                        >
                          <FaTrash size={14} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
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

        {/* STICKY FOOTER */}
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
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="md"
              loading={submitMutation.isPending}
              leftSection={<FaSave />}
              style={{
                background: "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)",
                color: "white",
                border: "none",
              }}
            >
              Save Changes
            </Button>
          </Group>
        </Paper>
      </form>

      {/* --- PREVIEW MODAL --- */}
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
    </Container>
  );
}
