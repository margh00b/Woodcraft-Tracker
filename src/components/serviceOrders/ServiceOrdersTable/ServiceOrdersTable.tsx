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
  Accordion,
  Tooltip,
  ActionIcon,
  Button,
  rem,
  Badge,
  Stack,
  ThemeIcon,
  Title,
  SimpleGrid,
  Anchor,
  Indicator,
  Switch,
  Select,
  Paper,
  UnstyledButton,
  Transition,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  FaPlus,
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaCheckCircle,
  FaTools,
  FaTrash,
  FaFilter,
} from "react-icons/fa";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useServiceOrdersTable } from "@/hooks/useServiceOrdersTable";
import { Views } from "@/types/db";
import { usePermissions } from "@/hooks/usePermissions";
import { useDisclosure } from "@mantine/hooks";
import JobDetailsDrawer from "@/components/Shared/JobDetailsDrawer/JobDetailsDrawer";
import { useDeleteServiceOrder } from "@/hooks/useDeleteServiceOrder";

dayjs.extend(utc);
type ServiceOrderView = Views<"service_orders_table_view">;

export default function ServiceOrdersTable() {
  const { canEditServiceOrders } = usePermissions();
  const router = useRouter();

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

  // Context Menu State
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

  const deleteServiceOrder = useDeleteServiceOrder();

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

  // Unified Filter Setter
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

  const handleDelete = (e: React.MouseEvent, id: number, soNumber: string) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Are you sure you want to delete Service Order #${soNumber}?`
      )
    ) {
      deleteServiceOrder.mutate(id);
    }
  };

  const { data, isLoading, isError, error } = useServiceOrdersTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });

  const tableData = (data?.data as unknown as ServiceOrderView[]) || [];
  const totalCount = data?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  const columnHelper = createColumnHelper<ServiceOrderView>();

  // Helper for Context Menu Cells
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
    columnHelper.accessor("service_order_number", {
      header: "Service Order #",
      size: 150,
      minSize: 120,
      cell: (info) => (
        <CellWrapper
          onContextMenu={(e) =>
            handleContextMenu(e, "service_order_number", info.getValue())
          }
        >
          <Text fw={600} size="sm">
            {info.getValue()}
          </Text>
        </CellWrapper>
      ),
    }),
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
          onContextMenu={(e) =>
            handleContextMenu(e, "job_number", info.getValue())
          }
        >
          {info.getValue()}
        </Anchor>
      ),
    }),
    columnHelper.accessor("client_name", {
      header: "Client Name",
      size: 180,
      minSize: 140,
      cell: (info) => (
        <CellWrapper
          onContextMenu={(e) =>
            handleContextMenu(e, "client_name", info.getValue())
          }
        >
          <Text size="sm">{info.getValue() || "—"}</Text>
        </CellWrapper>
      ),
    }),
    columnHelper.accessor("site_address", {
      header: "Site Address",
      size: 250,
      minSize: 180,
      cell: (info) => (
        <CellWrapper
          onContextMenu={(e) =>
            handleContextMenu(e, "site_address", info.getValue())
          }
        >
          <Tooltip label={info.getValue()}>
            <Text truncate size="sm">
              {info.getValue() || "—"}
            </Text>
          </Tooltip>
        </CellWrapper>
      ),
    }),
    columnHelper.accessor("installer_company", {
      header: "Service Technician",
      size: 180,
      minSize: 140,
      cell: (info) => {
        const installerRequested = info.row.original.installer_requested;
        return (
          <CellWrapper>
            {installerRequested ? (
              <Group>
                <Text size="sm" c="red" fw={600}>
                  Installer Requested
                </Text>
                <Indicator inline processing color="red" size={8} />
              </Group>
            ) : (
              <Text size="sm">{info.getValue() || "—"}</Text>
            )}
          </CellWrapper>
        );
      },
    }),
    columnHelper.accessor("date_entered", {
      header: "Date Entered",
      size: 130,
      minSize: 110,
      cell: (info) => {
        const date = info.getValue();
        return (
          <CellWrapper>
            {date ? dayjs(date).format("YYYY-MM-DD") : "—"}
          </CellWrapper>
        );
      },
    }),
    columnHelper.accessor("due_date", {
      header: "Date Due",
      size: 130,
      minSize: 110,
      cell: (info) => {
        const date = info.getValue();
        const isPast = dayjs(date).isBefore(dayjs(), "day");
        const isCompleted = !!info.row.original.completed_at;

        return (
          <CellWrapper>
            {date ? (
              <Text
                size="sm"
                fw={isPast && !isCompleted ? 700 : 400}
                c={isPast && !isCompleted ? "red" : "dark"}
              >
                {dayjs(date).format("YYYY-MM-DD")}
              </Text>
            ) : (
              "—"
            )}
          </CellWrapper>
        );
      },
    }),
    columnHelper.accessor("completed_at", {
      header: "Status",
      size: 160,
      minSize: 130,
      cell: (info) => {
        const date = info.getValue();
        return (
          <CellWrapper
            onContextMenu={(e) =>
              handleContextMenu(e, "status", date ? "COMPLETED" : "OPEN")
            }
          >
            {date ? (
              <Tooltip label="Completed">
                <Group gap={6}>
                  <FaCheckCircle
                    color="var(--mantine-color-green-6)"
                    size={14}
                  />
                  {date === "1999-09-19T00:00:00+00:00" ? (
                    <Text size="sm" c="green.8" fw={600}>
                      Completed
                    </Text>
                  ) : (
                    <Text size="sm" c="green.8" fw={600}>
                      {dayjs(date).format("YYYY-MM-DD")}
                    </Text>
                  )}{" "}
                </Group>
              </Tooltip>
            ) : (
              <Badge
                variant="gradient"
                gradient={{ from: "#4da0ff", to: "#0066cc", deg: 135 }}
                leftSection={<FaTools />}
              >
                Open
              </Badge>
            )}
          </CellWrapper>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      size: 100,
      minSize: 80,
      cell: (info) => {
        const id = info.row.original.service_order_id;
        const soNumber = info.row.original.service_order_number;

        if (!canEditServiceOrders || !id) return null;

        return (
          <Group justify="center">
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={(e) => handleDelete(e, id, soNumber || "")}
              loading={deleteServiceOrder.isPending}
            >
              <FaTrash size={16} />
            </ActionIcon>
          </Group>
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
      <Center style={{ height: "400px" }}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center style={{ height: "400px" }}>
        <Text c="red">Error: {(error as Error).message}</Text>
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
        position: "relative",
      }}
    >
      <Group mb="md" justify="space-between">
        <Group>
          <ThemeIcon
            size={50}
            radius="md"
            variant="gradient"
            gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
          >
            <FaTools size={26} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={2} style={{ color: "#343a40" }}>
              Service Orders
            </Title>
            <Text size="sm" c="dimmed">
              Track service orders
            </Text>
          </Stack>
        </Group>

        {canEditServiceOrders && (
          <Button
            onClick={() => router.push("/dashboard/serviceorders/new")}
            leftSection={<FaPlus size={14} />}
            style={{
              background: "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
              color: "white",
              border: "none",
            }}
          >
            New Service Order
          </Button>
        )}
      </Group>

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
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mt="sm" spacing="md">
              <TextInput
                label="SO Number"
                placeholder="Search..."
                value={getInputFilterValue("service_order_number") as string}
                onChange={(e) =>
                  setInputFilterValue("service_order_number", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Job Number"
                placeholder="Search..."
                value={getInputFilterValue("job_number") as string}
                onChange={(e) =>
                  setInputFilterValue("job_number", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Client Name"
                placeholder="Search..."
                value={getInputFilterValue("client_name") as string}
                onChange={(e) =>
                  setInputFilterValue("client_name", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <Select
                label="Order Status"
                placeholder="Select status"
                data={[
                  { value: "ALL", label: "All Orders" },
                  { value: "OPEN", label: "Open" },
                  { value: "COMPLETED", label: "Completed" },
                ]}
                value={(getInputFilterValue("status") as string) || "ALL"}
                onChange={(val) => setInputFilterValue("status", val)}
              />

              <DatePickerInput
                type="range"
                label="Date Entered Range"
                placeholder="Pick dates"
                allowSingleDateInRange
                value={
                  (getInputFilterValue("date_entered") as [
                    Date | null,
                    Date | null
                  ]) || [null, null]
                }
                onChange={(val) =>
                  setInputFilterValue("date_entered", val as any)
                }
                clearable
                valueFormat="YYYY-MM-DD"
                leftSection={<FaFilter size={14} color="gray" />}
              />

              <DatePickerInput
                type="range"
                label="Due Date Range"
                placeholder="Pick dates"
                allowSingleDateInRange
                value={
                  (getInputFilterValue("due_date") as [
                    Date | null,
                    Date | null
                  ]) || [null, null]
                }
                onChange={(val) => setInputFilterValue("due_date", val as any)}
                clearable
                valueFormat="YYYY-MM-DD"
                leftSection={<FaFilter size={14} color="gray" />}
              />

              <TextInput
                label="Site Address"
                placeholder="Search..."
                value={getInputFilterValue("site_address") as string}
                onChange={(e) =>
                  setInputFilterValue("site_address", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />

              <Box pt={24}>
                <Switch
                  label="Installer Requested"
                  size="md"
                  thumbIcon={<FaCheckCircle />}
                  styles={{
                    track: {
                      cursor: "pointer",
                      background:
                        getInputFilterValue("installer_requested") === "true"
                          ? "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)"
                          : "linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)",
                      color: "white",
                      border: "none",
                    },
                    thumb: {
                      background:
                        getInputFilterValue("installer_requested") === "true"
                          ? "#6e54ffff"
                          : "#d1d1d1ff",
                    },
                  }}
                  checked={
                    getInputFilterValue("installer_requested") === "true"
                  }
                  onChange={(e) =>
                    setInputFilterValue(
                      "installer_requested",
                      e.currentTarget.checked ? "true" : ""
                    )
                  }
                />
              </Box>
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
            background: "linear-gradient(135deg, #8E2DE2, #4A00E0)",
          },
        }}
        type="hover"
      >
        <Table
          striped
          stickyHeader
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
                    style={{
                      position: "relative",
                      width: header.getSize(),
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Group gap="xs" wrap="nowrap">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "asc" && <FaSortUp />}
                      {header.column.getIsSorted() === "desc" && <FaSortDown />}
                      {!header.column.getIsSorted() && <FaSort opacity={0.2} />}
                    </Group>
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {table.getRowModel().rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Center py="xl">
                    <Text c="dimmed">No service orders found.</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Table.Tr
                  key={row.id}
                  onClick={() =>
                    router.push(
                      `/dashboard/serviceorders/${row.original.service_order_id}`
                    )
                  }
                  style={{ cursor: "pointer" }}
                  onContextMenu={(e) => e.preventDefault()}
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
    </Box>
  );
}
