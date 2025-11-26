"use client";

import { useState, useMemo, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Row,
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
  Tooltip,
  Checkbox,
  Modal,
  Stack,
  Title,
  Divider,
  Paper,
  ThemeIcon,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import {
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaCheck,
  FaCalendarAlt,
  FaBoxOpen,
  FaShoppingBag,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import { Tables } from "@/types/db";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { notifications } from "@mantine/notifications";

dayjs.extend(isBetween);

// --- Standardized Type Definition (No extensions) ---
type PlantJobView = Tables<"jobs"> & {
  sales_orders:
    | (Tables<"sales_orders"> & {
        client: Tables<"client"> | null;
        cabinet: Tables<"cabinets"> | null;
      })
    | null;
  installation: Tables<"installation"> | null;
  production_schedule: Tables<"production_schedule"> | null;
};

// --- Custom Filter Logic ---
const genericFilter: FilterFn<PlantJobView> = (row, columnId, filterValue) => {
  const val = String(row.getValue(columnId) ?? "").toLowerCase();
  return val.includes(String(filterValue).toLowerCase());
};

// --- Job Detail Modal Component ---
const JobDetailModal = ({
  job,
  onClose,
}: {
  job: PlantJobView;
  onClose: () => void;
}) => {
  const install = job.installation;
  const client = job.sales_orders;
  const cabinet = job.sales_orders?.cabinet;
  const prod = job.production_schedule;
  const jobNum = job.job_number;

  return (
    <Modal
      opened={!!job}
      onClose={onClose}
      title={
        <Text fw={700} size="lg">
          Job #{jobNum}
        </Text>
      }
      size="lg"
      centered
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
    >
      <Stack gap="md">
        {/* Client & Location */}
        <Paper withBorder p="sm" bg="gray.0">
          <Group justify="space-between" mb={5}>
            <Text size="sm" c="dimmed" fw={600}>
              CLIENT
            </Text>
            <Text size="sm" fw={700}>
              {client?.shipping_client_name || "Unknown"}
            </Text>
          </Group>
          <Divider mb={5} />
          <Text size="sm">
            {job.sales_orders?.shipping_street || "No Street Address"}
          </Text>
          <Text size="sm" c="dimmed">
            {job.sales_orders?.shipping_city},{" "}
            {job.sales_orders?.shipping_province}{" "}
            {job.sales_orders?.shipping_zip}
          </Text>
        </Paper>

        {/* Cabinet Specs */}
        <Box>
          <Text size="sm" c="dimmed" fw={600} mb={4}>
            CABINET SPECIFICATIONS
          </Text>
          <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs">
            <Paper withBorder p="xs">
              <Text size="xs" c="dimmed">
                Box
              </Text>
              <Text size="sm" fw={500}>
                {cabinet?.box || "—"}
              </Text>
            </Paper>
            <Paper withBorder p="xs">
              <Text size="xs" c="dimmed">
                Species
              </Text>
              <Text size="sm" fw={500}>
                {cabinet?.species || "—"}
              </Text>
            </Paper>
            <Paper withBorder p="xs">
              <Text size="xs" c="dimmed">
                Door Style
              </Text>
              <Text size="sm" fw={500}>
                {cabinet?.door_style || "—"}
              </Text>
            </Paper>
            <Paper withBorder p="xs">
              <Text size="xs" c="dimmed">
                Color
              </Text>
              <Text size="sm" fw={500}>
                {cabinet?.color || "—"}
              </Text>
            </Paper>
          </SimpleGrid>
        </Box>

        {/* Dates & Notes */}
        <Box>
          <Text size="sm" c="dimmed" fw={600} mb={4}>
            SCHEDULE & NOTES
          </Text>
          <SimpleGrid cols={2} mb="xs">
            <Paper withBorder p="xs">
              <Text size="xs" c="dimmed">
                Wrap Date
              </Text>
              <Text size="sm">
                {install?.wrap_date
                  ? dayjs(install.wrap_date).format("YYYY-MM-DD")
                  : "—"}
              </Text>
            </Paper>
            <Paper withBorder p="xs">
              <Text size="xs" c="dimmed">
                Install Date
              </Text>
              <Text size="sm">
                {install?.installation_date
                  ? dayjs(install.installation_date).format("YYYY-MM-DD")
                  : "—"}
              </Text>
            </Paper>
          </SimpleGrid>

          <Paper withBorder p="xs" bg="gray.0">
            <Text size="xs" c="dimmed" mb={2}>
              Installation Notes
            </Text>
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {install?.installation_notes || "No notes recorded."}
            </Text>
          </Paper>
        </Box>

        {/* Status Badges */}
        <Group gap="xs">
          {prod?.doors_completed_actual && (
            <Badge color="green" variant="dot">
              Doors Done
            </Badge>
          )}
          {prod?.cut_finish_completed_actual && (
            <Badge color="green" variant="dot">
              Panels Done
            </Badge>
          )}
          {prod?.custom_finish_completed_actual && (
            <Badge color="green" variant="dot">
              Custom Finish Done
            </Badge>
          )}
          {prod?.paint_completed_actual && (
            <Badge color="green" variant="dot">
              Paint Done
            </Badge>
          )}
          {prod?.assembly_completed_actual && (
            <Badge color="green" variant="dot">
              Assembly Done
            </Badge>
          )}
          {install?.wrap_completed && (
            <Badge color="violet" variant="filled">
              Wrap Complete
            </Badge>
          )}
        </Group>
      </Stack>
    </Modal>
  );
};

export default function PlantTable() {
  const { supabase, isAuthenticated } = useSupabase();
  const queryClient = useQueryClient();

  // State
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);

  // Modal State
  const [
    detailModalOpened,
    { open: openDetailModal, close: closeDetailModal },
  ] = useDisclosure(false);
  const [selectedJob, setSelectedJob] = useState<PlantJobView | null>(null);

  // --- 1. Fetch Data ---
  const {
    data: plantJobs,
    isLoading,
    isError,
    error,
  } = useQuery<PlantJobView[]>({
    queryKey: ["plant_jobs_list"],
    queryFn: async () => {
      const { data, error: dbError } = await supabase
        .from("jobs")
        .select(
          `id,job_number,sales_orders:sales_orders(shipping_street,shipping_city,shipping_province,shipping_zip,
          shipping_client_name
          ,cabinet:cabinets(box,door_style,species,color)),installation!inner(installation_id,wrap_date,wrap_completed,installation_notes),production_schedule:production_schedule(*)`
        )
        .not("installation.wrap_date", "is", null)
        .order("wrap_date", {
          foreignTable: "installation",
          ascending: false, // Farthest in future first
        });

      if (dbError) throw new Error(dbError.message);
      return data as unknown as PlantJobView[];
    },
    enabled: isAuthenticated,
  });

  // --- 2. Mutation for Wrap Complete Toggle ---
  const toggleWrapMutation = useMutation({
    mutationFn: async ({
      installId,
      currentStatus,
    }: {
      installId: number;
      currentStatus: boolean;
    }) => {
      const { error } = await supabase
        .from("installation")
        .update({
          wrap_completed: currentStatus ? null : new Date().toISOString(),
        })
        .eq("installation_id", installId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plant_jobs_list"] });
      notifications.show({
        title: "Updated",
        message: "Wrap status updated successfully",
        color: "green",
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  // --- 3. Filter Helper ---
  const getFilterValue = (id: string): string => {
    const filter = columnFilters.find((f) => f.id === id);
    return String(filter?.value ?? "");
  };

  // --- 4. Apply Date Range Filter Manually ---
  const filteredData = useMemo(() => {
    if (!plantJobs) return [];
    let processed = plantJobs;

    if (dateRange[0] && dateRange[1]) {
      const start = dayjs(dateRange[0]).startOf("day");
      const end = dayjs(dateRange[1]).endOf("day");
      processed = processed.filter((row) => {
        const wrapDate = row.installation?.wrap_date;
        if (!wrapDate) return false;
        return dayjs(wrapDate).isBetween(start, end, "day", "[]");
      });
    }

    return processed;
  }, [plantJobs, dateRange]);

  // --- 5. Column Definitions ---
  const columnHelper = createColumnHelper<PlantJobView>();

  const columns = [
    // Hidden Wrap Date Column
    columnHelper.accessor("installation.wrap_date", {
      id: "wrap_date",
      header: "Wrap Date",
      size: 0,
    }),

    columnHelper.accessor("installation.wrap_completed", {
      id: "wrap_completed",
      header: "Wrapped",
      size: 70,
      cell: (info) => {
        const isComplete = !!info.getValue();
        const installId = info.row.original.installation?.installation_id;
        return (
          <Center onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isComplete}
              color="#7400e0ff"
              size="md"
              disabled={!installId || toggleWrapMutation.isPending}
              onChange={() => {
                if (installId) {
                  toggleWrapMutation.mutate({
                    installId,
                    currentStatus: isComplete,
                  });
                }
              }}
              style={{ cursor: "pointer" }}
            />
          </Center>
        );
      },
    }),

    columnHelper.accessor("job_number", {
      header: "Job #",
      size: 100,
      cell: (info) => (
        <Text fw={600} size="sm">
          {info.getValue()}
        </Text>
      ),
      filterFn: genericFilter,
    }),

    columnHelper.accessor("sales_orders.shipping_client_name", {
      id: "client",
      header: "Client",
      size: 140,
      cell: (info) => (
        <Text size="sm" fw={500}>
          {info.getValue() || "—"}
        </Text>
      ),
      filterFn: genericFilter,
    }),

    columnHelper.accessor(
      (row) => {
        const so = row.sales_orders;
        if (!so) return "";
        return [so.shipping_city, so.shipping_province]
          .filter(Boolean)
          .join(", ");
      },
      {
        id: "address",
        header: "Location",
        size: 160,
        cell: (info) => (
          <Tooltip label={info.row.original.sales_orders?.shipping_street}>
            <Text size="sm" truncate>
              {info.getValue()}
            </Text>
          </Tooltip>
        ),
        filterFn: genericFilter,
      }
    ),

    columnHelper.accessor("sales_orders.cabinet.box", {
      header: "Box",
      size: 90,
    }),
    columnHelper.accessor("sales_orders.cabinet.door_style", {
      header: "Door Style",
      size: 140,
      cell: (info) => (
        <Tooltip label={info.getValue()}>
          <Text size="sm" truncate>
            {info.getValue()}
          </Text>
        </Tooltip>
      ),
    }),
    columnHelper.accessor("sales_orders.cabinet.species", {
      header: "Species",
      size: 110,
    }),
    columnHelper.accessor("sales_orders.cabinet.color", {
      header: "Color",
      size: 110,
      cell: (info) => (
        <Tooltip label={info.getValue()}>
          <Text size="sm" truncate>
            {info.getValue()}
          </Text>
        </Tooltip>
      ),
    }),

    // Production Actuals (Compact)
    columnHelper.accessor("production_schedule.doors_completed_actual", {
      header: "D",
      size: 40,
      cell: (info) =>
        info.getValue() ? (
          <FaCheck color="green" size={10} />
        ) : (
          <Text c="dimmed" size="xs">
            -
          </Text>
        ),
    }),
    columnHelper.accessor("production_schedule.cut_finish_completed_actual", {
      header: "P",
      size: 40,
      cell: (info) =>
        info.getValue() ? (
          <FaCheck color="green" size={10} />
        ) : (
          <Text c="dimmed" size="xs">
            -
          </Text>
        ),
    }),
    columnHelper.accessor(
      "production_schedule.custom_finish_completed_actual",
      {
        header: "F/C",
        size: 40,
        cell: (info) =>
          info.getValue() ? (
            <FaCheck color="green" size={10} />
          ) : (
            <Text c="dimmed" size="xs">
              -
            </Text>
          ),
      }
    ),
    columnHelper.accessor("production_schedule.paint_completed_actual", {
      header: "P/S",
      size: 40,
      cell: (info) =>
        info.getValue() ? (
          <FaCheck color="green" size={10} />
        ) : (
          <Text c="dimmed" size="xs">
            -
          </Text>
        ),
    }),
    columnHelper.accessor("production_schedule.assembly_completed_actual", {
      header: "A",
      size: 40,
      cell: (info) =>
        info.getValue() ? (
          <FaCheck color="green" size={10} />
        ) : (
          <Text c="dimmed" size="xs">
            -
          </Text>
        ),
    }),

    // Notes
    columnHelper.accessor("installation.installation_notes", {
      header: "Notes",
      size: 180,
      cell: (info) => (
        <Tooltip label={info.getValue() || ""} multiline w={250}>
          <Text size="xs" c={info.getValue() ? "dark" : "dimmed"} truncate>
            {info.getValue() || "—"}
          </Text>
        </Tooltip>
      ),
    }),
  ];

  // --- 6. Table Setup ---
  const table = useReactTable({
    data: filteredData,
    columns,
    state: { columnFilters, pagination },
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      sorting: [{ id: "wrap_date", desc: true }], // Sync initial state with query
    },
  });

  // Memoized grouped rows
  const groupedRows = useMemo(() => {
    if (!table.getRowModel().rows) return {};
    return table.getRowModel().rows.reduce((acc, row) => {
      const job: PlantJobView = row.original;
      const wrapDate = job.installation?.wrap_date
        ? dayjs(job.installation.wrap_date).format("YYYY-MM-DD")
        : "No Date";
      if (!acc[wrapDate]) {
        acc[wrapDate] = [];
      }
      acc[wrapDate].push(row);
      return acc;
    }, {} as Record<string, Row<PlantJobView>[]>);
  }, [table.getRowModel().rows]);

  // Sorted Dates Keys: Farthest Future -> Past
  const sortedGroupKeys = useMemo(() => {
    return Object.keys(groupedRows).sort((a, b) => {
      if (a === "No Date") return 1;
      if (b === "No Date") return -1;
      return dayjs(b).diff(dayjs(a)); // Descending order
    });
  }, [groupedRows]);

  if (!isAuthenticated || isLoading)
    return (
      <Center h={400}>
        <Loader />
      </Center>
    );
  if (isError)
    return (
      <Center h={400}>
        <Text c="red">Error: {error?.message}</Text>
      </Center>
    );

  return (
    <Box
      p={20}
      h="calc(100vh - 45px)"
      display="flex"
      style={{ flexDirection: "column" }}
    >
      <Group mb="md">
        <ThemeIcon
          size={50}
          radius="md"
          variant="gradient"
          gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
        >
          <FaCalendarAlt size={26} />
        </ThemeIcon>
        <Stack gap={0}>
          <Title order={2} style={{ color: "#343a40" }}>
            Plant Wrap Schedule
          </Title>
          <Text size="sm" c="dimmed">
            Track plant wrap schedule
          </Text>
        </Stack>
      </Group>

      {/* Search Filters */}
      <Accordion variant="contained" radius="md" mb="md" defaultValue="filters">
        <Accordion.Item value="filters">
          <Accordion.Control icon={<FaSearch size={16} />}>
            Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
              <TextInput
                label="Job Number"
                placeholder="Search..."
                value={getFilterValue("job_number")}
                onChange={(e) =>
                  table.getColumn("job_number")?.setFilterValue(e.target.value)
                }
              />
              <TextInput
                label="Client Name"
                placeholder="Search..."
                value={getFilterValue("client")}
                onChange={(e) =>
                  table.getColumn("client")?.setFilterValue(e.target.value)
                }
              />
              <TextInput
                label="Address"
                placeholder="Street, City..."
                value={getFilterValue("address")}
                onChange={(e) =>
                  table.getColumn("address")?.setFilterValue(e.target.value)
                }
              />
              <DatePickerInput
                type="range"
                label="Wrap Date Range"
                placeholder="Pick dates range"
                value={dateRange}
                onChange={(value) =>
                  setDateRange(value as [Date | null, Date | null])
                }
                clearable
                leftSection={<FaCalendarAlt size={14} />}
              />
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {/* Table Area */}
      <ScrollArea style={{ flex: 1 }} type="always">
        {table.getRowModel().rows.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed">No jobs found.</Text>
          </Center>
        ) : (
          <Accordion
            variant="contained"
            defaultValue={sortedGroupKeys[0]}
            styles={{
              item: { marginBottom: 10, border: "1px solid #e0e0e0" },
              control: { backgroundColor: "#f8f9fa" },
              content: { padding: 0 },
            }}
          >
            {sortedGroupKeys.map((wrapDate) => {
              const jobsInGroup = groupedRows[wrapDate];
              const isPastDue = dayjs(wrapDate).isBefore(dayjs(), "day");

              // Calculate total boxes
              const totalBoxes = jobsInGroup.reduce((sum, row) => {
                const boxVal = row.original.sales_orders?.cabinet?.box;
                const parsed = parseInt(boxVal || "0", 10);
                return isNaN(parsed) ? sum : sum + parsed;
              }, 0);

              return (
                <Accordion.Item key={wrapDate} value={wrapDate}>
                  <Accordion.Control>
                    <Group gap="md">
                      <FaCalendarAlt size={16} />
                      <Text fw={700} size="md">
                        Wrap Date:{" "}
                        <span style={{ color: isPastDue ? "red" : "#4A00E0" }}>
                          {wrapDate}
                        </span>
                      </Text>
                      <Badge variant="light" color="black">
                        {jobsInGroup.length} Jobs
                      </Badge>
                      {totalBoxes > 0 && (
                        <Badge
                          variant="light"
                          color="violet"
                          leftSection={<FaBoxOpen size={10} />}
                        >
                          {totalBoxes} Boxes
                        </Badge>
                      )}
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Table striped highlightOnHover withColumnBorders>
                      <Table.Thead>
                        <Table.Tr>
                          {table
                            .getFlatHeaders()
                            .slice(1) // Skip hidden first column
                            .map((header) => (
                              <Table.Th
                                key={header.id}
                                style={{ width: header.getSize() }}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                              </Table.Th>
                            ))}
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {jobsInGroup.map((row) => (
                          <Table.Tr
                            key={row.id}
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                              setSelectedJob(row.original);
                              openDetailModal();
                            }}
                          >
                            {row
                              .getVisibleCells()
                              .slice(1) // Skip hidden first column
                              .map((cell) => (
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
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        )}
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

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => {
            closeDetailModal();
            setSelectedJob(null);
          }}
        />
      )}
    </Box>
  );
}
