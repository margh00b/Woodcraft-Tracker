"use client";

import { useState, useMemo } from "react";
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
  Badge,
  rem,
  Stack,
  ThemeIcon,
  Title,
  SimpleGrid,
} from "@mantine/core";
import {
  FaPlus,
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaEye,
  FaHome,
} from "react-icons/fa";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query"; // Import useQuery
import { useSupabase } from "@/hooks/useSupabase"; // Ensure Supabase hook is imported
import { useSalesTable } from "@/hooks/useSalesTable";
import { Views } from "@/types/db";

type SalesTableView = Views<"sales_table_view">;
export default function SalesTable() {
  const router = useRouter();
  const { supabase, isAuthenticated } = useSupabase(); // Access Supabase client

  // --- 1. Table State ---
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [inputFilters, setInputFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([]);

  // Helpers
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

  const { data: stats } = useQuery({
    queryKey: ["sales_stats_global"],
    queryFn: async () => {
      const [allRes, quoteRes, soldRes] = await Promise.all([
        supabase
          .from("sales_orders")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("sales_orders")
          .select("*", { count: "exact", head: true })
          .eq("stage", "QUOTE"),
        supabase
          .from("sales_orders")
          .select("*", { count: "exact", head: true })
          .eq("stage", "SOLD"),
      ]);

      return {
        ALL: allRes.count || 0,
        QUOTE: quoteRes.count || 0,
        SOLD: soldRes.count || 0,
      };
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  const { data, isLoading, isError, error } = useSalesTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });

  const tableData = data?.data || [];
  const totalCount = data?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  // --- 4. Search Actions ---
  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setActiveFilters(inputFilters);
  };

  const clearFilters = () => {
    setInputFilters([]);
    setActiveFilters([]);
  };

  const setStageFilter = (stage: string) => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    // Update active filters directly to trigger server refetch
    setActiveFilters((prev) => {
      const existing = prev.filter((f) => f.id !== "stage");
      if (stage === "ALL") return existing;
      return [...existing, { id: "stage", value: stage }];
    });
  };

  const currentStage =
    activeFilters.find((f) => f.id === "stage")?.value || "ALL";

  // --- 5. Columns ---
  const columnHelper = createColumnHelper<SalesTableView>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("sales_order_number", {
        header: "Id",
        size: 80,
        cell: (info) => (
          <Text
            size="sm"
            c={info.row.original.stage === "SOLD" ? "green.8" : "blue.8"}
          >
            {info.getValue()}
          </Text>
        ),
      }),
      columnHelper.accessor("job_number", {
        header: "Job Number",
        size: 100,
        cell: (info) => {
          if (info.getValue()) {
            return <Text fw={600}>{info.getValue()}</Text>;
          } else {
            return (
              <Text c="gray" size="xs">
                Unassigned (Quote)
              </Text>
            );
          }
        },
      }),
      columnHelper.accessor("stage", {
        header: "Status",
        size: 80,
        cell: (info) => (
          <Badge
            style={{ cursor: "inherit" }}
            color={info.getValue() === "SOLD" ? "green" : "blue"}
            variant="light"
          >
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor("designer", {
        header: "Designer",
        size: 100,
      }),
      columnHelper.accessor("shipping_client_name", {
        id: "clientlastName",
        header: "Client Name",
        size: 150,
      }),
      columnHelper.accessor(
        (row) =>
          [
            row.shipping_street,
            row.shipping_city,
            row.shipping_province,
            row.shipping_zip,
          ]
            .filter(Boolean)
            .join(", ") || "—",
        {
          id: "shippingAddress",
          header: "Shipping Address",
          size: 200,
          cell: (info) => (
            <Tooltip label={info.getValue()}>
              <Text size="sm" truncate>
                {info.getValue()}
              </Text>
            </Tooltip>
          ),
        }
      ),
      columnHelper.accessor("invoice_balance", {
        header: "Balance",
        size: 100,
        cell: (info) => `$${(info.getValue() as number)?.toFixed(2) || "0.00"}`,
      }),
      columnHelper.accessor("created_at", {
        header: "Created",
        size: 100,
        cell: (info) => {
          const date = info.getValue<string>();
          return date ? dayjs(date).format("YYYY-MM-DD") : "—";
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        size: 60,
        cell: (info) => (
          <Group justify="center">
            <Tooltip label="View Details / Edit">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => {
                  router.push(
                    `/dashboard/sales/editsale/${info.row.original.id}`
                  );
                }}
              >
                <FaEye size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      }),
    ],
    [router]
  );

  // --- 6. Table Instance ---
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
      {/* Header */}
      <Group mb="md" justify="space-between">
        <Group>
          <ThemeIcon
            size={50}
            radius="md"
            variant="gradient"
            gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
          >
            <FaHome size={26} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={2} style={{ color: "#343a40" }}>
              Sales
            </Title>
            <Text size="sm" c="dimmed">
              Track sales
            </Text>
          </Stack>
        </Group>

        <Button
          onClick={() => router.push("/dashboard/sales/newsale")}
          leftSection={<FaPlus size={14} />}
          style={{
            background: "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
            color: "white",
            border: "none",
          }}
        >
          New Order
        </Button>
      </Group>

      {/* Filter Section */}
      <Accordion variant="contained" radius="md" mb="md" w={"100%"}>
        <Accordion.Item value="search-filters">
          <Accordion.Control icon={<FaSearch size={16} />}>
            Search Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} mt="sm" spacing="xs">
              <TextInput
                label="Job Number"
                placeholder="e.g. 202401"
                value={getInputFilterValue("job_number")}
                onChange={(e) =>
                  setInputFilterValue("job_number", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <TextInput
                label="Client Name"
                placeholder="Search Client..."
                value={getInputFilterValue("clientlastName")}
                onChange={(e) =>
                  setInputFilterValue("clientlastName", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </SimpleGrid>
            <Group justify="flex-end" mt="md">
              <Button variant="default" color="gray" onClick={clearFilters}>
                Clear Filters
              </Button>
              <Button
                variant="filled"
                color="blue"
                leftSection={<FaSearch size={14} />}
                onClick={handleSearch}
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

      {/* Status Pills */}
      <Group mb="md" align="center" style={{ width: "100%" }}>
        <Group wrap="wrap">
          {[
            {
              key: "ALL",
              label: "All Orders",
              color: "gray",
              count: stats?.ALL || 0, // Using DB Stats
            },
            {
              key: "QUOTE",
              label: "Quotes",
              color: "blue",
              count: stats?.QUOTE || 0, // Using DB Stats
            },
            {
              key: "SOLD",
              label: "Jobs",
              color: "green",
              count: stats?.SOLD || 0, // Using DB Stats
            },
          ].map((item) => {
            const isActive = currentStage === item.key;
            const gradients: Record<string, string> = {
              ALL: "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)",
              QUOTE: "linear-gradient(135deg, #4da0ff 0%, #0066cc 100%)",
              SOLD: "linear-gradient(135deg, #3ac47d 0%, #0f9f4f 100%)",
            };

            const gradientsLight: Record<string, string> = {
              ALL: "linear-gradient(135deg, #e4d9ff 0%, #d7caff 100%)",
              QUOTE: "linear-gradient(135deg, #d7e9ff 0%, #c2ddff 100%)",
              SOLD: "linear-gradient(135deg, #d0f2e1 0%, #b9ebd3 100%)",
            };

            return (
              <Button
                key={item.key}
                variant={isActive ? "filled" : "light"}
                radius="xl"
                size="sm"
                onClick={() => setStageFilter(item.key)}
                style={{
                  cursor: "pointer",
                  minWidth: 120,
                  background: isActive
                    ? gradients[item.key]
                    : gradientsLight[item.key],
                  color: isActive ? "white" : "black",
                  border: "none",
                }}
                px={12}
              >
                <Group gap={6}>
                  <Text fw={600} size="sm">
                    {item.label}
                  </Text>

                  <Badge
                    autoContrast
                    variant="filled"
                    radius="xl"
                    size="sm"
                    style={{
                      cursor: "inherit",
                      background: "white",
                      color: "black",
                    }}
                  >
                    {item.count}
                  </Badge>
                </Group>
              </Button>
            );
          })}
        </Group>

        <div style={{ flex: 1 }} />
      </Group>

      {/* Data Table */}
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
          layout="fixed"
        >
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSorted = header.column.getIsSorted();
                  return (
                    <Table.Th
                      key={header.id}
                      colSpan={header.colSpan}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{
                        position: "relative",
                        width: header.getSize(),
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        userSelect: "none",
                      }}
                    >
                      <Group gap="xs" wrap="nowrap">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {isSorted === "asc" && <FaSortUp size={12} />}
                        {isSorted === "desc" && <FaSortDown size={12} />}
                        {!isSorted && (
                          <FaSort size={12} style={{ opacity: 0.2 }} />
                        )}
                      </Group>
                    </Table.Th>
                  );
                })}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {table.getRowModel().rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Center py="xl">
                    <Text c="dimmed">
                      No orders found matching the filters.
                    </Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Table.Tr
                  key={row.id}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    router.push(`/dashboard/sales/editsale/${row.original.id}`)
                  }
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

      {/* Pagination */}
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
