"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
  PaginationState,
  getPaginationRowModel,
  ColumnFiltersState,
  getFacetedRowModel,
  getFacetedUniqueValues,
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
  SimpleGrid,
  Accordion,
  Tooltip,
  ActionIcon,
  Button,
  rem,
  Badge,
  Stack,
  ThemeIcon,
  Title, // Added Badge
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
import { useSupabase } from "@/hooks/useSupabase";
import { Tables } from "@/types/db";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";

type ServiceOrderRow = Tables<"service_orders"> & {
  jobs:
    | (Tables<"jobs"> & {
        sales_orders:
          | (Tables<"sales_orders"> & {
              client: Tables<"client"> | null;
            })
          | null;
      })
    | null;
  installers: Tables<"installers"> | null;
};

export default function ServiceOrdersTable() {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 17,
  });

  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "OPEN" | "COMPLETED"
  >("ALL");

  const { supabase, isAuthenticated } = useSupabase();
  const router = useRouter();

  const {
    data: serviceOrders,
    isLoading: loading,
    isError,
    error,
  } = useQuery<ServiceOrderRow[]>({
    queryKey: ["service_orders_list"],
    queryFn: async () => {
      const { data, error: dbError } = await supabase
        .from("service_orders")
        .select(
          `
          *,
          jobs (
        job_number,
        sales_orders (
          shipping_street,
          shipping_city,
          shipping_province,
          shipping_zip,
          shipping_client_name,
          shipping_phone_1,
          shipping_phone_2,
          shipping_email_1,
          shipping_email_2
        )
      ),
          installers (company_name, first_name, last_name)
        `
        )
        .order("date_entered", { ascending: false });

      if (dbError) {
        console.error("Supabase query error:", dbError);
        throw new Error(dbError.message || "Failed to fetch service orders");
      }
      return data as unknown as ServiceOrderRow[];
    },
    enabled: isAuthenticated,
    placeholderData: (previousData) => previousData,
  });

  // 2. Filter Data based on status
  const filteredServiceOrders = useMemo(() => {
    if (!serviceOrders) return [];
    if (statusFilter === "ALL") return serviceOrders;
    if (statusFilter === "OPEN")
      return serviceOrders.filter((so) => !so.completed_at);
    if (statusFilter === "COMPLETED")
      return serviceOrders.filter((so) => so.completed_at);
    return serviceOrders;
  }, [serviceOrders, statusFilter]);

  // 3. Define Pill Items configuration
  const statusItems = [
    {
      key: "ALL",
      label: "All Orders",
      count: serviceOrders?.length || 0,
    },
    {
      key: "OPEN",
      label: "Open",
      count: serviceOrders?.filter((so) => !so.completed_at).length || 0,
    },
    {
      key: "COMPLETED",
      label: "Completed",
      count: serviceOrders?.filter((so) => so.completed_at).length || 0,
    },
  ] as const;

  const columnHelper = createColumnHelper<ServiceOrderRow>();
  const columns = [
    columnHelper.accessor("service_order_number", {
      header: "Service Order #",
      size: 120,
      minSize: 100,
      cell: (info) => (
        <Text fw={600} size="sm">
          {info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor("jobs.job_number", {
      header: "Job No.",
      size: 120,
      minSize: 100,
      cell: (info) => (
        <Text fw={600} size="sm">
          {info.getValue()}
        </Text>
      ),
    }),
    // ... (Keep existing columns: Client Name, Site Address, Date Entered, Date Due)
    columnHelper.accessor("jobs.sales_orders.shipping_client_name", {
      header: "Client Name",
      size: 150,
      minSize: 100,
      cell: (info) => info.getValue() || "—",
    }),
    columnHelper.accessor(
      (row) => {
        const so = row.jobs?.sales_orders;
        if (!so) return "—";
        const parts = [
          so.shipping_street,
          so.shipping_city,
          so.shipping_province,
          so.shipping_zip,
        ].filter(Boolean);
        return parts.join(", ");
      },
      {
        id: "site_address",
        header: "Site Address",
        size: 250,
        minSize: 150,
        cell: (info) => (
          <Tooltip label={info.getValue()}>
            <Text truncate>{info.getValue()}</Text>
          </Tooltip>
        ),
      }
    ),
    columnHelper.accessor("date_entered", {
      header: "Date Entered",
      size: 130,
      minSize: 100,
      cell: (info) => {
        const date = info.getValue();
        return date ? dayjs(date).format("YYYY-MM-DD") : "—";
      },
    }),
    columnHelper.accessor("due_date", {
      header: "Date Due",
      size: 130,
      minSize: 100,
      cell: (info) => {
        const date = info.getValue();
        return date ? dayjs(date).format("YYYY-MM-DD") : "—";
      },
    }),
    columnHelper.accessor("completed_at", {
      header: "Completion",
      size: 160,
      minSize: 120,
      cell: (info) => {
        const date = info.getValue();
        if (date) {
          return (
            <Group gap={5}>
              <FaCheckCircle color="green" />
              <Text size="sm"> {dayjs(date).format("YYYY-MM-DD")}</Text>
            </Group>
          );
        }
        return (
          <Group gap={5}>
            <FaTimesCircle color="red" />
            <Text size="sm" c="dimmed">
              Not Completed
            </Text>
          </Group>
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
                console.log("Edit", info.row.original);
              }}
            >
              <FaPencilAlt size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    }),
  ];

  // 4. Update Table to use filteredServiceOrders
  const table = useReactTable({
    data: filteredServiceOrders, // <--- Changed from serviceOrders
    columns,
    state: {
      columnFilters,
      pagination,
    },
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const shouldShowLoader = useMemo(
    () => !isAuthenticated || loading,
    [isAuthenticated, loading]
  );

  if (shouldShowLoader) {
    return (
      <Center className="py-10">
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center className="py-10">
        <Text c="red">Error fetching service orders: {error.message}</Text>
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
      <Group mb="lg">
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
      {/* 5. NEW HEADER LAYOUT: Pills + Button */}
      <Group mb="md" align="center" style={{ width: "100%" }}>
        {/* Pills container */}
        <Group wrap="wrap">
          {statusItems.map((item) => {
            const isActive = statusFilter === item.key;

            // Define gradients matching SalesTable style
            const gradients: Record<string, string> = {
              ALL: "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)",
              OPEN: "linear-gradient(135deg, #4da0ff 0%, #0066cc 100%)",
              COMPLETED: "linear-gradient(135deg, #3ac47d 0%, #0f9f4f 100%)",
            };

            const gradientsLight: Record<string, string> = {
              ALL: "linear-gradient(135deg, #e4d9ff 0%, #d7caff 100%)",
              OPEN: "linear-gradient(135deg, #d7e9ff 0%, #c2ddff 100%)",
              COMPLETED: "linear-gradient(135deg, #d0f2e1 0%, #b9ebd3 100%)",
            };

            return (
              <Button
                key={item.key}
                variant="filled"
                radius="xl"
                size="sm"
                onClick={() => setStatusFilter(item.key)}
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

        {/* Spacer pushes button to the far right */}
        <div style={{ flex: 1 }} />

        <Button
          size="md"
          onClick={() => router.push("/dashboard/serviceorders/new")}
          leftSection={<FaPlus size={14} />}
          style={{
            background: "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
            color: "white",
            border: "none",
            whiteSpace: "nowrap",
          }}
        >
          New Service Order
        </Button>
      </Group>

      {/* 6. SEARCH FILTERS: Moved to full-width Accordion below header */}
      <Accordion
        variant="contained"
        radius="md"
        mb="md"
        transitionDuration={300}
      >
        <Accordion.Item value="search-filters">
          <Accordion.Control icon={<FaSearch size={16} />}>
            Search Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 3, md: 5 }} mt="sm" spacing="sm">
              <TextInput
                placeholder="SO #..."
                onChange={(e) =>
                  table
                    .getColumn("service_order_number")
                    ?.setFilterValue(e.target.value)
                }
              />
              <TextInput
                placeholder="Job #..."
                onChange={(e) =>
                  table
                    .getColumn("jobs_job_number")
                    ?.setFilterValue(e.target.value)
                }
              />
              <TextInput
                placeholder="Client Name..."
                onChange={(e) =>
                  table
                    .getColumn("jobs_sales_orders_client_lastName")
                    ?.setFilterValue(e.target.value)
                }
              />
              <TextInput
                placeholder="Site Address..."
                onChange={(e) =>
                  table
                    .getColumn("site_address")
                    ?.setFilterValue(e.target.value)
                }
              />
            </SimpleGrid>
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
            background: "linear-gradient(135deg, #8E2DE2, #4A00E0)",
          },
        }}
        type="hover"
      >
        <Table striped highlightOnHover withColumnBorders layout="fixed">
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const resizeHandler = header.getResizeHandler();
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
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}

                      <span className="inline-block ml-1">
                        {header.column.getIsSorted() === "asc" && <FaSortUp />}
                        {header.column.getIsSorted() === "desc" && (
                          <FaSortDown />
                        )}
                        {!header.column.getIsSorted() && (
                          <FaSort opacity={0.1} />
                        )}
                      </span>
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            resizeHandler(e);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            resizeHandler(e);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`resizer ${
                            header.column.getIsResizing() ? "isResizing" : ""
                          }`}
                          style={{
                            position: "absolute",
                            right: 0,
                            top: 0,
                            height: "100%",
                            width: "5px",
                            background: header.column.getIsResizing()
                              ? "blue"
                              : "transparent",
                            cursor: "col-resize",
                            userSelect: "none",
                            touchAction: "none",
                          }}
                        />
                      )}
                    </Table.Th>
                  );
                })}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {/* 7. Added Empty State Check */}
            {table.getRowModel().rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Center className="py-8">
                    <Text c="dimmed">
                      No service orders found matching the filter.
                    </Text>
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
          hideWithOnePage
          withEdges
          color="#4A00E0"
          total={table.getPageCount()}
          value={table.getState().pagination.pageIndex + 1}
          onChange={(page) => table.setPageIndex(page - 1)}
        />
      </Box>
    </Box>
  );
}
