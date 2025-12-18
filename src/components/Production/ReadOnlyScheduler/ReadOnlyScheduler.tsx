"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import { Tables } from "@/types/db";
import {
  Container,
  Paper,
  Stack,
  Group,
  Text,
  Loader,
  Center,
  Divider,
  Box,
  Timeline,
  Grid,
  Card,
  ThemeIcon,
  Badge,
  Button,
  SimpleGrid,
} from "@mantine/core";
import dayjs from "dayjs";
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
  FaArrowLeft,
  FaRegCircle,
  FaClipboardList,
} from "react-icons/fa";
import CabinetSpecs from "@/components/Shared/CabinetSpecs/CabinetSpecs";
import ClientInfo from "@/components/Shared/ClientInfo/ClientInfo";
import OrderDetails from "@/components/Shared/OrderDetails/OrderDetails";
import RelatedBackorders from "@/components/Shared/RelatedBO/RelatedBO";
import RelatedServiceOrders from "@/components/Shared/RelatedServiceOrders/RelatedServiceOrders";

type CabinetSpecsJoined = Tables<"cabinets"> & {
  door_styles: { name: string } | null;
  species: { Species: string } | null;
  colors: { Name: string } | null;
};

type JobType = Tables<"jobs"> & {
  sales_orders: Tables<"sales_orders"> & {
    cabinet: CabinetSpecsJoined;
  };
  installation: Tables<"installation">;
  production_schedule: Tables<"production_schedule">;
};

const SectionTitle = ({
  icon: Icon,
  title,
  color = "violet",
}: {
  icon: any;
  title: string;
  color?: string;
}) => (
  <Group mb="md" gap="xs">
    <ThemeIcon size="md" radius="md" variant="light" color={color}>
      <Icon size={14} />
    </ThemeIcon>
    <Text
      fw={700}
      size="sm"
      tt="uppercase"
      c="dimmed"
      style={{ letterSpacing: "0.5px" }}
    >
      {title}
    </Text>
  </Group>
);

const DateBlock = ({
  label,
  date,
}: {
  label: string;
  date: string | null | undefined;
}) => (
  <Box
    p={8}
    bg="gray.0"
    style={{ borderRadius: 6, border: "1px solid #e9ecef" }}
  >
    <Text size="xs" c="dimmed" mb={2} fw={600}>
      {label}
    </Text>
    <Text size="sm" fw={600} c={date ? "dark" : "dimmed"}>
      {date ? dayjs(date).format("MMM D, YYYY") : "—"}
    </Text>
  </Box>
);

