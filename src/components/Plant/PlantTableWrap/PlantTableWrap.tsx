"use client";

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  flexRender,
  PaginationState,
  ColumnFiltersState,
  SortingState,
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
  Stack,
  Title,
  ThemeIcon,
  Button,
  Anchor,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  FaSearch,
  FaCalendarAlt,
  FaBoxOpen,
  FaCheck,
  FaPrint,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import { usePlantWrapTable } from "@/hooks/usePlantWrapTable";
import { Views } from "@/types/db";
import { useDisclosure } from "@mantine/hooks";
import WrapPdfPreviewModal from "./WrapPdfPreviewModal";
import JobDetailsDrawer from "@/components/Shared/JobDetailsDrawer/JobDetailsDrawer";
type PlantTableView = Views<"plant_table_view">;
export default function PlantTableWrap() {
  const { supabase, isAuthenticated } = useSupabase();
  const queryClient = useQueryClient();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "wrap_date", desc: false },
  ]);

  const [inputFilters, setInputFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [pdfOpened, { open: openPdf, close: closePdf }] = useDisclosure(false);
  const [drawerJobId, setDrawerJobId] = useState<number | null>(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);

  const handleJobClick = (id: number) => {
    setDrawerJobId(id);
    openDrawer();
  };
  const handlePrintPreview = () => {
    if (!dateRange[0] || !dateRange[1]) {
      notifications.show({
        title: "Date Range Required",
        message: "Please select a date range filter to generate the report.",
        color: "orange",
      });
      return;
    }
    openPdf();
  };
  const { data, isLoading, isError, error } = usePlantWrapTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });
  const tableData = (data?.data as PlantTableView[]) || [];
  const totalCount = data?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

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
      queryClient.invalidateQueries({ queryKey: ["plant_table_view"] });
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

  const setInputFilterValue = (id: string, value: any) => {
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

    let filters = [...inputFilters];
    if (dateRange[0] && dateRange[1]) {
      filters = filters.filter((f) => f.id !== "wrap_date_range");
      filters.push({ id: "wrap_date_range", value: dateRange });
    }
    setActiveFilters(filters);
  };

  const handleClearFilters = () => {
    setInputFilters([]);
    setActiveFilters([]);
    setDateRange([null, null]);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const columnHelper = createColumnHelper<PlantTableView>();

  const columns = [
    columnHelper.accessor("wrap_date", {
      header: "Wrap Date",
      size: 0,
    }),
    columnHelper.accessor("wrap_completed", {
      header: "Wrapped",
      size: 70,
      cell: (info) => {
        const isComplete = !!info.getValue();
        const installId = info.row.original.installation_id;
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
        <Anchor
          component="button"
          size="sm"
          fw={600}
          w="100%"
          style={{ textAlign: "left" }}
          c="#6f00ffff"
          onClick={(e) => {
            e.stopPropagation();
            const jobId = info.row.original.job_id;
            if (jobId) handleJobClick(jobId);
          }}
        >
          <Text fw={600}>{info.getValue()}</Text>
        </Anchor>
      ),
    }),
    columnHelper.accessor("client_name", {
      header: "Client",
      size: 140,
      cell: (info) => (
        <Text size="sm" fw={500}>
          {info.getValue() || "—"}
        </Text>
      ),
    }),
    columnHelper.accessor("shipping_city", {
      id: "address",
      header: "Location",
      size: 160,
      cell: (info) => {
        const city = info.row.original.shipping_city;
        const prov = info.row.original.shipping_province;
        return (
          <Tooltip label={info.row.original.shipping_street}>
            <Text size="sm" truncate>
              {[city, prov].filter(Boolean).join(", ")}
            </Text>
          </Tooltip>
        );
      },
    }),
    columnHelper.accessor("cabinet_box", { header: "Box", size: 90 }),
    columnHelper.accessor("cabinet_door_style", {
      header: "Door Style",
      size: 140,
    }),
    columnHelper.accessor("cabinet_species", { header: "Species", size: 110 }),
    columnHelper.accessor("cabinet_color", { header: "Color", size: 110 }),
    columnHelper.accessor("doors_completed_actual", {
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
    columnHelper.accessor("cut_finish_completed_actual", {
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
    columnHelper.accessor("custom_finish_completed_actual", {
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
    }),
    columnHelper.accessor("paint_completed_actual", {
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
    columnHelper.accessor("assembly_completed_actual", {
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
    columnHelper.accessor("installation_notes", {
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

  const groupedRows = useMemo(() => {
    if (!table.getRowModel().rows) return {};
    return table.getRowModel().rows.reduce((acc, row) => {
      const job = row.original;
      const wrapDate = job.wrap_date
        ? dayjs(job.wrap_date).format("YYYY-MM-DD")
        : "No Date";
      if (!acc[wrapDate]) acc[wrapDate] = [];
      acc[wrapDate].push(row);
      return acc;
    }, {} as Record<string, Row<PlantTableView>[]>);
  }, [table.getRowModel().rows]);

  const sortedGroupKeys = useMemo(() => {
    return Object.keys(groupedRows).sort((a, b) => {
      if (a === "No Date") return 1;
      if (b === "No Date") return -1;
      return dayjs(a).isAfter(dayjs(b)) ? -1 : 1;
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
      <Group mb="md" justify="space-between">
        <Group>
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

        <Button
          variant="outline"
          color="violet"
          leftSection={<FaPrint size={14} />}
          onClick={handlePrintPreview}
        >
          Print Preview
        </Button>
      </Group>

      <Accordion variant="contained" radius="md" mb="md">
        <Accordion.Item value="filters">
          <Accordion.Control icon={<FaSearch size={16} />}>
            Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
              <TextInput
                label="Job Number"
                placeholder="Search..."
                value={getInputFilterValue("job_number")}
                onChange={(e) =>
                  setInputFilterValue("job_number", e.target.value)
                }
              />
              <TextInput
                label="Client Name"
                placeholder="Search..."
                value={getInputFilterValue("client")}
                onChange={(e) => setInputFilterValue("client", e.target.value)}
              />
              <TextInput
                label="Address"
                placeholder="Street, City..."
                value={getInputFilterValue("address")}
                onChange={(e) => setInputFilterValue("address", e.target.value)}
              />
              <DatePickerInput
                type="range"
                allowSingleDateInRange
                label="Wrap Date Range"
                placeholder="Pick dates range"
                value={dateRange}
                onChange={(val) =>
                  setDateRange(val as [Date | null, Date | null])
                }
                clearable
                leftSection={<FaCalendarAlt size={14} />}
              />
            </SimpleGrid>
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleClearFilters}>
                Clear Filters
              </Button>
              <Button
                variant="filled"
                color="blue"
                onClick={handleApplyFilters}
                leftSection={<FaSearch size={14} />}
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
              const uniqueJobCount = new Set(
                jobsInGroup.map((r) => {
                  const val = r.original.job_number || "";
                  return val.split("-")[0].trim();
                })
              ).size;
              const totalBoxes = jobsInGroup.reduce((sum, row) => {
                const parsed = parseInt(row.original.cabinet_box || "0", 10);
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
                        {uniqueJobCount} Jobs
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
                            .slice(2)
                            .map((header) => (
                              <Table.Th
                                style={{
                                  backgroundColor: "#ffffffff",
                                  width: header.getSize(),
                                }}
                                key={header.id}
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
                          <Table.Tr key={row.id}>
                            {row
                              .getVisibleCells()
                              .slice(2)
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
      <WrapPdfPreviewModal
        opened={pdfOpened}
        onClose={closePdf}
        data={tableData}
        dateRange={dateRange}
      />
      <JobDetailsDrawer
        jobId={drawerJobId}
        opened={drawerOpened}
        onClose={closeDrawer}
      />
    </Box>
  );
}
