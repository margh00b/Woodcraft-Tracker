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
} from "react-icons/fa";
import dayjs from "dayjs";
import { DatePickerInput } from "@mantine/dates";
import { useInstallationTable } from "@/hooks/useInstallationTable";
import { Views } from "@/types/db";
import { useDisclosure } from "@mantine/hooks";
import JobDetailsDrawer from "@/components/Shared/JobDetailsDrawer/JobDetailsDrawer";
import BulkScheduleModal from "../BulkInstallationScheduleModal/BulkInstallationScheduleModal";
import { usePermissions } from "@/hooks/usePermissions";

type InstallationJobView = Views<"installation_table_view">;

export default function InstallationTable() {
  const router = useRouter();
  const permissions = usePermissions();
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

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkModalOpen, { open: openBulkModal, close: closeBulkModal }] =
    useDisclosure(false);

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
        prev.visible ? { ...prev, visible: false } : prev
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
    value: string | undefined | null | [Date | null, Date | null]
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

  const { data, isLoading, isError, error } = useInstallationTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });

  const tableData = data?.data || [];
  const totalCount = data?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  const columnHelper = createColumnHelper<InstallationJobView>();

  const CellWrapper = ({
    children,
    onContextMenu,
  }: {
    children: React.ReactNode;
    onContextMenu?: (e: React.MouseEvent) => void;
  }) => (
    <Box
      style={{
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
    ...(permissions.isInstaller
      ? [
          {
            id: "select",
            // Disable sorting for the checkbox column
            enableSorting: false,
            header: ({ table }: any) => (
              <Checkbox
                color="violet"
                styles={{ input: { cursor: "pointer" } }}
                checked={table.getIsAllPageRowsSelected()}
                indeterminate={table.getIsSomePageRowsSelected()}
                onChange={table.getToggleAllPageRowsSelectedHandler()}
                aria-label="Select all"
              />
            ),
            cell: ({ row }: any) => (
              <Center style={{ width: "100%", height: "100%" }}>
                <Checkbox
                  color="violet"
                  styles={{ input: { cursor: "pointer" } }}
                  checked={row.getIsSelected()}
                  disabled={!row.getCanSelect()}
                  onChange={row.getToggleSelectedHandler()}
                  aria-label="Select row"
                />
              </Center>
            ),
            size: 40,
          },
        ]
      : []),
    columnHelper.accessor("job_number", {
      header: "Job No.",
      size: 150,
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
      id: "client",
      header: "Client",
      size: 150,
      minSize: 120,
      cell: (info) => (
        <CellWrapper
          onContextMenu={(e) =>
            handleContextMenu(e, "client", info.getValue() as string)
          }
        >
          <Text size="sm">{info.getValue() ?? "—"}</Text>
        </CellWrapper>
      ),
    }),

    columnHelper.accessor("installer_company", {
      id: "installer",
      header: "Installer",
      size: 200,
      minSize: 150,
      cell: (info) => {
        const row = info.row.original;
        const filterValue =
          row.installer_company || row.installer_first_name || "";

        if (!row.installer_id && !row.installer_first_name)
          return <Text c="orange">TBD</Text>;

        return (
          <CellWrapper
            onContextMenu={(e) =>
              handleContextMenu(e, "installer", filterValue)
            }
          >
            <Group gap={4} wrap="nowrap">
              {row.installer_company ? (
                <Tooltip label={`${row.installer_company} `}>
                  <Text size="sm">{row.installer_first_name}</Text>
                </Tooltip>
              ) : (
                <Text size="sm">{row.installer_first_name}</Text>
              )}
            </Group>
          </CellWrapper>
        );
      },
    }),

    columnHelper.accessor("wrap_date", {
      header: "Wrap Date",
      size: 150,
      minSize: 120,
      cell: (info) => {
        const date = info.getValue();
        if (!date) return <Text c="orange">TBD</Text>;
        return (
          <CellWrapper
            onContextMenu={(e) =>
              handleContextMenu(
                e,
                "wrap_date",
                dayjs(date).format("YYYY-MM-DD")
              )
            }
          >
            {dayjs(date).format("YYYY-MM-DD")}
          </CellWrapper>
        );
      },
    }),
    columnHelper.accessor("ship_schedule", {
      header: "Shipping Date",
      size: 150,
      minSize: 120,
      cell: (info) => {
        const date = info.getValue();
        if (!date) return <Text c="orange">TBD</Text>;

        const dateObj = dayjs(date).toDate();

        return (
          <CellWrapper
            onContextMenu={(e) =>
              handleContextMenu(e, "ship_schedule", [dateObj, dateObj])
            }
          >
            {dayjs(date).format("YYYY-MM-DD")}
          </CellWrapper>
        );
      },
    }),

    columnHelper.accessor("has_shipped", {
      header: "Shipped",
      size: 80,
      minSize: 80,
      cell: (info) => {
        const shipped = info.getValue();
        return (
          <Center
            style={{
              width: "100%",
              height: "100%",
              cursor: "context-menu",
            }}
            onContextMenu={(e) => {
              const filterVal = shipped ? "false" : "true";
              handleContextMenu(e, "has_shipped", filterVal);
            }}
          >
            <Badge
              variant="gradient"
              style={{ cursor: "pointer" }}
              gradient={
                shipped
                  ? { from: "lime", to: "green", deg: 90 }
                  : { from: "red", to: "#ff2c2cff", deg: 90 }
              }
            >
              {shipped ? "YES" : "NO"}
            </Badge>
          </Center>
        );
      },
    }),
    columnHelper.accessor("installation_date", {
      header: "Installation Date",
      size: 150,
      minSize: 120,
      cell: (info) => {
        const date = info.getValue();
        if (!date) return <Text c="orange">TBD</Text>;

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
      size: 150,
      minSize: 120,
      cell: (info) => {
        const date = info.getValue();
        if (!date) return <Text c="orange">TBD</Text>;
        return (
          <CellWrapper
            onContextMenu={(e) =>
              handleContextMenu(
                e,
                "inspection_date",
                dayjs(date).format("YYYY-MM-DD")
              )
            }
          >
            {dayjs(date).format("YYYY-MM-DD")}
          </CellWrapper>
        );
      },
    }),
    columnHelper.accessor("installation_completed", {
      header: "Installation",
      size: 180,
      minSize: 180,
      cell: (info) => {
        const date = info.getValue();
        return (
          <CellWrapper
            onContextMenu={(e) => {
              if (date) {
                handleContextMenu(
                  e,
                  "installation_completed",
                  dayjs(date).format("YYYY-MM-DD")
                );
              } else {
                handleContextMenu(e, "installation_completed", "pending");
              }
            }}
          >
            {date ? (
              <Group gap={6}>
                <FaCheckCircle color="var(--mantine-color-green-6)" size={14} />
                {date === "1999-09-19T00:00:00+00:00" ? (
                  <Text size="sm" c="green.8" fw={600}>
                    Completed
                  </Text>
                ) : (
                  <Text size="sm" c="green.8" fw={600}>
                    {dayjs(date).format("YYYY-MM-DD")}
                  </Text>
                )}
              </Group>
            ) : (
              <Group gap={6}>
                <FaRegCircle color="gray" size={14} />
                <Text size="sm" c="dimmed">
                  Pending
                </Text>
              </Group>
            )}
          </CellWrapper>
        );
      },
    }),
    columnHelper.accessor("inspection_completed", {
      header: "Inspection",
      size: 160,
      minSize: 140,
      cell: (info) => {
        const date = info.getValue();
        return (
          <CellWrapper
            onContextMenu={(e) => {
              if (date) {
                handleContextMenu(
                  e,
                  "inspection_completed",
                  dayjs(date).format("YYYY-MM-DD")
                );
              } else {
                handleContextMenu(e, "inspection_completed", "pending");
              }
            }}
          >
            {date ? (
              <Group gap={6}>
                <FaCalendarCheck
                  color="var(--mantine-color-blue-6)"
                  size={14}
                />
                <Text size="sm" c="blue.8" fw={600}>
                  {dayjs(date).format("YYYY-MM-DD")}
                </Text>
              </Group>
            ) : (
              <Group gap={6}>
                <FaRegCircle color="gray" size={14} />
                <Text size="sm" c="dimmed">
                  Pending
                </Text>
              </Group>
            )}
          </CellWrapper>
        );
      },
    }),
    columnHelper.accessor("site_address", {
      header: "Site Address",
      size: 200,
      minSize: 150,
      cell: (info) => (
        <CellWrapper
          onContextMenu={(e) =>
            handleContextMenu(e, "site_address", info.getValue() as string)
          }
        >
          <Text size="sm">{info.getValue() ?? "—"}</Text>
        </CellWrapper>
      ),
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

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        padding: rem(20),
        height: "calc(100vh - 45px)",
        position: "relative", // Ensure context for absolute positioning if needed, though we use fixed for the bar
      }}
    >
      <Group mb="md">
        <ThemeIcon
          size={50}
          radius="md"
          variant="gradient"
          gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
        >
          <FaShippingFast size={26} />
        </ThemeIcon>
        <Stack gap={0}>
          <Title order={2} style={{ color: "#343a40" }}>
            Installation Schedule
          </Title>
          <Text size="sm" c="dimmed">
            Track installation schedule
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
                value={getInputFilterValue("job_number") as string}
                onChange={(e) =>
                  setInputFilterValue("job_number", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Site Address"
                placeholder="e.g., 123 Main St, Anytown, CA"
                value={getInputFilterValue("site_address") as string}
                onChange={(e) =>
                  setInputFilterValue("site_address", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Client"
                placeholder="e.g., Smith"
                value={getInputFilterValue("client") as string}
                onChange={(e) => setInputFilterValue("client", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Installer"
                placeholder="Company or Name"
                value={getInputFilterValue("installer") as string}
                onChange={(e) =>
                  setInputFilterValue("installer", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <DatePickerInput
                type="range"
                allowSingleDateInRange
                label="Installation Date"
                placeholder="Filter by Date Range"
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
              <DatePickerInput
                type="range"
                allowSingleDateInRange
                label="Shipping Date"
                placeholder="Filter by Date Range"
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
              <Group
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  paddingBottom: "6px",
                }}
              >
                <Switch
                  label="Not Shipped"
                  size="md"
                  thumbIcon={<FaCheckCircle />}
                  styles={{
                    track: {
                      cursor: "pointer",
                      background:
                        getInputFilterValue("has_shipped") === "true"
                          ? "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)"
                          : "linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)",
                      color: "white",
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
                  onChange={(e) =>
                    setInputFilterValue(
                      "has_shipped",
                      e.target.checked ? "true" : undefined
                    )
                  }
                />
                <Switch
                  label="Rush"
                  size="md"
                  thumbIcon={<FaCheckCircle />}
                  styles={{
                    track: {
                      cursor: "pointer",
                      background:
                        getInputFilterValue("rush") === "true"
                          ? "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)"
                          : "linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)",
                      color: "white",
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
                  onChange={(e) =>
                    setInputFilterValue(
                      "rush",
                      e.target.checked ? "true" : undefined
                    )
                  }
                />
              </Group>
            </SimpleGrid>

            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                color="gray"
                onClick={handleClearFilters}
              >
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

      {/* Floating Action Bar - Moved here and wrapped in Transition */}
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
              marginInline: "auto", // Centers the fixed element
              width: "fit-content",
              zIndex: 200, // Ensure it sits above table content
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
                        header.getContext()
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
                return (
                  <Table.Tr
                    key={row.id}
                    onClick={() =>
                      router.push(
                        `/dashboard/installation/${row.original.job_id}`
                      )
                    }
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ cursor: "pointer", backgroundColor: bgColor }}
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
                          cell.getContext()
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

      {/* Quick Filter Context Menu */}
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
                    contextMenu.filterValue
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
