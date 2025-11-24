"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@mantine/form";
import { zodResolver } from "@/utils/zodResolver/zodResolver";
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
  FaFire,
  FaIndustry,
  FaPaintBrush,
  FaShippingFast,
} from "react-icons/fa";
import { schedulingSchema } from "@/zod/prod.schema";

// ---------- Types ----------

type SalesOrderType = Tables<"sales_orders"> & {
  client: Tables<"client">;
  cabinet: Tables<"cabinets">;
};

type SchedulingFormValues = TablesUpdate<"production_schedule">;

type JobType = Tables<"jobs"> & {
  sales_orders: SalesOrderType;
  production_schedule: SchedulingFormValues;
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

  // ---------- Fetch Job ----------
  const { data, isLoading } = useQuery<JobType>({
    queryKey: ["production-schedule", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
          *,
          production_schedule:production_schedule (*),
          sales_orders:sales_orders (
            id,
            client:client (*),
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
      return data as JobType;
    },
    enabled: isAuthenticated && !!jobId,
  });

  // ---------- Form ----------
  const form = useForm<SchedulingFormValues>({
    initialValues: {
      rush: false,
      received_date: null,
      placement_date: null,
      doors_in_schedule: null,
      doors_out_schedule: null,
      cut_finish_schedule: null,
      cut_melamine_schedule: null,
      paint_in_schedule: null,
      paint_out_schedule: null,
      assembly_schedule: null,
      ship_schedule: null,
      in_plant_actual: null,
      ship_status: "unprocessed",
      doors_completed_actual: null,
      cut_finish_completed_actual: null,
      custom_finish_completed_actual: null,
      drawer_completed_actual: null,
      cut_melamine_completed_actual: null,
      paint_completed_actual: null,
      assembly_completed_actual: null,
    } as SchedulingFormValues,
    validate: zodResolver(schedulingSchema),
  });

  useEffect(() => {
    if (data?.production_schedule) form.setValues(data.production_schedule);
  }, [data]);

  // ---------- Timeline / Progress Logic ----------
  const actualSteps = useMemo(() => {
    const schedule = data?.production_schedule;
    if (!schedule) return [];

    const stepsData: {
      key: keyof SchedulingFormValues;
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
  }, [data]);

  // ---------- Mutation ----------
  const updateMutation = useMutation({
    mutationFn: async (values: SchedulingFormValues) => {
      if (!user) throw new Error("User not authenticated");
      const prodId = (data?.production_schedule as any)?.prod_id;
      const { error } = await supabase
        .from("production_schedule")
        .update(values)
        .eq("prod_id", prodId);
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
      queryClient.invalidateQueries({
        queryKey: ["production_schedule_list"],
      });
      router.push("/dashboard/production");
    },
    onError: (err: any) =>
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      }),
  });

  if (isLoading || !data)
    return (
      <Center h="100vh">
        <Loader />
        <Text ml="md">Loading...</Text>
      </Center>
    );

  const client = data.sales_orders?.client;
  const cabinet = data.sales_orders?.cabinet;

  const handleSubmit = (values: SchedulingFormValues) =>
    updateMutation.mutate(values);

  // ---------- JSX ----------
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
        <Grid>
          <Grid.Col span={10}>
            <Stack>
              {/* HEADER */}
              <Paper
                p="md"
                radius="md"
                shadow="sm"
                style={{ background: "#e3e3e3" }}
              >
                <Group align="center">
                  <Text
                    fw={600}
                    size="lg"
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    Job #{data.job_number}{" "}
                    <FaFire size={16} color="red" style={{ marginLeft: 4 }} />
                  </Text>
                </Group>
                <Divider my="sm" color="purple" />

                {/* CLIENT & CABINET */}
                <SimpleGrid cols={2}>
                  {client && (
                    <Paper
                      p="md"
                      radius="md"
                      shadow="sm"
                      mb="md"
                      style={{ background: "#f5f5f5" }}
                    >
                      <Text fw={600} mb="sm">
                        Client Details
                      </Text>
                      <SimpleGrid cols={3} spacing="sm">
                        {[
                          ["Client Name", client.lastName],
                          ["Street", client.street],
                          ["City", client.city],
                          ["Province", client.province],
                          ["ZIP", client.zip],
                          ["Phone 1", client.phone1],
                          ["Phone 2", client.phone2],
                          ["Email 1", client.email1],
                          ["Email 2", client.email2],
                        ].map(([label, val]) => (
                          <Text key={label} size="sm">
                            <strong>{label}:</strong> {val || "—"}
                          </Text>
                        ))}
                      </SimpleGrid>
                    </Paper>
                  )}

                  {cabinet && (
                    <Paper
                      p="md"
                      radius="md"
                      shadow="sm"
                      mb="md"
                      style={{ background: "#f5f5f5" }}
                    >
                      <Text fw={600} mb="sm">
                        Cabinet Details
                      </Text>
                      {/* --- General Cabinet Info --- */}

                      <Grid>
                        <Grid.Col span={8}>
                          <Text size="sm">
                            <strong>Box:</strong> {cabinet.box || "—"}
                          </Text>
                          <Text size="sm">
                            <strong>Color:</strong> {cabinet.color || "—"}
                          </Text>
                          <Text size="sm">
                            <strong>Finish:</strong> {cabinet.finish || "—"}
                          </Text>
                          <Text size="sm">
                            <strong>Species:</strong> {cabinet.species || "—"}
                          </Text>
                          <Text size="sm">
                            <strong>Interior:</strong> {cabinet.interior || "—"}
                          </Text>
                          <Text size="sm">
                            <strong>Piece Count:</strong>{" "}
                            {cabinet.piece_count || "—"}
                          </Text>
                          <Text size="sm">
                            <strong>Glass Type:</strong>{" "}
                            {cabinet.glass_type || "—"}
                          </Text>
                          <Text size="sm">
                            <strong>Door Style:</strong>{" "}
                            {cabinet.door_style || "—"}
                          </Text>
                          <Text size="sm">
                            <strong>Top Drawer Front:</strong>{" "}
                            {cabinet.top_drawer_front || "—"}
                          </Text>
                          <Text size="sm">
                            <strong>Drawer Box:</strong>{" "}
                            {cabinet.drawer_box || "—"}
                          </Text>
                        </Grid.Col>
                        <Grid.Col span={4}>
                          <Text
                            size="sm"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <strong>Glass:</strong>{" "}
                            {cabinet.glass && (
                              <FaCheck color="#8e2de2" size={12} />
                            )}
                          </Text>
                          <Text
                            size="sm"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <strong>Doors Parts Only:</strong>{" "}
                            {cabinet.doors_parts_only && (
                              <FaCheck color="#8e2de2" size={12} />
                            )}
                          </Text>
                          <Text
                            size="sm"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <strong>Handles Selected:</strong>{" "}
                            {cabinet.handles_selected && (
                              <FaCheck color="#8e2de2" size={12} />
                            )}
                          </Text>
                          <Text
                            size="sm"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <strong>Handles Supplied:</strong>{" "}
                            {cabinet.handles_supplied && (
                              <FaCheck color="#8e2de2" size={12} />
                            )}
                          </Text>
                          <Text
                            size="sm"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <strong>Hinge Soft Close:</strong>{" "}
                            {cabinet.hinge_soft_close && (
                              <FaCheck color="#8e2de2" size={12} />
                            )}
                          </Text>
                        </Grid.Col>
                      </Grid>
                    </Paper>
                  )}
                </SimpleGrid>
              </Paper>

              {/* FORM */}
              <Paper p="md" radius="md" shadow="xl" pb={30}>
                <Stack>
                  {/* Rush & Placement/Shipping */}
                  <Switch
                    size="xl"
                    offLabel="Normal"
                    onLabel="Rush"
                    thumbIcon={<FaFire />}
                    {...form.getInputProps("rush", { type: "checkbox" })}
                    checked={form.values.rush}
                    onChange={(e) =>
                      form.setFieldValue("rush", e.currentTarget.checked)
                    }
                    styles={{
                      track: {
                        padding: "5px",
                        cursor: "pointer",
                        background: form.values.rush
                          ? "linear-gradient(135deg, #ff4d4d 0%, #c80000 100%)"
                          : "linear-gradient(135deg, #555555 0%, #e3e3e3 100%)",
                        border: "none",
                        color: form.values.rush ? "white" : "black",
                        transition: "background 200ms ease",
                      },
                      thumb: {
                        background: form.values.rush ? "#ff6b6b" : "#fff",
                      },
                      label: { fontWeight: 600, display: "inline-block" },
                    }}
                  />

                  <Box>
                    <Group mb={8}>
                      <FaShippingFast size={18} />
                      <Text fw={600}>Placement & Shipping</Text>
                    </Group>
                    <SimpleGrid cols={5} spacing="sm">
                      <DateInput
                        label="Received Date"
                        {...form.getInputProps("received_date")}
                      />
                      <DateInput
                        label="Placement Date"
                        {...form.getInputProps("placement_date")}
                      />
                      <DateInput
                        label="Ship Date"
                        {...form.getInputProps("ship_schedule")}
                      />

                      <Select
                        w={150}
                        label="Shipping Date Status"
                        data={[
                          { value: "unprocessed", label: "Unprocessed" },
                          { value: "tentative", label: "Tentative" },
                          { value: "confirmed", label: "Confirmed" },
                        ]}
                        {...form.getInputProps("ship_status")}
                        styles={() => {
                          const v = form.values.ship_status;
                          let gradient =
                            "linear-gradient(135deg, #B0BEC5, #78909C)";
                          if (v === "confirmed")
                            gradient =
                              "linear-gradient(135deg, #4A00E0, #8E2DE2)";
                          else if (v === "tentative")
                            gradient =
                              "linear-gradient(135deg, #FF6A00, #FFB347)";
                          return {
                            input: {
                              background: gradient,
                              color: "white",
                              fontWeight: 600,
                              border: "none",
                              transition: "background 200ms ease",
                            },
                            dropdown: { borderRadius: 8 },
                            item: {
                              "&[data-selected]": {
                                background: gradient,
                                color: "white",
                              },
                            },
                          };
                        }}
                      />

                      <Box
                        style={{
                          display: "flex",
                          alignItems: "flex-end",
                          paddingBottom: 2,
                        }}
                      >
                        <Switch
                          size="lg"
                          offLabel="Not In Plant"
                          onLabel="In Plant"
                          thumbIcon={<FaIndustry />}
                          checked={!!form.values.in_plant_actual}
                          onChange={(e) =>
                            form.setFieldValue(
                              "in_plant_actual",
                              e.currentTarget.checked
                                ? new Date().toISOString()
                                : null
                            )
                          }
                          styles={{
                            track: {
                              padding: "4px",
                              cursor: "pointer",
                              background: form.values.in_plant_actual
                                ? "linear-gradient(135deg, #28a745 0%, #218838 100%)"
                                : "linear-gradient(135deg, #ff9a9a 0%, #ff6b6b 100%)",
                              border: "none",
                              color: form.values.in_plant_actual
                                ? "white"
                                : "black",
                              transition: "background 200ms ease",
                            },
                            thumb: {
                              background: form.values.in_plant_actual
                                ? "#218838"
                                : "#fff",
                            },
                            label: { fontWeight: 600, display: "inline-block" },
                          }}
                        />
                      </Box>
                    </SimpleGrid>
                  </Box>

                  {/* Schedule Groups */}
                  {[
                    {
                      title: "Doors Schedule",
                      icon: <FaDoorOpen />,
                      fields: [
                        ["doors_in_schedule", "Doors In Schedule"],
                        ["doors_out_schedule", "Doors Out Schedule"],
                      ],
                    },
                    {
                      title: "Cutting Schedule",
                      icon: <FaCut />,
                      fields: [
                        ["cut_finish_schedule", "Cut Finish Schedule"],
                        ["cut_melamine_schedule", "Cut Melamine Schedule"],
                      ],
                    },
                    {
                      title: "Paint Schedule",
                      icon: <FaPaintBrush />,
                      fields: [
                        ["paint_in_schedule", "Paint In Schedule"],
                        ["paint_out_schedule", "Paint Out Schedule"],
                      ],
                    },
                    {
                      title: "Assembly",
                      icon: <FaCogs />,
                      fields: [["assembly_schedule", "Assembly Schedule"]],
                      single: true,
                    },
                  ].map(({ title, icon, fields, single }) => (
                    <Box key={title}>
                      <Group mb={8}>
                        {icon} <Text fw={600}>{title}</Text>
                      </Group>
                      <SimpleGrid cols={single ? 1 : 2} spacing="sm">
                        {fields.map(([key, label]) => (
                          <DateInput
                            key={key}
                            label={label}
                            {...form.getInputProps(
                              key as keyof SchedulingFormValues
                            )}
                          />
                        ))}
                      </SimpleGrid>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Stack>
          </Grid.Col>

          {/* TIMELINE */}
          <Grid.Col span={2}>
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
            style={{
              background: "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
              color: "white",
              border: "none",
            }}
            onClick={() => form.onSubmit(handleSubmit)()}
          >
            Update Schedule
          </Button>
        </Group>
      </Paper>
    </Container>
  );
}
