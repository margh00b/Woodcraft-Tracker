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
  rem,
  Accordion,
  SimpleGrid,
} from "@mantine/core";
import {
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaCheckCircle,
  FaRegCircle,
  FaCalendarCheck,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";
import { DateInput } from "@mantine/dates";

interface ClientType {
  lastName: string;
}

interface InstallerType {
  company_name?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
}

interface InstallationType {
  installation_id: number;
  installer?: InstallerType | null;
  installation_date?: string | null;
  installation_completed?: string | null;
  wrap_date?: string | null;
  has_shipped: boolean;
  inspection_date?: string | null;
  inspection_completed?: string | null;
}

interface InstallationJobView {
  id: number;
  job_number: string;
  job_base_number: number;
  sales_orders?: { client?: ClientType } | null;
  installation?: InstallationType | null;
}

const genericFilter: FilterFn<InstallationJobView> = (
  row,
  columnId,
  filterValue
) => {
  const val = String(row.getValue(columnId) ?? "").toLowerCase();
  return val.includes(String(filterValue).toLowerCase());
};

export default function InstallationTable() {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const { supabase, isAuthenticated } = useSupabase();
  const router = useRouter();

  const getFilterValue = (id: string): string => {
    const filter = columnFilters.find((f) => f.id === id);
    const value = filter?.value;
    return String(value ?? "");
  };

  const {
    data: installationJobs,
    isLoading,
    isError,
    error,
  } = useQuery<InstallationJobView[]>({
    queryKey: ["installation_schedule_list"],
    queryFn: async () => {
      const { data, error: dbError } = await supabase
        .from("jobs")
        .select(
          `
            id,
            job_number,
            job_base_number,
            sales_orders:sales_orders (
              client:client_id (lastName)
            ),
            installation:installation_id (
              installation_id, installation_date, installation_completed,
              wrap_date, has_shipped, inspection_date, inspection_completed,
              installer:installer_id (company_name, first_name, last_name, phone_number)
            )
          `
        )
        .not("installation_id", "is", null)
        .order("installation_date", {
          ascending: false,
          foreignTable: "installation",
        });

      if (dbError)
        throw new Error(dbError.message || "Failed to fetch installation jobs");
      return data as unknown as InstallationJobView[];
    },
    enabled: isAuthenticated,
  });

  const columnHelper = createColumnHelper<InstallationJobView>();

  const columns = [
    columnHelper.accessor("job_number", {
      header: "Job No.",
      size: 150,
      minSize: 100,
      cell: (info) => (
        <Text fw={600} size="sm">
          {info.getValue()}
        </Text>
      ),
      enableColumnFilter: true,
      filterFn: genericFilter as any,
    }),

    columnHelper.accessor("sales_orders.client.lastName", {
      id: "clientlastName",
      header: "Client",
      size: 150,
      minSize: 120,
      cell: (info) => info.getValue() ?? "—",
      enableColumnFilter: true,
      filterFn: genericFilter as any,
    }),

    columnHelper.accessor("installation.installer.company_name", {
      id: "installerCompany",
      header: "Installer",
      size: 200,
      minSize: 150,
      cell: (info) => {
        const installer = info.row.original.installation?.installer;
        if (!installer) return <Text c="orange">TBD</Text>;

        return (
          <Group gap={4} wrap="nowrap">
            <Text size="sm" lineClamp={1}>
              {installer.first_name}
            </Text>
            <Text size="xs" c="dimmed">
              ({installer.company_name})
            </Text>
          </Group>
        );
      },
      enableColumnFilter: true,
      filterFn: genericFilter as any,
    }),

    columnHelper.accessor("installation.installation_date", {
      id: "installation_date",
      header: "Scheduled Date",
      size: 150,
      minSize: 120,
      cell: (info) => {
        const date = info.getValue();
        if (!date) return <Text c="orange">TBD</Text>;
        return dayjs(date).format("YYYY-MM-DD");
      },
    }),

    columnHelper.accessor("installation.wrap_date", {
      id: "wrap_date",
      header: "Wrap Date",
      size: 150,
      minSize: 120,
      cell: (info) => {
        const date = info.getValue();
        if (!date) return <Text c="dimmed">Pending</Text>;
        return dayjs(date).format("YYYY-MM-DD");
      },
    }),

    columnHelper.accessor("installation.has_shipped", {
      id: "has_shipped",
      header: "Shipped",
      size: 120,
      minSize: 100,
      cell: (info) => {
        const shipped = info.getValue();
        return (
          <Badge color={shipped ? "green" : "red"} variant="filled">
            {shipped ? "YES" : "NO"}
          </Badge>
        );
      },
      enableColumnFilter: false,
    }),

    columnHelper.accessor("installation.installation_completed", {
      id: "installation_status",
      header: "Completion Status",
      size: 200,
      minSize: 180,
      cell: (info) => {
        const installCompleted =
          info.row.original.installation?.installation_completed;
        const inspectionCompleted =
          info.row.original.installation?.inspection_completed;

        const isInstallDone = !!installCompleted;
        const isInspectionDone = !!inspectionCompleted;

        let statusText;
        let statusColor;
        let icon;

        if (isInstallDone && isInspectionDone) {
          statusText = "Inst. & Insp. Complete";
          statusColor = "green.8";
          icon = <FaCheckCircle color="green" size={14} />;
        } else if (isInstallDone && !isInspectionDone) {
          statusText = "Pending Inspection";
          statusColor = "orange.8";
          icon = <FaCalendarCheck color="orange" size={14} />;
        } else {
          statusText = "In Progress";
          statusColor = "gray.6";
          icon = <FaRegCircle color="gray" size={14} />;
        }

        return (
          <Group gap={4}>
            {icon}
            <Text size="sm" c={statusColor} fw={isInstallDone ? 600 : 400}>
              {statusText}
            </Text>
          </Group>
        );
      },
      enableColumnFilter: false,
    }),
  ];

  const table = useReactTable({
    data: installationJobs || [],
    columns,
    state: { columnFilters, pagination },
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!isAuthenticated || isLoading)
    return (
      <Center style={{ height: "300px" }}>
        <Loader />
      </Center>
    );
  if (isError)
    return (
      <Center style={{ height: "300px" }}>
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
        Installation Schedule
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
            <SimpleGrid cols={{ base: 1, sm: 3, md: 4 }} mt="sm" spacing="md">
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
              {/* Filter 3: Installer Company */}
              <TextInput
                label="Installer"
                placeholder="Company or Name"
                value={getFilterValue("installerCompany")}
                onChange={(e) =>
                  table
                    .getColumn("installerCompany")
                    ?.setFilterValue(e.target.value)
                }
              />
              {/* Filter 4: Scheduled Date */}
              <DateInput
                label="Scheduled Date"
                placeholder="Filter by Date"
                clearable
                value={
                  getFilterValue("installation_date")
                    ? dayjs(getFilterValue("installation_date")).toDate()
                    : null
                }
                onChange={(date) => {
                  const formattedDate = date
                    ? dayjs(date).format("YYYY-MM-DD")
                    : undefined;

                  table
                    .getColumn("installation_date")
                    ?.setFilterValue(formattedDate);
                }}
                valueFormat="YYYY-MM-DD"
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
                    <Text c="dimmed">No installation jobs found.</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Table.Tr
                  key={row.id}
                  onClick={() =>
                    router.push(`/dashboard/installation/${row.original.id}`)
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
