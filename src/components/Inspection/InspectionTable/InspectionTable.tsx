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
  rem,
  Accordion,
  SimpleGrid,
  Tooltip,
  Stack,
  ThemeIcon,
  Title,
  Button,
  Anchor,
  Modal,
  Badge,
} from "@mantine/core";
import {
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaFire,
  FaClipboardCheck,
  FaCheck,
  FaTimes,
  FaCalendarAlt,
  FaPencilAlt,
  FaCheckCircle,
  FaTrash,
} from "react-icons/fa";
import dayjs from "dayjs";
import { DateInput } from "@mantine/dates";
import { useSupabase } from "@/hooks/useSupabase";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { useInspectionTable } from "@/hooks/useInspectionTable";
import JobDetailsDrawer from "@/components/Shared/JobDetailsDrawer/JobDetailsDrawer";
import { usePermissions } from "@/hooks/usePermissions";

type InspectionTableView = {
  job_id: number;
  job_number: string;
  shipping_client_name: string;
  site_address: string;
  installation_id: number;
  installation_date: string | null;
  inspection_date: string | null;
  inspection_completed: string | null;
  installer_id: number | null;
  installer_company: string | null;
  installer_first_name: string | null;
  installer_last_name: string | null;
  rush: boolean;
};

export default function InspectionTable() {
  const permissions = usePermissions();
  const router = useRouter();
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 16,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [inputFilters, setInputFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([]);

  const [drawerJobId, setDrawerJobId] = useState<number | null>(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);

  const [selectedInstallId, setSelectedInstallId] = useState<number | null>(
    null
  );

  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [completionDateInput, setCompletionDateInput] = useState<Date | null>(
    new Date()
  );
  const [isCurrentlyCompleted, setIsCurrentlyCompleted] = useState(false);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDateInput, setScheduleDateInput] = useState<Date | null>(null);

  const { data, isLoading, isError, error } = useInspectionTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });

  const tableData = (data?.data as InspectionTableView[]) || [];
  const totalCount = data?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  const updateCompletionMutation = useMutation({
    mutationFn: async ({ id, date }: { id: number; date: string | null }) => {
      const { error } = await supabase
        .from("installation")
        .update({ inspection_completed: date })
        .eq("installation_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      notifications.show({
        title: "Updated",
        message: "Inspection status updated successfully",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["inspection_table_view"] });
      setCompletionModalOpen(false);
      setSelectedInstallId(null);
    },
    onError: (err: any) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, date }: { id: number; date: string | null }) => {
      const { error } = await supabase
        .from("installation")
        .update({ inspection_date: date })
        .eq("installation_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      notifications.show({
        title: "Scheduled",
        message: "Inspection date updated successfully",
        color: "blue",
      });
      queryClient.invalidateQueries({ queryKey: ["inspection_table_view"] });
      setScheduleModalOpen(false);
      setSelectedInstallId(null);
    },
    onError: (err: any) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const handleJobClick = (id: number) => {
    setDrawerJobId(id);
    openDrawer();
  };

  const setInputFilterValue = (
    id: string,
    value: string | undefined | null
  ) => {
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

  const handleCompletionClick = (row: InspectionTableView) => {
    setSelectedInstallId(row.installation_id);

    if (row.inspection_completed) {
      setCompletionDateInput(dayjs(row.inspection_completed).toDate());
      setIsCurrentlyCompleted(true);
    } else {
      setCompletionDateInput(new Date());
      setIsCurrentlyCompleted(false);
    }

    setCompletionModalOpen(true);
  };

  const confirmCompletionDate = () => {
    if (selectedInstallId && completionDateInput) {
      updateCompletionMutation.mutate({
        id: selectedInstallId,
        date: dayjs(completionDateInput).format("YYYY-MM-DD"),
      });
    }
  };

  const handleMarkIncomplete = () => {
    if (selectedInstallId) {
      updateCompletionMutation.mutate({
        id: selectedInstallId,
        date: null,
      });
    }
  };

  const handleScheduleClick = (row: InspectionTableView) => {
    setSelectedInstallId(row.installation_id);
    const currentDate = row.inspection_date
      ? dayjs(row.inspection_date).toDate()
      : null;
    setScheduleDateInput(currentDate);
    setScheduleModalOpen(true);
  };

  const confirmScheduleDate = () => {
    if (selectedInstallId) {
      const dateStr = scheduleDateInput
        ? dayjs(scheduleDateInput).format("YYYY-MM-DD")
        : null;
      updateScheduleMutation.mutate({
        id: selectedInstallId,
        date: dateStr,
      });
    }
  };

  const columnHelper = createColumnHelper<InspectionTableView>();

  const columns = [
    columnHelper.accessor("job_number", {
      header: "Job No.",
      size: 120,
      minSize: 100,
      cell: (info) => (
        <Anchor
          component="button"
          size="sm"
          fw={600}
          w="100%"
          c="#6f00ffff"
          onClick={(e) => {
            e.stopPropagation();
            const jobId = info.row.original.job_id;
            if (jobId) handleJobClick(jobId);
          }}
        >
          <Group gap={4}>
            <Text fw={600} size="sm">
              {info.getValue()}
            </Text>
            {info.row.original.rush && (
              <Tooltip label="RUSH JOB">
                <FaFire size={12} color="red" />
              </Tooltip>
            )}
          </Group>
        </Anchor>
      ),
    }),
    columnHelper.accessor("shipping_client_name", {
      header: "Client",
      size: 150,
      minSize: 120,
      cell: (info) => info.getValue() ?? "—",
    }),
    columnHelper.accessor("installer_company", {
      header: "Installer",
      size: 180,
      minSize: 150,
      cell: (info) => {
        const row = info.row.original;
        if (!row.installer_id && !row.installer_first_name)
          return (
            <Text c="orange" size="sm">
              Unassigned
            </Text>
          );

        return (
          <Group gap={4} wrap="nowrap">
            <Text size="sm" lineClamp={1}>
              {row.installer_first_name} {row.installer_last_name}
            </Text>
            <Text size="xs" c="dimmed">
              ({row.installer_company || "Indep."})
            </Text>
          </Group>
        );
      },
    }),
    columnHelper.accessor("installation_date", {
      header: "Install Date",
      size: 130,
      cell: (info) => {
        const date = info.getValue();
        if (!date)
          return (
            <Text c="orange" size="sm">
              TBD
            </Text>
          );
        return <Text size="sm">{dayjs(date).format("YYYY-MM-DD")}</Text>;
      },
    }),
    columnHelper.accessor("inspection_date", {
      header: "Inspection Date",
      size: 160,
      cell: (info) => {
        const date = info.getValue();
        return (
          <Button
            variant={date ? "subtle" : "light"}
            color={date ? "dark" : "blue"}
            size="xs"
            radius="sm"
            fullWidth
            disabled={!permissions.canEditInspections}
            justify="space-between"
            leftSection={<FaCalendarAlt size={12} style={{ opacity: 0.7 }} />}
            rightSection={
              <FaPencilAlt size={10} style={{ opacity: date ? 0.3 : 0.7 }} />
            }
            onClick={(e) => {
              e.stopPropagation();
              handleScheduleClick(info.row.original);
            }}
            styles={{
              root: {
                border: date ? "1px solid transparent" : undefined,
                "&:hover": {
                  border: date
                    ? "1px solid var(--mantine-color-gray-3)"
                    : undefined,
                  backgroundColor: date
                    ? "var(--mantine-color-gray-0)"
                    : undefined,
                },
              },
              section: { margin: 0 },
            }}
          >
            {date ? dayjs(date).format("MMM D, YYYY") : "Schedule"}
          </Button>
        );
      },
    }),
    columnHelper.accessor("inspection_completed", {
      header: "Status",
      size: 160,
      cell: (info) => {
        const completedDate = info.getValue();
        const isCompleted = !!completedDate;

        return (
          <Button
            variant={isCompleted ? "light" : "default"}
            color={isCompleted ? "green" : "gray"}
            size="xs"
            radius="sm"
            fullWidth
            justify={isCompleted ? "space-between" : "center"}
            leftSection={isCompleted ? <FaCheckCircle size={12} /> : undefined}
            disabled={!permissions.canEditInspections}
            onClick={(e) => {
              e.stopPropagation();
              handleCompletionClick(info.row.original);
            }}
            loading={
              updateCompletionMutation.isPending &&
              selectedInstallId === info.row.original.installation_id
            }
          >
            {isCompleted
              ? dayjs(completedDate).format("MMM D, YYYY")
              : "Mark Complete"}
          </Button>
        );
      },
    }),
  ];

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
      <Center h={400}>
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center h={400}>
        <Text c="red">{(error as any)?.message}</Text>
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
      <Group mb="md">
        <ThemeIcon
          size={50}
          radius="md"
          variant="gradient"
          gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
        >
          <FaClipboardCheck size={26} />
        </ThemeIcon>
        <Stack gap={0}>
          <Title order={2} style={{ color: "#343a40" }}>
            Inspection Manager
          </Title>
          <Text size="sm" c="dimmed">
            Track and verify job inspections
          </Text>
        </Stack>
      </Group>

      {}
      <Accordion variant="contained" radius="md" mb="md">
        <Accordion.Item value="search-filters">
          <Accordion.Control icon={<FaSearch size={16} />}>
            Search Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 3, md: 4 }} mt="sm" spacing="md">
              <TextInput
                label="Job Number"
                placeholder="e.g., 202401"
                value={getInputFilterValue("job_number")}
                onChange={(e) =>
                  setInputFilterValue("job_number", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Client"
                placeholder="Name"
                value={getInputFilterValue("shipping_client_name")}
                onChange={(e) =>
                  setInputFilterValue("shipping_client_name", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Installer"
                placeholder="Company or Name"
                value={getInputFilterValue("installer_company")}
                onChange={(e) =>
                  setInputFilterValue("installer_company", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <DateInput
                label="Inspection Date"
                placeholder="Filter by Date"
                clearable
                value={
                  getInputFilterValue("inspection_date")
                    ? dayjs(getInputFilterValue("inspection_date")).toDate()
                    : null
                }
                onChange={(date) => {
                  const formattedDate = date
                    ? dayjs(date).format("YYYY-MM-DD")
                    : undefined;
                  setInputFilterValue("inspection_date", formattedDate);
                }}
                valueFormat="YYYY-MM-DD"
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
        type="auto"
      >
        <Table
          striped
          highlightOnHover
          stickyHeader
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
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    <span className="inline-block ml-1">
                      {header.column.getIsSorted() === "asc" && <FaSortUp />}
                      {header.column.getIsSorted() === "desc" && <FaSortDown />}
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
                    <Text c="dimmed">No inspections found.</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Table.Tr
                  key={row.id}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    router.push(
                      `/dashboard/installation/${row.original.job_id}`
                    )
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

      <JobDetailsDrawer
        jobId={drawerJobId}
        opened={drawerOpened}
        onClose={closeDrawer}
      />

      {}
      <Modal
        opened={completionModalOpen}
        onClose={() => setCompletionModalOpen(false)}
        title={
          isCurrentlyCompleted
            ? "Edit Inspection Completion"
            : "Confirm Inspection Completion"
        }
        centered
        size="sm"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            {isCurrentlyCompleted
              ? "Modify the date or mark as incomplete."
              : "Select the date the inspection was completed."}
          </Text>
          <DateInput
            label="Completion Date"
            placeholder="YYYY-MM-DD"
            value={completionDateInput}
            onChange={(date) =>
              setCompletionDateInput(date ? dayjs(date).toDate() : null)
            }
            valueFormat="YYYY-MM-DD"
            allowDeselect={false}
            data-autofocus
          />
          <Group justify="space-between" mt="md">
            {}
            {isCurrentlyCompleted ? (
              <Button
                variant="light"
                color="red"
                leftSection={<FaTrash size={12} />}
                onClick={handleMarkIncomplete}
                loading={updateCompletionMutation.isPending}
              >
                Mark Incomplete
              </Button>
            ) : (
              <div />
            )}

            <Group>
              <Button
                variant="default"
                onClick={() => setCompletionModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmCompletionDate}
                color="green"
                loading={updateCompletionMutation.isPending}
              >
                Confirm
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      {}
      <Modal
        opened={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Schedule Inspection"
        centered
        size="sm"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Set or change the scheduled inspection date.
          </Text>
          <DateInput
            label="Scheduled Date"
            placeholder="YYYY-MM-DD"
            value={scheduleDateInput}
            onChange={(date) =>
              setScheduleDateInput(date ? dayjs(date).toDate() : null)
            }
            valueFormat="YYYY-MM-DD"
            clearable
            data-autofocus
          />
          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => setScheduleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmScheduleDate}
              color="blue"
              loading={updateScheduleMutation.isPending}
            >
              Save Date
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
