"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  PaginationState,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";
import {
  Table,
  ScrollArea,
  Text,
  Badge,
  Group,
  TextInput,
  Pagination,
  Box,
  rem,
  Loader,
  Center,
  Tooltip,
  Stack,
  ThemeIcon,
  Title,
  Accordion,
  SimpleGrid,
  Anchor,
  Button,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { GrEmergency } from "react-icons/gr";
import {
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaShoppingBag,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import { usePurchasingTable } from "@/hooks/usePurchasingTable";
import dayjs from "dayjs";
import { Views } from "@/types/db";
import { useDisclosure } from "@mantine/hooks";
import JobDetailsDrawer from "@/components/Shared/JobDetailsDrawer/JobDetailsDrawer";

type PurchasingTableView = Views<"purchasing_table_view"> & {
  doors_received_incomplete_at: string | null;
  glass_received_incomplete_at: string | null;
  handles_received_incomplete_at: string | null;
  acc_received_incomplete_at: string | null;
};

const StatusBadge = ({
  orderedAt,
  receivedAt,
  receivedIncompleteAt,
}: {
  orderedAt: string | null;
  receivedAt: string | null;
  receivedIncompleteAt: string | null;
}) => {
  let badgeColor = "red";
  let statusText = "—";

  if (receivedIncompleteAt) {
    badgeColor = "orange";
    statusText = "Incomplete";
  } else if (receivedAt) {
    badgeColor = "green";
    statusText = "Received";
  } else if (orderedAt) {
    badgeColor = "yellow";
    statusText = "Ordered";
  }

  return (
    <Badge
      color={badgeColor}
      variant="light"
      style={{ width: "100%", cursor: "default" }}
    >
      {statusText}
    </Badge>
  );
};

export default function ReadOnlyPurchasingTable() {
  const { isAuthenticated } = useSupabase();
  const [drawerJobId, setDrawerJobId] = useState<number | null>(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 16,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [inputFilters, setInputFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([]);
  const handleJobClick = (id: number) => {
    setDrawerJobId(id);
    openDrawer();
  };
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

  const { data, isLoading, isError, error } = usePurchasingTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });

  const tableData = (data?.data as PurchasingTableView[]) || [];
  const pageCount = Math.ceil((data?.count || 0) / pagination.pageSize);

  const columnHelper = createColumnHelper<PurchasingTableView>();

  const createStatusColumn = (
    keyPrefix: "doors" | "glass" | "handles" | "acc",
    headerTitle: string
  ) =>
    columnHelper.accessor(`${keyPrefix}_received_at` as any, {
      id: keyPrefix,
      header: headerTitle,
      size: 100,
      cell: (info) => {
        const row = info.row.original;

        const ordKey = `${keyPrefix}_ordered_at` as keyof PurchasingTableView;
        const recKey = `${keyPrefix}_received_at` as keyof PurchasingTableView;
        const incKey =
          `${keyPrefix}_received_incomplete_at` as keyof PurchasingTableView;

        const isDoorColumn = keyPrefix === "doors";
        const showWarning =
          isDoorColumn && row.door_style_name && !row.door_made_in_house;

        return (
          <Box style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <StatusBadge
              orderedAt={row[ordKey] as string}
              receivedAt={row[recKey] as string}
              receivedIncompleteAt={row[incKey] as string}
            />
            {showWarning && (
              <Tooltip label="Needs Ordering (Outsourced)">
                <GrEmergency size={10} color="#ff0000ff" />
              </Tooltip>
            )}
          </Box>
        );
      },
    });

  const columns = [
    columnHelper.accessor("job_number", {
      header: "Job Number",
      size: 120,
      cell: (info) => (
        <Text fw={600} size="sm">
          <Anchor
            component="button"
            size="sm"
            fw={600}
            c="violet.9"
            onClick={(e) => {
              e.stopPropagation();
              if (info.row.original.job_id)
                handleJobClick(info.row.original.job_id);
            }}
          >
            {info.getValue()}
          </Anchor>
        </Text>
      ),
    }),
    columnHelper.accessor("client_name", {
      header: "Client",
      size: 150,
      cell: (info) => <Text size="sm">{info.getValue() || "—"}</Text>,
    }),
    columnHelper.accessor("ship_schedule", {
      header: "Ship Date",
      size: 130,
      cell: (info) => {
        const date = info.getValue();
        if (!date)
          return (
            <Text c="orange" size="sm">
              TBD
            </Text>
          );
        return <Text size="sm">{dayjs(date).format("YYYY-MM-DD")}</Text>;
      },
    }),
    createStatusColumn("doors", "Doors"),
    createStatusColumn("glass", "Glass"),
    createStatusColumn("handles", "Handles"),
    createStatusColumn("acc", "Accessories"),
    columnHelper.accessor("purchasing_comments", {
      header: "History",
      size: 250,
      cell: (info) => (
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minHeight: "24px",
            maxWidth: "100%",
          }}
        >
          <Tooltip
            label={info.getValue()}
            multiline
            w={300}
            withinPortal
            disabled={!info.getValue()}
          >
            <Text size="xs" truncate c="dimmed" style={{ flex: 1 }}>
              {info.getValue() || "—"}
            </Text>
          </Tooltip>
        </Box>
      ),
    }),
  ];

  const table = useReactTable({
    data: tableData,
    columns,
    pageCount: pageCount,
    state: { pagination, sorting, columnFilters: activeFilters },
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
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
      p={rem(20)}
      style={{
        display: "flex",
        flexDirection: "column",
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
          <FaShoppingBag size={26} />
        </ThemeIcon>
        <Stack gap={0}>
          <Title order={2} style={{ color: "#343a40" }}>
            Purchase Tracking
          </Title>
          <Text size="sm" c="dimmed">
            View purchase order status
          </Text>
        </Stack>
      </Group>

      <Accordion variant="contained" radius="md" mb="md">
        <Accordion.Item value="filters">
          <Accordion.Control icon={<FaSearch size={16} />}>
            Search Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <TextInput
                label="Job Number"
                placeholder="Search..."
                value={getInputFilterValue("job_number")}
                onChange={(e) =>
                  setInputFilterValue("job_number", e.target.value)
                }
              />
              <TextInput
                label="Client Name"
                placeholder="Search..."
                value={getInputFilterValue("client_name")}
                onChange={(e) =>
                  setInputFilterValue("client_name", e.target.value)
                }
              />
              <DateInput
                label="Ship Date"
                placeholder="Filter by Date"
                clearable
                value={
                  getInputFilterValue("ship_schedule")
                    ? dayjs(getInputFilterValue("ship_schedule")).toDate()
                    : null
                }
                onChange={(date) => {
                  const formatted = date
                    ? dayjs(date).format("YYYY-MM-DD")
                    : undefined;
                  setInputFilterValue("ship_schedule", formatted);
                }}
                valueFormat="YYYY-MM-DD"
              />
            </SimpleGrid>
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleClearFilters}>
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

      <ScrollArea style={{ flex: 1 }}>
        <Table
          striped
          stickyHeader
          highlightOnHover
          withColumnBorders
          layout="fixed"
        >
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Th
                    key={header.id}
                    style={{ width: header.getSize(), cursor: "pointer" }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <Group gap={4}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "asc" && <FaSortUp />}
                      {header.column.getIsSorted() === "desc" && <FaSortDown />}
                      {!header.column.getIsSorted() && (
                        <FaSort style={{ opacity: 0.2 }} />
                      )}
                    </Group>
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {table.getRowModel().rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Center py="xl">
                    <Text c="dimmed">No purchasing records found.</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Table.Tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <Table.Td key={cell.id}>
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
          borderTop: "1px solid #eee",
          padding: "1rem",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Pagination
          total={table.getPageCount()}
          value={pagination.pageIndex + 1}
          onChange={(p) => table.setPageIndex(p - 1)}
          color="#4A00E0"
        />
      </Box>
      <JobDetailsDrawer
        jobId={drawerJobId}
        opened={drawerOpened}
        onClose={closeDrawer}
      />
    </Box>
  );
}
