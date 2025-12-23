"use client";

import { useState, useEffect } from "react";
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
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { FaTasks, FaCalendarAlt, FaFileExcel } from "react-icons/fa";
import dayjs from "dayjs";
import { useJobStatusReport } from "@/hooks/useJobStatusReport";
import { colors } from "@/theme";
import "@mantine/dates/styles.css";
import { JobStatusPdf } from "@/documents/JobStatusReportPdf";
import { exportToExcel } from "@/utils/exportToExcel";

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

export default function JobStatusReport() {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    dayjs().startOf("month").toDate(),
    dayjs().endOf("month").toDate(),
  ]);

  const [queryRange, setQueryRange] =
    useState<[Date | null, Date | null]>(dateRange);

  useEffect(() => {
    const [start, end] = dateRange;
    // Strict check: Only update if BOTH start and end dates are present.
    // This prevents reload on single date selection or when the filter is cleared (no date).
    if (start && end) {
      setQueryRange(dateRange);
    }
  }, [dateRange]);

  const {
    data: reportData,
    isLoading,
    isError,
    error,
  } = useJobStatusReport(queryRange);

  const handleExport = () => {
    if (!reportData) return;

    const excelData = reportData.map((item) => ({
      "Job #": item.job_number,
      Client: item.shipping_client_name,
      "Shipping Address": item.shipping_address,
      "Cut Mel": item.cut_melamine ? "Yes" : "No",
      "Cut Fin": item.cut_finish ? "Yes" : "No",
      "Cust Fin": item.custom_finish ? "Yes" : "No",
      Doors: item.doors ? "Yes" : "No",
      Drawers: item.drawers ? "Yes" : "No",
      Paint: item.paint ? "Yes" : "No",
      Assembly: item.assembly ? "Yes" : "No",
      Wrap: item.wrap ? "Yes" : "No",
      "% Done": `${item.completion_percentage}%`,
    }));

    exportToExcel(excelData, "Job_Status_Report");
  };

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
                gradient={{
                  from: colors.blue.secondary,
                  to: colors.blue.primary,
                  deg: 135,
                }}
              >
                <FaTasks size={26} />
              </ThemeIcon>
              <Stack gap={0}>
                <Title order={2} style={{ color: colors.gray.title }}>
                  Job Status Report
                </Title>
                <Text size="sm" c="dimmed">
                  Tracking production actuals and completion percentage.
                </Text>
              </Stack>
            </Group>

            <Group align="flex-end">
              <DatePickerInput
                allowSingleDateInRange
                type="range"
                label="Filter by Date Sold"
                placeholder="Select date range"
                value={dateRange}
                onChange={(value) =>
                  setDateRange(value as [Date | null, Date | null])
                }
                leftSection={
                  <FaCalendarAlt size={16} color={colors.violet.primary} />
                }
                w={350}
              />
              <Button
                onClick={handleExport}
                disabled={!reportData || reportData.length === 0}
                leftSection={<FaFileExcel size={14} />}
                variant="outline"
                color="green"
              >
                Export Excel
              </Button>
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
            border: `1px solid ${colors.gray.border}`,
          }}
        >
          {isLoading ? (
            <Center h="100%">
              <Loader type="bars" size="xl" color="violet" />
            </Center>
          ) : isError ? (
            <Center h="100%">
              <Text c="red">Error: {(error as Error).message}</Text>
            </Center>
          ) : reportData && reportData.length > 0 ? (
            <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
              <JobStatusPdf data={reportData} />
            </PDFViewer>
          ) : (
            <Center h="100%">
              <Stack align="center" gap="xs">
                <ThemeIcon color="gray" variant="light" size={60} radius="xl">
                  <FaTasks size={30} />
                </ThemeIcon>
                <Text size="lg" fw={500} c="dimmed">
                  No jobs found for this period.
                </Text>
              </Stack>
            </Center>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
