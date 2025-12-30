"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useForm } from "@mantine/form";
import { zodResolver } from "@/utils/zodResolver/zodResolver";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Tooltip,
  Collapse,
  Divider,
  Switch,
  rem,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { FaPlus, FaTrash, FaTools, FaSave, FaCheck } from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import {
  ServiceOrderFormValues,
  ServiceOrderSchema,
} from "@/zod/serviceorder.schema";

import { useJobSearch } from "@/hooks/useJobSearch";
import { useInstallerSearch } from "@/hooks/useInstallerSearch";
import CustomRichTextEditor from "@/components/RichTextEditor/RichTextEditor";
import AddInstaller from "@/components/Installers/AddInstaller/AddInstaller";
import ClientInfo from "@/components/Shared/ClientInfo/ClientInfo";
import CabinetSpecs from "@/components/Shared/CabinetSpecs/CabinetSpecs";
import OrderDetails from "@/components/Shared/OrderDetails/OrderDetails";
import { useNavigationGuard } from "@/providers/NavigationGuardProvider";
import HomeOwnersInfo from "../HomeOwnersInfo/HomeOwnersInfo";

interface NewServiceOrderProps {
  preselectedJobId?: string;
}

export default function NewServiceOrder({
  preselectedJobId,
}: NewServiceOrderProps) {
  const { supabase, isAuthenticated } = useSupabase();
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [
    isAddInstallerOpen,
    { open: openAddInstaller, close: closeAddInstaller },
  ] = useDisclosure(false);

  const form = useForm<ServiceOrderFormValues>({
    initialValues: {
      job_id: preselectedJobId || "",
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
      comments: `
<p><strong>Service Scheduled:</strong></p>
<ul>
  <li>Inspect inside each cabs and drws - inside &amp; out</li>
  <li>Adjustments - alignment &amp; slides/hinges functioning</li>
  <li>Touch ups - inside &amp; outside of ALL cabs/drws</li>
  <li>Install Toe kicks - cut &amp; on site</li>
  <li>Fill nail/pin holes - kicks, soffit/riser, etc…</li>
  <li>Dapping - Bumpers - Screw caps – hinge stops – nail fills (kick/riser/drwboxes)</li>
  <li>Secure panels if require – check L brackets on island</li>
</ul>
<p></p>
<p><em>*Not inspected when final typed</em></p>
`,
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

  const { setIsDirty } = useNavigationGuard();
  const isDirty = form.isDirty();
  useEffect(() => {
    setIsDirty(isDirty);
    return () => setIsDirty(false);
  }, [isDirty, setIsDirty]);

  const [existingSOCount, setExistingSOCount] = useState<number | null>(null);
  const [jobData, setJobData] = useState<any>(null);

  useEffect(() => {
    const fetchHomeownerInfo = async () => {
      if (!form.values.job_id) return;

      const { data } = await supabase
        .from("homeowners_info")
        .select("*")
        .eq("job_id", Number(form.values.job_id))
        .single();

      if (data) {
        form.setFieldValue("homeowner_name", data.homeowner_name || "");
        form.setFieldValue("homeowner_phone", data.homeowner_phone || "");
        form.setFieldValue("homeowner_email", data.homeowner_email || "");
        form.setFieldValue("homeowner_details", data.homeowner_details || "");
      }
    };

    fetchHomeownerInfo();
  }, [form.values.job_id, supabase]);

  useEffect(() => {
    const fetchSoNumber = async () => {
      const jobId = form.values.job_id;
      if (!jobId) {
        setExistingSOCount(null);
        form.setFieldValue("service_order_number", "");
        return;
      }

      try {
        const { data: jobData, error: jobError } = await supabase
          .from("jobs")
          .select("job_number")
          .eq("id", jobId)
          .single();

        if (jobError) throw jobError;
        if (!jobData) return;

        const { count, error: countError } = await supabase
          .from("service_orders")
          .select("*", { count: "exact", head: true })
          .eq("job_id", jobId);

        if (countError) throw countError;

        setExistingSOCount(count || 0);

        const nextSuffix = (count || 0) + 1;
        const nextSoNumber = `${jobData.job_number}-S${nextSuffix}`;

        form.setFieldValue("service_order_number", nextSoNumber);
      } catch (error) {
        console.error("Error auto-generating SO number:", error);
      }
    };
    const fetchJobDetails = async () => {
      const jobId = form.values.job_id;
      if (!jobId) return;

      try {
        const { data: jobData, error: jobError } = await supabase
          .from("jobs")
          .select(
            `sales_orders (
              shipping_street,
              shipping_city,
              shipping_province,
              shipping_zip,
              shipping_client_name,
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
          `
          )
          .eq("id", jobId)
          .single();

        if (jobError) throw jobError;
        if (!jobData) return;
        setJobData(jobData);
      } catch (error) {
        console.error("Error fetching job details:", error);
      }
    };
    fetchJobDetails();
    fetchSoNumber();
  }, [form.values.job_id]);

  const cabinet = jobData?.sales_orders?.cabinet;
  const shipping = jobData?.sales_orders
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

  const submitMutation = useMutation({
    mutationFn: async (values: ServiceOrderFormValues) => {
      if (!user) throw new Error("User not authenticated");

      const { data: soData, error: soError } = await supabase
        .from("service_orders")
        .insert({
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
          installer_requested: values.installer_requested,
          warranty_order_cost: values.warranty_order_cost,
          comments: values.comments,
          created_by: user.username || "Staff",
        })
        .select("service_order_id")
        .single();

      if (soError) throw new Error(`Create Order Error: ${soError.message}`);
      const newId = soData.service_order_id;

      if (values.parts && values.parts.length > 0) {
        const partsPayload = values.parts.map((p) => ({
          service_order_id: newId,
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
            { onConflict: "job_id" }
          );

        if (hoError) throw hoError;
      }

      return newId;
    },
    onSuccess: (newId) => {
      notifications.show({
        title: "Success",
        message: "Service Order created successfully.",
        color: "green",
      });
      queryClient.invalidateQueries({
        queryKey: ["service_orders_table_view"],
      });
      router.push(`/dashboard/serviceorders/${newId}`);
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

  if (jobsLoading || installersLoading) {
    return (
      <Center h="100vh">
        <Loader />
        <Text ml="md">Loading Resources...</Text>
      </Center>
    );
  }

  const switchControls = (
    <Stack gap="md" mt="md">
      <Switch
        size="md"
        color="violet"
        label="Chargeable"
        {...form.getInputProps("chargeable", { type: "checkbox" })}
      />
      <Group align="center" wrap="nowrap">
        <Switch
          size="md"
          color="violet"
          label="Warranty Order"
          {...form.getInputProps("is_warranty_so", {
            type: "checkbox",
          })}
        />
      </Group>
      <NumberInput
        w={rem(250)}
        size="sm"
        placeholder="Associated Cost"
        leftSection="$"
        {...form.getInputProps("warranty_order_cost")}
      />
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
          <Paper p="md" radius="md" shadow="xs" style={{ background: "#fff" }}>
            <Group>
              <FaTools size={24} color="#4A00E0" />
              <Text fw={700} size="xl" c="#4A00E0">
                New Service Order
              </Text>
            </Group>
          </Paper>

          <Collapse in={!!shipping || !!cabinet} transitionDuration={200}>
            <Paper
              p="md"
              radius="md"
              shadow="xs"
              style={{ background: "#fff" }}
            >
              <SimpleGrid cols={2}>
                <Stack>
                  <ClientInfo shipping={shipping} />
                  <OrderDetails orderDetails={orderDetails} />
                </Stack>

                {cabinet && <CabinetSpecs cabinet={cabinet} />}
              </SimpleGrid>
            </Paper>
          </Collapse>

          <Paper p="md" radius="md" shadow="xl" bg="gray.1">
            <Stack>
              <Fieldset legend="Job & Identifier" variant="filled" bg="white">
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <Select
                    label="Select Job"
                    placeholder="Type to search..."
                    data={jobOptions}
                    searchable
                    clearable
                    withAsterisk
                    searchValue={jobSearch}
                    onSearchChange={setJobSearch}
                    nothingFoundMessage={
                      jobsLoading ? "Searching..." : "No jobs found"
                    }
                    rightSection={jobsLoading ? <Loader size={16} /> : null}
                    {...form.getInputProps("job_id")}
                    onClear={() => setJobData(null)}
                  />

                  <TextInput
                    label={
                      <Group gap="xs">
                        <Text size="sm">Service Order Number</Text>
                        {existingSOCount ? (
                          <Text span size="xs" c="dimmed" fw={400}>
                            {existingSOCount > 1
                              ? `Job has ${existingSOCount} existing Service Orders`
                              : `Job has ${existingSOCount} existing Service Order`}
                          </Text>
                        ) : null}
                      </Group>
                    }
                    placeholder="e.g. 40100-S1"
                    {...form.getInputProps("service_order_number")}
                  />
                </SimpleGrid>
              </Fieldset>

              <Fieldset legend="Details" variant="filled" bg="white">
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
                                !form.values.installer_requested
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
                        label="Due Date"
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
                          label="Due Date"
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
                    <Table.Th w={200}>Part Name</Table.Th>
                    <Table.Th>Description</Table.Th>
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
              Create Service Order
            </Button>
          </Group>
        </Paper>
      </form>

      <AddInstaller
        opened={isAddInstallerOpen}
        onClose={() => {
          closeAddInstaller();
          queryClient.invalidateQueries({ queryKey: ["installers-list"] });
          queryClient.invalidateQueries({ queryKey: ["installer-search"] });
        }}
      />
    </Container>
  );
}
