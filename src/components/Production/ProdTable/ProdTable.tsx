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
  RowSelectionState,
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
  Tooltip,
  rem,
  Stack,
  Accordion,
  SimpleGrid,
  ThemeIcon,
  Title,
  Button,
  Anchor,
  Checkbox,
  Paper,
  Transition,
} from "@mantine/core";
import {
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaFire,
  FaCheckCircle,
  FaRegCircle,
  FaCalendarCheck,
} from "react-icons/fa";
import { FaGears } from "react-icons/fa6";
import dayjs from "dayjs";
import { DatePickerInput } from "@mantine/dates";
import { useProdTable } from "@/hooks/useProdTable";
import { Views } from "@/types/db";
import { useDisclosure } from "@mantine/hooks";
import JobDetailsDrawer from "@/components/Shared/JobDetailsDrawer/JobDetailsDrawer";
import BulkProductionScheduleModal from "../BulkProductionScheduleModal/BulkProductionScheduleModal";
import { usePermissions } from "@/hooks/usePermissions";

type ProductionListView = Views<"prod_table_view">;

export default function ProdTable() {
  const router = useRouter();
  const permissions = usePermissions();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 16,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const [inputFilters, setInputFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([]);
  const [drawerJobId, setDrawerJobId] = useState<number | null>(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkModalOpen, { open: openBulkModal, close: closeBulkModal }] =
    useDisclosure(false);

  const handleJobClick = (id: number) => {
    setDrawerJobId(id);
    openDrawer();
  };

  const setInputFilterValue = (id: string, value: any) => {
    setInputFilters((prev) => {
      const existing = prev.filter((f) => f.id !== id);
      if (!value) return existing;
      return [...existing, { id, value }];
    });
  };

  const getInputFilterValue = (id: string) => {
    return inputFilters.find((f) => f.id === id)?.value;
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

  const { data, isLoading, isError, error } = useProdTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });

  const tableData = data?.data || [];
  const totalCount = data?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  if (typeof window !== "undefined" && tableData.length > 0) {
    console.log("ProdTable Row Data Sample:", tableData[0]);
  }

  const columnHelper = createColumnHelper<ProductionListView>();

  const columns = [
    ...(permissions.isAdmin || permissions.isScheduler
      ? [
          {
            id: "select",
            enableSorting: false,
            header: ({ table }: any) => (
              <Checkbox
                color="violet"
                styles={{ input: { cursor: "pointer" } }}
                checked={table.getIsAllPageRowsSelected()}
                indeterminate={table.getIsSomePageRowsSelected()}
                onChange={(e) => {
                  e.stopPropagation();
                  table.getToggleAllPageRowsSelectedHandler()(e);
                }}
              />
            ),
            cell: ({ row }: any) => (
              <Center
                style={{ width: "100%", height: "100%" }}
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  color="violet"
                  styles={{ input: { cursor: "pointer" } }}
                  checked={row.getIsSelected()}
                  disabled={!row.getCanSelect()}
                  onChange={(e) => {
                    row.getToggleSelectedHandler()(e);
                  }}
                />
              </Center>
            ),
            size: 40,
          },
        ]
      : []),
    columnHelper.accessor("job_number", {
      header: "Job No.",
      size: 150,
      minSize: 150,
      cell: (info) => (
        <Group gap={4}>
          <Text fw={600} size="sm">
            <Anchor
              component="button"
              size="sm"
              fw={600}
              w="100%"
              c="#6f00ffff"
              onClick={(e) => {
                e.stopPropagation();
                const jobId = info.row.original.id;
                if (jobId) handleJobClick(jobId);
              }}
            >
              {info.getValue()}
            </Anchor>
          </Text>
          {info.row.original.rush && (
            <Tooltip label="RUSH JOB">
              <FaFire size={12} color="red" />
            </Tooltip>
          )}
        </Group>
      ),
    }),
    columnHelper.accessor("received_date", {
      header: "Received Date",
      size: 140,
      minSize: 120,
      cell: (info) => {
        const date = info.getValue();
        if (!date) return <Text c="orange">TBD</Text>;
        return dayjs(date).format("YYYY-MM-DD");
      },
    }),
    columnHelper.accessor("placement_date", {
      header: "Placement Date",
      size: 140,
      minSize: 120,
      cell: (info) => {
        const date = info.getValue();
        if (!date) return <Text c="orange">TBD</Text>;
        return dayjs(date).format("YYYY-MM-DD");
      },
    }),
    columnHelper.accessor("ship_schedule", {
      header: "Ship Date",
      size: 250,
      minSize: 200,
      cell: (info) => {
        const date = info.getValue();
        const status = info.row.original.ship_status;

        let gradient: string;
        let label: string;

        switch (status) {
          case "confirmed":
            gradient = "linear-gradient(135deg, #4A00E0, #8E2DE2)";
            label = "CONFIRMED";
            break;
          case "tentative":
            gradient = "linear-gradient(135deg, #FF6A00, #FFB347)";
            label = "TENTATIVE";
            break;
          default:
            gradient = "linear-gradient(135deg, #B0BEC5, #78909C)";
            label = "UNPROCESSED";
        }

        return (
          <Group
            style={{ width: "100%" }}
            justify="space-between"
            wrap="nowrap"
          >
            <Text
              style={{
                whiteSpace: "nowrap",
                color: date ? undefined : "orange",
              }}
            >
              {date ? dayjs(date).format("YYYY-MM-DD") : "TBD"}
            </Text>
            <Badge
              variant="filled"
              size="sm"
              style={{
                background: gradient,
                color: "white",
                fontWeight: 600,
                border: 0,
                borderRadius: "6px",
                textTransform: "uppercase",
                cursor: "inherit",
              }}
            >
              {label}
            </Badge>
          </Group>
        );
      },
    }),
    columnHelper.accessor("shipping_client_name", {
      id: "client",
      header: "Client",
      size: 150,
      minSize: 120,
      cell: (info) => info.getValue() ?? "—",
    }),
    columnHelper.display({
      id: "production_status",
      header: "Plant Progress",
      size: 500,
      minSize: 500,
      cell: (info) => {
        const row = info.row.original;

        const steps = [
          {
            key: "in_plant_actual",
            label: "In Plant",
            val: row.in_plant_actual,
          },
          {
            key: "doors_completed_actual",
            label: "Doors",
            val: row.doors_completed_actual,
          },
          {
            key: "cut_finish_completed_actual",
            label: "Cut Finish",
            val: row.cut_finish_completed_actual,
          },
          {
            key: "custom_finish_completed_actual",
            label: "Custom Finish",
            val: row.custom_finish_completed_actual,
          },
          {
            key: "drawer_completed_actual",
            label: "Drawer",
            val: row.drawer_completed_actual,
          },
          {
            key: "cut_melamine_completed_actual",
            label: "Cut Melamine",
            val: row.cut_melamine_completed_actual,
          },
          {
            key: "paint_completed_actual",
            label: "Paint",
            val: row.paint_completed_actual,
          },
          {
            key: "assembly_completed_actual",
            label: "Assembly",
            val: row.assembly_completed_actual,
          },
        ];

        return (
          <Group
            style={{
              display: "flex",
              flexWrap: "nowrap",
              justifyContent: "flex-start",
              gap: "12px",
              width: "100%",
            }}
          >
            {steps.map((step, idx) => {
              const done = !!step.val;
              return (
                <Text
                  key={idx}
                  size="xs"
                  c="dimmed"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  {done ? (
                    <FaCheckCircle
                      color="green"
                      size={12}
                      style={{ marginRight: 3 }}
                    />
                  ) : (
                    <FaRegCircle
                      color="gray"
                      size={12}
                      style={{ marginRight: 3 }}
                    />
                  )}
                  {step.label}
                </Text>
              );
            })}
          </Group>
        );
      },
    }),
    columnHelper.display({
      id: "cabinet_info",
      header: "Cabinet",
      size: 180,
      minSize: 150,
      cell: (info) => {
        const row = info.row.original;
        const parts = [
          row.cabinet_species,
          row.cabinet_color,
          row.cabinet_door_style,
        ].filter(Boolean);

        return (
          <Text size="sm" c="dimmed" lineClamp={1} tt="capitalize">
            {parts.length > 0 ? parts.join(" • ") : "—"}
          </Text>
        );
      },
    }),
    columnHelper.accessor("site_address", {
      header: "Site Address",
      size: 300,
      minSize: 200,
      cell: (info) => (
        <Text size="sm" c="dimmed" lineClamp={1}>
          {info.getValue() || "—"}
        </Text>
      ),
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
      rowSelection,
    },
    enableRowSelection: true,
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.prod_id),
  });

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center h={400}>
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
          <FaGears size={26} />
        </ThemeIcon>
        <Stack gap={0}>
          <Title order={2} style={{ color: "#343a40" }}>
            Production Schedule
          </Title>
          <Text size="sm" c="dimmed">
            Track production schedule
          </Text>
        </Stack>
      </Group>

      <Accordion variant="contained" radius="md" mb="md">
        <Accordion.Item value="search-filters">
          <Accordion.Control icon={<FaSearch size={16} />}>
            Search Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid
              cols={{ base: 1, sm: 3, md: 5, lg: 6 }}
              mt="sm"
              spacing="md"
            >
              <TextInput
                label="Job Number"
                placeholder="e.g., 202401"
                value={(getInputFilterValue("job_number") as string) || ""}
                onChange={(e) =>
                  setInputFilterValue("job_number", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Client"
                placeholder="e.g., Smith"
                value={(getInputFilterValue("client") as string) || ""}
                onChange={(e) => setInputFilterValue("client", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />

              <DatePickerInput
                type="range"
                label="Received Date"
                placeholder="Filter by Range"
                value={
                  (getInputFilterValue("received_date") as [
                    Date | null,
                    Date | null
                  ]) || [null, null]
                }
                onChange={(val) => setInputFilterValue("received_date", val)}
                clearable
                allowSingleDateInRange
                valueFormat="YYYY-MM-DD"
              />
              <DatePickerInput
                type="range"
                label="Placement Date"
                placeholder="Filter by Range"
                value={
                  (getInputFilterValue("placement_date") as [
                    Date | null,
                    Date | null
                  ]) || [null, null]
                }
                onChange={(val) => setInputFilterValue("placement_date", val)}
                clearable
                allowSingleDateInRange
                valueFormat="YYYY-MM-DD"
              />
              <DatePickerInput
                type="range"
                label="Ship Date"
                placeholder="Filter by Range"
                value={
                  (getInputFilterValue("ship_schedule") as [
                    Date | null,
                    Date | null
                  ]) || [null, null]
                }
                onChange={(val) => setInputFilterValue("ship_schedule", val)}
                clearable
                allowSingleDateInRange
                valueFormat="YYYY-MM-DD"
              />

              <TextInput
                label="Site Address"
                placeholder="Street or City"
                value={(getInputFilterValue("site_address") as string) || ""}
                onChange={(e) =>
                  setInputFilterValue("site_address", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
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

      <Transition
        mounted={Object.keys(rowSelection).length > 1}
        transition="slide-up"
        duration={200}
        timingFunction="ease"
      >
        {(styles) => (
          <Paper
            shadow="xl"
            radius="md"
            withBorder
            p="md"
            style={{
              ...styles,
              position: "fixed",
              bottom: rem(80),
              left: rem(250),
              right: 0,
              marginInline: "auto",
              width: "fit-content",
              zIndex: 200,
              backgroundColor: "var(--mantine-color-violet-0)",
              borderColor: "var(--mantine-color-violet-2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: rem(20),
            }}
          >
            <Group>
              <ThemeIcon color="violet" variant="light" size="lg">
                <FaCheckCircle />
              </ThemeIcon>
              <Text fw={500} c="violet.9">
                {Object.keys(rowSelection).length} jobs selected
              </Text>
            </Group>
            <Group>
              <Button
                variant="white"
                color="red"
                onClick={() => setRowSelection({})}
              >
                Clear Selection
              </Button>
              <Button
                color="violet"
                onClick={openBulkModal}
                leftSection={<FaCalendarCheck />}
              >
                Bulk Schedule
              </Button>
            </Group>
          </Paper>
        )}
      </Transition>

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
          style={{ minWidth: "2600px" }}
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
                      cursor: header.column.getCanSort()
                        ? "pointer"
                        : "default",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {header.column.getCanSort() && (
                      <span className="inline-block ml-1">
                        {header.column.getIsSorted() === "asc" && <FaSortUp />}
                        {header.column.getIsSorted() === "desc" && (
                          <FaSortDown />
                        )}
                        {!header.column.getIsSorted() && (
                          <FaSort opacity={0.1} />
                        )}
                      </span>
                    )}
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
                    <Text c="dimmed">
                      No production jobs found matching the filters.
                    </Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const bgColor =
                  row.original.placement_date === null
                    ? "#ffefefff"
                    : undefined;
                return (
                  <Table.Tr
                    key={row.id}
                    onClick={() =>
                      window.open(
                        `/dashboard/production/schedule/${row.original.id}`,
                        "_blank"
                      )
                    }
                    style={{ cursor: "pointer", backgroundColor: bgColor }}
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
                );
              })
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
      <JobDetailsDrawer
        jobId={drawerJobId}
        opened={drawerOpened}
        onClose={closeDrawer}
      />
      <BulkProductionScheduleModal
        opened={bulkModalOpen}
        onClose={closeBulkModal}
        selectedRows={table.getSelectedRowModel().rows}
        clearSelection={() => setRowSelection({})}
      />
    </Box>
  );
}
