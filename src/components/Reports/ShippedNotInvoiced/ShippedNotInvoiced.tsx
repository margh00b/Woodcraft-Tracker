"use client";

import { useState, useEffect, useMemo } from "react";
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
import { FaFileInvoice, FaCalendarAlt, FaFileExcel } from "react-icons/fa";
import dayjs from "dayjs";

import { useShippedNotInvoiced } from "@/hooks/useShippedNotInvoiced";
import { ShippedNotInvoicedPdf } from "@/documents/ShippedNotInvoiced";
import { colors } from "@/theme";
import "@mantine/dates/styles.css";
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

export default function ShippedNotInvoicedReport() {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    dayjs().startOf("year").toDate(),
    dayjs().endOf("year").toDate(),
  ]);

  const [queryRange, setQueryRange] =
    useState<[Date | null, Date | null]>(dateRange);

  useEffect(() => {
    const [start, end] = dateRange;
    if ((start && end) || (!start && !end)) {
      setQueryRange(dateRange);
    }
  }, [dateRange]);

  const {
    data: reportData,
    isLoading,
    isError,
    error,
  } = useShippedNotInvoiced(queryRange);
  const memoizedPreview = useMemo(
    () => (
      <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
        <ShippedNotInvoicedPdf data={reportData || []} />
      </PDFViewer>
    ),
    [reportData]
  );
  const handleExport = () => {
    if (!reportData) return;

    const excelData = reportData.map((item) => ({
      "Job #": item.job_number || "",
      "Ship Date": item.ship_date
        ? dayjs(item.ship_date).format("MMM D, YYYY")
        : "-",
      Client: item.shipping_client_name || "Unknown",
      "Shipping Address": item.shipping_address || "Pick Up / No Address",
    }));

    exportToExcel(excelData, "Shipped_Not_Invoiced_Report");
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
                  from: colors.red.primary,
                  to: colors.red.secondary,
                  deg: 135,
                }}
              >
                <FaFileInvoice size={26} />
              </ThemeIcon>
              <Stack gap={0}>
                <Title order={2} style={{ color: colors.gray.title }}>
                  Shipped & Not Invoiced
                </Title>
                <Text size="sm" c="dimmed">
                  Jobs marked as shipped but missing invoice records
                </Text>
              </Stack>
            </Group>

            <Group align="flex-end">
              <DatePickerInput
                allowSingleDateInRange
                type="range"
                label="Filter by Ship Date"
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
              <Text c="red">
                Error loading report: {(error as Error).message}
              </Text>
            </Center>
          ) : reportData && reportData.length > 0 ? (
            memoizedPreview
          ) : (
            <Center h="100%">
              <Stack align="center" gap="xs">
                <ThemeIcon color="green" variant="light" size={60} radius="xl">
                  <FaFileInvoice size={30} />
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
