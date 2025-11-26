"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import {
  Paper,
  Group,
  Text,
  Button,
  Stack,
  Title,
  ThemeIcon,
  Container,
  Center,
  Loader,
  Box,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { FaCalendarAlt, FaPrint, FaSearch } from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";
import {
  ShippingReportPdf,
  ShippingReportJob,
} from "@/documents/ShippingReportPdf";

// Dynamic import for PDF Viewer to avoid SSR issues
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

export default function ShippingReport() {
  const { supabase, isAuthenticated } = useSupabase();

  // Default to current month
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    dayjs().toDate(),
    dayjs().add(7, "day").toDate(),
  ]);

  // Fetch Data Logic
  const {
    data: reportData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ShippingReportJob[]>({
    queryKey: ["shipping_report", dateRange],
    queryFn: async () => {
      if (!dateRange[0] || !dateRange[1]) return [];

      const startDate = dayjs(dateRange[0]).format("YYYY-MM-DD");
      const endDate = dayjs(dateRange[1]).format("YYYY-MM-DD");

      // Join jobs -> sales_orders (for client/cabinet) -> production_schedule (for date filtering)
      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
          *,
          sales_orders:sales_orders (
            shipping_street,
            shipping_city,
            shipping_zip,
            shipping_client_name,
            cabinet:cabinets (box, species, color, door_style)
          ),
          production_schedule!inner (*)
        `
        )
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
        {/* Header / Controls */}
        <Paper p="md" radius="md" shadow="sm" bg="white">
          <Group justify="space-between" align="flex-end">
            <Group>
              <ThemeIcon
                size={50}
                radius="md"
                variant="gradient"
                gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
              >
                <FaPrint size={26} />
              </ThemeIcon>
              <Stack gap={0}>
                <Title order={2} style={{ color: "#343a40" }}>
                  Orders Shipping Report
                </Title>
                <Text size="sm" c="dimmed">
                  Generate PDF report by shipping date range.
                </Text>
              </Stack>
            </Group>

            <Group align="flex-end">
              <DatePickerInput
                type="range"
                label="Report Date Range"
                placeholder="Select dates"
                value={dateRange}
                // FIX: Explicitly cast value to satisfy TypeScript
                onChange={(val) =>
                  setDateRange(val as [Date | null, Date | null])
                }
                style={{ width: 300 }}
                clearable={false}
              />
              <Button
                onClick={() => refetch()}
                loading={isLoading}
                leftSection={<FaSearch size={14} />}
                variant="gradient"
                gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
              >
                Generate
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* PDF Preview Area */}
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
              <ShippingReportPdf
                data={reportData}
                startDate={dateRange[0]}
                endDate={dateRange[1]}
              />
            </PDFViewer>
          ) : (
            <Center h="100%">
              <Stack align="center" gap="xs">
                <ThemeIcon color="gray" variant="light" size={60} radius="xl">
                  <FaPrint size={30} />
                </ThemeIcon>
                <Text size="lg" fw={500} c="dimmed">
                  No shipments found in this range.
                </Text>
              </Stack>
            </Center>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
