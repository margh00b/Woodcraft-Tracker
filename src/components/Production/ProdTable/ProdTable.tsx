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
  ColumnFiltersState,
  FilterFn,
  getPaginationRowModel,
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
  ActionIcon,
  Button,
  rem,
  Stack,
  Accordion,
  SimpleGrid,
  Select,
} from "@mantine/core";
import {
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaCalendarAlt,
  FaFire,
  FaCheckCircle,
  FaRegCircle,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import { Tables } from "@/types/db";
import dayjs from "dayjs";
import { DateInput, DatePicker } from "@mantine/dates";

// --- 1. Types ---
type ProductionJobView = Tables<"jobs"> & {
  production_schedule: Tables<"production_schedule"> | null;
  sales_orders:
    | (Tables<"sales_orders"> & {
        client: Tables<"client"> | null;
        cabinet: Tables<"cabinets"> | null;
      })
    | null;
};

// --- 2. Generic Filter ---
const genericFilter: FilterFn<ProductionJobView> = (
  row,
  columnId,
  filterValue
) => {
  const val = String(row.getValue(columnId) ?? "").toLowerCase();
  return val.includes(String(filterValue).toLowerCase());
};

// --- 3. Component ---
export default function ProdTable() {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const { supabase, isAuthenticated } = useSupabase();
  const router = useRouter();
  const getFilterValue = (id: string): string => {
    // Find the filter object, access its value, and ensure it's converted to a string.
    const filter = columnFilters.find((f) => f.id === id);
    const value = filter?.value;

    // Handle null/undefined or any odd types by forcing an empty string fallback
    return String(value ?? "");
  };
  // --- 4. Fetch data from jobs ---
  const {
    data: productionJobs,
    isLoading,
    isError,
    error,
  } = useQuery<ProductionJobView[]>({
    queryKey: ["production_schedule_list"],
    queryFn: async () => {
      const { data, error: dbError } = await supabase
        .from("jobs")
        .select(
          `
        id,
        job_number,
        job_base_number,
        job_suffix,
        production_schedule:production_schedule(*),
        sales_orders:sales_orders (
        shipping_street, shipping_city, shipping_province, shipping_zip,
          client:client (lastName),
          cabinet:cabinets (species, color, door_style)
        )
      `
        )
        .not("prod_id", "is", null);

      if (dbError) throw new Error(dbError.message || "Failed to fetch jobs");
      return data as unknown as ProductionJobView[];
    },
    enabled: isAuthenticated,
  });

  // --- 5. Columns ---
  const columnHelper = createColumnHelper<ProductionJobView>();

  const columns = [
    columnHelper.accessor("job_number", {
      header: "Job No.",
      size: 200,
      minSize: 150,
      cell: (info) => (
        <Group gap={4}>
          <Text fw={600} size="sm">
            {info.getValue()}
          </Text>
          {info.row.original.production_schedule?.rush && (
            <Tooltip label="RUSH JOB">
              <FaFire size={12} color="red" />
            </Tooltip>
          )}
        </Group>
      ),
      enableColumnFilter: true,
      filterFn: genericFilter as any,
    }),
    columnHelper.accessor("production_schedule.received_date", {
      id: "received_date",
      header: "Received Date",
      size: 140,
      minSize: 120,
      cell: (info) => {
        const date = info.getValue();
        if (!date) return <Text c="orange">TBD</Text>;
        return dayjs(date).format("YYYY-MM-DD");
      },
    }),
    columnHelper.accessor("production_schedule.placement_date", {
      id: "placement_date",
      header: "Placement Date",
      size: 140,
      minSize: 120,
      cell: (info) => {
        const date = info.getValue();
        if (!date) return <Text c="orange">TBD</Text>;
        return dayjs(date).format("YYYY-MM-DD");
      },
    }),

    columnHelper.accessor("production_schedule.ship_schedule", {
      id: "ship_schedule",
      header: "Ship Date",
      size: 600,
      minSize: 650,
      cell: (info) => {
        const date = info.getValue();
        const status = info.row.original.production_schedule?.ship_status;

        let gradient: string;
        let label: string;

        switch (status) {
          case "confirmed":
            gradient = "linear-gradient(135deg, #4A00E0, #8E2DE2)"; // purple-blue
            label = "CONFIRMED";
            break;
          case "tentative":
            gradient = "linear-gradient(135deg, #FF6A00, #FFB347)"; // orange-yellow
            label = "TENTATIVE";
            break;
          default:
            gradient = "linear-gradient(135deg, #B0BEC5, #78909C)"; // muted gray-blue
            label = "UNPROCESSED";
        }

        return (
          <Group style={{ width: "100%" }} justify="space-between">
            <Text
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
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
              }}
            >
              {label}
            </Badge>
          </Group>
        );
      },
    }),

    columnHelper.accessor("sales_orders.client.lastName", {
      id: "clientlastName",
      header: "Client",
      size: 150,
      minSize: 120,
      cell: (info) => info.getValue() ?? "—",
    }),

    columnHelper.display({
      id: "cabinet_info",
      header: "Cabinet",
      size: 180,
      minSize: 150,
      cell: (info) => {
        const cabinet = info.row.original.sales_orders?.cabinet;
        if (!cabinet) return <Text c="dimmed">—</Text>;
        const parts = [
          cabinet.species,
          cabinet.color,
          cabinet.door_style,
        ].filter(Boolean);

        return (
          <Text size="sm" c="dimmed" lineClamp={1} tt="capitalize">
            {parts.join(" • ")}
          </Text>
        );
      },
      enableColumnFilter: false,
    }),
    columnHelper.display({
      id: "production_status",
      header: "Progress Steps",
      size: 500,
      minSize: 500,
      cell: (info) => {
        const schedule = info.row.original.production_schedule;
        if (!schedule) return <Text c="dimmed">—</Text>;

        const steps: {
          key: keyof Tables<"production_schedule">;
          label: string;
        }[] = [
          { key: "in_plant_actual", label: "In Plant" },
          { key: "doors_completed_actual", label: "Doors" },
          { key: "cut_finish_completed_actual", label: "Cut Finish" },
          { key: "custom_finish_completed_actual", label: "Custom Finish" },
          { key: "drawer_completed_actual", label: "Drawer" },
          { key: "cut_melamine_completed_actual", label: "Cut Melamine" },
          { key: "paint_completed_actual", label: "Paint" },
          { key: "assembly_completed_actual", label: "Assembly" },
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
              const done = !!schedule[step.key];
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
      enableColumnFilter: false,
    }),
    columnHelper.display({
      id: "site_address",
      header: "Site Address",
      size: 300,
      minSize: 200,
      cell: (info) => {
        const order = info.row.original.sales_orders;
        if (!order) return <Text c="dimmed">—</Text>;
        const address = [
          order.shipping_street,
          order.shipping_city,
          order.shipping_province,
          order.shipping_zip,
        ]
          .filter(Boolean)
          .join(", ");
        return (
          <Text size="sm" c="dimmed" lineClamp={1}>
            {address}
          </Text>
        );
      },
      enableColumnFilter: true, // enable filtering
      filterFn: (row, columnId, filterValue) => {
        const order = row.original.sales_orders;
        if (!order || !filterValue) return true;
        const address = [
          order.shipping_street,
          order.shipping_city,
          order.shipping_province,
          order.shipping_zip,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return address.includes(String(filterValue).toLowerCase());
      },
    }),
  ];
  // --- 6. Table setup ---
  const table = useReactTable({
    data: productionJobs || [],
    columns,
    state: { columnFilters, pagination },
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // --- 7. Render ---
  if (!isAuthenticated || isLoading)
    return (
      <Center>
        <Loader />
      </Center>
    );
  if (isError)
    return (
      <Center>
        <Text c="red">{(error as any)?.message}</Text>
      </Center>
    );

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        padding: rem(20),
        height: "calc(100vh - 45px)",
      }}
    >
      <Text fw={700} size="xl" mb="md">
        Production Schedule Overview
      </Text>
      {/* SEARCH/FILTER ACCORDION */}
      <Accordion
        variant="contained"
        radius="md"
        mb="md"
        defaultValue="search-filters"
      >
        <Accordion.Item value="search-filters">
          <Accordion.Control icon={<FaSearch size={16} />}>
            Search Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid
              cols={{ base: 1, sm: 3, md: 5, lg: 6 }} // Expanded grid for more filters
              mt="sm"
              spacing="md"
            >
              {/* Filter 1: Job Number */}
              <TextInput
                label="Job Number"
                placeholder="e.g., 202401"
                value={getFilterValue("job_number")}
                onChange={(e) =>
                  table.getColumn("job_number")?.setFilterValue(e.target.value)
                }
              />
              {/* Filter 2: Client Name */}
              <TextInput
                label="Client"
                placeholder="e.g., Smith"
                value={getFilterValue("clientlastName")}
                onChange={(e) =>
                  table
                    .getColumn("clientlastName")
                    ?.setFilterValue(e.target.value)
                }
              />
              <DateInput
                label="Received Date"
                placeholder="Filter by Date"
                clearable
                value={
                  getFilterValue("received_date")
                    ? dayjs(getFilterValue("received_date")).toDate()
                    : null
                }
                onChange={(date) => {
                  // Safely format the Date object back to YYYY-MM-DD using Day.js
                  const formattedDate = date
                    ? dayjs(date).format("YYYY-MM-DD")
                    : undefined;

                  table
                    .getColumn("received_date")
                    ?.setFilterValue(formattedDate);
                }}
                valueFormat="YYYY-MM-DD"
              />
              {/* Filter 5: Placement Date (Text search for simplicity) */}
              <DateInput
                label="Placement Date"
                placeholder="Filter by Date"
                clearable
                value={
                  getFilterValue("placement_date")
                    ? dayjs(getFilterValue("placement_date")).toDate()
                    : null
                }
                onChange={(date) => {
                  // Safely format the Date object back to YYYY-MM-DD using Day.js
                  const formattedDate = date
                    ? dayjs(date).format("YYYY-MM-DD")
                    : undefined;

                  table
                    .getColumn("placement_date")
                    ?.setFilterValue(formattedDate);
                }}
                valueFormat="YYYY-MM-DD"
              />
              <DateInput
                label="Ship Date"
                placeholder="Filter by Date" // Added placeholder for clarity
                clearable
                value={
                  getFilterValue("ship_schedule")
                    ? dayjs(getFilterValue("ship_schedule")).toDate() // FIX 1: Use dayjs to parse the filter string into a Date object
                    : null
                }
                onChange={(date) => {
                  // FIX 2: Use dayjs to safely format the Date object back to a YYYY-MM-DD string
                  const formattedDate = date
                    ? dayjs(date).format("YYYY-MM-DD")
                    : undefined;

                  table
                    .getColumn("ship_schedule")
                    ?.setFilterValue(formattedDate);
                }}
                // Added valueFormat for clarity, though Day.js handles the output formatting
                valueFormat="YYYY-MM-DD"
              />
              {/* Filter 7: Site Address (Text search) */}
              <TextInput
                label="Site Address"
                placeholder="Street or City"
                value={getFilterValue("site_address")}
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
            cursor: "pointer",
            background: "linear-gradient(135deg, #dfc9f2, #ba9bfa)",
          },
        }}
        type="always"
      >
        <Table
          striped
          highlightOnHover
          withColumnBorders
          style={{ minWidth: "2100px" }}
        >
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Th
                    key={header.id}
                    colSpan={header.colSpan}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ cursor: "pointer" }}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    <span>
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
                    <Text c="dimmed">No production jobs found.</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Table.Tr
                  key={row.id}
                  onClick={() =>
                    router.push(
                      `/dashboard/production/schedule/${row.original.id}`
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

      {/* PAGINATION */}
      <Box
        style={{
          position: "fixed",
          bottom: 0,
          left: rem(200),
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
