"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  FilterFn,
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
  Accordion,
  Tooltip,
  ActionIcon,
  Button,
  SimpleGrid,
  Badge,
  rem,
  Stack,
  ThemeIcon,
  Title,
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
import { useDisclosure } from "@mantine/hooks";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";
import { Tables } from "@/types/db";

interface SalesOrderView
  extends Pick<
    Tables<"sales_orders">,
    | "id"
    | "sales_order_number"
    | "stage"
    | "invoice_balance"
    | "designer"
    | "created_at"
    | "shipping_client_name"
    | "shipping_street"
    | "shipping_city"
    | "shipping_province"
    | "shipping_zip"
    | "shipping_phone_1"
    | "shipping_email_1"
  > {
  job_ref: Pick<Tables<"jobs">, "job_number" | "job_base_number"> | null;
}

const genericFilter: FilterFn<SalesOrderView> = (
  row,
  columnId,
  filterValue
) => {
  const filterText = String(filterValue).toLowerCase();
  let cellValue;

  if (columnId.includes(".")) {
    const keys = columnId.split(".");
    const parentObject = row.original[keys[0] as keyof SalesOrderView];

    if (parentObject && typeof parentObject === "object" && keys.length === 2) {
      cellValue = parentObject[keys[1] as keyof typeof parentObject];
    }
  } else {
    cellValue = row.getValue(columnId);
  }

  const val = String(cellValue ?? "").toLowerCase();
  return val.includes(filterText);
};

