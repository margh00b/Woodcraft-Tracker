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
} from "@mantine/core";
import {
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaCalendarAlt,
  FaFire,
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
  assembly_completed_actual?: string | null;
  // Add other actual dates if needed
}

interface SalesOrderType {
  client: ClientType;
  cabinet: CabinetType;
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
      const { data, error: dbError } = await supabase.from("jobs").select(`
        id,
        job_number,
        job_base_number,
        job_suffix,
        production_schedule:production_schedule(*),
        sales_orders:sales_orders (
          client:client (firstName, lastName, phone1, email1),
          cabinet:cabinets (species, color, door_style)
        )
      `);

      if (dbError) throw new Error(dbError.message || "Failed to fetch jobs");
      return data as unknown as ProductionJobView[];
    },
    enabled: isAuthenticated,
  });

  // --- 5. Columns ---
  const columnHelper = createColumnHelper<ProductionJobView>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("job_number", {
        header: "Job No.",
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
      columnHelper.accessor("production_schedule.ship_schedule", {
        header: "Ship Date",
        cell: (info) => {
          const date = info.getValue();
          if (!date) return <Text c="orange">TBD</Text>;
          return new Date(date).toLocaleDateString();
        },
      }),
      columnHelper.accessor("production_schedule.ship_status", {
        header: "Shipping Status",
        cell: (info) => {
          const status = info.getValue();
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
            <Badge color={color} variant="light">
              {label}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("sales_orders.client.lastName", {
        header: "Client",
        cell: (info) => info.getValue() ?? "—",
      }),
      columnHelper.accessor("sales_orders.client.phone1", {
        header: "Phone",
        cell: (info) => info.getValue() ?? "—",
      }),
      columnHelper.accessor("sales_orders.client.email1", {
        header: "Email",
        cell: (info) => info.getValue() ?? "—",
      }),
      columnHelper.display({
        id: "schedule_action",
        header: "Actions",
        cell: (info) => (
          <ActionIcon
            color="violet"
            onClick={(e) => {
              e.stopPropagation();
              router.push(
                `/dashboard/production/schedule/${info.row.original.id}`
              );
            }}
          >
            <FaCalendarAlt size={16} />
          </ActionIcon>
        ),
      }),
    ],
    [columnHelper, router]
  );

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
        height: "100%",
      }}
    >
      <Text fw={700} size="xl" mb="md">
        Production Schedule Overview
      </Text>
      <ScrollArea style={{ flex: 1, minHeight: 0 }}>
        <Table striped highlightOnHover withColumnBorders layout="fixed">
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

      {/* Pagination */}
      <Pagination
        total={table.getPageCount()}
        value={table.getState().pagination.pageIndex + 1}
        onChange={(page) => table.setPageIndex(page - 1)}
        withEdges
        mt="md"
      />
    </Box>
  );
}
