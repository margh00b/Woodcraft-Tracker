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

// Cabinet inside sales_orders
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

// Client inside sales_orders
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

// Job + sales_orders
type JobType = {
  id: number;
  job_number: string;
  job_base_number: number;
  job_suffix?: string;
  sales_orders: {
    id: number;
    client: ClientType;
    cabinet: CabinetType;
  };
};

// Full flattened Supabase response
type FullDataType = {
  job_id: number;
  rush: boolean;
  created_at: string;
  updated_at: string;
  placement_date: string | null;
  doors_in_schedule: string | null;
  doors_out_schedule: string | null;
  cut_finish_schedule: string | null;
  cut_melamine_schedule: string | null;
  paint_in_schedule: string | null;
  paint_out_schedule: string | null;
  assembly_schedule: string | null;
  ship_schedule: string | null;
  in_plant_actual: string | null;
  doors_completed_actual: string | null;
  cut_finish_completed_actual: string | null;
  custom_finish_completed_actual: string | null;
  drawer_completed_actual: string | null;
  cut_melamine_completed_actual: string | null;
  paint_completed_actual: string | null;
  assembly_completed_actual: string | null;
  box_assembled_count: number;
  ship_status: string;
  ship_confirmed_date: string | null;
  ship_confirmed_legacy?: boolean | null;
  Id: number;

  job: JobType;
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

  // ---- Fetch production_schedule + job → sales_orders → client,cabinet ----
  const { data, isLoading } = useQuery({
    queryKey: ["production-schedule", jobId],
    queryFn: async (): Promise<FullDataType> => {
      const { data, error } = await supabase
        .from("production_schedule")
        .select(
          `
            *,
            job:jobs (
              id,
              job_number,
              job_base_number,
              job_suffix,
              sales_orders:sales_orders (
                id,
                client:client (*),
                cabinet:cabinets (*)
              )
            )
          `
        )
        .eq("job_id", jobId)
        .single();

      if (error) throw error;

      return data as FullDataType;
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
    if (data) {
      form.setValues({
        rush: data.rush,
        placement_date: data.placement_date,
        doors_in_schedule: data.doors_in_schedule,
        doors_out_schedule: data.doors_out_schedule,
        cut_finish_schedule: data.cut_finish_schedule,
        cut_melamine_schedule: data.cut_melamine_schedule,
        paint_in_schedule: data.paint_in_schedule,
        paint_out_schedule: data.paint_out_schedule,
        assembly_schedule: data.assembly_schedule,
        ship_schedule: data.ship_schedule,
        box_assembled_count: data.box_assembled_count,
        ship_status: data.ship_status,
        ship_confirmed_date: data.ship_confirmed_date,
      });
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

  // ---------- UI ----------
  const client = data.job.sales_orders.client;
  const cabinet = data.job.sales_orders.cabinet;

  return (
    <Container size="100%" pl={10} w="100%" style={{ paddingRight: 0 }}>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          {/* HEADER */}
          <Paper p="md" radius="md" shadow="sm">
            <Group>
              <Text fw={600} size="lg">
                Job #{data.job.job_number}
              </Text>

              <Badge color={data.rush ? "red" : "gray"}>
                {data.rush ? "Rush" : "Normal"}
              </Badge>
            </Group>

            <Divider my="sm" />

            {/* CLIENT INFO */}
            <Accordion
              variant="filled"
              radius="md"
              defaultValue="client-details"
            >
              <Accordion.Item value="client-details">
                <Accordion.Control>Client Details</Accordion.Control>
                <Accordion.Panel>
                  <SimpleGrid cols={2} spacing="xs">
                    <Text size="sm">
                      <strong>First Name:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {client.firstName || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Last Name:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {client.lastName || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Street:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {client.street || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>City:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {client.city || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Province:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {client.province || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>ZIP:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {client.zip || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Phone 1:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {client.phone1 || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Phone 2:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {client.phone2 || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Email 1:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {client.email1 || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Email 2:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {client.email2 || "—"}
                      </span>
                    </Text>
                  </SimpleGrid>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            {/* CABINET INFO */}
            <Accordion
              variant="filled"
              radius="md"
              defaultValue="cabinet-details"
            >
              <Accordion.Item value="cabinet-details">
                <Accordion.Control>Cabinet Details</Accordion.Control>
                <Accordion.Panel>
                  <SimpleGrid cols={4} spacing="xs">
                    <Text size="sm">
                      <strong>Box:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {cabinet.box || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Species:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {cabinet.species || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Color:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {cabinet.color || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Finish:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {cabinet.finish || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Glaze:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {cabinet.glaze || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Door Style:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {cabinet.door_style || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Top Drawer Front:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {cabinet.top_drawer_front || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Interior:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {cabinet.interior || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Drawer Box:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {cabinet.drawer_box || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Drawer Hardware:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {cabinet.drawer_hardware || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Glass:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {cabinet.glass ? "Yes" : "No"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Glass Type:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {cabinet.glass_type || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Piece Count:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {cabinet.piece_count || "—"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Hardware Only:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {cabinet.hardware_only ? "Yes" : "No"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Doors Parts Only:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {cabinet.doors_parts_only ? "Yes" : "No"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Handles Selected:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {cabinet.handles_selected ? "Yes" : "No"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Handles Supplied:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {cabinet.handles_supplied ? "Yes" : "No"}
                      </span>
                    </Text>
                    <Text size="sm">
                      <strong>Hinge Soft Close:</strong>{" "}
                      <span style={{ color: "#6c6c6c" }}>
                        {cabinet.hinge_soft_close ? "Yes" : "No"}
                      </span>
                    </Text>
                  </SimpleGrid>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
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
