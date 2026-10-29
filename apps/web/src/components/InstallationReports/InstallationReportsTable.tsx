"use client";

import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Flex,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
  rem,
} from "@mantine/core";
import type { PaginationState } from "@tanstack/react-table";
import {
  TbCalendar,
  TbChevronLeft,
  TbChevronRight,
  TbEye,
  TbFilterOff,
  TbMapPin,
  TbPhoto,
  TbSearch,
} from "react-icons/tb";
import type {
  InstallationReport,
  InstallationReportFilters,
} from "@/hooks/useInstallationReports";
import { formatDate } from "@/utils/installationReportUtils";
import { DatePickerInput } from "@mantine/dates";

type Props = {
  jobId: number | null;
  jobNumber: number | string | null;
  reports: InstallationReport[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isFetching: boolean;
  filters: InstallationReportFilters;
  onFiltersChange: (filters: InstallationReportFilters) => void;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  onSelectReport: (report: InstallationReport) => void;
};

export default function InstallationReportsTable({
  jobId,
  jobNumber,
  reports,
  total,
  isLoading,
  isError,
  error,
  isFetching,
  filters,
  onFiltersChange,
  pagination,
  onPaginationChange,
  onSelectReport,
}: Props) {
  const displayedJobNumber = jobNumber ?? jobId;
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));
  const hasFilters = Object.values(filters).some((value) => value !== "");

  const updateFilter = (
    key: keyof InstallationReportFilters,
    value: string,
  ) => {
    onFiltersChange({ ...filters, [key]: value });
    onPaginationChange({ ...pagination, pageIndex: 0 });
  };

  const clearFilters = () => {
    onFiltersChange({
      jobNumber: "",
      address: "",
      installer: "",
      createdFrom: "",
      createdTo: "",
    });
    onPaginationChange({ ...pagination, pageIndex: 0 });
  };

  return (
    <Paper
      withBorder
      radius="lg"
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box p="md">
        <Group justify="space-between" align="center" wrap="wrap" mb="md">
          <Stack gap={3}>
            <Title order={4}>
              {jobId !== null
                ? `Reports for Job #${displayedJobNumber}`
                : "Submitted reports"}
            </Title>
            <Text size="sm" c="dimmed">
              {jobId !== null
                ? "Installation reports submitted for this job."
                : "Filter reports by job, address, installer, or submission date."}
            </Text>
          </Stack>

          <Badge variant="light" color="violet" size="lg" radius="sm">
            {total} {total === 1 ? "report" : "reports"}
          </Badge>
        </Group>

        {jobId === null && (
          <Stack gap="sm">
            <SimpleFilters
              filters={filters}
              updateFilter={updateFilter}
              onRangeChange={(createdFrom, createdTo) => {
                onFiltersChange({ ...filters, createdFrom, createdTo });
                onPaginationChange({ ...pagination, pageIndex: 0 });
              }}
            />

            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                {hasFilters
                  ? "Showing matching reports"
                  : "Showing the most recent reports"}
              </Text>

              <Button
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<TbFilterOff size={15} />}
                onClick={clearFilters}
                disabled={!hasFilters}
              >
                Clear filters
              </Button>
            </Group>
          </Stack>
        )}
      </Box>

      <Divider />

      {isLoading ? (
        <Center style={{ flex: 1, minHeight: 220 }}>
          <Stack align="center" gap="sm">
            <Loader color="violet" />
            <Text size="sm" c="dimmed">
              Loading installation reports...
            </Text>
          </Stack>
        </Center>
      ) : isError ? (
        <Center p="xl">
          <Alert
            color="red"
            title="Unable to load installation reports"
            maw={600}
          >
            {error instanceof Error
              ? error.message
              : "An unexpected error occurred."}
          </Alert>
        </Center>
      ) : reports.length === 0 ? (
        <Center style={{ flex: 1, minHeight: 260 }} p="xl">
          <Stack align="center" gap="sm">
            <ThemeIcon size={54} radius="xl" variant="light" color="gray">
              <TbSearch size={24} />
            </ThemeIcon>
            <Text fw={600}>
              {hasFilters
                ? "No matching reports"
                : "No installation reports found"}
            </Text>
            <Text size="sm" c="dimmed" ta="center" maw={380}>
              {hasFilters
                ? "Try changing or clearing your filters."
                : "Submitted Insite installation reports will appear here."}
            </Text>
            {hasFilters && (
              <Button variant="light" color="violet" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </Stack>
        </Center>
      ) : (
        <ScrollArea style={{ flex: 1 }} type="auto">
          <Table
            striped
            highlightOnHover
            stickyHeader
            layout="fixed"
            miw={850}
            styles={{
              thead: {
                background: "var(--mantine-color-gray-0)",
              },
              th: {
                padding: `${rem(12)} ${rem(12)}`,
                borderBottom: "1px solid var(--mantine-color-gray-3)",
                textAlign: "center",
                fontWeight: 700,
                whiteSpace: "nowrap",
              },
              td: {
                padding: `${rem(12)} ${rem(12)}`,
                borderBottom: "1px solid var(--mantine-color-gray-2)",
                textAlign: "center",
                verticalAlign: "middle",
              },
            }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={120}>Job #</Table.Th>
                <Table.Th>Address</Table.Th>
                <Table.Th w={250}>Submitted</Table.Th>
                <Table.Th w={250}>Submitted by</Table.Th>
                <Table.Th w={120}>Attachments</Table.Th>
                <Table.Th w={110}>Action</Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {reports.map((report) => (
                <Table.Tr key={report.id}>
                  <Table.Td>
                    <Badge variant="light" color="violet" radius="sm" size="lg">
                      {report.job_number.split("-")[0]}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text
                      size="sm"
                      truncate
                      title={report.address ?? undefined}
                    >
                      {report.address || "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{formatDate(report.created_at)}</Text>
                  </Table.Td>

                  <Table.Td>
                    <Text size="sm" fw={500} truncate>
                      {report.submitted_by || "—"}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    <Badge
                      variant="light"
                      color={report.attachment_count ? "blue" : "gray"}
                      radius="sm"
                      leftSection={
                        report.attachment_count ? (
                          <TbPhoto size={12} />
                        ) : undefined
                      }
                    >
                      {report.attachment_count}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    <Tooltip label="View report details">
                      <Button
                        size="xs"
                        radius="md"
                        variant="light"
                        color="violet"
                        leftSection={<TbEye size={15} />}
                        onClick={() => onSelectReport(report)}
                      >
                        View
                      </Button>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}

      <Divider />

      <Flex justify="space-between" align="center" wrap="wrap" gap="sm" p="md">
        <Text size="sm" c="dimmed">
          {total === 0
            ? "No reports"
            : `Showing ${pagination.pageIndex * pagination.pageSize + 1}–${Math.min(
                (pagination.pageIndex + 1) * pagination.pageSize,
                total,
              )} of ${total} reports`}
        </Text>

        <Group gap="xs">
          {isFetching && !isLoading && <Loader size="xs" color="violet" />}

          <Button
            variant="default"
            size="xs"
            leftSection={<TbChevronLeft size={15} />}
            disabled={pagination.pageIndex === 0 || isFetching}
            onClick={() =>
              onPaginationChange({
                ...pagination,
                pageIndex: pagination.pageIndex - 1,
              })
            }
          >
            Previous
          </Button>

          <Text size="sm" c="dimmed">
            Page {pagination.pageIndex + 1} of {pageCount}
          </Text>

          <Button
            variant="default"
            size="xs"
            rightSection={<TbChevronRight size={15} />}
            disabled={pagination.pageIndex + 1 >= pageCount || isFetching}
            onClick={() =>
              onPaginationChange({
                ...pagination,
                pageIndex: pagination.pageIndex + 1,
              })
            }
          >
            Next
          </Button>
        </Group>
      </Flex>
    </Paper>
  );
}

function SimpleFilters({
  filters,
  updateFilter,
  onRangeChange,
}: {
  filters: InstallationReportFilters;
  updateFilter: (key: keyof InstallationReportFilters, value: string) => void;
  onRangeChange: (from: string, to: string) => void;
}) {
  return (
    <Box
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: rem(12),
      }}
    >
      <TextInput
        label="Job number"
        placeholder="Search job number"
        leftSection={<TbSearch size={16} />}
        value={filters.jobNumber}
        onChange={(event) =>
          updateFilter("jobNumber", event.currentTarget.value)
        }
      />

      <TextInput
        label="Address"
        placeholder="Street or city"
        value={filters.address}
        onChange={(event) => updateFilter("address", event.currentTarget.value)}
      />

      <TextInput
        label="Installer"
        placeholder="Installer name"
        value={filters.installer}
        onChange={(event) =>
          updateFilter("installer", event.currentTarget.value)
        }
      />

      <DatePickerInput
        size="xs"
        type="range"
        allowSingleDateInRange
        label="Submission Date"
        placeholder="Filter by range"
        clearable
        value={[
          filters.createdFrom
            ? new Date(`${filters.createdFrom}T12:00:00`)
            : null,
          filters.createdTo ? new Date(`${filters.createdTo}T12:00:00`) : null,
        ]}
        onChange={([from, to]) => {
          onRangeChange(from ?? "", to ?? "");
        }}
        valueFormat="YYYY-MM-DD"
      />
    </Box>
  );
}
