"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Views } from "@/types/db";
import {
  ProductionSchedulePdf,
  ShippingReportJob,
} from "@/documents/ProductionSchedulePdf";
import dynamic from "next/dynamic";
import {
  Loader,
  Center,
  Group,
  Title,
  Text,
  Stack,
  ThemeIcon,
  Container,
  Paper,
  Switch,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { FaCalendarAlt } from "react-icons/fa";
import dayjs from "dayjs";
import { useSupabase } from "@/hooks/useSupabase";
import { colors } from "@/theme";
import { useDebouncedValue } from "@mantine/hooks";
import { formatProductionScheduleData } from "@/utils/reportFormatters";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <Center h="100%">
        <Loader color="violet" />
      </Center>
    ),
  }
);

export default function ProductionScheduleReport() {
  const { supabase, isAuthenticated } = useSupabase();
  const [showPrior, setShowPrior] = useState(false);
  const [debouncedShowPrior] = useDebouncedValue(showPrior, 600);

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    dayjs().subtract(1, "day").toDate(),
    dayjs().add(7, "day").toDate(),
  ]);
  const [debouncedDateRange] = useDebouncedValue(dateRange, 600);

  const {
    data: reportData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [
      "production_schedule_report",
      debouncedDateRange,
      debouncedShowPrior,
    ],
    queryFn: async () => {
      if (!debouncedDateRange[0] || !debouncedDateRange[1]) return [];

      const startDate = dayjs(debouncedDateRange[0]).format("YYYY-MM-DD");
      const endDate = dayjs(debouncedDateRange[1]).format("YYYY-MM-DD");

      let query = supabase
        .from("plant_production_view")
        .select("*")
        .not("has_shipped", "is", true)
        .not("wrap_date", "is", null)
        .lte("wrap_date", endDate);

      if (!debouncedShowPrior) {
        query = query.gte("wrap_date", startDate);
      }

      const { data, error } = await query
        .order("wrap_date", { ascending: true })
        .order("job_number", { ascending: true });

      if (error) throw error;
      return data as Views<"plant_production_view">[];
    },
    enabled:
      isAuthenticated && !!debouncedDateRange[0] && !!debouncedDateRange[1],
  });

  const formattedData: ShippingReportJob[] = useMemo(() => {
    return formatProductionScheduleData(reportData || []);
  }, [reportData]);

  const memoizedPreview = useMemo(
    () => (
      <PDFViewer
        key={Math.random()}
        width="100%"
        height="100%"
        style={{ border: "none" }}
      >
        <ProductionSchedulePdf
          data={formattedData}
          startDate={debouncedDateRange[0]}
          endDate={debouncedDateRange[1]}
        />
      </PDFViewer>
    ),
    [formattedData, debouncedDateRange, debouncedShowPrior]
  );

  const isDebouncing =
    showPrior !== debouncedShowPrior || dateRange !== debouncedDateRange;

  return (
    <Container size="100%" p="md">
      <Stack gap="lg">
        <Paper p="md" radius="md" shadow="sm" bg="white">
          <Group justify="space-between" align="flex-end">
            <Group>
              <ThemeIcon
                size={50}
                radius="md"
                variant="gradient"
                gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
              >
                <FaCalendarAlt size={26} />
              </ThemeIcon>
              <Stack gap={0}>
                <Title order={2} style={{ color: "#343a40" }}>
                  Production Schedule Report
                </Title>
                <Text size="sm" c="dimmed">
                  Generate PDF report by wrap date range.
                </Text>
              </Stack>
            </Group>
            <Group align="flex-end">
              <Switch
                label="Show Prior"
                checked={showPrior}
                onChange={(event) => setShowPrior(event.currentTarget.checked)}
                color="violet"
                size="md"
                mb={8}
              />
              <DatePickerInput
                type="range"
                allowSingleDateInRange
                label="Report Date Range"
                placeholder="Select dates"
                value={dateRange}
                onChange={(val) =>
                  setDateRange(val as [Date | null, Date | null])
                }
                style={{ width: 300 }}
                clearable={false}
              />
            </Group>
          </Group>
        </Paper>

        <Paper
          shadow="md"
          p={0}
          radius="md"
          style={{
            height: "calc(100vh - 200px)",
            overflow: "hidden",
            border: `1px solid ${colors.gray?.border || "#e0e0e0"}`,
          }}
        >
          {!dateRange[0] || !dateRange[1] ? (
            <Center h="100%">
              <Text c="dimmed">
                Please select a date range to view the report.
              </Text>
            </Center>
          ) : isLoading || isDebouncing ? (
            <Center h="100%">
              <Loader type="bars" size="xl" color="violet" />
            </Center>
          ) : isError ? (
            <Center h="100%">
              <Text c="red">
                Error generating report: {(error as Error).message}
              </Text>
            </Center>
          ) : formattedData.length > 0 ? (
            memoizedPreview
          ) : (
            <Center h="100%">
              <Stack align="center" gap="xs">
                <ThemeIcon color="violet" variant="light" size={60} radius="xl">
                  <FaCalendarAlt size={30} />
                </ThemeIcon>
                <Text size="lg" fw={500} c="dimmed">
                  No records found for this period.
                </Text>
              </Stack>
            </Center>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
