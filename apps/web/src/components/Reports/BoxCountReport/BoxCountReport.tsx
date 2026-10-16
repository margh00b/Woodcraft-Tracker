"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import {
  Paper,
  Group,
  Text,
  Stack,
  Title,
  ThemeIcon,
  Container,
  Center,
  Loader,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { FaBoxOpen } from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";
import { ShippingReportJob } from "@/documents/ShippingReportPdf";
import { BoxCountReportPdf } from "@/documents/BoxCountPdf";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <Center h="100%">
        <Loader color="violet" />
      </Center>
    ),
  },
);

export default function BoxCountReport() {
  const { supabase, isAuthenticated } = useSupabase();

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    dayjs().startOf("month").toDate(),
    dayjs().endOf("month").toDate(),
  ]);

  const {
    data: reportData,
    isLoading,
    isError,
    error,
  } = useQuery<ShippingReportJob[]>({
    queryKey: ["box_count_report", dateRange],
    queryFn: async () => {
      if (!dateRange[0] || !dateRange[1]) return [];

      const startDate = dayjs(dateRange[0]).format("YYYY-MM-DD");
      const endDate = dayjs(dateRange[1]).format("YYYY-MM-DD");

      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
      id,
      sales_orders (
        cabinet:cabinets (
          box
        )
      ),
      production_schedule!inner (
        ship_schedule
      ),
      installation (
        has_shipped,
        partially_shipped
      )
    `,
        )
        .eq("is_active", true)
        .gte("production_schedule.ship_schedule", startDate)
        .lte("production_schedule.ship_schedule", endDate)
        .order("ship_schedule", {
          referencedTable: "production_schedule",
          ascending: true,
        });

      if (error) throw error;
      return data as unknown as ShippingReportJob[];
    },
    enabled: isAuthenticated && !!dateRange[0] && !!dateRange[1],
  });

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
                <FaBoxOpen size={26} />
              </ThemeIcon>
              <Stack gap={0}>
                <Title order={2} style={{ color: "#343a40" }}>
                  Box Volume Report
                </Title>
                <Text size="sm" c="dimmed">
                  Generate total box counts by shipping date range.
                </Text>
              </Stack>
            </Group>

            <Group align="flex-end">
              <DatePickerInput
                type="range"
                allowSingleDateInRange
                label="Date Range"
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
            border: "1px solid #e0e0e0",
          }}
        >
          {!dateRange[0] || !dateRange[1] ? (
            <Center h="100%">
              <Text c="dimmed">
                Please select a date range to view the report.
              </Text>
            </Center>
          ) : isLoading ? (
            <Center h="100%">
              <Loader type="bars" size="xl" color="violet" />
            </Center>
          ) : isError ? (
            <Center h="100%">
              <Text c="red">
                Error generating report: {(error as Error).message}
              </Text>
            </Center>
          ) : reportData && reportData.length > 0 ? (
            <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
              <BoxCountReportPdf
                data={reportData}
                startDate={dateRange[0]}
                endDate={dateRange[1]}
              />
            </PDFViewer>
          ) : (
            <Center h="100%">
              <Stack align="center" gap="xs">
                <ThemeIcon color="gray" variant="light" size={60} radius="xl">
                  <FaBoxOpen size={30} />
                </ThemeIcon>
                <Text size="lg" fw={500} c="dimmed">
                  No box data found in this range.
                </Text>
              </Stack>
            </Center>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