export default function SalesTable() {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const { supabase, isAuthenticated } = useSupabase();
  const router = useRouter();

  const [viewModalOpened, { open: viewModalOpen, close: viewModalClose }] =
    useDisclosure(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrderView | null>(
    null
  );

  const [stageFilter, setStageFilter] = useState<"ALL" | "QUOTE" | "SOLD">(
    "ALL"
  );

  const {
    data: orders,
    isLoading: loading,
    isError,
    error,
  } = useQuery<SalesOrderView[]>({
    queryKey: ["sales_orders_full_list"],
    queryFn: async () => {
      const { data, error: dbError } = await supabase
        .from("sales_orders")
        .select(
          `
            id, sales_order_number, stage, total, deposit, invoice_balance, designer, created_at,
            shipping_client_name, shipping_street, shipping_city, shipping_province, shipping_zip,
            job_ref:jobs (job_number, job_base_number) 
        `
        )
        .order("created_at", { ascending: false });

      if (dbError)
        throw new Error(dbError.message || "Failed to fetch sales orders");
      return data as unknown as SalesOrderView[];
    },
    enabled: isAuthenticated,
    placeholderData: (previousData) => previousData,
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (stageFilter === "ALL") return orders;

    return orders.filter((order) => order.stage === stageFilter);
  }, [orders, stageFilter]);

  const columnHelper = createColumnHelper<SalesOrderView>();
  const columns = useMemo(
    () => [
      columnHelper.accessor("sales_order_number", {
        header: "Id",
        size: 50,
        minSize: 60,
        enableColumnFilter: true,
        filterFn: "includesString" as any,
        cell: (info) => (
          <Text
            size="sm"
            c={info.row.original.stage === "SOLD" ? "green.8" : "blue.8"}
          >
            {info.getValue()}
          </Text>
        ),
      }),
      ...(stageFilter !== "QUOTE"
        ? [
            columnHelper.accessor("job_ref.job_number", {
              id: "job_number",
              header: "Job Number",
              size: 50,
              minSize: 60,
              enableColumnFilter: true,
              filterFn: genericFilter as any,
              cell: (info) => <Text>{info.getValue() || "—"}</Text>,
            }),
          ]
        : []),
      columnHelper.accessor("stage", {
        header: "Status",
        size: 40,
        minSize: 40,
        cell: (info) => (
          <Badge
            style={{ cursor: "inherit" }}
            color={info.getValue() === "SOLD" ? "green" : "blue"}
            variant="light"
          >
            {info.getValue()}
          </Badge>
        ),
        enableColumnFilter: false,
      }),
      columnHelper.accessor("designer", {
        header: "Designer",
        size: 60,
        minSize: 30,
        filterFn: "includesString" as any,
      }),
      columnHelper.accessor("shipping_client_name", {
        id: "clientlastName",
        header: "Client Name",
        size: 150,
        minSize: 60,
        enableColumnFilter: true,
        filterFn: genericFilter as any,
        cell: (info) => info.getValue(),
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
          minSize: 80,
          enableColumnFilter: true,
          filterFn: genericFilter as any,
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
        minSize: 60,
        cell: (info) => `$${(info.getValue() as number)?.toFixed(2) || "0.00"}`,
      }),
      columnHelper.accessor("created_at", {
        header: "Created",
        size: 130,
        minSize: 60,
        cell: (info) => {
          const date = info.getValue<string>();
          return date ? dayjs(date).format("YYYY-MM-DD") : "—";
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        size: 40,
        minSize: 40,
        cell: (info) => (
          <Group justify="center">
            <Tooltip label="View Details / Edit">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => {
                  setSelectedOrder(info.row.original);
                  viewModalOpen();
                }}
              >
                <FaEye size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      }),
    ],
    [columnHelper]
  );

  const table = useReactTable({
    data: filteredOrders,
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
  type StageKey = "ALL" | "QUOTE" | "SOLD";

  const stageItems: {
    key: StageKey;
    label: string;
    color: string;
    count: number;
  }[] = [
    {
      key: "ALL",
      label: "All Orders",
      color: "black",
      count: orders?.length || 0,
    },
    {
      key: "QUOTE",
      label: "Quotes",
      color: "blue",
      count: orders?.filter((o) => o.stage === "QUOTE").length || 0,
    },
    {
      key: "SOLD",
      label: "Jobs",
      color: "green",
      count: orders?.filter((o) => o.stage === "SOLD").length || 0,
    },
  ];

  if (!isAuthenticated || loading) {
    return (
      <Center style={{ height: "300px" }}>
        <Loader />
      </Center>
    );
  }
  if (isError) {
    return (
      <Center style={{ height: "300px" }}>
        <Text c="red">Error: {error?.message}</Text>
      </Center>
    );
  }

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        padding: rem(20),
        height: "calc(100vh - 40px)",
      }}
    >
      <Group mb="md">
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
      {/* --- STATUS FILTER PILLS --- */}

      <Group mb="md" align="center" style={{ width: "100%" }}>
        {/* Pills container */}
        <Group wrap="wrap">
          {stageItems.map((item) => {
            const isActive = stageFilter === item.key;

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
                variant="filled"
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

        {/* Spacer pushes button to the far right */}
        <div style={{ flex: 1 }} />

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

      {/* SEARCH/FILTER ACCORDION */}
      <Accordion variant="contained" radius="md" mb="md">
        <Accordion.Item value="search-filters">
          <Accordion.Control icon={<FaSearch size={16} />}>
            Search Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid
              cols={{ base: 1, sm: 2 }}
              mt="sm"
              spacing="xs"
              display={"flex"}
            >
              <TextInput
                placeholder="Job Number..."
                w={rem(200)}
                onChange={(e) =>
                  table.getColumn("job_number")?.setFilterValue(e.target.value)
                }
              />
              <TextInput
                w={rem(200)}
                placeholder="Client Name..."
                onChange={(e) =>
                  table
                    .getColumn("clientlastName")
                    ?.setFilterValue(e.target.value)
                }
              />
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {/* DATA TABLE */}
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
            {/* Show message if filter results in no data */}
            {table.getRowModel().rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Center>
                    <Text c="dimmed">
                      No orders found matching the filters/selection.
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

      {/* PAGINATION */}
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
