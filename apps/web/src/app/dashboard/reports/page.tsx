"use client";

import {
  SimpleGrid,
  Card,
  Text,
  Group,
  Stack,
  Title,
  ThemeIcon,
  rem,
  UnstyledButton,
  Box,
} from "@mantine/core";
import {
  TbPackage,
  TbTruckDelivery,
  TbArchive,
  TbBox,
  TbAlertTriangle,
  TbActivity,
  TbChecklist,
  TbFileAnalytics,
  TbBuilding,
} from "react-icons/tb";
import { useRouter } from "next/navigation";
import { colors, gradients, linearGradients } from "@/theme";

const reports = [
  {
    title: "Production Schedule",
    description: "View Production schedule and completion status.",
    icon: TbPackage,
    gradient: gradients.service,
    path: "/dashboard/reports/productionschedulereport",
  },
  {
    title: "Ship Schedule",
    description: "Monitor upcoming shipments and delivery timeline.",
    icon: TbTruckDelivery,
    gradient: gradients.success,
    path: "/dashboard/reports/shipschedulereport",
  },
  {
    title: "Past Shipping",
    description: "Archive of completed shipments and delivery history.",
    icon: TbArchive,
    gradient: {
      from: "#e45d5dff",
      to: "#790000ff",
      deg: 135,
    },
    path: "/dashboard/reports/pastshipreport",
  },
  {
    title: "Box Count",
    description: "Breakdown of box counts by Month",
    icon: TbBox,
    gradient: gradients.backorder,
    path: "/dashboard/reports/boxcountreport",
  },
  {
    title: "Not Invoiced",
    description: "List of shipped Jobs pending invoicing.",
    icon: TbAlertTriangle,
    gradient: gradients.danger,
    path: "/dashboard/reports/shippednotinvoiced",
  },
  {
    title: "Plant Status",
    description: "Overview of current plant department statuses.",
    icon: TbActivity,
    gradient: gradients.primary,
    path: "/dashboard/reports/plantstatusreport",
  },
  {
    title: "Job Status",
    description:
      "Comprehensive status report for all active jobs, including inspections, cabinet finals, SOs etc...",
    icon: TbChecklist,
    gradient: gradients.service,
    path: "/dashboard/reports/jobstatusreport",
  },
  {
    title: "Builder Summary",
    description: "Export summary of builder jobs and shipping status.",
    icon: TbBuilding,
    gradient: gradients.primary,
    path: "/dashboard/reports/buildersummary",
  },
];

export default function ReportsDashboard() {
  const router = useRouter();

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        padding: rem(20),
        height: "100%",
        overflow: "auto",
      }}
    >
      <Group mb={30}>
        <ThemeIcon
          size={50}
          radius="md"
          variant="gradient"
          gradient={gradients.primary}
        >
          <TbFileAnalytics size={26} />
        </ThemeIcon>
        <Stack gap={0}>
          <Title order={2} style={{ color: colors.gray.title }}>
            Reports Dashboard
          </Title>
          <Text size="sm" c="dimmed">
            Access all system reports and analytics
          </Text>
        </Stack>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg">
        {reports.map((report) => (
          <UnstyledButton
            key={report.title}
            onClick={() => window.open(report.path, "_blank")}
            style={{ height: "100%" }}
          >
            <Card
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              h="100%"
              style={{
                transition: "all 0.2s ease",
                cursor: "pointer",
                backgroundColor: "white",
              }}
              onMouseEnter={(e: any) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.1)";
                e.currentTarget.style.borderColor = colors.violet.light;
              }}
              onMouseLeave={(e: any) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
                e.currentTarget.style.borderColor = colors.gray.border;
              }}
            >
              <Group justify="space-between" align="flex-start" mb="md">
                <ThemeIcon
                  size={48}
                  radius="md"
                  variant="gradient"
                  gradient={report.gradient}
                >
                  <report.icon style={{ width: rem(26), height: rem(26) }} />
                </ThemeIcon>
              </Group>

              <Text fw={700} size="lg" mb={rem(4)} c="dark.8">
                {report.title}
              </Text>

              <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
                {report.description}
              </Text>
            </Card>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Box>
  );
}
