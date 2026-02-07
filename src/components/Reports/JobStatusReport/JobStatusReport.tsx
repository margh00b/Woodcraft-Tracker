"use client";

import { useMemo, useState } from "react";
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
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { FaPrint, FaFileExcel, FaCalendarCheck } from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";
import { exportToExcel } from "@/utils/exportToExcel";
import "@mantine/dates/styles.css";
import {
  JobStatusJob,
  JobStatusReportPdf,
} from "@/documents/JobStatusReportPdf";

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

export default function JobStatusReport() {
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
  } = useQuery({
    queryKey: ["job_status_report", dateRange],
    queryFn: async () => {
      if (!dateRange[0] || !dateRange[1]) return [];

      const startDate = dayjs(dateRange[0]).format("YYYY-MM-DD");
      const endDate = dayjs(dateRange[1]).format("YYYY-MM-DD");

      const { data, error } = await supabase
        .from("job_status_report_view")
        .select("*")
        .gte("ship_schedule", startDate)
        .lte("ship_schedule", endDate)
        .order("ship_schedule", { ascending: true });

      if (error) throw error;

      return (data || []) as JobStatusJob[];
    },
    enabled: isAuthenticated && !!dateRange[0] && !!dateRange[1],
  });

  const memoizedPreview = useMemo(
    () => (
      <PDFViewer
        key={Math.random()}
        width="100%"
        height="100%"
        style={{ border: "none" }}
      >
        <JobStatusReportPdf
          data={reportData || []}
          startDate={dateRange[0]}
          endDate={dateRange[1]}
        />
      </PDFViewer>
    ),
    [reportData, dateRange],
  );

  const handleExport = () => {
    if (!reportData) return;

    const excelData = reportData.map((job) => {
      const address =
        [job.shipping_street, job.shipping_city].filter(Boolean).join(", ") ||
        "";

      return {
        "Job #": job.job_number,
        Client: job.shipping_client_name || "",
        Address: address,
        "Ship Date": job.ship_schedule
          ? dayjs(job.ship_schedule).format("YYYY-MM-DD")
          : "",
        Shipped: job.has_shipped ? "Yes" : "No",
        "Install Date": job.installation_date || "",
        "Install Comp":
          job.installation_completed &&
          dayjs(job.installation_completed).isValid()
            ? dayjs(job.installation_completed).format("YYYY-MM-DD")
            : "",
        "Inspection Date": job.inspection_date || "",
        "Inspection Comp":
          job.inspection_completed && dayjs(job.inspection_completed).isValid()
            ? dayjs(job.inspection_completed).format("YYYY-MM-DD")
            : "",
        "Final Date": "",
        "SO Count": job.service_order_count || 0,
      };
    });

    const startDate = dayjs(dateRange[0]);
    const endDate = dayjs(dateRange[1]);
    let periodText = "Unknown Period";

    if (
      startDate.isValid() &&
      endDate.isValid() &&
      startDate.isSame(endDate, "month") &&
      startDate.isSame(endDate, "year")
    ) {
      periodText = startDate.format("MMMM YYYY");
    } else if (startDate.isValid() && endDate.isValid()) {
      periodText = `${startDate.format("MMMM YYYY")} - ${endDate.format("MMMM YYYY")}`;
    }

    const rangeText = `Range: ${startDate.isValid() ? startDate.format("MMM DD, YYYY") : "?"} - ${endDate.isValid() ? endDate.format("MMM DD, YYYY") : "?"}`;
    const printedText = `Printed: ${dayjs().format("MMM DD, YYYY")}`;

    exportToExcel(excelData, "Job_Status_Report", {
      customHeaders: [
        [periodText],
        ["Job Status Report"],
        [`${rangeText}    ${printedText}`],
      ],
      merges: [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
      ],
    });
  };

  const presets = [
    {
      label: "This Month",
      value: [
        dayjs().startOf("month").toDate(),
        dayjs().endOf("month").toDate(),
      ],
    },
    {
      label: "Last Month",
      value: [
        dayjs().subtract(1, "month").startOf("month").toDate(),
        dayjs().subtract(1, "month").endOf("month").toDate(),
      ],
    },
  ] as any;

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
                gradient={{ from: "#1c7ed6", to: "#228be6", deg: 135 }}
              >
                <FaCalendarCheck size={26} />
              </ThemeIcon>
              <Stack gap={0}>
                <Title order={2} style={{ color: "#343a40" }}>
                  Job Status Report
                </Title>
                <Text size="sm" c="dimmed">
                  Generate report by shipping date.
                </Text>
              </Stack>
            </Group>

            <Group align="flex-end">
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
                presets={presets}
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
            memoizedPreview
          ) : (
            <Center h="100%">
              <Stack align="center" gap="xs">
                <ThemeIcon color="gray" variant="light" size={60} radius="xl">
                  <FaPrint size={30} />
                </ThemeIcon>
                <Text size="lg" fw={500} c="dimmed">
                  No records found in this range.
                </Text>
              </Stack>
            </Center>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
