"use client";

import { useEffect, useMemo, useState } from "react";
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
  Select,
  Box,
  Timeline,
  Grid,
  ThemeIcon,
  Badge,
  Textarea,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import {
  FaCalendarCheck,
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
import CabinetSpecs from "@/components/Shared/CabinetSpecs/CabinetSpecs";
import ClientInfo from "@/components/Shared/ClientInfo/ClientInfo";
import OrderDetails from "@/components/Shared/OrderDetails/OrderDetails";
import RelatedBackorders from "@/components/Shared/RelatedBO/RelatedBO";
import RelatedServiceOrders from "@/components/Shared/RelatedServiceOrders/RelatedServiceOrders";
import AddBackorderModal from "@/components/Installation/AddBOModal/AddBOModal";
import { useNavigationGuard } from "@/providers/NavigationGuardProvider";
import utc from "dayjs/plugin/utc";
import JobAttachments from "@/components/Shared/JobAttachments/JobAttachments";
import PlantActuals from "@/components/Shared/PlantActuals/PlantActuals";

dayjs.extend(utc);

type CabinetSpecsJoined = Tables<"cabinets"> & {
  door_styles: { name: string } | null;
  species: { Species: string } | null;
  colors: { Name: string } | null;
};
type SalesOrderType = Tables<"sales_orders"> & {
  cabinet: CabinetSpecsJoined;
};

type SchedulingFormValues = TablesUpdate<"production_schedule"> & {
  wrap_date?: string | null;
};

type JobType = Tables<"jobs"> & {
  sales_orders: SalesOrderType;
  production_schedule: SchedulingFormValues;
  installation: Tables<"installation">;
};

export default function EditProductionSchedulePage({
  jobId,
}: {
  jobId: number;
}) {
  const router = useRouter();
  const { supabase, isAuthenticated } = useSupabase();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [isBackorderPromptOpen, setIsBackorderPromptOpen] = useState(false);
  const [isAddBackorderModalOpen, setIsAddBackorderModalOpen] = useState(false);
  const { data, isLoading } = useQuery<JobType>({
    queryKey: ["production-schedule", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
          *,
          production_schedule:production_schedule (*),
          installation:installation (wrap_date),
          sales_orders:sales_orders (
            id,
            shipping_street,
            shipping_city,
            shipping_province,
            shipping_zip,
            shipping_client_name,
            project_name,
            shipping_phone_1,
            shipping_email_1,
            shipping_phone_2,
            shipping_email_2,
            order_type,
            delivery_type,
            install,
            is_canopy_required,
            is_woodtop_required,
            is_custom_cab_required,
            cabinet:cabinets (
              id,
              box,
              glass,
              glaze,
              finish,
              interior,
              drawer_box,
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
        `
        )
        .eq("id", jobId)
        .single();
      if (error) throw error;
      return data as JobType;
    },
    enabled: isAuthenticated && !!jobId,
  });

  const handleBackorderPromptDecision = (isCompleteShipment: boolean) => {
    setIsBackorderPromptOpen(false);

    if (isCompleteShipment) {
      form.setFieldValue("has_shipped", true);
      form.setFieldValue("partially_shipped", false);
    } else {
      setIsAddBackorderModalOpen(true);
    }
  };

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
      wrap_date: null,
      ship_schedule: null,
      in_plant_actual: null,
      in_plant_cabinets_actual: null,
      ship_status: "unprocessed",
      production_comments: "",
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
  const { setIsDirty } = useNavigationGuard();
  const isDirty = form.isDirty();
  useEffect(() => {
    setIsDirty(isDirty);
    return () => setIsDirty(false);
  }, [isDirty, setIsDirty]);

  useEffect(() => {
    if (data?.production_schedule) {
      form.initialize({
        ...data.production_schedule,
        wrap_date: data.installation?.wrap_date || null,
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (values: SchedulingFormValues) => {
      if (!user) throw new Error("User not authenticated");
      if (!data?.production_schedule?.prod_id)
        throw new Error("Production schedule data missing");

      const prodId = data.production_schedule.prod_id;
      const { wrap_date, ...scheduleValues } = values;
      if (
        scheduleValues.ship_schedule &&
        scheduleValues.ship_status === "unprocessed"
      ) {
        scheduleValues.ship_status = "tentative";
      }

      const { error: prodError } = await supabase
        .from("production_schedule")
        .update(scheduleValues)
        .eq("prod_id", prodId);

      if (prodError) throw prodError;

      if (wrap_date !== undefined && data.installation_id) {
        const formattedWrapDate = wrap_date
          ? dayjs(wrap_date).format("YYYY-MM-DD")
          : wrap_date;

        const { error: installError } = await supabase
          .from("installation")
          .update({ wrap_date: formattedWrapDate })
          .eq("installation_id", data.installation_id);

        if (installError) throw installError;
      }
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
      queryClient.invalidateQueries({
        queryKey: ["prod_table_view"],
      });
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

  const cabinet = data.sales_orders?.cabinet;
  const shipping = data.sales_orders
    ? {
        project_name: data.sales_orders.project_name,
        shipping_client_name: data.sales_orders.shipping_client_name,
        shipping_phone_1: data.sales_orders.shipping_phone_1,
        shipping_phone_2: data.sales_orders.shipping_phone_2,
        shipping_email_1: data.sales_orders.shipping_email_1,
        shipping_email_2: data.sales_orders.shipping_email_2,
        shipping_street: data.sales_orders.shipping_street,
        shipping_city: data.sales_orders.shipping_city,
        shipping_province: data.sales_orders.shipping_province,
        shipping_zip: data.sales_orders.shipping_zip,
      }
    : null;
  const orderDetails = data?.sales_orders
    ? {
        order_type: data.sales_orders.order_type,
        delivery_type: data.sales_orders.delivery_type,
        install: data.sales_orders.install,
      }
    : null;

  const handleSubmit = (values: SchedulingFormValues) =>
    updateMutation.mutate(values);

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
                <FaCalendarCheck size={22} />
              </ThemeIcon>
              <Stack gap={0}>
                <Group gap="sm">
                  <Text fw={700} size="xl" style={{ color: "#343a40" }}>
                    Job #{data.job_number}
                  </Text>
                  {form.values.rush && (
                    <Badge
                      color="red"
                      variant="filled"
                      leftSection={<FaFire size={10} />}
                    >
                      RUSH
                    </Badge>
                  )}
                </Group>
                <Text size="sm" c="dimmed">
                  Production Schedule & Status
                </Text>
              </Stack>
            </Group>
          </Group>
        </Paper>
        <Grid gutter="xs">
          <Grid.Col span={10}>
            <Stack mb="md">
              <Paper p="md" radius="md" shadow="sm" bg="gray.1">
                <SimpleGrid cols={2}>
                  <Stack>
                    <ClientInfo shipping={shipping} />
                    <OrderDetails orderDetails={orderDetails} />
                  </Stack>

                  {cabinet && <CabinetSpecs cabinet={cabinet} />}
                </SimpleGrid>
              </Paper>

              <Paper p="md" radius="md" shadow="xl" pb={30} bg="gray.1">
                <Paper p="md" radius="md" shadow="xl" bg="white">
                  <Stack>
                    {}
                    <Box mb="md">
                      <Group gap="xl" align="center">
                        <Switch
                          size="md"
                          color="red"
                          label="Rush Job"
                          checked={form.values.rush}
                          onChange={(e) =>
                            form.setFieldValue("rush", e.currentTarget.checked)
                          }
                          styles={{ label: { fontWeight: 600 } }}
                        />
                        <Switch
                          size="md"
                          color="violet"
                          label="In Plant (Doors)"
                          checked={!!form.values.in_plant_actual}
                          onChange={(e) =>
                            form.setFieldValue(
                              "in_plant_actual",
                              e.currentTarget.checked
                                ? new Date().toISOString()
                                : null
                            )
                          }
                          styles={{ label: { fontWeight: 600 } }}
                        />
                        <Switch
                          size="md"
                          color="violet"
                          label="In Plant (Cabinets)"
                          checked={!!form.values.in_plant_cabinets_actual}
                          onChange={(e) =>
                            form.setFieldValue(
                              "in_plant_cabinets_actual",
                              e.currentTarget.checked
                                ? new Date().toISOString()
                                : null
                            )
                          }
                          styles={{ label: { fontWeight: 600 } }}
                        />
                      </Group>
                    </Box>

                    <Box>
                      <Group mb={8}>
                        <FaShippingFast size={18} />
                        <Text fw={600}>Placement & Shipping</Text>
                      </Group>
                      <SimpleGrid cols={5} spacing="sm">
                        <DateInput
                          styles={{
                            label: {
                              fontWeight: "bold",
                            },
                          }}
                          clearable
                          highlightToday
                          label="Received Date"
                          {...form.getInputProps("received_date")}
                        />
                        <DateInput
                          styles={{
                            label: {
                              fontWeight: "bold",
                            },
                          }}
                          clearable
                          label="Placement Date"
                          {...form.getInputProps("placement_date")}
                          highlightToday
                        />
                        <DateInput
                          styles={{
                            label: {
                              fontWeight: "bold",
                            },
                          }}
                          clearable
                          excludeDate={(date) =>
                            new Date(date).getUTCDay() === 0 ||
                            new Date(date).getUTCDay() === 6
                          }
                          label="Wrap Date"
                          {...form.getInputProps("wrap_date")}
                          highlightToday
                        />
                        <DateInput
                          styles={{
                            label: {
                              fontWeight: "bold",
                            },
                          }}
                          clearable
                          excludeDate={(date) =>
                            new Date(date).getUTCDay() === 0 ||
                            new Date(date).getUTCDay() === 6
                          }
                          label="Ship Date"
                          {...form.getInputProps("ship_schedule")}
                          highlightToday
                        />
                        <Select
                          label="Shipping Date Status"
                          styles={{
                            label: {
                              fontWeight: "bold",
                            },
                          }}
                          w={"100%"}
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
                      </SimpleGrid>
                    </Box>

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
                    ].map(({ title, fields, single }) => (
                      <Box key={title}>
                        <SimpleGrid cols={single ? 1 : 2} spacing="sm">
                          {fields.map(([key, label]) => (
                            <DateInput
                              styles={{
                                label: {
                                  fontWeight: "bold",
                                },
                              }}
                              excludeDate={(date) =>
                                new Date(date).getUTCDay() === 0 ||
                                new Date(date).getUTCDay() === 6
                              }
                              key={key}
                              label={label}
                              {...form.getInputProps(
                                key as keyof SchedulingFormValues
                              )}
                              highlightToday
                              clearable
                            />
                          ))}
                        </SimpleGrid>
                      </Box>
                    ))}
                  </Stack>
                  <Box mt="xl">
                    <Textarea
                      label="Production & Scheduling Comments"
                      placeholder="Enter notes, exceptions, or special instructions here..."
                      minRows={10}
                      mb={"md"}
                      styles={{ input: { minHeight: "200px" } }}
                      {...form.getInputProps("production_comments")}
                      value={form.values.production_comments ?? ""}
                    />
                    <JobAttachments jobId={jobId as number} full />
                  </Box>
                </Paper>
              </Paper>
            </Stack>
            {jobId && (
              <RelatedBackorders
                jobId={String(jobId)}
                onAddBackorder={() => setIsAddBackorderModalOpen(true)}
              />
            )}
            {jobId && <RelatedServiceOrders jobId={jobId} />}
          </Grid.Col>

          <Grid.Col span={2} style={{ borderLeft: "1px solid #ccc" }}>
            <Box pt="md" style={{ justifyItems: "center" }}>
              <PlantActuals
                schedule={data.production_schedule}
                isCanopyRequired={data.sales_orders?.is_canopy_required}
                isWoodtopRequired={data.sales_orders?.is_woodtop_required}
                isCustomCabRequired={data.sales_orders?.is_custom_cab_required}
              />
            </Box>
          </Grid.Col>
        </Grid>
      </form>

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
            onClick={() => {
              const nav = (window as any).navigation;
              if (nav && "canGoBack" in nav) {
                if (nav.canGoBack) {
                  router.back();
                } else {
                  window.close();
                }
                return;
              }
            }}
          >
            Back
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
      <AddBackorderModal
        opened={isAddBackorderModalOpen}
        onClose={() => setIsAddBackorderModalOpen(false)}
        jobId={String(jobId)}
        jobNumber={data.job_number}
        onSuccess={() => {
          form.setFieldValue("has_shipped", false);
          form.setFieldValue("partially_shipped", true);
        }}
      />
    </Container>
  );
}
