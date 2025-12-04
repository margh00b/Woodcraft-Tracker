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
  Modal,
  Collapse,
  rem,
  Tooltip,
} from "@mantine/core";
import dayjs from "dayjs";
import { DateInput } from "@mantine/dates";
import { FaPlus, FaTrash, FaTools, FaSave, FaEye } from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import {
  ServiceOrderFormValues,
  ServiceOrderSchema,
} from "@/zod/serviceorder.schema";
import { useJobs } from "@/hooks/useJobs";
import CustomRichTextEditor from "@/components/RichTextEditor/RichTextEditor";
import PdfPreview from "../PdfPreview/PdfPreview";
import CabinetSpecs from "@/components/Shared/CabinetSpecs/CabinetSpecs";
import ClientInfo from "@/components/Shared/ClientInfo/ClientInfo";
import { Tables } from "@/types/db";
import AddInstaller from "@/components/Installers/AddInstaller/AddInstaller";

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
      })
    | null;
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

  const { data: jobOptions, isLoading: jobsLoading } = useJobs(isAuthenticated);

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
            sales_orders:sales_orders (
              designer,
              shipping_street,
              shipping_city,
              shipping_province,
              shipping_zip,
              shipping_client_name,
              shipping_phone_1,
              shipping_phone_2,
              shipping_email_1,
              shipping_email_2,
              cabinet:cabinets (
                box,
                glass,
                glaze,
                finish,
                interior,
                drawer_box,
                drawer_hardware,
                glass_type,
                piece_count,
                doors_parts_only,
                handles_selected,
                handles_supplied,
                hinge_soft_close,
                top_drawer_front,
                door_styles(name),
                species(Species),
                colors(Name)
              )
            )
          )
        `
          )
          .eq("service_order_id", serviceOrderId)
          .single();

        if (error) throw error;
        return data as unknown as ServiceOrderData;
      },
      enabled: isAuthenticated,
    });

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
      warranty_order_cost: undefined,
      comments: "",
      parts: [],
    },
    validate: zodResolver(ServiceOrderSchema),
  });

  useEffect(() => {
    if (serviceOrderData) {
      form.setValues({
        job_id: String(serviceOrderData.job_id),
        service_order_number: serviceOrderData.service_order_number,
        due_date: serviceOrderData.due_date
          ? dayjs(serviceOrderData.due_date).toDate()
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
        is_warranty_so: serviceOrderData.is_warranty_so || false,
        warranty_order_cost: serviceOrderData.warranty_order_cost || undefined,
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
          chargeable: values.chargeable,
          is_warranty_so: values.is_warranty_so,
          warranty_order_cost: values.warranty_order_cost,
          comments: values.comments,
          completed_at: values.completed_at,
        })
        .eq("service_order_id", serviceOrderId);

      if (soError) throw new Error(`Update Order Error: ${soError.message}`);

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
  const cabinet = serviceOrderData?.jobs?.sales_orders?.cabinet;
  const shipping = serviceOrderData?.jobs?.sales_orders;

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
          <Paper p="md" radius="md" shadow="sm" bg="gray.1">
            <Group
              justify="space-between"
              align="center"
              bg="white"
              p="md"
              style={{ borderRadius: "6px" }}
            >
              <Text
                fw={600}
                size="lg"
                style={{ display: "flex", alignItems: "center" }}
              >
                <FaTools size={20} style={{ marginRight: 8 }} color="#4A00E0" />
                Service Order: {serviceOrderData?.service_order_number || "—"}
              </Text>

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
              {shipping && <ClientInfo shipping={shipping} />}
              {cabinet && <CabinetSpecs cabinet={cabinet} />}
            </SimpleGrid>
          </Paper>

          {/* MAIN FORM */}
          <Paper p="md" radius="md" shadow="xl" bg="gray.1">
            <Stack>
              <Fieldset legend="Job & Identifier" variant="filled" bg="white">
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

              <Fieldset legend="Logistics" variant="filled" bg="white">
                <SimpleGrid cols={{ base: 1, sm: 3 }}>
                  <Group align="flex-end" gap="xs" style={{ width: "100%" }}>
                    <Select
                      label="Assign Installer"
                      placeholder="Select Installer"
                      data={installerOptions}
                      searchable
                      clearable
                      style={{ flex: 1 }}
                      {...form.getInputProps("installer_id")}
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

                <Box mt="md">
                  <CustomRichTextEditor
                    label="Comments"
                    content={form.values.comments || ""}
                    onChange={(html) => form.setFieldValue("comments", html)}
                  />
                </Box>

                <SimpleGrid cols={2} p="md" mih={rem(100)}>
                  <Group>
                    <Switch
                      size="md"
                      color="violet"
                      label="Chargeable"
                      {...form.getInputProps("chargeable", {
                        type: "checkbox",
                      })}
                    />

                    <Switch
                      size="md"
                      color="violet"
                      label="Warranty Order"
                      {...form.getInputProps("is_warranty_so", {
                        type: "checkbox",
                      })}
                    />
                    <Collapse in={form.values.is_warranty_so} keepMounted>
                      <NumberInput
                        w={rem(200)}
                        label="Warranty Cost"
                        placeholder="e.g. 99.99"
                        leftSection="$"
                        {...form.getInputProps("warranty_order_cost")}
                      />
                    </Collapse>
                  </Group>
                  <Group justify="end">
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
                    <Collapse in={!!form.values.completed_at} keepMounted>
                      <Text size="sm" c="dimmed" w={rem(250)}>
                        Completed on:
                        {dayjs(form.values.completed_at).format(
                          "YYYY-MM-DD HH:mm"
                        )}
                      </Text>
                    </Collapse>
                  </Group>
                </SimpleGrid>
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
                color="white"
                bg="linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%"
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
        }}
      />
    </Container>
  );
}
