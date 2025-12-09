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
  Box,
  Timeline,
  Grid,
  Card,
  ThemeIcon,
  Badge,
  Button,
  SimpleGrid,
  Divider,
} from "@mantine/core";
import dayjs from "dayjs";
import {
  FaCalendarCheck,
  FaCheckCircle,
  FaCogs,
  FaCut,
  FaDoorOpen,
  FaIndustry,
  FaPaintBrush,
  FaArrowLeft,
  FaRegCircle,
  FaTools,
  FaTruckLoading,
  FaUserTie,
  FaClipboardList,
} from "react-icons/fa";
import CabinetSpecs from "@/components/Shared/CabinetSpecs/CabinetSpecs";
import ClientInfo from "@/components/Shared/ClientInfo/ClientInfo";
import RelatedServiceOrders from "@/components/Shared/RelatedServiceOrders/RelatedServiceOrders";
import RelatedBackorders from "@/components/Shared/RelatedBO/RelatedBO";
import OrderDetails from "@/components/Shared/OrderDetails/OrderDetails";

// --- Types ---
type JoinedCabinet = Tables<"cabinets"> & {
  door_styles: { name: string } | null;
  species: { Species: string } | null;
  colors: { Name: string } | null;
};

type JoinedInstallation = Tables<"installation"> & {
  installer: {
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    phone_number: string | null;
  } | null;
};

type JobData = Tables<"jobs"> & {
  installation: JoinedInstallation | null;
  production_schedule: Tables<"production_schedule"> | null;
  sales_orders: Tables<"sales_orders"> & {
    cabinet: JoinedCabinet | null;
  };
};
type ProductionScheduleType = Tables<"production_schedule">;
// --- Helper Components ---
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
  date: string | null | undefined | Date;
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

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <Group justify="space-between" align="center" mb={4}>
    <Text size="sm" c="dimmed">
      {label}
    </Text>
    <Text size="sm" fw={500}>
      {value || "—"}
    </Text>
  </Group>
);

