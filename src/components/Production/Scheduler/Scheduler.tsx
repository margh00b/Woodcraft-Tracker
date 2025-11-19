"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@mantine/form";
import { zodResolver } from "@/utils/zodResolver/zodResolver";
import { useSupabase } from "@/hooks/useSupabase";
import {
  Container,
  Paper,
  Stack,
  Group,
  Text,
  TextInput,
  Switch,
  Button,
  SimpleGrid,
  Loader,
  Center,
  Badge,
  Divider,
  Accordion,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";

// ---------- Types ----------
type CabinetType = {
  id: number;
  species: string;
  color: string;
  finish: string;
  glaze: string;
  door_style: string;
  top_drawer_front: string;
  interior: string;
  drawer_box: string | null;
  drawer_hardware: string;
  box: string;
  hinge_soft_close: boolean;
  doors_parts_only: boolean;
  hardware_only?: boolean;
  handles_selected?: boolean;
  handles_supplied?: boolean;
  glass: boolean;
  piece_count: string;
  hardware_quantity?: string | null;
  glass_type: string;
  created_at: string;
  updated_at: string;
};

type ClientType = {
  id: number;
  firstName?: string;
  lastName: string;
  street?: string;
  city?: string;
  province?: string;
  zip?: string;
  phone1?: string;
  phone2?: string;
  email1?: string;
  email2?: string;
};

type SalesOrderType = {
  id: number;
  client: ClientType;
  cabinet: CabinetType;
};

type JobType = {
  id: number;
  job_number: string;
  job_base_number: number;
  job_suffix?: string;
  sales_orders: SalesOrderType;
  production_schedule: SchedulingFormValues;
};

type SchedulingFormValues = {
  rush: boolean;
  placement_date: string | null;
  doors_in_schedule: string | null;
  doors_out_schedule: string | null;
  cut_finish_schedule: string | null;
  cut_melamine_schedule: string | null;
  paint_in_schedule: string | null;
  paint_out_schedule: string | null;
  assembly_schedule: string | null;
  ship_schedule: string | null;
  box_assembled_count: number;
  ship_status: string;
  ship_confirmed_date: string | null;
};

// ---------- Component ----------
export default function EditProductionSchedulePage({
  jobId,
}: {
  jobId: number;
}) {
  const router = useRouter();
  const { supabase, isAuthenticated } = useSupabase();
  const { user } = useUser();
  const queryClient = useQueryClient();

  // ---- Fetch job + production_schedule + sales_orders → client + cabinet ----
  const { data, isLoading } = useQuery({
    queryKey: ["production-schedule", jobId],
    queryFn: async (): Promise<JobType> => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
          *,
          production_schedule:production_schedule (*),
          sales_orders:sales_orders (
            id,
            client:client (*),
            cabinet:cabinets (*)
          )
        `
        )
        .eq("id", jobId)
        .single();

      if (error) throw error;
      return data as JobType;
    },
    enabled: isAuthenticated && !!jobId,
  });

  // ---- Form ----
  const form = useForm<SchedulingFormValues>({
    initialValues: {
      rush: false,
      placement_date: null,
      doors_in_schedule: null,
      doors_out_schedule: null,
      cut_finish_schedule: null,
      cut_melamine_schedule: null,
      paint_in_schedule: null,
      paint_out_schedule: null,
      assembly_schedule: null,
      ship_schedule: null,
      box_assembled_count: 0,
      ship_status: "unprocessed",
      ship_confirmed_date: null,
    },
    validate: zodResolver({} as any),
  });

  useEffect(() => {
    if (data?.production_schedule) {
      form.setValues(data.production_schedule);
    }
  }, [data]);

  // ---- Update Mutation ----
  const updateMutation = useMutation({
    mutationFn: async (values: SchedulingFormValues) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("production_schedule")
        .update(values)
        .eq("job_id", jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Production schedule updated successfully",
        color: "green",
      });
      queryClient.invalidateQueries({
        queryKey: ["production-schedule", jobId],
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

  if (isLoading || !data) {
    return (
      <Center h="100vh">
        <Loader />
        <Text ml="md">Loading...</Text>
      </Center>
    );
  }

  const handleSubmit = (values: SchedulingFormValues) => {
    updateMutation.mutate(values);
  };

  const client = data.sales_orders?.client;
  const cabinet = data.sales_orders?.cabinet;

  return (
    <Container size="100%" pl={10} w="100%" style={{ paddingRight: 0 }}>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          {/* HEADER */}
          <Paper
            p="md"
            radius="md"
            shadow="sm"
            style={{ backgroundColor: "#e3e3e3" }}
          >
            <Group>
              <Text fw={600} size="lg">
                Job #{data.job_number}
              </Text>

              <Badge color={form.values.rush ? "red" : "gray"}>
                {form.values.rush ? "Rush" : "Normal"}
              </Badge>
            </Group>

            <Divider my="sm" />

            {/* CLIENT INFO */}
            {client && (
              <Accordion
                variant="filled"
                defaultValue="client-details"
                style={{ borderRadius: "20px" }}
              >
                <Accordion.Item
                  value="client-details"
                  style={{
                    backgroundColor: "white",
                    borderRadius: "20px",
                  }}
                >
                  <Accordion.Control styles={{ label: { fontWeight: "bold" } }}>
                    Client Details
                  </Accordion.Control>
                  <Accordion.Panel>
                    <SimpleGrid cols={2} spacing="xs">
                      <Text size="sm">
                        <strong>Client Name:</strong> {client.lastName || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Street:</strong> {client.street || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>City:</strong> {client.city || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Province:</strong> {client.province || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>ZIP:</strong> {client.zip || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Phone 1:</strong> {client.phone1 || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Phone 2:</strong> {client.phone2 || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Email 1:</strong> {client.email1 || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Email 2:</strong> {client.email2 || "—"}
                      </Text>
                    </SimpleGrid>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            )}
            <Divider mb="sm" />
            {/* CABINET INFO */}
            {cabinet && (
              <Accordion
                variant="filled"
                radius="md"
                defaultValue="cabinet-details"
                style={{ borderRadius: "20px" }}
              >
                <Accordion.Item
                  value="cabinet-details"
                  style={{ backgroundColor: "white", borderRadius: "20px" }}
                >
                  <Accordion.Control styles={{ label: { fontWeight: "bold" } }}>
                    Cabinet Details
                  </Accordion.Control>
                  <Accordion.Panel>
                    <SimpleGrid cols={4} spacing="xs">
                      <Text size="sm">
                        <strong>Box:</strong> {cabinet.box || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Species:</strong> {cabinet.species || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Color:</strong> {cabinet.color || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Finish:</strong> {cabinet.finish || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Glaze:</strong> {cabinet.glaze || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Door Style:</strong> {cabinet.door_style || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Top Drawer Front:</strong>{" "}
                        {cabinet.top_drawer_front || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Interior:</strong> {cabinet.interior || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Drawer Box:</strong> {cabinet.drawer_box || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Drawer Hardware:</strong>{" "}
                        {cabinet.drawer_hardware || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Glass:</strong> {cabinet.glass ? "Yes" : "No"}
                      </Text>
                      <Text size="sm">
                        <strong>Glass Type:</strong> {cabinet.glass_type || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Piece Count:</strong>{" "}
                        {cabinet.piece_count || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Hardware Only:</strong>{" "}
                        {cabinet.hardware_only ? "Yes" : "No"}
                      </Text>
                      <Text size="sm">
                        <strong>Doors Parts Only:</strong>{" "}
                        {cabinet.doors_parts_only ? "Yes" : "No"}
                      </Text>
                      <Text size="sm">
                        <strong>Handles Selected:</strong>{" "}
                        {cabinet.handles_selected ? "Yes" : "No"}
                      </Text>
                      <Text size="sm">
                        <strong>Handles Supplied:</strong>{" "}
                        {cabinet.handles_supplied ? "Yes" : "No"}
                      </Text>
                      <Text size="sm">
                        <strong>Hinge Soft Close:</strong>{" "}
                        {cabinet.hinge_soft_close ? "Yes" : "No"}
                      </Text>
                    </SimpleGrid>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            )}
          </Paper>

          {/* FORM */}
          <Paper p="md" radius="md" shadow="xl">
            <Stack>
              <Switch
                label="Rush Job"
                {...form.getInputProps("rush", { type: "checkbox" })}
              />

              <SimpleGrid cols={2} spacing="sm">
                <DateInput
                  label="Placement Date"
                  {...form.getInputProps("placement_date")}
                />
                <DateInput
                  label="Doors In Schedule"
                  {...form.getInputProps("doors_in_schedule")}
                />
                <DateInput
                  label="Doors Out Schedule"
                  {...form.getInputProps("doors_out_schedule")}
                />
                <DateInput
                  label="Cut Finish Schedule"
                  {...form.getInputProps("cut_finish_schedule")}
                />
                <DateInput
                  label="Cut Melamine Schedule"
                  {...form.getInputProps("cut_melamine_schedule")}
                />
                <DateInput
                  label="Paint In Schedule"
                  {...form.getInputProps("paint_in_schedule")}
                />
                <DateInput
                  label="Paint Out Schedule"
                  {...form.getInputProps("paint_out_schedule")}
                />
                <DateInput
                  label="Assembly Schedule"
                  {...form.getInputProps("assembly_schedule")}
                />
                <DateInput
                  label="Ship Schedule"
                  {...form.getInputProps("ship_schedule")}
                />
                <DateInput
                  label="Ship Confirmed Date"
                  {...form.getInputProps("ship_confirmed_date")}
                />
              </SimpleGrid>

              <TextInput
                label="Box Assembled Count"
                type="number"
                {...form.getInputProps("box_assembled_count")}
              />
              <TextInput
                label="Ship Status"
                {...form.getInputProps("ship_status")}
              />
            </Stack>
          </Paper>

          {/* BUTTONS */}
          <Group>
            <Button color="blue" type="submit">
              Update Schedule
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </Group>
        </Stack>
      </form>
    </Container>
  );
}
