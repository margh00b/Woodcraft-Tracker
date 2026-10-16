"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
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
  Switch,
  Card,
  Badge,
  Divider,
} from "@mantine/core";
import {
  FaSearch,
  FaSortDown,
  FaSortUp,
  FaFire,
  FaClipboardCheck,
  FaCheckCircle,
  FaTrash,
  FaCalendarAlt,
  FaPencilAlt,
} from "react-icons/fa";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { DateInput, DatePickerInput } from "@mantine/dates";
import { useSupabase } from "@/hooks/useSupabase";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { useInspectionTable } from "@/hooks/useInspectionTable";
import JobDetailsDrawer from "@/components/Shared/JobDetailsDrawer/JobDetailsDrawer";
import { usePermissions } from "@/hooks/usePermissions";

dayjs.extend(utc);

const parseIsoToLocalDate = (isoString: string | null): Date | null => {
  if (!isoString) return null;
  const dateStr = dayjs.utc(isoString).format("YYYY-MM-DD");
  return dayjs(dateStr).toDate();
};

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
  all_installation_ids?: number[];
};

export default function InspectionTable() {
  const permissions = usePermissions();
  const router = useRouter();
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const defaultStartDate = dayjs().subtract(1, "year").format("YYYY-MM-DD");
  const defaultFilters: ColumnFiltersState = [
    { id: "installation_date", value: [defaultStartDate, null] },
  ];

  const [inputFilters, setInputFilters] =
    useState<ColumnFiltersState>(defaultFilters);
  const [activeFilters, setActiveFilters] =
    useState<ColumnFiltersState>(defaultFilters);

  const [drawerJobId, setDrawerJobId] = useState<number | null>(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);

  const [selectedInstallIds, setSelectedInstallIds] = useState<number[]>([]);
  const [ungroup, setUngroup] = useState(false);

  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [completionDateInput, setCompletionDateInput] = useState<Date | null>(
    new Date(),
  );
  const [isCurrentlyCompleted, setIsCurrentlyCompleted] = useState(false);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDateInput, setScheduleDateInput] = useState<Date | null>(null);

  const { data, isLoading, isError, error, isFetching } = useInspectionTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });

  const tableData = useMemo(() => {
    const rows = (data?.data as InspectionTableView[]) || [];

    if (ungroup) {
      return rows;
    }

    const groups = new Map<string, InspectionTableView>();

    rows.forEach((row) => {
      const baseJobNumber = row.job_number.split("-")[0];
      const key = `${baseJobNumber}|${row.installation_date}|${row.inspection_date}`;

      if (!groups.has(key)) {
        groups.set(key, {
          ...row,
          job_number: baseJobNumber,
          all_installation_ids: [row.installation_id],
        });
      } else {
        const group = groups.get(key)!;
        if (group.all_installation_ids) {
          group.all_installation_ids.push(row.installation_id);
        }
      }
    });

    return Array.from(groups.values());
  }, [data, ungroup]);
  const totalCount = data?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  const updateCompletionMutation = useMutation({
    mutationFn: async ({
      ids,
      date,
    }: {
      ids: number[];
      date: string | null;
    }) => {
      const { error } = await supabase
        .from("installation")
        .update({ inspection_completed: date })
        .in("installation_id", ids);
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
      setSelectedInstallIds([]);
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
    mutationFn: async ({
      ids,
      date,
    }: {
      ids: number[];
      date: string | null;
    }) => {
      const { error } = await supabase
        .from("installation")
        .update({ inspection_date: date })
        .in("installation_id", ids);
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
      setSelectedInstallIds([]);
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
    value: string | undefined | null,
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
    const ids = row.all_installation_ids || [row.installation_id];
    setSelectedInstallIds(ids);

    if (row.inspection_completed) {
      setCompletionDateInput(parseIsoToLocalDate(row.inspection_completed));
      setIsCurrentlyCompleted(true);
    } else {
      setCompletionDateInput(new Date());
      setIsCurrentlyCompleted(false);
    }

    setCompletionModalOpen(true);
  };

  const handleScheduleClick = (row: InspectionTableView) => {
    const ids = row.all_installation_ids || [row.installation_id];
    setSelectedInstallIds(ids);
    setScheduleDateInput(parseIsoToLocalDate(row.inspection_date));
    setScheduleModalOpen(true);
  };

  const confirmCompletionDate = () => {
    if (selectedInstallIds.length > 0 && completionDateInput) {
      updateCompletionMutation.mutate({
        ids: selectedInstallIds,
        date: dayjs(completionDateInput).format("YYYY-MM-DD"),
      });
    }
  };

  const handleMarkIncomplete = () => {
    if (selectedInstallIds.length > 0) {
      updateCompletionMutation.mutate({
        ids: selectedInstallIds,
        date: null,
      });
    }
  };

  const confirmScheduleDate = () => {
    if (selectedInstallIds.length > 0) {
      const dateStr = scheduleDateInput
        ? dayjs(scheduleDateInput).format("YYYY-MM-DD")
        : null;
      updateScheduleMutation.mutate({
        ids: selectedInstallIds,
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
    columnHelper.accessor("site_address", {
      header: "Site Address",
      size: 200,
      minSize: 150,
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
            {row.installer_company && (
              <Text size="xs" c="dimmed">
                ({row.installer_company})
              </Text>
            )}
          </Group>
        );
      },
    }),
    columnHelper.accessor("installation_date", {
      header: "Install Date",
      size: 100,
      cell: (info) => {
        const date = info.getValue();
        if (!date)
          return (
            <Text c="orange" size="sm">
              TBD
            </Text>
          );
        return <Text size="sm">{dayjs.utc(date).format("YYYY-MM-DD")}</Text>;
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
            {date ? dayjs.utc(date).format("MMM D, YYYY") : "Schedule"}
          </Button>
        );
      },
    }),
    columnHelper.accessor("inspection_completed", {
      header: " Inspection Complete",
      size: 190,
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
            justify={"center"}
            leftSection={isCompleted ? <FaCheckCircle size={12} /> : undefined}
            disabled={!permissions.canEditInspections}
            onClick={(e) => {
              e.stopPropagation();
              handleCompletionClick(info.row.original);
            }}
            loading={
              updateCompletionMutation.isPending &&
              selectedInstallIds.includes(info.row.original.installation_id)
            }
          >
            {isCompleted
              ? dayjs.utc(completedDate).format("MMM D, YYYY")
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
      <ScrollArea
        style={{
          flex: 1,
          minHeight: 0,
          padding: rem(10),
        }}
        type="auto"
      >
        <Center h={400}>
          <Loader />
        </Center>
      </ScrollArea>
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
      <Group mb="md" wrap="nowrap">
        <ThemeIcon
          w={{ base: 40, md: 50 }}
          h={{ base: 40, md: 50 }}
          radius="md"
          variant="gradient"
          gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
        >
          <FaClipboardCheck size={20} />
        </ThemeIcon>
        <Stack gap={0}>
          <Title
            order={2}
            fz={{ base: 20, md: 26 }}
            style={{ color: "#343a40" }}
          >
            Inspection Manager
          </Title>
          <Text fz={{ base: 10, md: "sm" }} c="dimmed" lineClamp={1}>
            Track and verify job inspections
          </Text>
        </Stack>
      </Group>

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
                visibleFrom="md"
                value={getInputFilterValue("shipping_client_name")}
                onChange={(e) =>
                  setInputFilterValue("shipping_client_name", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Site Address"
                placeholder="Search Address..."
                value={getInputFilterValue("site_address") as string}
                onChange={(e) =>
                  setInputFilterValue("site_address", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Installer"
                placeholder="Company or Name"
                visibleFrom="md"
                value={getInputFilterValue("installer_company") as string}
                onChange={(e) =>
                  setInputFilterValue("installer_company", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <DatePickerInput
                type="range"
                allowSingleDateInRange
                label="Installation Date"
                placeholder="Filter Range"
                clearable
                visibleFrom="md"
                value={
                  (inputFilters.find((f) => f.id === "installation_date")
                    ?.value as [Date | null, Date | null]) || [null, null]
                }
                onChange={(val) => {
                  const formatted = val.map((d) =>
                    d ? dayjs(d).format("YYYY-MM-DD") : null,
                  );
                  setInputFilterValue("installation_date", formatted as any);
                }}
                valueFormat="YYYY-MM-DD"
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <DatePickerInput
                type="range"
                allowSingleDateInRange
                label="Inspection Date"
                placeholder="Filter Range"
                clearable
                visibleFrom="md"
                value={
                  (inputFilters.find((f) => f.id === "inspection_date")
                    ?.value as [Date | null, Date | null]) || [null, null]
                }
                onChange={(val) => {
                  const formatted = val.map((d) =>
                    d ? dayjs(d).format("YYYY-MM-DD") : null,
                  );
                  setInputFilterValue("inspection_date", formatted as any);
                }}
                valueFormat="YYYY-MM-DD"
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <Group
                style={{
                  alignItems: "flex-end",
                  paddingBottom: 6,
                }}
                gap={40}
              >
                <Switch
                  label="Unscheduled"
                  size="md"
                  visibleFrom="md"
                  checked={inputFilters.some(
                    (f) => f.id === "unscheduled" && f.value === true,
                  )}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    const val = checked ? true : undefined;

                    setInputFilterValue("unscheduled", val as any);

                    const otherFilters = inputFilters.filter(
                      (f) => f.id !== "unscheduled",
                    );
                    const newActiveFilters = checked
                      ? [...otherFilters, { id: "unscheduled", value: true }]
                      : otherFilters;

                    setActiveFilters(newActiveFilters);
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                  thumbIcon={<FaCheckCircle />}
                  styles={{
                    track: {
                      cursor: "pointer",
                      background: inputFilters.some(
                        (f) => f.id === "unscheduled" && f.value === true,
                      )
                        ? "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)"
                        : "linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)",
                      color: "white",
                      border: "none",
                    },
                    thumb: {
                      background: inputFilters.some(
                        (f) => f.id === "unscheduled" && f.value === true,
                      )
                        ? "#6e54ffff"
                        : "#d1d1d1ff",
                    },
                  }}
                />
                <Switch
                  label="Incomplete"
                  size="md"
                  checked={inputFilters.some(
                    (f) => f.id === "incomplete" && f.value === true,
                  )}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    const val = checked ? true : undefined;

                    setInputFilterValue("incomplete", val as any);

                    const otherFilters = inputFilters.filter(
                      (f) => f.id !== "incomplete",
                    );
                    const newActiveFilters = checked
                      ? [...otherFilters, { id: "incomplete", value: true }]
                      : otherFilters;

                    setActiveFilters(newActiveFilters);
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                  thumbIcon={<FaCheckCircle />}
                  styles={{
                    track: {
                      cursor: "pointer",
                      background: inputFilters.some(
                        (f) => f.id === "incomplete" && f.value === true,
                      )
                        ? "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)"
                        : "linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)",
                      color: "white",
                      border: "none",
                    },
                    thumb: {
                      background: inputFilters.some(
                        (f) => f.id === "incomplete" && f.value === true,
                      )
                        ? "#6e54ffff"
                        : "#d1d1d1ff",
                    },
                  }}
                />
              </Group>
              <Switch
                label="Ungroup"
                size="md"
                visibleFrom="md"
                checked={ungroup}
                onChange={(event) => setUngroup(event.currentTarget.checked)}
                thumbIcon={<FaCheckCircle />}
                styles={{
                  root: {
                    display: "flex",
                    alignItems: "flex-end",
                    paddingBottom: 6,
                  },
                  track: {
                    cursor: "pointer",
                    background: ungroup
                      ? "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)"
                      : "linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)",
                    color: "white",
                    border: "none",
                  },
                  thumb: {
                    background: ungroup ? "#6e54ffff" : "#d1d1d1ff",
                  },
                }}
              />
            </SimpleGrid>

            {}
            <Stack hiddenFrom="md" mt="md">
              <Button
                variant="filled"
                color="blue"
                fullWidth
                leftSection={<FaSearch size={14} />}
                onClick={handleApplyFilters}
                style={{
                  background:
                    "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
                }}
              >
                Apply Filters
              </Button>
              <Button variant="default" fullWidth onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </Stack>

            {}
            <Group justify="flex-end" mt="md" visibleFrom="md">
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

      <ScrollArea hiddenFrom="md" style={{ flex: 1 }}>
        <Stack gap="md" pb={80}>
          {table.getRowModel().rows.length === 0 ? (
            <Center h={100}>
              <Text c="dimmed">No inspections found.</Text>
            </Center>
          ) : (
            table.getRowModel().rows.map((row) => (
              <Card key={row.id} withBorder shadow="sm" radius="md">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Anchor
                      component="button"
                      fw={700}
                      size="lg"
                      c="#6f00ffff"
                      onClick={() => handleJobClick(row.original.job_id)}
                    >
                      Job {row.original.job_number}
                    </Anchor>
                    {row.original.rush && (
                      <Badge color="red" variant="filled">
                        RUSH
                      </Badge>
                    )}
                  </Group>

                  <Group gap="xs">
                    <Text size="sm" c="dimmed" w={80}>
                      Client:
                    </Text>
                    <Text size="sm" fw={500}>
                      {row.original.shipping_client_name || "—"}
                    </Text>
                  </Group>

                  <Group gap="xs" align="flex-start">
                    <Text size="sm" c="dimmed" w={80}>
                      Address:
                    </Text>
                    <Text size="sm" fw={500} style={{ flex: 1 }}>
                      {row.original.site_address || "—"}
                    </Text>
                  </Group>

                  <Group gap="xs">
                    <Text size="sm" c="dimmed" w={80}>
                      Installer:
                    </Text>
                    <Box>
                      {!row.original.installer_id &&
                      !row.original.installer_first_name ? (
                        <Text c="orange" size="sm">
                          Unassigned
                        </Text>
                      ) : (
                        <Group gap={4}>
                          <Text size="sm" fw={500}>
                            {row.original.installer_first_name}{" "}
                            {row.original.installer_last_name}
                          </Text>
                          {row.original.installer_company && (
                            <Text size="xs" c="dimmed">
                              ({row.original.installer_company})
                            </Text>
                          )}
                        </Group>
                      )}
                    </Box>
                  </Group>

                  <Group gap="xs">
                    <Text size="sm" c="dimmed" w={80}>
                      Install Date:
                    </Text>
                    <Text size="sm" fw={500}>
                      {row.original.installation_date
                        ? dayjs
                            .utc(row.original.installation_date)
                            .format("MMM D, YYYY")
                        : "TBD"}
                    </Text>
                  </Group>

                  <Divider my={2} />
                  <Center>
                    <Text>Inspection</Text>
                  </Center>
                  <Stack>
                    <Button
                      variant={
                        row.original.inspection_date ? "subtle" : "light"
                      }
                      color={row.original.inspection_date ? "dark" : "blue"}
                      size="sm"
                      radius="sm"
                      fullWidth
                      disabled={!permissions.canEditInspections}
                      leftSection={
                        <FaCalendarAlt size={12} style={{ opacity: 0.7 }} />
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScheduleClick(row.original);
                      }}
                      style={{
                        fontSize: 13,
                        border: row.original.inspection_date
                          ? "1px solid #dee2e6"
                          : undefined,
                      }}
                    >
                      {row.original.inspection_date
                        ? dayjs
                            .utc(row.original.inspection_date)
                            .format("MMM D, YYYY")
                        : "Schedule"}
                    </Button>

                    <Button
                      variant={
                        row.original.inspection_completed ? "light" : "default"
                      }
                      color={
                        row.original.inspection_completed ? "green" : "gray"
                      }
                      size="sm"
                      loading={
                        updateCompletionMutation.isPending &&
                        selectedInstallIds.includes(
                          row.original.installation_id,
                        )
                      }
                      radius="sm"
                      fullWidth
                      leftSection={
                        row.original.inspection_completed ? (
                          <FaCheckCircle size={12} />
                        ) : undefined
                      }
                      disabled={!permissions.canEditInspections}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompletionClick(row.original);
                      }}
                    >
                      {row.original.inspection_completed
                        ? dayjs
                            .utc(row.original.inspection_completed)
                            .format("MMM D, YYYY")
                        : "Mark Done"}
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            ))
          )}
        </Stack>
      </ScrollArea>

      <ScrollArea
        visibleFrom="md"
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
                      header.getContext(),
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
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(
                      `/dashboard/installation/${row.original.job_id}`,
                      "_blank",
                    );
                  }}
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
                        cell.getContext(),
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
          left: 0,
          right: 0,
          padding: "1rem 0",
          background: "white",
          borderTop: "1px solid #eee",
          zIndex: 100,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
        pl={{ md: rem(250) }}
      >
        <Pagination
          color="#4A00E0"
          withEdges
          siblings={0}
          size="sm"
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

      <Modal
        opened={completionModalOpen}
        onClose={() => setCompletionModalOpen(false)}
        title={
          isCurrentlyCompleted
            ? "Edit Inspection Completion"
            : "Confirm Inspection Completion"
        }
        centered
        size="lg"
      >
        <Stack>
          <Group justify="space-between" px={20}>
            <Text size="sm" c="dimmed">
              {isCurrentlyCompleted
                ? "Modify the date or mark as incomplete."
                : "Select the date the inspection was completed."}
            </Text>
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
          </Group>
          <DateInput
            label="Completion Date"
            placeholder="YYYY-MM-DD"
            value={completionDateInput}
            onChange={(val: any) =>
              setCompletionDateInput(val ? dayjs(val).toDate() : null)
            }
            valueFormat="YYYY-MM-DD"
            allowDeselect={false}
          />
          <Group justify="space-between" mt="md">
            <Group>
              <Button
                variant="default"
                onClick={() => setCompletionModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmCompletionDate}
                variant="gradient"
                gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
                loading={updateCompletionMutation.isPending}
              >
                Confirm
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

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
            onChange={(val: any) =>
              setScheduleDateInput(val ? dayjs(val).toDate() : null)
            }
            valueFormat="YYYY-MM-DD"
            clearable
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
              variant="gradient"
              gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
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
