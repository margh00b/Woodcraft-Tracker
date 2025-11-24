"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useForm } from "@mantine/form";
import { zodResolver } from "@/utils/zodResolver/zodResolver";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
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
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { FaPlus, FaTrash, FaTools, FaSave } from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import {
  ServiceOrderFormValues,
  ServiceOrderSchema,
} from "@/zod/serviceorder.schema";
import { useJobs } from "@/hooks/useJobs";
import CustomRichTextEditor from "@/components/RichTextEditor/RichTextEditor";

export default function NewServiceOrder() {
  const { supabase, isAuthenticated } = useSupabase();
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  // 1. Fetch Jobs (Reusable Hook)
  const { data: jobOptions, isLoading: jobsLoading } = useJobs(isAuthenticated);

  // 2. Fetch Installers (Local Query)
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

  // 3. Form Setup
  const form = useForm<ServiceOrderFormValues>({
    initialValues: {
      job_id: "",
      service_order_number: "", // Could be auto-generated logic here if preferred
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

  const [existingSOCount, setExistingSOCount] = useState<number | null>(null);

  // Auto-populate Service Order Number when Job ID changes
  useEffect(() => {
    const fetchSoNumber = async () => {
      const jobId = form.values.job_id;
      if (!jobId) {
        setExistingSOCount(null);
        return;
      }

      try {
        // 1. Get Job Number
        const { data: jobData, error: jobError } = await supabase
          .from("jobs")
          .select("job_number")
          .eq("id", jobId)
          .single();

        if (jobError) throw jobError;
        if (!jobData) return;

        // 2. Get Count of existing Service Orders for this job
        const { count, error: countError } = await supabase
          .from("service_orders")
          .select("*", { count: "exact", head: true })
          .eq("job_id", jobId);

        if (countError) throw countError;

        setExistingSOCount(count || 0);

        // 3. Generate Next Suffix
        const nextSuffix = (count || 0) + 1;
        const nextSoNumber = `${jobData.job_number}-S${nextSuffix}`;

        // 4. Set Value
        form.setFieldValue("service_order_number", nextSoNumber);
      } catch (error) {
        console.error("Error auto-generating SO number:", error);
      }
    };

    fetchSoNumber();
  }, [form.values.job_id]);

  // ... (rest of the code)

  // 4. Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async (values: ServiceOrderFormValues) => {
      if (!user) throw new Error("User not authenticated");

      // A. Insert Service Order
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
          comments: values.comments,
        })
        .select("service_order_id")
        .single();

      if (soError) throw new Error(`Create Order Error: ${soError.message}`);
      const newId = soData.service_order_id;

      // B. Insert Parts (if any)
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

      return newId;
    },
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Service Order created successfully.",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["service_orders_list"] });
      router.push("/dashboard/serviceorders"); // Assuming you will create this list page later
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

  // Helper to add a part row
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
          <Paper p="md" radius="md" shadow="xs" style={{ background: "#fff" }}>
            <Group>
              <FaTools size={24} color="#4A00E0" />
              <Text fw={700} size="xl" c="#4A00E0">
                New Service Order
              </Text>
            </Group>
          </Paper>

          {/* MAIN DETAILS */}
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
                    placeholder="e.g. SO-40100-1"
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
                    <Table.Th>Part Name</Table.Th>
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

          {/* Padding for sticky footer */}
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
              Create Service Order
            </Button>
          </Group>
        </Paper>
      </form>
    </Container>
  );
}
