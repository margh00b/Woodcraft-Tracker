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
  Accordion,
  Tooltip,
  Button,
  rem,
  Badge,
  Stack,
  ThemeIcon,
  Title,
  SimpleGrid,
} from "@mantine/core";
import {
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaIndustry,
  FaTools,
  FaBoxOpen,
} from "react-icons/fa";
import dayjs from "dayjs";
import { DateInput } from "@mantine/dates";
import { usePlantMasterTable } from "@/hooks/usePlantMasterTable";

// Define the shape based on our View
type PlantMasterRow = {
  record_type: "JOB" | "SERVICE";
  id: number;
  display_id: string;
  client_name: string;
  due_date: string | null;
  status_raw: string;
  description: string;
  created_at: string;
};

export default function PlantMasterTable() {
  const router = useRouter();

  // --- Table State ---
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [inputFilters, setInputFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([]);

  // --- Helpers ---
  const setInputFilterValue = (id: string, value: string | null) => {
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

  // --- Data Fetching ---
  const { data, isLoading, isError, error } = usePlantMasterTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });

  const tableData = (data?.data as PlantMasterRow[]) || [];
  const totalCount = data?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  // --- Columns ---
  const columnHelper = createColumnHelper<PlantMasterRow>();

  const columns = [
    columnHelper.accessor("record_type", {
      header: "Type",
      size: 100,
      cell: (info) => {
        const type = info.getValue();
        return (
          <Badge
            variant="light"
            color={type === "JOB" ? "blue" : "orange"}
            leftSection={
              type === "JOB" ? <FaBoxOpen size={10} /> : <FaTools size={10} />
            }
          >
            {type === "JOB" ? "JOB" : "SVC"}
          </Badge>
        );
      },
    }),
    columnHelper.accessor("display_id", {
      header: "Ref #",
      size: 120,
      cell: (info) => (
        <Text fw={700} size="sm">
          {info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor("client_name", {
      header: "Client",
      size: 150,
      cell: (info) => (
        <Text size="sm" lineClamp={1}>
          {info.getValue() || "—"}
        </Text>
      ),
    }),
    columnHelper.accessor("description", {
      header: "Description",
      size: 300,
      cell: (info) => {
        const rawValue = info.getValue();
        const cleanText = rawValue
          ? String(rawValue).replace(/<[^>]+>/g, " ")
          : "—";

        return (
          <Tooltip label={cleanText} multiline w={250}>
            <Text size="sm" c="dimmed" lineClamp={1}>
              {cleanText}
            </Text>
          </Tooltip>
        );
      },
    }),
    columnHelper.accessor("due_date", {
      header: "Due Date",
      size: 130,
      cell: (info) => {
        const date = info.getValue();
        if (!date)
          return (
            <Text c="dimmed" size="sm">
              TBD
            </Text>
          );
        // Highlight overdue items?
        const isPast = dayjs(date).isBefore(dayjs(), "day");
        return (
          <Text size="sm" fw={isPast ? 700 : 400} c={isPast ? "red" : "dark"}>
            {dayjs(date).format("MMM D, YYYY")}
          </Text>
        );
      },
    }),
    columnHelper.accessor("status_raw", {
      header: "Status",
      size: 120,
      cell: (info) => {
        const val = info.getValue();
        // Simple color mapping
        const color =
          val === "confirmed"
            ? "green"
            : val === "completed"
            ? "gray"
            : val === "tentative"
            ? "yellow"
            : "blue";

        return (
          <Badge color={color} variant="dot" size="sm">
            {val}
          </Badge>
        );
      },
    }),
  ];

  // --- Table Instance ---
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
        <Text c="red">Error: {(error as Error).message}</Text>
      </Center>
    );
  }

  return (
    <Box
      p={rem(20)}
      h="calc(100vh - 45px)"
      display="flex"
      style={{ flexDirection: "column" }}
    >
      {/* HEADER */}
      <Group mb="md">
        <ThemeIcon
          size={50}
          radius="md"
          variant="gradient"
          gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
        >
          <FaIndustry size={26} />
        </ThemeIcon>
        <Stack gap={0}>
          <Title order={2} style={{ color: "#343a40" }}>
            Plant Master Schedule
          </Title>
          <Text size="sm" c="dimmed">
            Unified view of Production Jobs and Service Orders
          </Text>
        </Stack>
      </Group>

      {/* FILTERS */}
      <Accordion variant="contained" radius="md" mb="md">
        <Accordion.Item value="filters">
          <Accordion.Control icon={<FaSearch size={16} />}>
            Search Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <TextInput
                label="Reference #"
                placeholder="Job or SO #"
                value={getInputFilterValue("display_id")}
                onChange={(e) =>
                  setInputFilterValue("display_id", e.target.value)
                }
              />
              <TextInput
                label="Client"
                placeholder="Search Client..."
                value={getInputFilterValue("client_name")}
                onChange={(e) =>
                  setInputFilterValue("client_name", e.target.value)
                }
              />
              <DateInput
                label="Due Date"
                placeholder="Exact Date Match"
                clearable
                value={
                  getInputFilterValue("due_date")
                    ? dayjs(getInputFilterValue("due_date")).toDate()
                    : null
                }
                onChange={(date) => {
                  const val = date ? dayjs(date).format("YYYY-MM-DD") : null;
                  setInputFilterValue("due_date", val);
                }}
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

      {/* TABLE */}
      <ScrollArea style={{ flex: 1 }} type="hover">
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
                    <Text c="dimmed">No records found.</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Table.Tr
                  key={`${row.original.record_type}-${row.original.id}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    // Smart Routing based on type
                    if (row.original.record_type === "JOB") {
                      // Assuming you want to go to the production schedule or install page for jobs
                      router.push(`/dashboard/installation/${row.original.id}`);
                    } else {
                      router.push(
                        `/dashboard/serviceorders/${row.original.id}`
                      );
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <Table.Td
                      key={cell.id}
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
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

      {/* PAGINATION */}
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
    </Box>
  );
}
