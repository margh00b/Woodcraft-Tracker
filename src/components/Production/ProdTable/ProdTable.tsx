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

// --- 1. Types ---
interface ClientType {
  firstName?: string;
  lastName: string;
  phone1?: string;
  email1?: string;
}

interface CabinetType {
  species: string;
  color: string;
  door_style: string;
}

interface ProductionScheduleType {
  rush: boolean;
  placement_date?: string | null;
  ship_schedule?: string | null;
  ship_status: "unprocessed" | "tentative" | "confirmed";
  // Add the actual fields here:
  in_plant_actual?: string | null;
  doors_completed_actual?: string | null;
  cut_finish_completed_actual?: string | null;
  custom_finish_completed_actual?: string | null;
  drawer_completed_actual?: string | null;
  cut_melamine_completed_actual?: string | null;
  paint_completed_actual?: string | null;
  assembly_completed_actual?: string | null;
}

interface SalesOrderType {
  client: ClientType;
  cabinet: CabinetType;
  shipping_street: string;
  shipping_city: string;
  shipping_province: string;
  shipping_zip: string;
}

interface JobType {
  id: number;
  job_number: string;
  job_base_number: number;
  job_suffix?: string;
  production_schedule?: ProductionScheduleType;
  sales_orders?: SalesOrderType;
}

interface ProductionJobView extends JobType {}

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
export default function ProductionScheduleTable() {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const { supabase, isAuthenticated } = useSupabase();
  const router = useRouter();

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

    columnHelper.accessor("production_schedule.placement_date", {
      header: "Placement Date",
      size: 140,
      minSize: 120,
      cell: (info) => {
        const date = info.getValue();
        if (!date) return <Text c="orange">TBD</Text>;
        return new Date(date).toLocaleDateString();
      },
    }),

    columnHelper.accessor("production_schedule.ship_schedule", {
      header: "Ship Date",
      size: 600,
      minSize: 650,
      cell: (info) => {
        const date = info.getValue();
        const status = info.row.original.production_schedule?.ship_status;

        let color: "gray" | "yellow" | "green";
        let label: string;

        switch (status) {
          case "confirmed":
            color = "green";
            label = "CONFIRMED";
            break;
          case "tentative":
            color = "yellow";
            label = "TENTATIVE";
            break;
          default:
            color = "gray";
            label = "UNPROCESSED";
        }

        return (
          <Group
            align="center"
            style={{ width: "100%", justifyContent: "flex-start" }}
          >
            <Text
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: date ? undefined : "orange",
              }}
            >
              {date ? new Date(date).toLocaleDateString() : "TBD"}
            </Text>
            <Badge color={color} variant="light" size="sm">
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
      size: 600,
      minSize: 500,
      cell: (info) => {
        const schedule = info.row.original.production_schedule;
        if (!schedule) return <Text c="dimmed">—</Text>;

        const steps: { key: keyof ProductionScheduleType; label: string }[] = [
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
                  {!done ? (
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
      enableColumnFilter: false,
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
      <ScrollArea
        style={{
          flex: 1,
          minHeight: 0,
          padding: rem(10),
        }}
        type="hover"
      >
        <Table
          striped
          highlightOnHover
          withColumnBorders
          style={{ minWidth: "1800px" }}
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
