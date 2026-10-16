"use client";

import { useState, KeyboardEvent } from "react";
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
  Badge,
  Title,
  Stack,
  ThemeIcon,
  Select,
  Button,
  Accordion,
  SimpleGrid,
  Switch,
  rem,
} from "@mantine/core";
import {
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaClipboardList,
  FaPrint,
} from "react-icons/fa";
import dayjs from "dayjs";
import { useDisclosure } from "@mantine/hooks";
import { DatePickerInput } from "@mantine/dates";
import EditBOModal from "@/components/Installation/EditBOModal/EditBOModal";
import { useBackordersTable } from "@/hooks/useBackOrdersTable";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import BackorderPdfPreviewModal from "@/components/Shared/BOPdfModal/BOPdfModal";
import BackordersListPdfModal from "@/components/Backorders/BackordersListPdfModal/BackordersListPdfModal";
import { ActionIcon } from "@mantine/core";

export default function BackordersTable() {
  const permissions = usePermissions();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const [inputFilters, setInputFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([]);

  const [selectedBO, setSelectedBO] = useState<any>(null);
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);

  const { supabase, isAuthenticated } = useSupabase();
  const [printBackorderId, setPrintBackorderId] = useState<number | null>(null);
  const [
    printItemModalOpened,
    { open: openPrintItemModal, close: closePrintItemModal },
  ] = useDisclosure(false);

  const [
    printListModalOpened,
    { open: openPrintListModal, close: closePrintListModal },
  ] = useDisclosure(false);

  const { data, isLoading } = useBackordersTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });

  const { data: printListData, isLoading: isPrintListLoading } =
    useBackordersTable({
      pagination: { pageIndex: 0, pageSize: 0 },
      columnFilters: activeFilters,
      sorting,
      fetchAll: true,
    });

  const { data: printData, isLoading: isPrintLoading } = useQuery({
    queryKey: ["backorder-print-data", printBackorderId],
    queryFn: async () => {
      if (!printBackorderId) return null;

      const { data, error } = await supabase
        .from("backorders")
        .select(
          `
          *,
          jobs:job_id (
            job_number,
            sales_orders:sales_orders (
              shipping_client_name,
              shipping_street,
              shipping_city,
              shipping_province,
              shipping_zip,
              cabinet:cabinets (
                box,
                species:species (Species),
                colors:colors (Name),
                door_styles:door_styles (name)
              )
            )
          )
        `
        )
        .eq("id", printBackorderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated && !!printBackorderId,
  });

  const handlePrintItemClick = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setPrintBackorderId(id);
    openPrintItemModal();
  };

  const handleClosePrintItem = () => {
    closePrintItemModal();
    setPrintBackorderId(null);
  };

  const setInputFilterValue = (
    id: string,
    value: string | undefined | null | [Date | null, Date | null]
  ) => {
    setInputFilters((prev) => {
      const existing = prev.filter((f) => f.id !== id);
      if (value === undefined || value === null || value === "")
        return existing;
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

  const tableData = data?.data || [];
  const totalCount = data?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  const columnHelper = createColumnHelper<any>();

  const columns = [
    columnHelper.accessor("id", {
      header: "BO #",
      size: 80,
      cell: (info) => (
        <Text fw={600} size="sm">
          BO-{info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor("job_number", {
      header: "Job #",
      size: 100,
      cell: (info) => (
        <Text fw={600} size="sm">
          {info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor("shipping_client_name", {
      header: "Client",
      size: 180,
      cell: (info) => <Text size="sm">{info.getValue()}</Text>,
    }),
    columnHelper.accessor("comments", {
      header: "Description / Comments",
      size: 300,
      cell: (info) => (
        <Text size="sm" lineClamp={1} title={info.getValue()}>
          {info.getValue() || "—"}
        </Text>
      ),
    }),
    columnHelper.accessor("date_entered", {
      header: "Date Entered",
      size: 130,
      cell: (info) =>
        info.getValue() ? dayjs(info.getValue()).format("YYYY-MM-DD") : "—",
    }),
    columnHelper.accessor("due_date", {
      header: "Due Date",
      size: 130,
      cell: (info) => {
        const date = info.getValue();
        const isLate =
          date &&
          dayjs(date).isBefore(dayjs(), "day") &&
          !info.row.original.complete;
        return (
          <Text size="sm" c={isLate ? "red" : "dimmed"} fw={isLate ? 700 : 400}>
            {date ? dayjs(date).format("YYYY-MM-DD") : "—"}
          </Text>
        );
      },
    }),
    columnHelper.accessor("complete", {
      header: "Status",
      size: 120,
      cell: (info) => (
        <Badge color={info.getValue() ? "green" : "red"} variant="light">
          {info.getValue() ? "Complete" : "Pending"}
        </Badge>
      ),
    }),
    columnHelper.display({
      id: "print",
      size: 60,
      cell: (info) => (
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={(e) => handlePrintItemClick(e, info.row.original.id)}
          loading={isPrintLoading && printBackorderId === info.row.original.id}
        >
          <FaPrint size={14} />
        </ActionIcon>
      ),
    }),
  ];

  const table = useReactTable({
    data: tableData,
    columns,
    pageCount,
    state: { pagination, sorting, columnFilters: activeFilters },
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleRowClick = (row: any) => {
    setSelectedBO(row);
    openEditModal();
  };

  const dateEnteredFilter = activeFilters.find((f) => f.id === "date_entered")
    ?.value as [Date | null, Date | null] | undefined;
  const printDateRange = dateEnteredFilter || [null, null];

  return (
    <Box
      p="md"
      h="calc(100vh - 60px)"
      display="flex"
      style={{ flexDirection: "column" }}
    >
      <Group mb="lg" justify="space-between">
        <Group>
          <ThemeIcon
            size={44}
            radius="md"
            variant="gradient"
            gradient={{ from: "orange", to: "red" }}
          >
            <FaClipboardList size={24} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={3}>Backorders</Title>
            <Text c="dimmed" size="sm">
              Manage all active and past backorders
            </Text>
          </Stack>
        </Group>
        <Button
          leftSection={<FaPrint />}
          onClick={openPrintListModal}
          variant="outline"
          color="violet"
        >
          Print Backorders List
        </Button>
      </Group>

      <Accordion variant="contained" radius="md" mb="md">
        <Accordion.Item value="search-filters">
          <Accordion.Control icon={<FaSearch size={16} />}>
            Search Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 3, md: 4 }} mt="sm" spacing="md">
              <TextInput
                label="BO Number (ID)"
                placeholder="e.g. 123"
                value={getInputFilterValue("id") as string}
                onChange={(e) => setInputFilterValue("id", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Job Number"
                placeholder="e.g. 24001"
                value={getInputFilterValue("job_number") as string}
                onChange={(e) =>
                  setInputFilterValue("job_number", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Client"
                placeholder="Client Name"
                value={getInputFilterValue("shipping_client_name") as string}
                onChange={(e) =>
                  setInputFilterValue("shipping_client_name", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Comments"
                placeholder="Search comments..."
                value={getInputFilterValue("comments") as string}
                onChange={(e) =>
                  setInputFilterValue("comments", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <DatePickerInput
                type="range"
                allowSingleDateInRange
                label="Date Entered"
                placeholder="Filter by Date Range"
                clearable
                value={
                  (inputFilters.find((f) => f.id === "date_entered")?.value as [
                    Date | null,
                    Date | null
                  ]) || [null, null]
                }
                onChange={(value) => {
                  setInputFilterValue("date_entered", value as any);
                }}
                valueFormat="YYYY-MM-DD"
              />
              <DatePickerInput
                type="range"
                allowSingleDateInRange
                label="Due Date"
                placeholder="Filter by Date Range"
                clearable
                value={
                  (inputFilters.find((f) => f.id === "due_date")?.value as [
                    Date | null,
                    Date | null
                  ]) || [null, null]
                }
                onChange={(value) => {
                  setInputFilterValue("due_date", value as any);
                }}
                valueFormat="YYYY-MM-DD"
              />
              <Select
                label="Status"
                placeholder="Status"
                data={[
                  { label: "All", value: "all" },
                  { label: "Pending", value: "false" },
                  { label: "Complete", value: "true" },
                ]}
                value={(getInputFilterValue("complete") as string) || "all"}
                onChange={(val) => {
                  setInputFilterValue("complete", val || "all");
                }}
                allowDeselect={false}
              />
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

      <ScrollArea style={{ flex: 1 }} type="hover">
        <Table striped highlightOnHover stickyHeader>
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Th
                    key={header.id}
                    style={{ width: header.getSize(), cursor: "pointer" }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <Group gap="xs">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {{
                        asc: <FaSortUp />,
                        desc: <FaSortDown />,
                      }[header.column.getIsSorted() as string] ?? (
                        <FaSort opacity={0.2} />
                      )}
                    </Group>
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Center h={200}>
                    <Loader />
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : tableData.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Center h={100}>
                    <Text c="dimmed">No backorders found.</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Table.Tr
                  key={row.id}
                  onClick={() => handleRowClick(row.original)}
                  style={{ cursor: "pointer" }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <Table.Td key={cell.id}>
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

      <Group justify="center" pt="md">
        <Pagination
          total={table.getPageCount()}
          value={table.getState().pagination.pageIndex + 1}
          onChange={(p) => table.setPageIndex(p - 1)}
        />
      </Group>

      {selectedBO && (
        <EditBOModal
          opened={editModalOpened}
          onClose={() => {
            closeEditModal();
            setSelectedBO(null);
          }}
          backorder={selectedBO}
          readOnly={!(permissions.canEditInstallation || permissions.isPlant)}
        />
      )}

      <BackorderPdfPreviewModal
        opened={printItemModalOpened}
        onClose={handleClosePrintItem}
        data={printData}
      />

      <BackordersListPdfModal
        opened={printListModalOpened}
        onClose={closePrintListModal}
        data={printListData?.data || []}
        dateRange={printDateRange}
      />
    </Box>
  );
}
