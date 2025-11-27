"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Grid,
  Paper,
  Stack,
  Text,
  Title,
  Group,
  RingProgress,
  rem,
  Loader,
  Center,
  Container,
  Box,
  ThemeIcon,
  Divider,
  Tooltip,
  Badge,
} from "@mantine/core";
import {
  FaChartBar,
  FaClipboardList,
  FaHome,
  FaShippingFast,
  FaTools,
  FaUsers,
  FaExclamationCircle,
  FaClock,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import { Tables } from "@/types/db";
import { useMemo } from "react";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// --- 1. Type Definitions ---
// We only fetch specific fields now
type SalesTrendData = Pick<Tables<"sales_orders">, "designer" | "created_at">;

// Gradient Palette
const GRADIENTS = {
  blue: { from: "#4facfe", to: "#3700ffff", deg: 45 },
  teal: { from: "#43e97b", to: "#004105ff", deg: 45 },
  orange: { from: "#fa709a", to: "#ff6600ff", deg: 45 },
  red: { from: "#ff0844", to: "#ffb199", deg: 45 },
  purple: { from: "#8E2DE2", to: "#4A00E0", deg: 45 },
};

// --- 2. UI Components ---

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  subtext,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: keyof typeof GRADIENTS;
  subtext?: string;
}) => {
  const gradient = GRADIENTS[color];
  return (
    <Paper p="md" shadow="sm" radius="md" withBorder style={{ height: "100%" }}>
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
            {title}
          </Text>
          <Text
            fw={700}
            size={rem(28)}
            variant="gradient"
            gradient={gradient}
            style={{ lineHeight: 1 }}
          >
            {value}
          </Text>
          {subtext && (
            <Text size="xs" c="dimmed" mt={4}>
              {subtext}
            </Text>
          )}
        </Stack>
        <ThemeIcon
          size="lg"
          radius="md"
          variant="gradient"
          gradient={gradient}
          style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
        >
          <Icon size={18} color="white" />
        </ThemeIcon>
      </Group>
    </Paper>
  );
};

const SalesSpikeChart = ({
  data,
}: {
  data: { label: string; count: number }[];
}) => {
  const maxCount = Math.max(...data.map((d) => d.count || 0), 1);

  return (
    <Paper p="md" shadow="sm" radius="md" withBorder style={{ height: "100%" }}>
      <Group justify="space-between" mb="md">
        <Title order={5} c="dimmed">
          Monthly Sales Volume (12 Mo)
        </Title>
        <FaChartBar color="#4A00E0" />
      </Group>

      <Group
        align="flex-end"
        justify="space-between"
        style={{ height: rem(180), width: "100%" }}
        gap={4}
      >
        {data.map((item) => {
          const count = item.count || 0;
          const heightPercent = (count / maxCount) * 100;

          return (
            <Stack
              key={item.label}
              gap={4}
              align="center"
              justify="flex-end"
              style={{ flex: 1, height: "100%" }}
            >
              <Tooltip label={`${count} Sales`} withArrow>
                <Box
                  style={{
                    width: "80%",
                    height: `${heightPercent}%`,
                    background:
                      "linear-gradient(180deg, #8E2DE2 0%, #4A00E0 100%)",
                    borderRadius: "4px 4px 0 0",
                    opacity: count === 0 ? 0.1 : 1,
                    minHeight: rem(4),
                    transition: "height 0.3s ease",
                  }}
                />
              </Tooltip>
              <Text
                size="xs"
                c="dimmed"
                style={{ fontSize: "10px", whiteSpace: "nowrap" }}
              >
                {item.label.split(" ")[0]}
              </Text>
            </Stack>
          );
        })}
      </Group>
    </Paper>
  );
};

