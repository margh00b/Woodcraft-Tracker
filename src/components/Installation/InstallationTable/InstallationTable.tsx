"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  flexRender,
  PaginationState,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TextInput,
  Group,
  Loader,
  Pagination,
  ScrollArea,
  Center,
  Text,
  Box,
  Badge,
  rem,
  Accordion,
  SimpleGrid,
  Tooltip,
  Stack,
  ThemeIcon,
  Title,
  Button,
} from "@mantine/core";
import {
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaCheckCircle,
  FaRegCircle,
  FaCalendarCheck,
  FaFire,
  FaShippingFast,
} from "react-icons/fa";
import dayjs from "dayjs";
import { DateInput } from "@mantine/dates";
import { useInstallationTable } from "@/hooks/useInstallationTable";
import { Views } from "@/types/db";

type InstallationJobView = Views<"installation_table_view">;

export default function InstallationTable() {
  const router = useRouter();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [inputFilters, setInputFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([]);

  const setInputFilterValue = (
    id: string,
    value: string | undefined | null
  ) => {
    setInputFilters((prev) => {
      const existing = prev.filter((f) => f.id !== id);
      if (!value) return existing;
      return [...existing, { id, value }];
    });
  };

  const getInputFilterValue = (id: string) => {
    return (inputFilters.find((f) => f.id === id)?.value as string) || "";
  };

  const handleApplyFilters = () => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setActiveFilters(inputFilters);
  };

  const handleClearFilters = () => {
    setInputFilters([]);
    setActiveFilters([]);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const { data, isLoading, isError, error } = useInstallationTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });

  const tableData = data?.data || [];
  const totalCount = data?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  const columnHelper = createColumnHelper<InstallationJobView>();

  const columns = [
    columnHelper.accessor("job_number", {
      header: "Job No.",
      size: 150,
      minSize: 100,
      cell: (info) => (
        <Group gap={4}>
          <Text fw={600} size="sm">
            {info.getValue()}
          </Text>
          {info.row.original.rush && (
            <Tooltip label="RUSH JOB">
              <FaFire size={12} color="red" />
            </Tooltip>
          )}
        </Group>
      ),
    }),

    columnHelper.accessor("shipping_client_name", {
      id: "client",
      header: "Client",
      size: 150,
      minSize: 120,
      cell: (info) => info.getValue() ?? "—",
    }),

    columnHelper.accessor("installer_company", {
      id: "installer",
      header: "Installer",
      size: 200,
      minSize: 150,
      cell: (info) => {
        const row = info.row.original;
        if (!row.installer_id && !row.installer_first_name)
          return <Text c="orange">TBD</Text>;

        return (
          <Group gap={4} wrap="nowrap">
            <Text size="sm" lineClamp={1}>
              {row.installer_first_name}
            </Text>
            <Text size="xs" c="dimmed">
              ({row.installer_company || "—"})
            </Text>
          </Group>
        );
      },
    }),

    columnHelper.accessor("installation_date", {
      header: "Installation Date",
      size: 150,
      minSize: 120,
      cell: (info) => {
        const date = info.getValue();
        if (!date) return <Text c="orange">TBD</Text>;
        return dayjs(date).format("YYYY-MM-DD");
      },
    }),

    columnHelper.accessor("wrap_date", {
      header: "Wrap Date",
      size: 150,
      minSize: 120,
      cell: (info) => {
        const date = info.getValue();
        if (!date) return <Text c="orange">TBD</Text>;
        return dayjs(date).format("YYYY-MM-DD");
      },
    }),
    columnHelper.accessor("ship_schedule", {
      header: "Shipping Date",
      size: 150,
      minSize: 120,
      cell: (info) => {
        const date = info.getValue();
        if (!date) return <Text c="orange">TBD</Text>;
        return dayjs(date).format("YYYY-MM-DD");
      },
    }),

    columnHelper.accessor("has_shipped", {
      header: "Shipped",
      size: 120,
      minSize: 100,
      cell: (info) => {
        const shipped = info.getValue();
        return (
          <Badge
            variant="gradient"
            gradient={
              shipped
                ? { from: "lime", to: "green", deg: 90 }
                : { from: "red", to: "#ff2c2cff", deg: 90 }
            }
          >
            {shipped ? "YES" : "NO"}
          </Badge>
        );
      },
    }),

    columnHelper.accessor("installation_completed", {
      id: "installation_status",
      header: "Completion Status",
      size: 200,
      minSize: 180,
      cell: (info) => {
        const installCompleted = info.row.original.installation_completed;
        const inspectionCompleted = info.row.original.inspection_completed;

        const isInstallDone = !!installCompleted;
        const isInspectionDone = !!inspectionCompleted;

        let statusText;
        let statusColor;
        let icon;

        if (isInstallDone && isInspectionDone) {
          statusText = "Inst. & Insp. Complete";
          statusColor = "green.8";
          icon = <FaCheckCircle color="green" size={14} />;
        } else if (isInstallDone && !isInspectionDone) {
          statusText = "Pending Inspection";
          statusColor = "orange.8";
          icon = <FaCalendarCheck color="orange" size={14} />;
        } else {
          statusText = "In Progress";
          statusColor = "gray.6";
          icon = <FaRegCircle color="gray" size={14} />;
        }

        return (
          <Group gap={4}>
            {icon}
            <Text size="sm" c={statusColor} fw={isInstallDone ? 600 : 400}>
              {statusText}
            </Text>
          </Group>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: tableData,
    columns,
    pageCount: pageCount,
    state: {
      pagination,
      sorting,
      columnFilters: activeFilters,
    },
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <Center style={{ height: "300px" }}>
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center style={{ height: "300px" }}>
        <Text c="red">{(error as any)?.message}</Text>
      </Center>
    );
  }

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        padding: rem(20),
        height: "calc(100vh - 45px)",
      }}
    >
      <Group mb="md">
        <ThemeIcon
          size={50}
          radius="md"
          variant="gradient"
          gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
        >
          <FaShippingFast size={26} />
        </ThemeIcon>
        <Stack gap={0}>
          <Title order={2} style={{ color: "#343a40" }}>
            Installation Schedule
          </Title>
          <Text size="sm" c="dimmed">
            Track installation schedule
          </Text>
        </Stack>
      </Group>

      <Accordion variant="contained" radius="md" mb="md">
        <Accordion.Item value="search-filters">
          <Accordion.Control icon={<FaSearch size={16} />}>
            Search Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 3, md: 4 }} mt="sm" spacing="md">
              <TextInput
                label="Job Number"
                placeholder="e.g., 202401"
                value={getInputFilterValue("job_number")}
                onChange={(e) =>
                  setInputFilterValue("job_number", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Client"
                placeholder="e.g., Smith"
                value={getInputFilterValue("client")}
                onChange={(e) => setInputFilterValue("client", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Installer"
                placeholder="Company or Name"
                value={getInputFilterValue("installer")}
                onChange={(e) =>
                  setInputFilterValue("installer", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <DateInput
                label="Scheduled Inst. Date"
                placeholder="Filter by Date"
                clearable
                value={
                  getInputFilterValue("installation_date")
                    ? dayjs(getInputFilterValue("installation_date")).toDate()
                    : null
                }
                onChange={(date) => {
                  const formattedDate = date
                    ? dayjs(date).format("YYYY-MM-DD")
                    : undefined;
                  setInputFilterValue("installation_date", formattedDate);
                }}
                valueFormat="YYYY-MM-DD"
              />
              <DateInput
                label="Shipping Date"
                placeholder="Filter by shipping date"
                clearable
                value={
                  getInputFilterValue("ship_schedule")
                    ? dayjs(getInputFilterValue("ship_schedule")).toDate()
                    : null
                }
                onChange={(date) => {
                  const formattedDate = date
                    ? dayjs(date).format("YYYY-MM-DD")
                    : undefined;
                  setInputFilterValue("ship_schedule", formattedDate);
                }}
                valueFormat="YYYY-MM-DD"
              />
            </SimpleGrid>

            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                color="gray"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
              <Button
                variant="filled"
                color="blue"
                leftSection={<FaSearch size={14} />}
                onClick={handleApplyFilters}
                style={{
                  background:
                    "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
                }}
              >
                Apply Filters
              </Button>
            </Group>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <ScrollArea
        style={{
          flex: 1,
          minHeight: 0,
          padding: rem(10),
        }}
        styles={{
          thumb: {
            cursor: "pointer",
            background: "linear-gradient(135deg, #dfc9f2, #ba9bfa)",
          },
        }}
        type="always"
      >
        <Table
          striped
          highlightOnHover
          stickyHeader
          withColumnBorders
          style={{ minWidth: "1000px" }}
        >
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Th
                    key={header.id}
                    colSpan={header.colSpan}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                      position: "relative",
                      width: header.getSize(),
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    <span className="inline-block ml-1">
                      {header.column.getIsSorted() === "asc" && <FaSortUp />}
                      {header.column.getIsSorted() === "desc" && <FaSortDown />}
                      {!header.column.getIsSorted() && <FaSort opacity={0.1} />}
                    </span>
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {table.getRowModel().rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Center>
                    <Text c="dimmed">No installation jobs found.</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Table.Tr
                  key={row.id}
                  onClick={() =>
                    router.push(
                      `/dashboard/installation/${row.original.job_id}`
                    )
                  }
                  style={{ cursor: "pointer" }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <Table.Td
                      key={cell.id}
                      style={{
                        width: cell.column.getSize(),
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      <Box
        style={{
          position: "fixed",
          bottom: 0,
          left: rem(250),
          right: 0,
          padding: "1rem 0",
          background: "white",
          borderTop: "1px solid #eee",
          zIndex: 100,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Pagination
          color="#4A00E0"
          withEdges
          total={table.getPageCount()}
          value={table.getState().pagination.pageIndex + 1}
          onChange={(page) => table.setPageIndex(page - 1)}
        />
      </Box>
    </Box>
  );
}
