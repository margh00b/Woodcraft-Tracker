"use client";

import { useState, useMemo } from "react";
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
  Title,
  Stack,
  ThemeIcon,
  Button,
  Accordion,
  SimpleGrid,
  ActionIcon,
  rem,
} from "@mantine/core";
import {
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaPlus,
  FaPen,
} from "react-icons/fa";
import { GrSchedules } from "react-icons/gr";
import dayjs from "dayjs";
import { useDisclosure } from "@mantine/hooks";
import { DatePickerInput } from "@mantine/dates";
import { usePermissions } from "@/hooks/usePermissions";
import { useSiteVisitsTable } from "@/hooks/useSiteVisitsTable";
import SiteVisitModal from "./SiteVisitModal/SiteVisitModal";
import { linearGradients, colors, gradients } from "@/theme";

export default function SiteVisits() {
  const permissions = usePermissions();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([]);

  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);

  const { data, isLoading } = useSiteVisitsTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });

  const tableData = data?.data || [];
  const totalCount = data?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  const columnHelper = createColumnHelper<any>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("jobs.job_number", {
        id: "job_number",
        header: "Job #",
        size: 100,
        cell: (info) => (
          <Text fw={600} size="sm">
            {info.getValue() || "—"}
          </Text>
        ),
      }),
      columnHelper.accessor("jobs.sales_orders.shipping_client_name", {
        id: "client_name",
        header: "Client",
        size: 200,
        cell: (info) => <Text size="sm">{info.getValue() || "—"}</Text>,
      }),
      columnHelper.accessor(
        (row) =>
          [
            row.jobs?.sales_orders?.shipping_street,
            row.jobs?.sales_orders?.shipping_city,
            row.jobs?.sales_orders?.shipping_province,
            row.jobs?.sales_orders?.shipping_zip,
          ]
            .filter(Boolean)
            .join(", ") || "—",
        {
          id: "shipping_address",
          header: "Site Address",
          size: 200,
          cell: (info) => (
            <Text size="sm" truncate>
              {info.getValue()}
            </Text>
          ),
        }
      ),
      columnHelper.accessor("visit_date", {
        header: "Visit Date",
        size: 100,
        cell: (info) =>
          info.getValue() ? dayjs(info.getValue()).format("YYYY-MM-DD") : "—",
      }),
      columnHelper.accessor("created_by", {
        header: "Visisted By",
        size: 100,
        cell: (info) => <Text size="sm">{info.getValue() || "—"}</Text>,
      }),
      columnHelper.accessor("notes", {
        header: "Notes",
        size: 300,
        cell: (info) => (
          <Text size="sm" lineClamp={1} title={info.getValue()}>
            {info.getValue() || "—"}
          </Text>
        ),
      }),
      columnHelper.display({
        id: "actions",
        size: 60,
        cell: (info) => (
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(info.row.original);
            }}
          >
            <FaPen size={14} />
          </ActionIcon>
        ),
      }),
    ],
    []
  );

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

  const handleEdit = (visit: any) => {
    setSelectedVisit(visit);
    openModal();
  };

  const handleCreate = () => {
    setSelectedVisit(null);
    openModal();
  };

  const setFilterValue = (id: string, value: any) => {
    setColumnFilters((prev) => {
      const existing = prev.filter((f) => f.id !== id);
      if (value === undefined || value === null || value === "")
        return existing;
      return [...existing, { id, value }];
    });
  };

  const getFilterValue = (id: string) =>
    columnFilters.find((f) => f.id === id)?.value;

  const handleApplyFilters = () => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setActiveFilters(columnFilters);
  };

  const handleClearFilters = () => {
    setColumnFilters([]);
    setActiveFilters([]);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

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
            gradient={gradients.primary}
          >
            <GrSchedules size={24} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={3}>Site Visits</Title>
            <Text c="dimmed" size="sm">
              Log and track site visits
            </Text>
          </Stack>
        </Group>
        <Button
          leftSection={<FaPlus size={14} />}
          onClick={handleCreate}
          style={{
            background: linearGradients.primary,
            border: "none",
          }}
        >
          Log Site Visit
        </Button>
      </Group>

      <Accordion variant="contained" radius="md" mb="md">
        <Accordion.Item value="search-filters">
          <Accordion.Control icon={<FaSearch size={16} />}>
            Search Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mt="sm" spacing="md">
              <TextInput
                label="Job Number"
                placeholder="e.g. 24001"
                value={(getFilterValue("job_number") as string) || ""}
                onChange={(e) => setFilterValue("job_number", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Client Name"
                placeholder="Search Client..."
                value={(getFilterValue("client_name") as string) || ""}
                onChange={(e) => setFilterValue("client_name", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Site Address"
                placeholder="Search Address..."
                value={(getFilterValue("shipping_address") as string) || ""}
                onChange={(e) =>
                  setFilterValue("shipping_address", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <DatePickerInput
                type="range"
                allowSingleDateInRange
                label="Visit Date"
                placeholder="Filter by Date Range"
                clearable
                value={
                  (getFilterValue("visit_date") as [
                    Date | null,
                    Date | null
                  ]) || [null, null]
                }
                onChange={(value) => setFilterValue("visit_date", value)}
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
                color="blue"
                leftSection={<FaSearch size={14} />}
                onClick={handleApplyFilters}
                style={{ background: linearGradients.primary }}
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
                    style={{
                      width: header.getSize(),
                      cursor: header.column.getCanSort()
                        ? "pointer"
                        : "default",
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <Group gap="xs">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
                        <>
                          {{
                            asc: <FaSortUp size={12} />,
                            desc: <FaSortDown size={12} />,
                          }[header.column.getIsSorted() as string] ?? (
                            <FaSort opacity={0.2} size={12} />
                          )}
                        </>
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
                    <Text c="dimmed">No site visits found.</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Table.Tr
                  key={row.id}
                  onClick={() => handleEdit(row.original)}
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
          color="violet"
        />
      </Group>

      <SiteVisitModal
        opened={modalOpened}
        onClose={closeModal}
        visit={selectedVisit}
      />
    </Box>
  );
}