export default function ReadOnlyInstallation({ jobId }: { jobId: number }) {
  const router = useRouter();
  const { supabase, isAuthenticated } = useSupabase();

  // --- Data Fetching ---
  const { data: jobData, isLoading } = useQuery<JobData>({
    queryKey: ["installation-readonly", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
          id,
          job_number,
          installation:installation_id (
            *,
            installer:installer_id (
              first_name, last_name, company_name, phone_number
            )
          ),
          production_schedule:production_schedule (*),
          sales_orders:sales_orders (
            shipping_street, shipping_city, shipping_province, shipping_zip,
            shipping_client_name,
            shipping_phone_1,
            shipping_phone_2,
            shipping_email_1,
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
      return data as unknown as JobData;
    },
    enabled: isAuthenticated && !!jobId,
  });

  // --- Derived State ---
  const install = jobData?.installation;
  const prod = jobData?.production_schedule;
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
  const cabinet = jobData?.sales_orders?.cabinet;
  const productionScheduledSteps: {
    key: keyof ProductionScheduleType;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "placement_date",
      label: "Placement Date",
      icon: <FaIndustry size={12} />,
    },
    {
      key: "doors_in_schedule",
      label: "Doors In",
      icon: <FaDoorOpen size={12} />,
    },
    {
      key: "doors_out_schedule",
      label: "Doors Out",
      icon: <FaDoorOpen size={12} />,
    },
    {
      key: "cut_finish_schedule",
      label: "Cut Finish",
      icon: <FaCut size={12} />,
    },
    {
      key: "cut_melamine_schedule",
      label: "Cut Melamine",
      icon: <FaCut size={12} />,
    },
    {
      key: "paint_in_schedule",
      label: "Paint In",
      icon: <FaPaintBrush size={12} />,
    },
    {
      key: "paint_out_schedule",
      label: "Paint Out",
      icon: <FaPaintBrush size={12} />,
    },
    { key: "assembly_schedule", label: "Assembly", icon: <FaCogs size={12} /> },
  ];
  // --- Production Timeline Data ---
  const actualSteps = useMemo(() => {
    if (!prod) return [];
    const stepsData = [
      {
        key: "in_plant_actual",
        label: "In Plant",
        icon: <FaIndustry size={10} />,
      },
      {
        key: "doors_completed_actual",
        label: "Doors",
        icon: <FaDoorOpen size={10} />,
      },
      {
        key: "cut_finish_completed_actual",
        label: "Cut Finish",
        icon: <FaCut size={10} />,
      },
      {
        key: "custom_finish_completed_actual",
        label: "Custom Finish",
        icon: <FaPaintBrush size={10} />,
      },
      {
        key: "drawer_completed_actual",
        label: "Drawers",
        icon: <FaDoorOpen size={10} />,
      },
      {
        key: "cut_melamine_completed_actual",
        label: "Cut Melamine",
        icon: <FaCut size={10} />,
      },
      {
        key: "paint_completed_actual",
        label: "Paint",
        icon: <FaPaintBrush size={10} />,
      },
      {
        key: "assembly_completed_actual",
        label: "Assembly",
        icon: <FaCogs size={10} />,
      },
    ] as const;

    return stepsData.map((step) => ({
      ...step,
      isCompleted: !!prod[step.key],
      date: prod[step.key] as string | null,
    }));
  }, [prod]);

  // --- Installation Timeline Data ---
  const installSteps = useMemo(() => {
    if (!install) return [];
    return [
      {
        label: "Installation Complete",
        date: install.installation_completed,
        isCompleted: !!install.installation_completed,
      },
      {
        label: "Inspection Signed Off",
        date: install.inspection_completed,
        isCompleted: !!install.inspection_completed,
      },
    ];
  }, [install]);

  if (isLoading || !jobData) {
    return (
      <Center h="100vh" bg="gray.0">
        <Loader color="violet" type="bars" />
      </Center>
    );
  }

  const installerName = install?.installer
    ? install.installer.company_name ||
      `${install.installer.first_name} ${install.installer.last_name}`
    : "Unassigned";

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
      {/* --- Header --- */}
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
              <FaTools size={22} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text fw={700} size="xl" style={{ color: "#343a40" }}>
                Installation Job #{jobData.job_number}
              </Text>
              <Text size="sm" c="dimmed">
                Status Overview
              </Text>
            </Stack>
          </Group>
        </Group>
      </Paper>

      {/* --- Content --- */}
      <Box style={{ flex: 1, overflowY: "auto" }} p="md">
        <Grid gutter="lg">
          {/* LEFT COLUMN: Main Info */}
          <Grid.Col span={{ base: 12, lg: 10 }}>
            <Stack gap="md">
              {/* Client & Specs */}
              <Paper p="md" radius="md" shadow="xs" withBorder>
                <SimpleGrid cols={3} spacing="xl" verticalSpacing="lg">
                  <Stack>
                    <ClientInfo shipping={shipping} />
                    <OrderDetails orderDetails={orderDetails} />
                  </Stack>
                  {cabinet && <CabinetSpecs cabinet={cabinet} />}
                  {prod && (
                    <Paper
                      p="md"
                      radius="md"
                      shadow="sm"
                      style={{ background: "#ffffffff" }}
                    >
                      <Text
                        fw={600}
                        size="lg"
                        mb="md"
                        c="#4A00E0"
                        style={{ display: "flex", alignItems: "center" }}
                      >
                        <FaCogs style={{ marginRight: 8 }} /> Production
                        Schedule
                      </Text>
                      <Stack gap="xs">
                        {productionScheduledSteps.map((step) => (
                          <Group
                            key={step.key}
                            justify="space-between"
                            wrap="nowrap"
                          >
                            <Group gap="xs" wrap="nowrap">
                              {step.icon}
                              <Text size="sm" fw={500}>
                                {step.label}:
                              </Text>
                            </Group>
                            <Text
                              size="sm"
                              c={prod[step.key] ? "dark" : "dimmed"}
                              style={{ whiteSpace: "nowrap" }}
                            >
                              {prod[step.key]
                                ? dayjs(prod[step.key] as string).format(
                                    "YYYY-MM-DD"
                                  )
                                : "—"}
                            </Text>
                          </Group>
                        ))}
                      </Stack>
                    </Paper>
                  )}
                </SimpleGrid>
              </Paper>

              {/* Installer & Schedule */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <SectionTitle
                  icon={FaUserTie}
                  title="Installer & Schedule"
                  color="blue"
                />
                <SimpleGrid cols={3} spacing="md">
                  <Box>
                    <Text size="xs" c="dimmed" fw={600} mb={4}>
                      ASSIGNED INSTALLER
                    </Text>
                    <Text fw={600} size="lg">
                      {installerName}
                    </Text>
                    {install?.installer?.phone_number && (
                      <Text size="sm" c="dimmed">
                        {install.installer.phone_number}
                      </Text>
                    )}
                  </Box>
                  <DateBlock
                    label="Scheduled Installation"
                    date={install?.installation_date}
                  />
                  <DateBlock
                    label="Scheduled Inspection"
                    date={install?.inspection_date}
                  />
                </SimpleGrid>
              </Card>

              {/* Shipping & Logistics */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <SectionTitle
                  icon={FaTruckLoading}
                  title="Shipping Management"
                  color="green"
                />
                <SimpleGrid cols={4} spacing="md">
                  <DateBlock label="Wrap Date" date={install?.wrap_date} />
                  <DateBlock label="Ship Date" date={prod?.ship_schedule} />
                  <Box
                    p={8}
                    bg="gray.0"
                    style={{ borderRadius: 6, border: "1px solid #e9ecef" }}
                  >
                    <Text size="xs" c="dimmed" mb={2} fw={600}>
                      Date Status
                    </Text>
                    <Badge
                      color={
                        prod?.ship_status === "confirmed"
                          ? "green"
                          : prod?.ship_status === "tentative"
                          ? "orange"
                          : "gray"
                      }
                      variant="light"
                    >
                      {prod?.ship_status || "Unprocessed"}
                    </Badge>
                  </Box>
                  <Box
                    p={8}
                    bg="gray.0"
                    style={{ borderRadius: 6, border: "1px solid #e9ecef" }}
                  >
                    <Text size="xs" c="dimmed" mb={2} fw={600}>
                      Shipped?
                    </Text>
                    <Badge
                      color={install?.has_shipped ? "green" : "red"}
                      variant="filled"
                    >
                      {install?.has_shipped ? "YES" : "NO"}
                    </Badge>
                    {install?.partially_shipped && (
                      <Badge color="orange" variant="outline" mx={4}>
                        Partially Shipped
                      </Badge>
                    )}
                  </Box>
                </SimpleGrid>
              </Card>

              {/* Notes */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <SectionTitle
                  icon={FaClipboardList}
                  title="Site Notes"
                  color="gray"
                />
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {install?.installation_notes || "No notes available."}
                </Text>
              </Card>

              {/* Related Service Orders */}
              <RelatedServiceOrders jobId={jobId} readOnly />
              <RelatedBackorders jobId={String(jobId)} readOnly />
            </Stack>
          </Grid.Col>

          {/* RIGHT COLUMN: Timelines */}
          <Grid.Col span={{ base: 12, lg: 2 }}>
            <Stack gap="md">
              {/* Installation Phase */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <SectionTitle
                  icon={FaCalendarCheck}
                  title="Installation Phase"
                  color="violet"
                />
                <Timeline active={-1} bulletSize={24} lineWidth={2}>
                  {installSteps.map((step, idx) => (
                    <Timeline.Item
                      key={idx}
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
                      title={step.label}
                      lineVariant={step.isCompleted ? "solid" : "dashed"}
                    >
                      <Text size="xs" c="dimmed">
                        {step.isCompleted ? "Completed" : "Pending"}
                      </Text>
                      {step.date && (
                        <Text size="xs" fw={500}>
                          {dayjs(step.date).format("YYYY-MM-DD, HH:mm")}
                        </Text>
                      )}
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Card>

              {/* Production Progress */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <SectionTitle
                  icon={FaCogs}
                  title="Production History"
                  color="gray"
                />
                <Timeline active={-1} bulletSize={20} lineWidth={2}>
                  {actualSteps.map((step, idx) => (
                    <Timeline.Item
                      key={idx}
                      bullet={
                        <Box
                          style={{
                            backgroundColor: step.isCompleted
                              ? "#28a745"
                              : "#f1f3f5",
                            borderRadius: "50%",
                            width: 20,
                            height: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            aspectRatio: 1,
                            color: step.isCompleted ? "white" : "#adb5bd",
                          }}
                        >
                          {step.isCompleted ? (
                            <FaCheckCircle size={10} />
                          ) : (
                            step.icon
                          )}
                        </Box>
                      }
                      title={step.label}
                      lineVariant={step.isCompleted ? "solid" : "dashed"}
                    >
                      {step.date && (
                        <Text size="xs" c="dimmed">
                          {dayjs(step.date).format("YYYY-MM-DD, HH:mm")}
                        </Text>
                      )}
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Card>
            </Stack>
          </Grid.Col>
        </Grid>
      </Box>
    </Container>
  );
}