export default function ReadOnlyScheduler({ jobId }: { jobId: number }) {
  const router = useRouter();
  const { supabase, isAuthenticated } = useSupabase();

  const { data, isLoading } = useQuery<JobType>({
    queryKey: ["production-schedule-readonly", jobId],
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
            shipping_phone_1,
            shipping_email_1,
            shipping_phone_2,
            shipping_email_2,
            order_type,
            delivery_type,
            install,
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
      return data as unknown as JobType;
    },
    enabled: isAuthenticated && !!jobId,
  });

  const actualSteps = useMemo(() => {
    const schedule = data?.production_schedule;
    if (!schedule) return [];

    const stepsData = [
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
    ] as const;

    return stepsData.map((step) => ({
      ...step,
      isCompleted: !!schedule[step.key],
      date: schedule[step.key] as string | null,
    }));
  }, [data]);

  if (isLoading || !data) {
    return (
      <Center h="100vh" bg="gray.0">
        <Loader color="violet" type="bars" />
      </Center>
    );
  }

  const schedule = data.production_schedule;
  const cabinet = data.sales_orders?.cabinet;
  const installation = data.installation;
  const shipping = data.sales_orders
    ? {
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
                {schedule.rush && (
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

      <Box style={{ flex: 1, overflowY: "auto" }} p="md">
        <Grid gutter="lg">
          <Grid.Col span={10}>
            <Stack gap="md" mb="md">
              <Paper p="md" radius="md" shadow="xs" withBorder bg="gray.1">
                <SimpleGrid cols={2} spacing="xl">
                  <Stack>
                    <ClientInfo shipping={shipping} />
                    <OrderDetails orderDetails={orderDetails} />
                  </Stack>
                  {cabinet && <CabinetSpecs cabinet={cabinet} />}
                </SimpleGrid>
              </Paper>
              <Paper p="md" radius="md" shadow="xs" withBorder bg="gray.1">
                <Stack gap="md">
                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <SectionTitle
                      icon={FaShippingFast}
                      title="Logistics & Dates"
                      color="blue"
                    />
                    <SimpleGrid cols={5} spacing="md">
                      <DateBlock
                        label="Received"
                        date={schedule.received_date}
                      />
                      <DateBlock
                        label="Placement"
                        date={schedule.placement_date}
                      />
                      <DateBlock
                        label="Wrap Date"
                        date={installation?.wrap_date}
                      />
                      <DateBlock
                        label="Ship Date"
                        date={schedule.ship_schedule}
                      />
                      <Box
                        p={8}
                        bg="gray.0"
                        style={{ borderRadius: 6, border: "1px solid #e9ecef" }}
                      >
                        <Text size="xs" c="dimmed" mb={2} fw={600}>
                          Ship Date Status
                        </Text>
                        <Badge
                          variant="light"
                          color={
                            schedule.ship_status === "confirmed"
                              ? "green"
                              : schedule.ship_status === "tentative"
                              ? "orange"
                              : "gray"
                          }
                        >
                          {schedule.ship_status || "Unprocessed"}
                        </Badge>
                      </Box>
                      <Badge variant="light" color="gray">
                        {schedule.rush ? "Rush" : "Not Rush"}
                      </Badge>
                    </SimpleGrid>
                  </Card>

                  <SimpleGrid cols={2} spacing="md">
                    <Card shadow="sm" padding="md" radius="md" withBorder>
                      <SectionTitle
                        icon={FaDoorOpen}
                        title="Doors"
                        color="orange"
                      />
                      <SimpleGrid cols={2}>
                        <DateBlock
                          label="Doors In"
                          date={schedule.doors_in_schedule}
                        />
                        <DateBlock
                          label="Doors Out"
                          date={schedule.doors_out_schedule}
                        />
                      </SimpleGrid>
                    </Card>

                    <Card shadow="sm" padding="md" radius="md" withBorder>
                      <SectionTitle
                        icon={FaCut}
                        title="Cutting"
                        color="grape"
                      />
                      <SimpleGrid cols={2}>
                        <DateBlock
                          label="Cut Finish"
                          date={schedule.cut_finish_schedule}
                        />
                        <DateBlock
                          label="Cut Melamine"
                          date={schedule.cut_melamine_schedule}
                        />
                      </SimpleGrid>
                    </Card>

                    <Card shadow="sm" padding="md" radius="md" withBorder>
                      <SectionTitle
                        icon={FaPaintBrush}
                        title="Finishing"
                        color="pink"
                      />
                      <SimpleGrid cols={2}>
                        <DateBlock
                          label="Paint In"
                          date={schedule.paint_in_schedule}
                        />
                        <DateBlock
                          label="Paint Out"
                          date={schedule.paint_out_schedule}
                        />
                      </SimpleGrid>
                    </Card>

                    <Card shadow="sm" padding="md" radius="md" withBorder>
                      <SectionTitle
                        icon={FaCogs}
                        title="Assembly"
                        color="teal"
                      />
                      <SimpleGrid cols={1}>
                        <DateBlock
                          label="Assembly"
                          date={schedule.assembly_schedule}
                        />
                      </SimpleGrid>
                    </Card>
                  </SimpleGrid>
                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <SectionTitle
                      icon={FaClipboardList}
                      title="Production Notes"
                      color="violet"
                    />
                    <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                      {data.production_schedule.production_comments ||
                        "No notes recorded."}
                    </Text>
                  </Card>
                </Stack>
              </Paper>
            </Stack>
            <RelatedBackorders jobId={String(jobId)} readOnly />
            <RelatedServiceOrders jobId={jobId} readOnly />
          </Grid.Col>

          <Grid.Col span={2}>
            <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
              <SectionTitle
                icon={FaCalendarCheck}
                title="Actual Progress"
                color="green"
              />
              <Timeline bulletSize={24} lineWidth={2} active={-1} mt="md">
                {actualSteps.map((step, idx) => (
                  <Timeline.Item
                    key={idx}
                    title={step.label}
                    bullet={
                      <Box
                        style={{
                          backgroundColor: step.isCompleted
                            ? "#28a745"
                            : "#f1f3f5",
                          borderRadius: "50%",
                          width: 24,
                          height: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          aspectRatio: 1,
                          color: step.isCompleted ? "white" : "#adb5bd",
                        }}
                      >
                        {step.isCompleted ? (
                          <FaCheckCircle size={12} />
                        ) : (
                          <FaRegCircle size={12} />
                        )}
                      </Box>
                    }
                    lineVariant={step.isCompleted ? "solid" : "dashed"}
                  >
                    <Text size="xs" c="dimmed">
                      {step.isCompleted ? "Completed" : "Pending"}
                    </Text>
                    {step.date && (
                      <Text size="xs" fw={500} c="dark">
                        {dayjs(step.date).format("MMM D, h:mm A")}
                      </Text>
                    )}
                  </Timeline.Item>
                ))}
              </Timeline>
            </Card>
          </Grid.Col>
        </Grid>
      </Box>
    </Container>
  );
}