// --- 3. Optimized Data Fetching ---
export default function ManagerDashboardClient() {
  const { supabase, isAuthenticated } = useSupabase();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["manager-dashboard-optimized"],
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    queryFn: async () => {
      const todayISO = dayjs().startOf("day").toISOString();
      const oneYearAgoISO = dayjs()
        .subtract(11, "month")
        .startOf("month")
        .toISOString();

      // Execute all optimized queries in parallel
      const [
        quotesRes,
        soldRes,
        serviceRes,
        prodTotalRes,
        prodIncompleteRes,
        salesTrendRes,
        shipmentsRes,
      ] = await Promise.all([
        // 1. Count Active Quotes
        supabase
          .from("sales_orders")
          .select("*", { count: "exact", head: true })
          .eq("stage", "QUOTE"),

        // 2. Count Total Sold Jobs (Lifetime)
        supabase
          .from("sales_orders")
          .select("*", { count: "exact", head: true })
          .eq("stage", "SOLD"),

        // 3. Count Open Service Orders
        supabase
          .from("service_orders")
          .select("*", { count: "exact", head: true })
          .is("completed_at", null),

        // 4. Count Total Production Jobs
        supabase
          .from("production_schedule")
          .select("*", { count: "exact", head: true }),

        // 5. Count Incomplete Production Jobs (Assembly not done)
        supabase
          .from("production_schedule")
          .select("*", { count: "exact", head: true })
          .is("assembly_completed_actual", null),

        // 6. Fetch Sales Trend Data (Last 12 Months Only)
        // Optimized: Only fetching designer & date, filtered by date
        supabase
          .from("sales_orders")
          .select("designer, created_at")
          .eq("stage", "SOLD")
          .gte("created_at", oneYearAgoISO),

        // 7. Fetch Upcoming Shipments (Limit 5)
        // Optimized: Uses DB ordering and limiting
        supabase
          .from("production_schedule")
          .select("prod_id, ship_schedule, jobs(job_number)")
          .gte("ship_schedule", todayISO)
          .order("ship_schedule", { ascending: true })
          .limit(5),
      ]);

      // Error Handling
      if (quotesRes.error) throw quotesRes.error;
      if (soldRes.error) throw soldRes.error;
      if (serviceRes.error) throw serviceRes.error;
      if (prodTotalRes.error) throw prodTotalRes.error;
      if (prodIncompleteRes.error) throw prodIncompleteRes.error;
      if (salesTrendRes.error) throw salesTrendRes.error;
      if (shipmentsRes.error) throw shipmentsRes.error;

      return {
        countQuotes: quotesRes.count || 0,
        countSold: soldRes.count || 0,
        countOpenService: serviceRes.count || 0,
        countProdTotal: prodTotalRes.count || 0,
        countProdIncomplete: prodIncompleteRes.count || 0,
        salesTrend: salesTrendRes.data as SalesTrendData[],
        upcomingShipments: shipmentsRes.data || [],
      };
    },
  });

  // --- 4. Logic & Transformation (Fast) ---
  const metrics = useMemo(() => {
    if (!data) return null;

    // A. Chart Data Preparation
    const monthlyCounts: Record<string, number> = {};
    const designerCounts: Record<string, number> = {};

    // Initialize 12 buckets
    const chartData: { label: string; count: number }[] = [];
    const today = dayjs();
    let loopDate = today.subtract(11, "month").startOf("month");

    for (let i = 0; i < 12; i++) {
      const key = loopDate.format("YYYY-MM");
      monthlyCounts[key] = 0;
      chartData.push({
        label: loopDate.format("MMM YY"), // Label for display
        count: 0, // Placeholder
      });
      loopDate = loopDate.add(1, "month");
    }

    // B. Process Sales Trend Data (Client-side aggregation of the small filtered dataset)
    data.salesTrend.forEach((sale) => {
      // 1. Designer Stats
      const designer = sale.designer || "Unknown";
      designerCounts[designer] = (designerCounts[designer] || 0) + 1;

      // 2. Chart Stats
      if (sale.created_at) {
        const mKey = dayjs(sale.created_at).format("YYYY-MM");
        if (monthlyCounts[mKey] !== undefined) {
          monthlyCounts[mKey]++;
        }
      }
    });

    // Map counts to chart data array (preserving order)
    const finalChartData = chartData.map((d, index) => {
      // Re-calculate key from start date to match the map
      const key = today
        .subtract(11, "month")
        .startOf("month")
        .add(index, "month")
        .format("YYYY-MM");
      return {
        ...d,
        count: monthlyCounts[key] || 0,
      };
    });

    // C. Sort Top Designers
    const topDesigners = Object.entries(designerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // D. Flatten Shipments
    const flatShipments = data.upcomingShipments.map((s: any) => ({
      prod_id: s.prod_id,
      ship_schedule: s.ship_schedule,
      // Handle array or object return from 'jobs' relation
      job_number: Array.isArray(s.jobs)
        ? s.jobs[0]?.job_number
        : s.jobs?.job_number || "—",
    }));

    return {
      totalQuotes: data.countQuotes,
      totalSold: data.countSold,
      openServiceOrders: data.countOpenService,
      totalUncompleteJobs: data.countProdIncomplete,
      totalJobsInProduction: data.countProdTotal,
      topDesigners,
      upcomingShipments: flatShipments,
      monthlyChartData: finalChartData,
    };
  }, [data]);

  if (isLoading) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="xs">
          <Loader size="lg" color="violet" />
          <Text c="dimmed">Loading Dashboard...</Text>
        </Stack>
      </Center>
    );
  }

  if (isError || !metrics) {
    return (
      <Center h="100vh">
        <Text c="red" fw={500}>
          Unable to load dashboard data. Please reload.
        </Text>
      </Center>
    );
  }

  // Calculate Completion Rate
  const { totalJobsInProduction, totalUncompleteJobs } = metrics;
  const finishedJobs = totalJobsInProduction - totalUncompleteJobs;
  const completionRate =
    totalJobsInProduction > 0
      ? Math.round((finishedJobs / totalJobsInProduction) * 100)
      : 0;

  return (
    <Container size="xl" p="lg">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <ThemeIcon
              size={48}
              radius="md"
              variant="gradient"
              gradient={GRADIENTS.purple}
            >
              <FaUsers size={24} />
            </ThemeIcon>
            <Stack gap={0}>
              <Title order={2} style={{ color: "#2C2E33" }}>
                Manager Dashboard
              </Title>
              <Text size="sm" c="dimmed">
                Operational Overview & Sales Performance
              </Text>
            </Stack>
          </Group>
          <Text size="xs" c="dimmed" fs="italic">
            Last Updated: {dayjs().format("MMM D, HH:mm")}
          </Text>
        </Group>

        <Divider />

        {/* 1. KPI CARDS */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Active Quotes"
              value={metrics.totalQuotes}
              icon={FaUsers}
              color="blue"
              subtext="Potential Jobs"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Total Sold Jobs"
              value={metrics.totalSold}
              icon={FaHome}
              color="teal"
              subtext="Converted Orders"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Incomplete Jobs"
              value={metrics.totalUncompleteJobs}
              icon={FaClipboardList}
              color="orange"
              subtext="In Production"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Open Service"
              value={metrics.openServiceOrders}
              icon={FaTools}
              color="red"
              subtext="Pending Resolution"
            />
          </Grid.Col>
        </Grid>

        {/* 2. CHARTS */}
        <Grid>
          {/* Production Progress Ring */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper
              p="md"
              shadow="sm"
              radius="md"
              withBorder
              style={{ height: "100%" }}
            >
              <Title order={5} mb="lg" c="dimmed">
                Shop Floor Throughput
              </Title>
              <Center h={180}>
                <RingProgress
                  size={160}
                  thickness={16}
                  roundCaps
                  label={
                    <Text size="xs" ta="center" c="dimmed" fw={700}>
                      {completionRate}%<br />
                      Complete
                    </Text>
                  }
                  sections={[
                    {
                      value: completionRate,
                      color: "teal",
                      tooltip: `${finishedJobs} Jobs Finished`,
                    },
                    {
                      value: 100 - completionRate,
                      color: "orange",
                      tooltip: `${totalUncompleteJobs} Jobs Incomplete`,
                    },
                  ]}
                />
              </Center>
              <Group justify="center" mt="md" gap="xl">
                <Group gap={4}>
                  <Box
                    w={8}
                    h={8}
                    bg="orange"
                    style={{ borderRadius: "50%" }}
                  />
                  <Text size="xs">{totalUncompleteJobs} Incomplete</Text>
                </Group>
                <Group gap={4}>
                  <Box w={8} h={8} bg="teal" style={{ borderRadius: "50%" }} />
                  <Text size="xs">{finishedJobs} Finished</Text>
                </Group>
              </Group>
            </Paper>
          </Grid.Col>

          {/* Monthly Spike Chart */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <SalesSpikeChart data={metrics.monthlyChartData} />
          </Grid.Col>
        </Grid>

        {/* 3. LISTS */}
        <Grid>
          {/* Top Designers */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" shadow="sm" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Title order={5} c="dimmed">
                  Top Designers (Last 12 Mo)
                </Title>
                <FaUsers color="gray" />
              </Group>
              <Stack gap="sm">
                {metrics.topDesigners.map((d, index) => (
                  <Group key={d.name} justify="space-between">
                    <Group gap="sm">
                      <ThemeIcon
                        variant="gradient"
                        gradient={GRADIENTS.purple}
                        size="sm"
                        radius="xl"
                      >
                        {index + 1}
                      </ThemeIcon>
                      <Text size="sm" fw={500}>
                        {d.name}
                      </Text>
                    </Group>
                    <Badge
                      variant="gradient"
                      gradient={GRADIENTS.blue}
                      radius="sm"
                    >
                      {d.count} Sales
                    </Badge>
                  </Group>
                ))}
                {metrics.topDesigners.length === 0 && (
                  <Text c="dimmed" size="sm" fs="italic">
                    No sales data available.
                  </Text>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Upcoming Shipments */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" shadow="sm" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Title order={5} c="dimmed">
                  Next Scheduled Shipments
                </Title>
                <FaShippingFast color="gray" />
              </Group>
              <Stack gap="xs">
                {metrics.upcomingShipments.length > 0 ? (
                  metrics.upcomingShipments.map((job: any, idx: number) => (
                    <Paper
                      key={idx}
                      withBorder
                      p="xs"
                      bg="var(--mantine-color-gray-0)"
                    >
                      <Group justify="space-between">
                        <Group gap="xs">
                          <FaClock color="gray" size={12} />
                          <Text size="sm" fw={600}>
                            {dayjs(job.ship_schedule).format("ddd, MMM D")}
                          </Text>
                        </Group>
                        <Text
                          size="sm"
                          fw={700}
                          variant="gradient"
                          gradient={GRADIENTS.purple}
                        >
                          Job #{job.job_number}
                        </Text>
                      </Group>
                    </Paper>
                  ))
                ) : (
                  <Group justify="center" p="lg" gap="xs">
                    <FaExclamationCircle color="gray" />
                    <Text c="dimmed" size="sm">
                      No future shipments found.
                    </Text>
                  </Group>
                )}
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
