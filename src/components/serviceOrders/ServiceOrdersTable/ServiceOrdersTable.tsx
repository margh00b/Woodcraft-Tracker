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
  ActionIcon,
  Button,
  rem,
  Badge,
  Stack,
  ThemeIcon,
  Title,
  SimpleGrid,
  Anchor,
} from "@mantine/core";
import {
  FaPencilAlt,
  FaPlus,
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaCheckCircle,
  FaTimesCircle,
  FaTools,
} from "react-icons/fa";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useServiceOrdersTable } from "@/hooks/useServiceOrdersTable";
import { Views } from "@/types/db";
import { useUser } from "@clerk/nextjs";
import { usePermissions } from "@/hooks/usePermissions";
dayjs.extend(utc);
// Define shape based on the View structure
type ServiceOrderView = Views<"service_orders_table_view">;

export default function ServiceOrdersTable() {
  const { canEditServiceOrders } = usePermissions();
  const router = useRouter();

  // --- State Management ---
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  // inputFilters = UI state, activeFilters = Query state
  const [inputFilters, setInputFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([]);

  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "OPEN" | "COMPLETED"
  >("ALL");

  // --- Filter Helpers ---
  const setInputFilterValue = (id: string, value: string) => {
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

  const handleStatusChange = (status: "ALL" | "OPEN" | "COMPLETED") => {
    setStatusFilter(status);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // --- Data Fetching ---
  const { data, isLoading, isError, error } = useServiceOrdersTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
    statusFilter,
  });

  const tableData = (data?.data as unknown as ServiceOrderView[]) || [];
  const totalCount = data?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  // --- Columns ---
  const columnHelper = createColumnHelper<ServiceOrderView>();

  const columns = [
    columnHelper.accessor("service_order_number", {
      header: "Service Order #",
      size: 150,
      minSize: 120,
      cell: (info) => (
        <Text fw={600} size="sm">
          {info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor("job_number", {
      header: "Job No.",
      size: 120,
      minSize: 100,
      cell: (info) => (
        <Text fw={600} size="sm">
          <Anchor
            href={`/dashboard/sales/editsale/${info.row.original.sales_order_id}`}
            style={{ color: "#6100bbff", fontWeight: "bold" }}
            onClick={(e) => e.stopPropagation()}
          >
            {info.getValue()}
          </Anchor>
        </Text>
      ),
    }),
    columnHelper.accessor("client_name", {
      header: "Client Name",
      size: 180,
      minSize: 140,
      cell: (info) => info.getValue() || "—",
    }),
    columnHelper.accessor("site_address", {
      header: "Site Address",
      size: 250,
      minSize: 180,
      cell: (info) => (
        <Tooltip label={info.getValue()}>
          <Text truncate size="sm">
            {info.getValue() || "—"}
          </Text>
        </Tooltip>
      ),
    }),
    columnHelper.accessor("date_entered", {
      header: "Date Entered",
      size: 130,
      minSize: 110,
      cell: (info) => {
        const date = info.getValue();
        return date ? dayjs(date).format("YYYY-MM-DD") : "—";
      },
    }),
    columnHelper.accessor("due_date", {
      header: "Date Due",
      size: 130,
      minSize: 110,
      cell: (info) => {
        const date = info.getValue();
        return date ? dayjs.utc(date).format("YYYY-MM-DD") : "—";
      },
    }),
    columnHelper.accessor("completed_at", {
      header: "Status",
      size: 160,
      minSize: 130,
      cell: (info) => {
        const date = info.getValue();
        if (date) {
          return (
            <Badge
              variant="gradient"
              gradient={{ from: "#3ac47d", to: "#0f9f4f", deg: 135 }}
              leftSection={<FaCheckCircle />}
            >
              Completed
            </Badge>
          );
        }
        return (
          <Badge
            variant="gradient"
            gradient={{ from: "#4da0ff", to: "#0066cc", deg: 135 }}
            leftSection={<FaTools />}
          >
            Open
          </Badge>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      size: 80,
      minSize: 80,
      cell: (info) => (
        <Group justify="center">
          <Tooltip label="Edit Service Order">
            <ActionIcon
              variant="subtle"
              color="blue"
              onClick={(e) => {
                e.stopPropagation();
                router.push(
                  `/dashboard/serviceorders/${info.row.original.service_order_id}`
                );
              }}
            >
              <FaPencilAlt size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    }),
  ];

  // --- Table Instance ---
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
      <Center style={{ height: "400px" }}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center style={{ height: "400px" }}>
        <Text c="red">Error: {(error as Error).message}</Text>
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
      <Group mb="md" justify="space-between">
        <Group>
          <ThemeIcon
            size={50}
            radius="md"
            variant="gradient"
            gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
          >
            <FaTools size={26} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={2} style={{ color: "#343a40" }}>
              Service Orders
            </Title>
            <Text size="sm" c="dimmed">
              Track service orders
            </Text>
          </Stack>
        </Group>

        {canEditServiceOrders && (
          <Button
            onClick={() => router.push("/dashboard/serviceorders/new")}
            leftSection={<FaPlus size={14} />}
            style={{
              background: "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
              color: "white",
              border: "none",
            }}
          >
            New Service Order
          </Button>
        )}
      </Group>

      {/* Filters Accordion */}
      <Accordion variant="contained" radius="md" mb="md">
        <Accordion.Item value="search-filters">
          <Accordion.Control icon={<FaSearch size={16} />}>
            Search Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mt="sm" spacing="md">
              <TextInput
                label="SO Number"
                placeholder="Search..."
                value={getInputFilterValue("service_order_number")}
                onChange={(e) =>
                  setInputFilterValue("service_order_number", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Job Number"
                placeholder="Search..."
                value={getInputFilterValue("job_number")}
                onChange={(e) =>
                  setInputFilterValue("job_number", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Client Name"
                placeholder="Search..."
                value={getInputFilterValue("client_name")}
                onChange={(e) =>
                  setInputFilterValue("client_name", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Site Address"
                placeholder="Search..."
                value={getInputFilterValue("site_address")}
                onChange={(e) =>
                  setInputFilterValue("site_address", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
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
      <Group mb="md">
        {[
          { key: "ALL", label: "All Orders" },
          { key: "OPEN", label: "Open" },
          { key: "COMPLETED", label: "Completed" },
        ].map((item) => {
          const isActive = statusFilter === item.key;

          // Theme Gradients
          const gradients: Record<string, string> = {
            ALL: "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)", // Purple
            OPEN: "linear-gradient(135deg, #4da0ff 0%, #0066cc 100%)", // Blue
            COMPLETED: "linear-gradient(135deg, #3ac47d 0%, #0f9f4f 100%)", // Green
          };

          const gradientsLight: Record<string, string> = {
            ALL: "linear-gradient(135deg, #e4d9ff 0%, #d7caff 100%)",
            OPEN: "linear-gradient(135deg, #d7e9ff 0%, #c2ddff 100%)",
            COMPLETED: "linear-gradient(135deg, #d0f2e1 0%, #b9ebd3 100%)",
          };

          return (
            <Button
              key={item.key}
              radius="xl"
              size="sm"
              onClick={() => handleStatusChange(item.key as any)}
              style={{
                cursor: "pointer",
                minWidth: 100,
                background: isActive
                  ? gradients[item.key]
                  : gradientsLight[item.key],
                color: isActive ? "white" : "black",
                border: "none",
                transition: "transform 0.1s ease",
              }}
              px={16}
            >
              {item.label}
            </Button>
          );
        })}
      </Group>
      <ScrollArea
        style={{
          flex: 1,
          minHeight: 0,
          padding: rem(10),
        }}
        styles={{
          thumb: {
            background: "linear-gradient(135deg, #8E2DE2, #4A00E0)",
          },
        }}
        type="hover"
      >
        <Table
          striped
          stickyHeader
          highlightOnHover
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
                    <Group gap="xs" wrap="nowrap">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "asc" && <FaSortUp />}
                      {header.column.getIsSorted() === "desc" && <FaSortDown />}
                      {!header.column.getIsSorted() && <FaSort opacity={0.2} />}
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
                    <Text c="dimmed">No service orders found.</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Table.Tr
                  key={row.id}
                  onClick={() =>
                    router.push(
                      `/dashboard/serviceorders/${row.original.service_order_id}`
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
