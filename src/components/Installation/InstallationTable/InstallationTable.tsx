"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  flexRender,
  PaginationState,
  ColumnFiltersState,
  SortingState,
  RowSelectionState,
  Table as ReactTableInstance,
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
  Grid,
  Tooltip,
  Stack,
  ThemeIcon,
  Title,
  Button,
  Anchor,
  Switch,
  Paper,
  UnstyledButton,
  Transition,
  Checkbox,
  Select,
  ActionIcon,
} from "@mantine/core";
import {
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaCheckCircle,
  FaRegCircle,
  FaCalendarCheck,
  FaFire,
  FaShippingFast,
  FaFilter,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { IoIosWarning } from "react-icons/io";
import dayjs from "dayjs";
import { DatePickerInput } from "@mantine/dates";
import { useInstallationTable } from "@/hooks/useInstallationTable";
import { Views } from "@/types/db";
import { useDisclosure } from "@mantine/hooks";
import JobDetailsDrawer from "@/components/Shared/JobDetailsDrawer/JobDetailsDrawer";
import BulkScheduleModal from "../BulkInstallationScheduleModal/BulkInstallationScheduleModal";
import { usePermissions } from "@/hooks/usePermissions";

import { RowEditorOverlay } from "./RowEditorOverlay";
import { FaDollarSign, FaHandHoldingDollar } from "react-icons/fa6";
type InstallationJobView = Views<"installation_table_view"> & {
  partially_shipped?: boolean;
  installer_id?: number | null;
  cabinet_color?: string | null;
};

interface InstallationTableProps {
  isReadOnly?: boolean;
}

export default function InstallationTable({
  isReadOnly: isReadOnlyProp = false,
}: InstallationTableProps) {
  const router = useRouter();
  const permissions = usePermissions();
  const isReadOnly = isReadOnlyProp || !permissions.canEditInstallation;
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 21,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [inputFilters, setInputFilters] = useState<ColumnFiltersState>([
    { id: "has_shipped", value: "true" },
  ]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([
    { id: "has_shipped", value: "true" },
  ]);
  const [drawerJobId, setDrawerJobId] = useState<number | null>(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkModalOpen, { open: openBulkModal, close: closeBulkModal }] =
    useDisclosure(false);

  const [editingRow, setEditingRow] = useState<InstallationJobView | null>(
    null,
  );
  const [editingRowMeta, setEditingRowMeta] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    cellWidths: number[];
  } | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    filterId: string | null;
    filterValue: any | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    filterId: null,
    filterValue: null,
  });

  useEffect(() => {
    const handleClick = () => {
      setContextMenu((prev) =>
        prev.visible ? { ...prev, visible: false } : prev,
      );
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleJobClick = (id: number) => {
    setDrawerJobId(id);
    openDrawer();
  };

  const setInputFilterValue = (
    id: string,
    value: string | undefined | null | [Date | null, Date | null],
  ) => {
    setInputFilters((prev) => {
      const existing = prev.filter((f) => f.id !== id);
      if (!value) return existing;
      return [...existing, { id, value }];
    });
  };

  const getInputFilterValue = (id: string) => {
    return inputFilters.find((f) => f.id === id)?.value || "";
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

  const handleQuickFilter = (id: string, value: any) => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setInputFilters((prev) => {
      const existing = prev.filter((f) => f.id !== id);
      return [...existing, { id, value }];
    });
    setActiveFilters((prev) => {
      const existing = prev.filter((f) => f.id !== id);
      return [...existing, { id, value }];
    });
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleContextMenu = (e: React.MouseEvent, id: string, value: any) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      filterId: id,
      filterValue: value,
    });
  };

  const { data, isLoading, isError, error, refetch } = useInstallationTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });

  const tableData = data?.data || [];
  const pageCount = Math.ceil((data?.count || 0) / pagination.pageSize);

  const columnHelper = createColumnHelper<InstallationJobView>();

  const CellWrapper = ({
    children,
    onContextMenu,
    style,
  }: {
    children: React.ReactNode;
    onContextMenu?: (e: React.MouseEvent) => void;
    style?: React.CSSProperties;
  }) => (
    <Box
      style={{
        ...style,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
      }}
      onContextMenu={onContextMenu}
    >
      {children}
    </Box>
  );

  const columns = [
    ...(permissions.isInstaller || permissions.isAdmin
      ? [
          {
            id: "select",
            enableSorting: false,
            header: ({ table }: any) => (
              <Center style={{ width: "100%", height: "100%" }}>
                <Checkbox
                  color="violet"
                  size="xs"
                  styles={{ input: { cursor: "pointer" } }}
                  checked={table.getIsAllPageRowsSelected()}
                  indeterminate={table.getIsSomePageRowsSelected()}
                  onChange={table.getToggleAllPageRowsSelectedHandler()}
                  aria-label="Select all"
                />
              </Center>
            ),
            cell: ({ row }: any) => (
              <Center style={{ width: "100%", height: "100%" }}>
                <Checkbox
                  color="violet"
                  size="xs"
                  styles={{ input: { cursor: "pointer" } }}
                  checked={row.getIsSelected()}
                  disabled={!row.getCanSelect()}
                  onChange={row.getToggleSelectedHandler()}
                  aria-label="Select row"
                />
              </Center>
            ),
            size: 40,
            minSize: 40,
          },
        ]
      : []),
    ...(!isReadOnly
      ? [
          {
            id: "actions",
            header: "Open",
            size: 40,
            minSize: 40,
            cell: ({ row }: any) => (
              <Center>
                <Tooltip label="Open Full Editor">
                  <ActionIcon
                    variant="subtle"
                    color="violet"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(
                        `/dashboard/installation/${row.original.job_id}`,
                        "_blank",
                      );
                    }}
                  >
                    <FaExternalLinkAlt size={12} />
                  </ActionIcon>
                </Tooltip>
              </Center>
            ),
          },
        ]
      : []),
    columnHelper.accessor("job_number", {
      header: "Job No.",
      size: 100,
      minSize: 100,
      cell: (info) => (
        <Anchor
          component="button"
          size="xs"
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
            <Text fw={600} size="xs">
              {info.getValue()}
            </Text>
            {info.row.original.rush && (
              <Tooltip label="RUSH JOB">
                <FaFire size={12} color="red" />
              </Tooltip>
            )}
            {info.row.original.is_cod && (
              <Tooltip
                label={
                  info.row.original.payment_received
                    ? "COD : Received"
                    : "COD : Pending"
                }
              >
                <Badge
                  style={{ cursor: "pointer" }}
                  size="xs"
                  radius="100%"
                  styles={{ root: { padding: 3, marginLeft: 3 } }}
                  variant="gradient"
                  gradient={
                    info.row.original.payment_received
                      ? {
                          from: "#00470cff",
                          to: "#009917ff",
                          deg: 135,
                        }
                      : { from: "#a30000ff", to: "#d60000ff", deg: 135 }
                  }
                >
                  <FaDollarSign size={10} color="white" />
                </Badge>
              </Tooltip>
            )}
          </Group>
        </Anchor>
      ),
    }),

    columnHelper.accessor("shipping_client_name", {
      id: "client",
      header: "Client",
      size: 130,
      minSize: 100,
      cell: (info) => {
        const projectName = info.row.original.project_name;
        const clientName = info.getValue() || "—";
        const fullLabel = projectName
          ? `${projectName} - ${clientName}`
          : clientName;

        return (
          <CellWrapper
            onContextMenu={(e) =>
              handleContextMenu(e, "client", info.getValue() as string)
            }
          >
            <Tooltip label={fullLabel} openDelay={400} withArrow>
              <Text size="xs" fw={500} truncate="end" w="100%">
                {projectName && (
                  <>
                    <Text span fs="italic" fw={600} size="xs">
                      {projectName}
                    </Text>
                    {" - "}
                  </>
                )}
                {clientName}
              </Text>
            </Tooltip>
          </CellWrapper>
        );
      },
    }),
    columnHelper.accessor("site_address", {
      header: "Site Address",
      size: 180,
      minSize: 150,
      cell: (info) => (
        <CellWrapper
          onContextMenu={(e) =>
            handleContextMenu(e, "site_address", info.getValue() as string)
          }
        >
          <Tooltip label={info.getValue()} openDelay={400}>
            <Text size="xs" truncate="end" w="100%">
              {info.getValue() ?? "—"}
            </Text>
          </Tooltip>
        </CellWrapper>
      ),
    }),
    columnHelper.accessor("box", {
      header: "Box",
      size: 40,
      minSize: 40,
      cell: (info) => (
        <Center>
          <Text size="xs">{info.getValue() ?? "—"}</Text>
        </Center>
      ),
    }),

    columnHelper.accessor("cabinet_color", {
      id: "cabinet_color",
      header: "Color",
      size: 110,
      minSize: 90,
      cell: (info) => (
        <CellWrapper
          onContextMenu={(e) =>
            handleContextMenu(e, "cabinet_color", info.getValue() as string)
          }
        >
          <Text size="xs" truncate="end" w="100%">
            {info.getValue() ?? "—"}
          </Text>
        </CellWrapper>
      ),
    }),

    columnHelper.accessor("wrap_date", {
      header: "Wrap Date",
      size: 100,
      minSize: 90,
      cell: (info) => {
        const date = info.getValue();
        if (!date)
          return (
            <Text c="orange" size="xs">
              TBD
            </Text>
          );
        return (
          <CellWrapper
            onContextMenu={(e) =>
              handleContextMenu(
                e,
                "wrap_date",
                dayjs(date).format("YYYY-MM-DD"),
              )
            }
          >
            {dayjs(date).format("YYYY-MM-DD")}
          </CellWrapper>
        );
      },
    }),
    columnHelper.accessor("ship_schedule", {
      header: "Ship Date",
      size: 110,
      minSize: 100,
      cell: (info) => {
        const date = info.getValue();
        const row = info.row.original;

        if (!date)
          return (
            <Center>
              <Text c="orange" size="xs">
                TBD
              </Text>
            </Center>
          );

        const dateObj = dayjs(date).toDate();
        const status = (row as any).ship_status;

        return (
          <CellWrapper
            onContextMenu={(e) =>
              handleContextMenu(e, "ship_schedule", [dateObj, dateObj])
            }
            style={{ justifyContent: "center" }}
          >
            <Group gap={6} wrap="nowrap" justify="center">
              <Text size="xs">{dayjs(date).format("YYYY-MM-DD")}</Text>

              {status === "confirmed" && (
                <Tooltip label="Confirmed">
                  <FaCheckCircle size={14} color="green" />
                </Tooltip>
              )}

              {status === "tentative" && (
                <Tooltip label="Tentative">
                  <IoIosWarning size={14} color="orange" />
                </Tooltip>
              )}
            </Group>
          </CellWrapper>
        );
      },
    }),

    columnHelper.accessor("has_shipped", {
      header: "Shipped",
      size: 90,
      minSize: 90,
      cell: (info) => {
        const hasShipped = info.getValue();
        const partiallyShipped = info.row.original.partially_shipped;

        return (
          <Center
            style={{
              width: "100%",
              height: "100%",
              cursor: "context-menu",
            }}
            onContextMenu={(e) => {
              handleContextMenu(
                e,
                "has_shipped",
                hasShipped ? "true" : "false",
              );
            }}
          >
            {partiallyShipped ? (
              <Badge
                variant="gradient"
                size="xs"
                style={{ cursor: "pointer" }}
                gradient={{ from: "orange", to: "yellow", deg: 90 }}
              >
                PARTIAL
              </Badge>
            ) : hasShipped ? (
              <Badge
                variant="gradient"
                size="xs"
                style={{ cursor: "pointer" }}
                gradient={{ from: "lime", to: "green", deg: 90 }}
              >
                YES
              </Badge>
            ) : (
              <Badge
                variant="gradient"
                size="xs"
                style={{ cursor: "pointer" }}
                gradient={{ from: "red", to: "#ff2c2cff", deg: 90 }}
              >
                NO
              </Badge>
            )}
          </Center>
        );
      },
    }),
    columnHelper.accessor("installer_company", {
      id: "installer",
      header: "Installer",
      size: 110,
      minSize: 100,
      cell: (info) => {
        const row = info.row.original;

        const firstName = row.installer_first_name || "";
        const lastName = row.installer_last_name || "";
        const company = row.installer_company || "";

        const fullName = `${firstName} ${lastName}`.trim();

        const displayText = fullName || company;

        if (!displayText) {
          return (
            <Text c="orange" size="xs">
              TBD
            </Text>
          );
        }

        return (
          <CellWrapper
            onContextMenu={(e) =>
              handleContextMenu(e, "installer", displayText)
            }
          >
            {fullName && company ? (
              <Tooltip label={company}>
                <Text size="xs" truncate="end" w="100%">
                  {displayText}
                </Text>
              </Tooltip>
            ) : (
              <Text size="xs" truncate="end" w="100%">
                {displayText}
              </Text>
            )}
          </CellWrapper>
        );
      },
    }),
    columnHelper.accessor("installation_date", {
      header: "Installation Date",
      size: 100,
      minSize: 90,
      cell: (info) => {
        const date = info.getValue();
        if (!date)
          return (
            <Text c="orange" size="xs">
              TBD
            </Text>
          );

        const dateObj = dayjs(date).toDate();

        return (
          <CellWrapper
            onContextMenu={(e) =>
              handleContextMenu(e, "installation_date", [dateObj, dateObj])
            }
          >
            {dayjs(date).format("YYYY-MM-DD")}
          </CellWrapper>
        );
      },
    }),
    columnHelper.accessor("inspection_date", {
      header: "Inspection Date",
      size: 100,
      minSize: 90,
      cell: (info) => {
        const date = info.getValue();
        if (!date)
          return (
            <Text c="orange" size="xs">
              TBD
            </Text>
          );
        return (
          <CellWrapper
            onContextMenu={(e) =>
              handleContextMenu(
                e,
                "inspection_date",
                dayjs(date).format("YYYY-MM-DD"),
              )
            }
          >
            {dayjs(date).format("YYYY-MM-DD")}
          </CellWrapper>
        );
      },
    }),
    columnHelper.accessor("installation_completed", {
      header: "Install Done",
      size: 100,
      minSize: 100,
      cell: (info) => {
        const date = info.getValue();
        return (
          <CellWrapper
            onContextMenu={(e) => {
              if (date) {
                handleContextMenu(
                  e,
                  "installation_completed",
                  dayjs(date).format("YYYY-MM-DD"),
                );
              } else {
                handleContextMenu(e, "installation_completed", "pending");
              }
            }}
          >
            {date ? (
              <Group gap={4}>
                <FaCheckCircle color="var(--mantine-color-green-6)" size={12} />
                {date === "1999-09-19T00:00:00+00:00" ? (
                  <Text size="xs" c="green.8" fw={600}>
                    Done
                  </Text>
                ) : (
                  <Text size="xs" c="green.8" fw={600}>
                    {dayjs(date).format("YYYY-MM-DD")}
                  </Text>
                )}
              </Group>
            ) : (
              <Group gap={4}>
                <FaRegCircle color="gray" size={12} />
                <Text size="xs" c="dimmed">
                  Pending
                </Text>
              </Group>
            )}
          </CellWrapper>
        );
      },
    }),
    columnHelper.accessor("inspection_completed", {
      header: "Inspection Done",
      size: 100,
      minSize: 100,
      cell: (info) => {
        const date = info.getValue();
        return (
          <CellWrapper
            onContextMenu={(e) => {
              if (date) {
                handleContextMenu(
                  e,
                  "inspection_completed",
                  dayjs(date).format("YYYY-MM-DD"),
                );
              } else {
                handleContextMenu(e, "inspection_completed", "pending");
              }
            }}
          >
            {date ? (
              <Group gap={4}>
                <FaCalendarCheck
                  color="var(--mantine-color-blue-6)"
                  size={12}
                />
                <Text size="xs" c="blue.8" fw={600}>
                  {dayjs(date).format("YYYY-MM-DD")}
                </Text>
              </Group>
            ) : (
              <Group gap={4}>
                <FaRegCircle color="gray" size={12} />
                <Text size="xs" c="dimmed">
                  Pending
                </Text>
              </Group>
            )}
          </CellWrapper>
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
      rowSelection,
    },
    enableRowSelection: true,
    enableSortingRemoval: true,
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.installation_id),
  });

  if (isLoading) {
    return (
      <Center style={{ height: "300px" }}>
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center style={{ height: "300px" }}>
        <Text c="red">{(error as any)?.message}</Text>
      </Center>
    );
  }

  const currentRow = editingRow
    ? table
        .getRowModel()
        .rows.find(
          (r) => r.original.installation_id === editingRow.installation_id,
        )
    : null;

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        paddingTop: rem(5),
        paddingBottom: rem(1),
        paddingLeft: rem(20),
        paddingRight: rem(20),
        height: "100vh",
        position: "relative",
      }}
      fz={"xs"}
    >
      <Stack gap={6}>
        <Center>
          <Group>
            <ThemeIcon
              size={30}
              radius="md"
              variant="gradient"
              gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
            >
              <FaShippingFast size={16} />
            </ThemeIcon>
            <Title order={4} style={{ color: "#343a40" }}>
              Installation Schedule
            </Title>
          </Group>
        </Center>

        <Accordion variant="contained" radius="md" mb="xs">
          <Accordion.Item value="search-filters" w="100%">
            <Accordion.Control
              icon={<FaSearch size={13} />}
              style={{ fontSize: 13 }}
              styles={{
                label: {
                  padding: 6,
                },
              }}
            >
              Search Filters
            </Accordion.Control>
            <Accordion.Panel styles={{ content: { padding: 8 } }}>
              <Grid columns={12} gutter="sm">
                <Grid.Col span={{ base: 12, sm: 6, md: 1 }}>
                  <TextInput
                    size="xs"
                    label="Job Number"
                    placeholder="e.g., 202401"
                    value={getInputFilterValue("job_number") as string}
                    onChange={(e) =>
                      setInputFilterValue("job_number", e.target.value)
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                  <TextInput
                    size="xs"
                    label="Client"
                    placeholder="e.g., Smith"
                    value={getInputFilterValue("client") as string}
                    onChange={(e) =>
                      setInputFilterValue("client", e.target.value)
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 1.5 }}>
                  <TextInput
                    size="xs"
                    label="Project Name"
                    placeholder="Search Project..."
                    value={(getInputFilterValue("projectName") as string) || ""}
                    onChange={(e) =>
                      setInputFilterValue("projectName", e.target.value)
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                  <TextInput
                    size="xs"
                    label="Installer"
                    placeholder="Company or Name"
                    value={getInputFilterValue("installer") as string}
                    onChange={(e) =>
                      setInputFilterValue("installer", e.target.value)
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 1.5 }}>
                  <TextInput
                    size="xs"
                    label="Color"
                    placeholder="e.g., White"
                    value={getInputFilterValue("cabinet_color") as string}
                    onChange={(e) =>
                      setInputFilterValue("cabinet_color", e.target.value)
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <TextInput
                    size="xs"
                    label="Site Address"
                    placeholder="e.g., 123 Main St"
                    value={getInputFilterValue("site_address") as string}
                    onChange={(e) =>
                      setInputFilterValue("site_address", e.target.value)
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 0.8 }}>
                  <Select
                    size="xs"
                    label="Ship Status"
                    placeholder="Date Status"
                    data={[
                      { label: "Confirmed", value: "confirmed" },
                      { label: "Tentative", value: "tentative" },
                      { label: "Unprocessed", value: "unprocessed" },
                      { label: "All", value: "all" },
                    ]}
                    value={
                      (getInputFilterValue("ship_status") as string) || "all"
                    }
                    onChange={(val) => {
                      setInputFilterValue(
                        "ship_status",
                        val === "all" ? null : val,
                      );
                    }}
                    allowDeselect={false}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                  <DatePickerInput
                    size="xs"
                    type="range"
                    allowSingleDateInRange
                    label="Installation Date"
                    placeholder="Filter by Range"
                    clearable
                    value={
                      (inputFilters.find((f) => f.id === "installation_date")
                        ?.value as [Date | null, Date | null]) || [null, null]
                    }
                    onChange={(value) => {
                      setInputFilterValue("installation_date", value as any);
                    }}
                    valueFormat="YYYY-MM-DD"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                  <DatePickerInput
                    size="xs"
                    type="range"
                    allowSingleDateInRange
                    label="Shipping Date"
                    placeholder="Filter by Range"
                    clearable
                    value={
                      (inputFilters.find((f) => f.id === "ship_schedule")
                        ?.value as [Date | null, Date | null]) || [null, null]
                    }
                    onChange={(value) => {
                      setInputFilterValue("ship_schedule", value as any);
                    }}
                    valueFormat="YYYY-MM-DD"
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                  <Stack gap={6} pt={2}>
                    <Text size="xs" fw={500} c="black">
                      Toggles
                    </Text>
                    <Group gap="xl">
                      <Switch
                        label="Not Shipped"
                        size="sm"
                        thumbIcon={<FaCheckCircle />}
                        styles={{
                          label: { fontSize: 15 },
                          track: {
                            cursor: "pointer",
                            background:
                              getInputFilterValue("has_shipped") === "true"
                                ? "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)"
                                : "linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)",
                            border: "none",
                          },
                          thumb: {
                            background:
                              getInputFilterValue("has_shipped") === "true"
                                ? "#6e54ffff"
                                : "#d1d1d1ff",
                          },
                        }}
                        checked={getInputFilterValue("has_shipped") === "true"}
                        onChange={(e) => {
                          const val = e.currentTarget.checked;
                          setInputFilterValue(
                            "has_shipped",
                            val ? "true" : undefined,
                          );
                          const otherFilters = inputFilters.filter(
                            (f) => f.id !== "has_shipped",
                          );
                          const newActiveFilters = val
                            ? [
                                ...otherFilters,
                                { id: "has_shipped", value: val },
                              ]
                            : otherFilters;
                          setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                          setActiveFilters(newActiveFilters);
                        }}
                      />
                      <Switch
                        label="Rush"
                        size="sm"
                        thumbIcon={<FaCheckCircle />}
                        styles={{
                          label: { fontSize: 15 },
                          track: {
                            cursor: "pointer",
                            background:
                              getInputFilterValue("rush") === "true"
                                ? "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)"
                                : "linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)",
                            border: "none",
                          },
                          thumb: {
                            background:
                              getInputFilterValue("rush") === "true"
                                ? "#6e54ffff"
                                : "#d1d1d1ff",
                          },
                        }}
                        checked={getInputFilterValue("rush") === "true"}
                        onChange={(e) => {
                          const val = e.currentTarget.checked;
                          setInputFilterValue(
                            "rush",
                            e.target.checked ? "true" : undefined,
                          );
                          const otherFilters = inputFilters.filter(
                            (f) => f.id !== "rush",
                          );
                          const newActiveFilters = val
                            ? [...otherFilters, { id: "rush", value: val }]
                            : otherFilters;
                          setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                          setActiveFilters(newActiveFilters);
                        }}
                      />
                    </Group>
                  </Stack>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Group justify="flex-end" gap="xs">
                    <Button
                      size="xs"
                      variant="default"
                      color="gray"
                      onClick={handleClearFilters}
                    >
                      Clear Filters
                    </Button>
                    <Button
                      size="xs"
                      variant="filled"
                      leftSection={<FaSearch size={12} />}
                      onClick={handleApplyFilters}
                      style={{
                        background:
                          "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
                      }}
                    >
                      Apply Filters
                    </Button>
                  </Group>
                </Grid.Col>
              </Grid>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Stack>

      <Transition
        mounted={Object.keys(rowSelection).length > 1}
        transition="slide-up"
        duration={200}
        timingFunction="ease"
      >
        {(styles) => (
          <Paper
            shadow="xl"
            radius="md"
            withBorder
            p="md"
            style={{
              ...styles,
              position: "fixed",
              bottom: rem(80),
              left: rem(250),
              right: 0,
              marginInline: "auto",
              width: "fit-content",
              zIndex: 200,
              backgroundColor: "var(--mantine-color-violet-0)",
              borderColor: "var(--mantine-color-violet-2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: rem(20),
            }}
          >
            <Group>
              <ThemeIcon color="violet" variant="light" size="lg">
                <FaCheckCircle />
              </ThemeIcon>
              <Text fw={500} c="violet.9">
                {Object.keys(rowSelection).length} jobs selected
              </Text>
            </Group>
            <Group>
              <Button
                variant="white"
                color="red"
                onClick={() => setRowSelection({})}
              >
                Clear Selection
              </Button>
              <Button
                color="violet"
                onClick={openBulkModal}
                leftSection={<FaCalendarCheck />}
              >
                Bulk Schedule
              </Button>
            </Group>
          </Paper>
        )}
      </Transition>

      <ScrollArea
        style={{
          flex: 1,
          minHeight: 0,
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
          layout="fixed"
          style={{
            fontSize: "var(--mantine-font-size-xs)",
          }}
        >
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <Table.Th
                      key={header.id}
                      colSpan={header.colSpan}
                      onClick={
                        canSort
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                      style={{
                        position: "relative",
                        width: header.getSize(),
                        cursor: canSort ? "pointer" : "default",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {canSort && (
                        <span className="inline-block ml-1">
                          {header.column.getIsSorted() === "asc" && (
                            <FaSortUp />
                          )}
                          {header.column.getIsSorted() === "desc" && (
                            <FaSortDown />
                          )}
                          {!header.column.getIsSorted() && (
                            <FaSort opacity={0.1} />
                          )}
                        </span>
                      )}
                    </Table.Th>
                  );
                })}
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
              table.getRowModel().rows.map((row) => {
                const bgColor =
                  row.original.wrap_date !== null ||
                  row.original.ship_schedule !== null ||
                  row.original.has_shipped == true
                    ? undefined
                    : "#ffefefff";

                const isEditing =
                  editingRow?.installation_id === row.original.installation_id;

                return (
                  <Table.Tr
                    key={row.id}
                    onDoubleClick={(e) => {
                      if (isReadOnly) return;
                      const cells = Array.from(
                        e.currentTarget.children,
                      ) as HTMLElement[];
                      const widths = cells.map(
                        (c) => c.getBoundingClientRect().width,
                      );
                      const rect = e.currentTarget.getBoundingClientRect();

                      setEditingRowMeta({
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                        cellWidths: widths,
                      });
                      setEditingRow(row.original);
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{
                      cursor: "pointer",
                      backgroundColor: bgColor,
                      opacity: isEditing ? 0 : 1,
                      userSelect: "none",
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Table.Td
                        key={cell.id}
                        style={{
                          minWidth: cell.column.getSize(),
                          whiteSpace: "nowrap",
                          padding:
                            cell.column.id === "select" ? "0" : undefined,
                        }}
                        onClick={(e) => {
                          if (cell.column.id === "select") {
                            e.stopPropagation();
                          }
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      <Box
        style={{
          width: "100%",
          padding: "5px",
          background: "white",
          borderTop: "1px solid #eee",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Pagination
          color="#4A00E0"
          withEdges
          size="sm"
          total={table.getPageCount()}
          value={table.getState().pagination.pageIndex + 1}
          onChange={(page) => table.setPageIndex(page - 1)}
        />
      </Box>

      {editingRow && editingRowMeta && currentRow && (
        <RowEditorOverlay
          data={editingRow}
          rowMeta={editingRowMeta}
          table={table}
          onCancel={() => {
            setEditingRow(null);
            setEditingRowMeta(null);
          }}
          row={currentRow}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      <Transition
        mounted={contextMenu.visible}
        transition="pop"
        duration={200}
        timingFunction="ease"
      >
        {(styles) => (
          <Paper
            shadow="md"
            radius="sm"
            withBorder
            style={{
              ...styles,
              position: "fixed",
              top: contextMenu.y,
              left: contextMenu.x,
              zIndex: 9999,
              minWidth: 160,
              overflow: "hidden",
              padding: 4,
            }}
          >
            <UnstyledButton
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                padding: "8px 12px",
                fontSize: "14px",
                borderRadius: "4px",
                transition: "background-color 0.1s",
              }}
              onClick={() => {
                if (contextMenu.filterId && contextMenu.filterValue !== null) {
                  handleQuickFilter(
                    contextMenu.filterId,
                    contextMenu.filterValue,
                  );
                }
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "var(--mantine-color-gray-1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <FaFilter style={{ marginRight: 8, color: "#666" }} size={12} />
              <Text size="sm">Quick Filter</Text>
            </UnstyledButton>
          </Paper>
        )}
      </Transition>

      <JobDetailsDrawer
        jobId={drawerJobId}
        opened={drawerOpened}
        onClose={closeDrawer}
      />
      <BulkScheduleModal
        opened={bulkModalOpen}
        onClose={closeBulkModal}
        selectedRows={table.getSelectedRowModel().rows}
        clearSelection={() => setRowSelection({})}
      />
    </Box>
  );
}
