"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { FaPrint, FaFileExcel } from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";
import { exportToExcel } from "@/utils/exportToExcel";
import "@mantine/dates/styles.css";
import { PastShippingJob } from "@/documents/PastShipReportPdf";

export default function PastShipReport() {
  const { supabase, isAuthenticated } = useSupabase();

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    dayjs().subtract(7, "day").toDate(),
    dayjs().toDate(),
  ]);

  const {
    data: reportData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["pastship_report", dateRange],
    queryFn: async () => {
      if (!dateRange[0] || !dateRange[1]) return [];

      const startDate = dayjs(dateRange[0]).format("YYYY-MM-DD");
      const endDate = dayjs(dateRange[1]).format("YYYY-MM-DD");

      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
    id,
    job_number,
    sales_orders!inner (
      shipping_client_name,
      shipping_street,
      shipping_city,
      delivery_type,
      cabinets (
        box
      )
    ),
    production_schedule!inner (
      ship_schedule,
      ship_status
    ),
    installation!inner (
      installation_date,
      inspection_date,
      installation_completed,
      inspection_completed,
      has_shipped,
      partially_shipped,
      installers (
        first_name,
        last_name,
        company_name
      )
    ),
    invoices (
      paid_at,
      invoice_number,
      date_entered
    )
  `,
        )
        .gte("production_schedule.ship_schedule", startDate)
        .lte("production_schedule.ship_schedule", endDate)
        .or("has_shipped.eq.true,partially_shipped.eq.true", {
          referencedTable: "installation",
        })
        .order("ship_schedule", {
          referencedTable: "production_schedule",
          ascending: true,
        });

      if (error) throw error;
      return data as unknown as PastShippingJob[];
    },
    enabled: isAuthenticated && !!dateRange[0] && !!dateRange[1],
  });

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  useEffect(() => {
    let active = true;
    if (!reportData || reportData.length === 0) {
      setPdfUrl(null);
      return;
    }

    const generatePdf = async () => {
      setIsPdfGenerating(true);
      try {
        const response = await fetch("/api/pdf/past-ship-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: reportData,
            startDate: dateRange[0],
            endDate: dateRange[1],
          }),
        });

        if (!response.ok) throw new Error("Failed to generate PDF");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        if (active) {
          setPdfUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        } else {
          URL.revokeObjectURL(url);
        }
      } catch (e) {
      } finally {
        if (active) setIsPdfGenerating(false);
      }
    };

    generatePdf();

    return () => {
      active = false;
    };
  }, [reportData, dateRange]);

  const handleExport = () => {
    if (!reportData) return;

    const excelData = reportData.map((job) => {
      const so = Array.isArray(job.sales_orders)
        ? job.sales_orders[0]
        : job.sales_orders;
      const cab = so?.cabinets
        ? Array.isArray(so.cabinets)
          ? so.cabinets[0]
          : so.cabinets
        : null;
      const ps = Array.isArray(job.production_schedule)
        ? job.production_schedule[0]
        : job.production_schedule;
      const inst = job.installation;
      const inv = Array.isArray(job.invoices) ? job.invoices[0] : job.invoices;

      const address =
        [so?.shipping_street, so?.shipping_city].filter(Boolean).join(", ") ||
        "";

      let installerName = "";
      if (inst?.installers) {
        installerName =
          inst.installers.first_name ||
          inst.installers.last_name ||
          inst.installers.company_name ||
          "";
      }

      return {
        "Ship Date": ps?.ship_schedule
          ? dayjs(ps.ship_schedule).format("YYYY-MM-DD")
          : "",
        "Job #": job.job_number,
        Customer: so?.shipping_client_name || "",
        Address: address,
        Box: cab?.box || "",
        Delivery: so?.delivery_type || "",
        "Install Date": inst?.installation_date || "",
        Installer: installerName,
        "Inspection Date": inst?.inspection_date || "",
        Invoiced: inv ? "Yes" : "No",
        "Invoice Date": inv?.date_entered || "",
        "Invoice #": inv?.invoice_number || "",
      };
    });

    exportToExcel(excelData, "Past_Shipping_Report");
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
                gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
              >
                <FaPrint size={26} />
              </ThemeIcon>
              <Stack gap={0}>
                <Title order={2} style={{ color: "#343a40" }}>
                  Past Shipping Report
                </Title>
                <Text size="sm" c="dimmed">
                  Generate PDF report by shipping date range.
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
          ) : isLoading || isPdfGenerating ? (
            <Center h="100%">
              <Loader type="bars" size="xl" color="violet" />
            </Center>
          ) : isError ? (
            <Center h="100%">
              <Text c="red">
                Error generating report: {(error as Error).message}
              </Text>
            </Center>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="Past Shipping Report"
            />
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
