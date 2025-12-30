"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import {
  Grid,
  Paper,
  Stack,
  Text,
  Title,
  Group,
  rem,
  Loader,
  Center,
  Container,
  Box,
  ThemeIcon,
  Divider,
  Tooltip,
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
  FaCalendarCheck,
  FaHardHat,
  FaCheckCircle,
  FaShoppingBag,
} from "react-icons/fa";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

import { useSupabase } from "@/hooks/useSupabase";
import { usePermissions } from "@/hooks/usePermissions";
import { Tables } from "@/types/db";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

type DashboardView =
  | "OVERVIEW"
  | "DESIGNER"
  | "PRODUCTION"
  | "INSTALLATION"
  | "SERVICE"
  | "PLANT";

// Modified type to include the nested jobs relation we will fetch
type SalesTrendData = Pick<
  Tables<"sales_orders">,
  "designer" | "created_at"
> & {
  jobs?: { job_base_number: number }[] | { job_base_number: number } | null;
};

interface DashboardMetrics {
  totalQuotes?: number;
  totalSold?: number;
  fiscalLabel?: string;
  monthlyChartData?: { label: string; count: number }[];
  topDesigners?: { name: string; count: number }[];

  myTotalQuotes?: number;
  myTotalSold?: number;

  prodTotalJobs?: number;
  prodPendingOrders?: number;

  plantActiveJobs?: number;
  plantShipmentsMonth?: number;

  pendingPlacement?: {
    prod_id: number;
    job_number: string;
    created_at: string;
  }[];
  upcomingShipments?: {
    prod_id: number;
    ship_schedule: string | null;
    job_number: string;
  }[];

  pendingInstalls?: number;
  activeInstallers?: number;
  completedInstallsYear?: number;

  openServiceOrders?: number;
  completedServiceOrders?: number;
}

const GRADIENTS = {
  blue: { from: "#4facfe", to: "#3700ffff", deg: 45 },
  teal: { from: "#43e97b", to: "#004105ff", deg: 45 },
  orange: { from: "#fa709a", to: "#ff6600ff", deg: 45 },
  red: { from: "#ff0844", to: "#ffb199", deg: 45 },
  purple: { from: "#8E2DE2", to: "#4A00E0", deg: 45 },
};

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
            gradient={GRADIENTS[color]}
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
          gradient={GRADIENTS[color]}
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
  yearLabel,
}: {
  data: { label: string; count: number }[];
  yearLabel: string;
}) => {
  const maxCount = Math.max(...data.map((d) => d.count || 0), 1);

  return (
    <Paper p="md" shadow="sm" radius="md" withBorder style={{ height: "100%" }}>
      <Group justify="space-between" mb="md">
        <Title order={5} c="dimmed">
          Sales Volume ({yearLabel})
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
              <Tooltip
                label={`${count} ${count === 1 ? "Sale" : "Sales"}`}
                withArrow
              >
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
                {item.label}
              </Text>
            </Stack>
          );
        })}
      </Group>
    </Paper>
  );
};

