"use client";

import { useMemo } from "react";
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
import { FaTasks, FaFileExcel } from "react-icons/fa";
import { useAccountingJobReport } from "@/hooks/useAccountingJobReport";
import { colors } from "@/theme";
import { AccountingJobReportPdf } from "@/documents/AccountingJobReportPdf";
import { exportToExcel } from "@/utils/exportToExcel";
import dayjs from "dayjs";

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

const formatPrice = (price: number | null) =>
  price == null
    ? "—"
    : price.toLocaleString("en-CA", {
        style: "currency",
        currency: "CAD",
      });

export default function AccountingJobReport() {
  const {
    data: reportData,
    isLoading,
    isError,
    error,
  } = useAccountingJobReport();

  const memoizedPreview = useMemo(
    () => (
      <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
        <AccountingJobReportPdf data={reportData || []} />
      </PDFViewer>
    ),
    [reportData],
  );

  const handleExport = () => {
    if (!reportData) return;

    const excelData = reportData.map((item) => ({
      "Job #": item.job_number,
      Client: item.shipping_client_name,
      "Shipping Address": item.shipping_address,
      "Ship Date": item.ship_schedule
        ? dayjs(item.ship_schedule).format("DD-MMM-YY")
        : "TBD",
      Price: formatPrice(item.price),
    }));

    exportToExcel(excelData, "Accounting_Job_Report");
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
                  Accounting Job Report
                </Title>
                <Text size="sm" c="dimmed">
                  Active, unshipped jobs with their recorded job prices.
                </Text>
              </Stack>
            </Group>

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
            memoizedPreview
          ) : (
            <Center h="100%">
              <Stack align="center" gap="xs">
                <ThemeIcon color="gray" variant="light" size={60} radius="xl">
                  <FaTasks size={30} />
                </ThemeIcon>
                <Text size="lg" fw={500} c="dimmed">
                  No jobs found.
                </Text>
              </Stack>
            </Center>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