export default function ManagerDashboardClient() {
  const { supabase, isAuthenticated } = useSupabase();
  const { user } = useUser();
  const permissions = usePermissions();

  const [currentView, setCurrentView] = useState<DashboardView>("OVERVIEW");

  useEffect(() => {
    if (permissions.isDesigner) setCurrentView("DESIGNER");
    else if (permissions.isScheduler) setCurrentView("PRODUCTION");
    else if (permissions.isInstaller) setCurrentView("INSTALLATION");
    else if (permissions.isService) setCurrentView("SERVICE");
    else if (permissions.isPlant) setCurrentView("PLANT");
    else setCurrentView("OVERVIEW");
  }, [permissions]);

  const {
    data: metrics,
    isLoading,
    isError,
  } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard-metrics", currentView, user?.id],
    enabled: isAuthenticated && !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const fiscalStart = dayjs().month(1).date(1).startOf("day");
      const fiscalStartISO = (
        dayjs().month() < 1 ? fiscalStart.subtract(1, "year") : fiscalStart
      ).toISOString();
      const fiscalYearLabel = `FY ${dayjs(fiscalStartISO).year()}`;

      const todayISO = dayjs().startOf("day").toISOString();

      // Generic helper to count unique values in a dataset
      const getUniqueCount = (data: any[], key: string, nestedKey?: string) => {
        if (!data || data.length === 0) return 0;
        const uniqueValues = new Set();
        data.forEach((item) => {
          let val;
          const relation = item[key];

          if (nestedKey && relation) {
            // Handle array vs object relation
            if (Array.isArray(relation)) {
              // If multiple related items (e.g. split jobs), consider all
              relation.forEach((relItem) => {
                if (relItem[nestedKey])
                  uniqueValues.add(String(relItem[nestedKey]));
              });
              return; // Skip default add
            } else {
              val = relation[nestedKey];
            }
          } else {
            val = relation;
          }

          if (val !== undefined && val !== null && val !== "") {
            uniqueValues.add(String(val));
          }
        });
        return uniqueValues.size;
      };

      const processSalesChart = (salesData: SalesTrendData[]) => {
        const monthlyCounts: Record<string, number> = {};
        const designerCounts: Record<string, number> = {};
        const seenJobBaseNumbers = new Set<string>();

        let loopDate = dayjs(fiscalStartISO);

        const chartData = Array.from({ length: 12 }).map(() => {
          const key = loopDate.format("YYYY-MM");
          monthlyCounts[key] = 0;
          const label = loopDate.format("MMM");
          loopDate = loopDate.add(1, "month");
          return { label, key, count: 0 };
        });

        salesData.forEach((s) => {
          // Identify Job Base Number
          let baseNumber: string | null = null;

          if (s.jobs) {
            if (Array.isArray(s.jobs) && s.jobs.length > 0) {
              baseNumber = String(s.jobs[0].job_base_number);
            } else if (
              !Array.isArray(s.jobs) &&
              (s.jobs as any).job_base_number
            ) {
              baseNumber = String((s.jobs as any).job_base_number);
            }
          }

          // Fallback: If no job relation, use row ID as unique (mostly for quotes or error states, but this fn is for Sold)
          const uniqueKey = baseNumber || `no-job-${s.created_at}`;

          if (baseNumber && seenJobBaseNumbers.has(baseNumber)) {
            return; // Skip duplicate base numbers
          }
          if (baseNumber) seenJobBaseNumbers.add(baseNumber);

          if (s.created_at) {
            const mKey = dayjs(s.created_at).format("YYYY-MM");
            if (monthlyCounts[mKey] !== undefined) monthlyCounts[mKey]++;
          }
          const designer = s.designer || "Unknown";
          designerCounts[designer] = (designerCounts[designer] || 0) + 1;
        });

        const finalChartData = chartData.map((d) => ({
          label: d.label,
          count: monthlyCounts[d.key] || 0,
        }));

        const topDesigners = Object.entries(designerCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));

        return { finalChartData, topDesigners };
      };

      const flattenJobRelation = (data: any[]) => {
        return data.map((item: any) => {
          const jobObj = Array.isArray(item.jobs) ? item.jobs[0] : item.jobs;
          return {
            prod_id: item.prod_id,
            ship_schedule: item.ship_schedule || null,
            job_number: jobObj?.job_number || "—",
            created_at: jobObj?.created_at,
          };
        });
      };

      if (currentView === "OVERVIEW") {
        const [quotes, sold, service, activeJobs, salesData, shipments] =
          await Promise.all([
            // Quotes don't have base numbers yet
            supabase
              .from("sales_orders")
              .select("id", { count: "exact", head: true })
              .eq("stage", "QUOTE"),

            // Total Sold: Fetch jobs relation for deduplication
            supabase
              .from("sales_orders")
              .select("id, jobs!inner(job_base_number)")
              .eq("stage", "SOLD")
              .gte("created_at", fiscalStartISO),

            supabase
              .from("service_orders")
              .select("*", { count: "exact", head: true })
              .is("completed_at", null),

            // Active Jobs: Already has base number
            supabase
              .from("jobs")
              .select(
                "job_base_number, installation!inner(wrap_completed, wrap_date)"
              )
              .eq("is_active", true)
              .not("installation.wrap_date", "is", null)
              .is("installation.wrap_completed", null),

            // Sales Chart Data: Fetch jobs relation for deduplication
            supabase
              .from("sales_orders")
              .select("designer, created_at, jobs!inner(job_base_number)")
              .eq("stage", "SOLD")
              .gte("created_at", fiscalStartISO),

            supabase
              .from("production_schedule")
              .select("prod_id, ship_schedule, jobs(job_number)")
              .gte("ship_schedule", todayISO)
              .order("ship_schedule", { ascending: true })
              .limit(5),
          ]);

        const { finalChartData, topDesigners } = processSalesChart(
          (salesData.data as any[]) || []
        );

        return {
          totalQuotes: quotes.count || 0,
          totalSold: getUniqueCount(sold.data || [], "jobs", "job_base_number"),
          openServiceOrders: service.count || 0,
          prodTotalJobs: getUniqueCount(
            activeJobs.data || [],
            "job_base_number"
          ),
          fiscalLabel: fiscalYearLabel,
          monthlyChartData: finalChartData,
          topDesigners,
          upcomingShipments: flattenJobRelation(shipments.data || []),
        };
      }

      if (currentView === "PRODUCTION") {
        const startOfWeek = dayjs().startOf("week").toISOString();
        const endOfWeek = dayjs().endOf("week").toISOString();

        const [pendingCount, shipments, pendingPlace, pendingOrders] =
          await Promise.all([
            supabase
              .from("production_schedule")
              .select("prod_id, jobs!inner(job_base_number)")
              .is("placement_date", null)
              .eq("jobs.is_active", true),

            supabase
              .from("production_schedule")
              .select("prod_id, ship_schedule, jobs(job_number)")
              .gte("ship_schedule", todayISO)
              .order("ship_schedule", { ascending: true })
              .limit(5),

            supabase
              .from("production_schedule")
              .select(
                "prod_id, placement_date, jobs!inner(job_number, created_at)"
              )
              .is("placement_date", null)
              .eq("jobs.is_active", true)
              .limit(5),

            // Fetch job_base_number from purchasing view for deduplication
            supabase
              .from("purchasing_table_view")
              .select(
                "job_base_number, doors_ordered_at, doors_received_at, glass_ordered_at, glass_received_at, handles_ordered_at, handles_received_at, acc_ordered_at, acc_received_at"
              )
              .gte("ship_schedule", startOfWeek)
              .lte("ship_schedule", endOfWeek),
          ]);

        // Filter for pending, then count unique base numbers
        const pendingOrdersUniqueCount = (() => {
          const rawPending = (pendingOrders.data || []).filter((row) => {
            const isPending = (
              ordered: string | null,
              received: string | null
            ) => ordered && !received;

            return (
              isPending(row.doors_ordered_at, row.doors_received_at) ||
              isPending(row.glass_ordered_at, row.glass_received_at) ||
              isPending(row.handles_ordered_at, row.handles_received_at) ||
              isPending(row.acc_ordered_at, row.acc_received_at)
            );
          });
          return getUniqueCount(rawPending, "job_base_number");
        })();

        return {
          prodTotalJobs: getUniqueCount(
            pendingCount.data || [],
            "jobs",
            "job_base_number"
          ),
          prodPendingOrders: pendingOrdersUniqueCount,
          upcomingShipments: flattenJobRelation(shipments.data || []),
          pendingPlacement: flattenJobRelation(pendingPlace.data || []),
        };
      }

      if (currentView === "PLANT") {
        const startOfMonth = dayjs().startOf("month").toISOString();
        const endOfMonth = dayjs().endOf("month").toISOString();

        const [activeNotWrapped, shipmentsMonth, shipments] = await Promise.all(
          [
            supabase
              .from("jobs")
              .select(
                "job_base_number, installation!inner(wrap_completed, wrap_date)"
              )
              .eq("is_active", true)
              .not("installation.wrap_date", "is", null)
              .is("installation.wrap_completed", null),

            supabase
              .from("production_schedule")
              .select("prod_id, jobs!inner(job_base_number)")
              .gte("ship_schedule", startOfMonth)
              .lte("ship_schedule", endOfMonth),

            supabase
              .from("production_schedule")
              .select("prod_id, ship_schedule, jobs(job_number)")
              .gte("ship_schedule", todayISO)
              .order("ship_schedule", { ascending: true })
              .limit(5),
          ]
        );

        return {
          plantActiveJobs: getUniqueCount(
            activeNotWrapped.data || [],
            "job_base_number"
          ),
          plantShipmentsMonth: getUniqueCount(
            shipmentsMonth.data || [],
            "jobs",
            "job_base_number"
          ),
          upcomingShipments: flattenJobRelation(shipments.data || []),
        };
      }

      if (currentView === "INSTALLATION") {
        const [pending, completedYear, active] = await Promise.all([
          supabase
            .from("installation")
            .select("id, jobs!inner(job_base_number)")
            .is("installation_date", null),
          supabase
            .from("installation")
            .select("id, jobs!inner(job_base_number)")
            .not("installation_completed", "is", null)
            .gte("installation_date", fiscalStartISO),
          supabase
            .from("installers")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true),
        ]);

        return {
          pendingInstalls: getUniqueCount(
            pending.data || [],
            "jobs",
            "job_base_number"
          ),
          completedInstallsYear: getUniqueCount(
            completedYear.data || [],
            "jobs",
            "job_base_number"
          ),
          activeInstallers: active.count || 0,
        };
      }

      if (currentView === "SERVICE") {
        const [open, closedMonth] = await Promise.all([
          supabase
            .from("service_orders")
            .select("*", { count: "exact", head: true })
            .is("completed_at", null),
          supabase
            .from("service_orders")
            .select("*", { count: "exact", head: true })
            .not("completed_at", "is", null)
            .gte("completed_at", dayjs().startOf("month").toISOString()),
        ]);

        return {
          openServiceOrders: open.count || 0,
          completedServiceOrders: closedMonth.count || 0,
        };
      }

      if (currentView === "DESIGNER") {
        const [quotes, sold, salesData] = await Promise.all([
          supabase
            .from("sales_orders")
            .select("*", { count: "exact", head: true })
            .eq("stage", "QUOTE")
            .ilike("designer", `%${user?.username || ""}%`),
          supabase
            .from("sales_orders")
            .select("id, jobs!inner(job_base_number)")
            .eq("stage", "SOLD")
            .gte("created_at", fiscalStartISO)
            .ilike("designer", `%${user?.username || ""}%`),
          supabase
            .from("sales_orders")
            .select("designer, created_at, jobs!inner(job_base_number)")
            .eq("stage", "SOLD")
            .gte("created_at", fiscalStartISO)
            .ilike("designer", `%${user?.username || ""}%`),
        ]);

        const { finalChartData, topDesigners } = processSalesChart(
          (salesData.data as any[]) || []
        );

        return {
          myTotalQuotes: quotes.count || 0,
          myTotalSold: getUniqueCount(
            sold.data || [],
            "jobs",
            "job_base_number"
          ),
          fiscalLabel: fiscalYearLabel,
          monthlyChartData: finalChartData,
          topDesigners,
        };
      }

      return {};
    },
  });

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

  if (isError) {
    return (
      <Center h="100vh">
        <Text c="red" fw={500}>
          Unable to load dashboard data.
        </Text>
      </Center>
    );
  }

  return (
    <Container size="100%" p="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end">
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
                {currentView === "OVERVIEW"
                  ? "Overview"
                  : currentView.charAt(0) +
                    currentView.slice(1).toLowerCase()}{" "}
                Dashboard
              </Title>
              <Text size="sm" c="dimmed">
                {currentView === "OVERVIEW"
                  ? "Operational Overview & Sales Performance"
                  : `Metrics for ${currentView}`}
              </Text>
            </Stack>
          </Group>
        </Group>

        <Divider />

        {currentView === "OVERVIEW" && metrics && (
          <>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <StatCard
                  title="Active Quotes"
                  value={metrics.totalQuotes || 0}
                  icon={FaUsers}
                  color="blue"
                  subtext="Pending"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <StatCard
                  title="Sold Jobs"
                  value={metrics.totalSold || 0}
                  icon={FaHome}
                  color="teal"
                  subtext={metrics.fiscalLabel}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <StatCard
                  title="In Production"
                  value={metrics.prodTotalJobs || 0}
                  icon={FaClipboardList}
                  color="orange"
                  subtext="Active Jobs"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <StatCard
                  title="Open Service Orders"
                  value={metrics.openServiceOrders || 0}
                  icon={FaTools}
                  color="red"
                  subtext="Pending Resolution"
                />
              </Grid.Col>
            </Grid>

            <Grid>
              <Grid.Col span={{ base: 12, md: 8 }}>
                <SalesSpikeChart
                  data={metrics.monthlyChartData || []}
                  yearLabel={metrics.fiscalLabel || ""}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper p="md" shadow="sm" radius="md" withBorder h="100%">
                  <Group justify="space-between" mb="md">
                    <Title order={5} c="dimmed">
                      Upcoming Shipments
                    </Title>
                    <FaShippingFast color="gray" />
                  </Group>
                  <Stack gap="xs">
                    {metrics.upcomingShipments &&
                    metrics.upcomingShipments.length > 0 ? (
                      metrics.upcomingShipments.map((job, idx) => (
                        <Paper key={idx} withBorder p="xs" bg="gray.0">
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
                              #{job.job_number}
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
          </>
        )}

        {currentView === "PRODUCTION" && metrics && (
          <>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <StatCard
                  title="Active Jobs"
                  value={metrics.prodTotalJobs || 0}
                  icon={FaClipboardList}
                  color="blue"
                  subtext="Not Wrapped"
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <StatCard
                  title="Unscheduled"
                  value={metrics.pendingPlacement?.length || 0}
                  icon={FaCalendarCheck}
                  color="red"
                  subtext="No Placement Date"
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <StatCard
                  title="Pending Orders"
                  value={metrics.prodPendingOrders || 0}
                  icon={FaShoppingBag}
                  color="orange"
                  subtext="Shipping This Week"
                />
              </Grid.Col>
            </Grid>

            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" shadow="sm" radius="md" withBorder h="100%">
                  <Group justify="space-between" mb="md">
                    <Title order={5} c="dimmed">
                      Pending Placement
                    </Title>
                    <FaCalendarCheck color="gray" />
                  </Group>
                  <Stack gap="xs">
                    {metrics.pendingPlacement?.slice(0, 5).map((job) => (
                      <Paper key={job.prod_id} withBorder p="xs" bg="gray.0">
                        <Group justify="space-between">
                          <Text size="sm" fw={700}>
                            Job #{job.job_number}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {dayjs(job.created_at).format("MMM D")}
                          </Text>
                        </Group>
                      </Paper>
                    ))}
                    {(metrics.pendingPlacement?.length || 0) === 0 && (
                      <Text c="dimmed" fs="italic" size="sm">
                        All jobs scheduled.
                      </Text>
                    )}
                  </Stack>
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" shadow="sm" radius="md" withBorder h="100%">
                  <Group justify="space-between" mb="md">
                    <Title order={5} c="dimmed">
                      Upcoming Shipments
                    </Title>
                    <FaShippingFast color="gray" />
                  </Group>
                  <Stack gap="xs">
                    {metrics.upcomingShipments?.slice(0, 5).map((job, idx) => (
                      <Paper key={idx} withBorder p="xs" bg="gray.0">
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
                            #{job.job_number}
                          </Text>
                        </Group>
                      </Paper>
                    ))}
                    {(metrics.upcomingShipments?.length || 0) === 0 && (
                      <Text c="dimmed" fs="italic" size="sm">
                        No shipments soon.
                      </Text>
                    )}
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>
          </>
        )}

        {currentView === "PLANT" && metrics && (
          <>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <StatCard
                  title="Active on Floor"
                  value={metrics.plantActiveJobs || 0}
                  icon={FaClipboardList}
                  color="blue"
                  subtext="Jobs Not Wrapped"
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6 }}>
                <StatCard
                  title="Shipments (Month)"
                  value={metrics.plantShipmentsMonth || 0}
                  icon={FaShippingFast}
                  color="teal"
                  subtext="Total Scheduled"
                />
              </Grid.Col>
            </Grid>

            <Grid>
              <Grid.Col span={12}>
                <Paper p="md" shadow="sm" radius="md" withBorder h="100%">
                  <Group justify="space-between" mb="md">
                    <Title order={5} c="dimmed">
                      Upcoming Shipments
                    </Title>
                    <FaShippingFast color="gray" />
                  </Group>
                  <Stack gap="xs">
                    {metrics.upcomingShipments?.slice(0, 5).map((job, idx) => (
                      <Paper key={idx} withBorder p="xs" bg="gray.0">
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
                            #{job.job_number}
                          </Text>
                        </Group>
                      </Paper>
                    ))}
                    {(metrics.upcomingShipments?.length || 0) === 0 && (
                      <Text c="dimmed" fs="italic" size="sm">
                        No shipments soon.
                      </Text>
                    )}
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>
          </>
        )}

        {currentView === "INSTALLATION" && metrics && (
          <Grid>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <StatCard
                title="Pending Schedule"
                value={metrics.pendingInstalls || 0}
                icon={FaCalendarCheck}
                color="blue"
                subtext="Not assigned yet"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <StatCard
                title="Completed (Year)"
                value={metrics.completedInstallsYear || 0}
                icon={FaHardHat}
                color="teal"
                subtext="Installations Done"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <StatCard
                title="Active Installers"
                value={metrics.activeInstallers || 0}
                icon={FaUsers}
                color="orange"
                subtext="Available Teams"
              />
            </Grid.Col>
          </Grid>
        )}

        {currentView === "SERVICE" && metrics && (
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <StatCard
                title="Open Orders"
                value={metrics.openServiceOrders || 0}
                icon={FaTools}
                color="red"
                subtext="Require Attention"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <StatCard
                title="Closed (Month)"
                value={metrics.completedServiceOrders || 0}
                icon={FaCheckCircle}
                color="teal"
                subtext="Service Orders Closed"
              />
            </Grid.Col>
          </Grid>
        )}

        {currentView === "DESIGNER" && metrics && (
          <>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <StatCard
                  title="My Active Quotes"
                  value={metrics.myTotalQuotes || 0}
                  icon={FaUsers}
                  color="blue"
                  subtext="Pending Quotes"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <StatCard
                  title="My Sold Jobs"
                  value={metrics.myTotalSold || 0}
                  icon={FaHome}
                  color="teal"
                  subtext={`My Sales ${metrics.fiscalLabel}`}
                />
              </Grid.Col>
            </Grid>
            <Grid>
              <Grid.Col span={12}>
                <SalesSpikeChart
                  data={metrics.monthlyChartData || []}
                  yearLabel={metrics.fiscalLabel || ""}
                />
              </Grid.Col>
            </Grid>
          </>
        )}
      </Stack>
    </Container>
  );
}
