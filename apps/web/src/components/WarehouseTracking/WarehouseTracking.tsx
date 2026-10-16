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
  Switch,
  Badge,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaWarehouse,
  FaEdit,
  FaCheckCircle,
} from "react-icons/fa";
import { IoMdCube } from "react-icons/io";
import dayjs from "dayjs";
import { useWarehouseTrackingTable } from "@/hooks/useWarehouseTrackingTable";
import { gradients, linearGradients } from "@/theme";
import { Database } from "@/types/supabase";
import WarehouseTrackingModal from "@/components/Shared/WarehouseTrackingModal/WarehouseTrackingModal";

type WarehouseTrackingRow =
  Database["public"]["Views"]["warehouse_tracking_view"]["Row"];

import { useQueryClient } from "@tanstack/react-query";
import { exportToExcel } from "@/utils/exportToExcel";
import { useWarehouseExport } from "@/hooks/useWarehouseTrackingTable";
import dynamic from "next/dynamic";
import { FaFileExcel, FaPrint } from "react-icons/fa";
import { WarehouseTrackingPdf } from "@/documents/WarehouseTrackingPdf";
import { Modal } from "@mantine/core";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <Center h="100%">
        <Loader color="violet" />
      </Center>
    ),
  }
);

export default function WarehouseTrackingTable() {
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([]);

  const [selectedRow, setSelectedRow] = useState<WarehouseTrackingRow | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfData, setPdfData] = useState<WarehouseTrackingRow[] | null>(null);
  const [isPdfOpen, setIsPdfOpen] = useState(false);

  const { fetchAll } = useWarehouseExport();

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const data = await fetchAll(activeFilters, sorting);
      const excelData = data.map((row) => {
        const pallets = row.pallets || 0;
        let costPerPallet = 5;
        const start = dayjs(row.dropoff_date);
        const end = row.pickup_date ? dayjs(row.pickup_date) : dayjs();
        const diff = Math.max(0, end.diff(start, "day"));
        costPerPallet += diff * 1;
        if (row.pickup_date) {
          costPerPallet += 5;
        }
        const totalCost = costPerPallet * pallets;
        const days = row.dropoff_date
          ? Math.max(0, end.diff(dayjs(row.dropoff_date), "day"))
          : 0;

        return {
          "Job #": row.job_number,
          Client: row.shipping_client_name,
          Address: row.shipping_address,
          Boxes: row.box,
          "Dropoff Date": row.dropoff_date
            ? dayjs(row.dropoff_date).format("YYYY-MM-DD")
            : "",
          "Pickup Date": row.pickup_date
            ? dayjs(row.pickup_date).format("YYYY-MM-DD")
            : "",
          Pallets: pallets,
          Days: days,
          Cost: totalCost,
        };
      });
      exportToExcel(excelData, "Warehouse_Tracking_Report");
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handlePrintPdf = async () => {
    setIsExportingPdf(true);
    try {
      const data = await fetchAll(activeFilters, sorting);
      setPdfData(data);
      setIsPdfOpen(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const { data, isLoading } = useWarehouseTrackingTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });

  const tableData = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPalletsInWarehouse = data?.totalPallets || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  const columnHelper = createColumnHelper<WarehouseTrackingRow>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("job_number", {
        id: "job_number",
        header: "Job #",
        size: 100,
        cell: (info) => (
          <Text fw={600} size="sm">
            {info.getValue() || "—"}
          </Text>
        ),
      }),
      columnHelper.accessor("shipping_client_name", {
        id: "shipping_client_name",
        header: "Client",
        size: 200,
        cell: (info) => <Text size="sm">{info.getValue() || "—"}</Text>,
      }),
      columnHelper.accessor("shipping_address", {
        id: "shipping_address",
        header: "Shipping Address",
        size: 200,
        cell: (info) => (
          <Text size="sm" truncate>
            {info.getValue() || "—"}
          </Text>
        ),
      }),
      columnHelper.accessor("box", {
        header: "Boxes",
        size: 80,
        cell: (info) => (
          <Text fw={600} size="sm">
            {info.getValue() || "—"}
          </Text>
        ),
      }),
      columnHelper.accessor("dropoff_date", {
        header: "Dropoff Date",
        size: 150,
        cell: (info) =>
          info.getValue() ? dayjs(info.getValue()).format("YYYY-MM-DD") : "—",
      }),
      columnHelper.accessor("pickup_date", {
        header: "Pickup Date",
        size: 150,
        cell: (info) =>
          info.getValue() ? dayjs(info.getValue()).format("YYYY-MM-DD") : "—",
      }),
      columnHelper.accessor("pallets", {
        header: "Pallets",
        size: 100,
        cell: (info) => <Text size="sm">{info.getValue() || 0}</Text>,
      }),

      columnHelper.display({
        id: "days_at_warehouse",
        header: "Days In Warehouse",
        size: 120,
        cell: (info) => {
          const row = info.row.original;
          if (!row.dropoff_date) return "—";

          const start = dayjs(row.dropoff_date);
          const end = row.pickup_date ? dayjs(row.pickup_date) : dayjs();

          const diff = end.diff(start, "day");
          return Math.max(0, diff);
        },
        enableSorting: true,
      }),
      columnHelper.display({
        id: "cost",
        header: "Cost",
        size: 50,
        cell: (info) => {
          const row = info.row.original;
          if (!row.dropoff_date) return "—";

          const pallets = row.pallets || 0;

          let costPerPallet = 5;

          const start = dayjs(row.dropoff_date);
          const end = row.pickup_date ? dayjs(row.pickup_date) : dayjs();
          const diff = Math.max(0, end.diff(start, "day"));

          costPerPallet += diff * 1;

          if (row.pickup_date) {
            costPerPallet += 5;
          }

          const totalCost = costPerPallet * pallets;

          return `$${totalCost.toFixed(2)}`;
        },
        enableSorting: true,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        size: 80,
        cell: (info) => (
          <Group gap={4} justify="center">
            <ActionIcon
              variant="subtle"
              color="violet"
              onClick={() => {
                setSelectedRow(info.row.original);
                setIsModalOpen(true);
              }}
            >
              <FaEdit size={16} />
            </ActionIcon>
          </Group>
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
    <Box p="md" h="100vh" display="flex" style={{ flexDirection: "column" }}>
      <Group mb="lg" justify="space-between" align="center">
        <Group>
          <ThemeIcon
            size={44}
            radius="md"
            variant="gradient"
            gradient={gradients.primary}
          >
            <FaWarehouse size={24} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={3}>Warehouse Tracking</Title>
            <Text c="dimmed" size="sm">
              Track warehouse inventory and costs
            </Text>
          </Stack>
        </Group>
        <Group>
          <Group gap="xs">
            <Text fw={600} size="sm" c="dimmed">
              Total Pallets in Warehouse:
            </Text>
            <Badge
              size="lg"
              variant="gradient"
              gradient={gradients.primary}
              leftSection={<IoMdCube size={14} />}
            >
              {totalPalletsInWarehouse}
            </Badge>
          </Group>
          <Group gap="xs">
            <Button
              variant="outline"
              color="green"
              size="sm"
              leftSection={<FaFileExcel size={14} />}
              loading={isExportingExcel}
              onClick={handleExportExcel}
            >
              Excel
            </Button>
            <Button
              variant="gradient"
              gradient={gradients.primary}
              size="sm"
              leftSection={<FaPrint size={14} />}
              loading={isExportingPdf}
              onClick={handlePrintPdf}
            >
              PDF
            </Button>
          </Group>
        </Group>
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
                value={(getFilterValue("shipping_client_name") as string) || ""}
                onChange={(e) =>
                  setFilterValue("shipping_client_name", e.target.value)
                }
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
                label="Dropoff Date Range"
                placeholder="Pick dates"
                value={
                  (getFilterValue("dropoff_date_range") as [
                    Date | null,
                    Date | null
                  ]) || [null, null]
                }
                onChange={(val) => setFilterValue("dropoff_date_range", val)}
                clearable
              />
              <DatePickerInput
                type="range"
                allowSingleDateInRange
                label="Pickup Date Range"
                placeholder="Pick dates"
                value={
                  (getFilterValue("pickup_date_range") as [
                    Date | null,
                    Date | null
                  ]) || [null, null]
                }
                onChange={(val) => setFilterValue("pickup_date_range", val)}
                clearable
              />
              <Group align="flex-end" pb={6}>
                <Switch
                  label="Not Picked"
                  size="md"
                  thumbIcon={
                    getFilterValue("not_picked") === "true" ? (
                      <FaCheckCircle size={12} color={gradients.primary.from} />
                    ) : null
                  }
                  styles={{
                    track: {
                      cursor: "pointer",
                      background:
                        getFilterValue("not_picked") === "true"
                          ? linearGradients.primary
                          : undefined,
                      border: "none",
                    },
                    thumb: {
                      borderColor: "transparent",
                    },
                  }}
                  checked={getFilterValue("not_picked") === "true"}
                  onChange={(e) => {
                    const val = e.currentTarget.checked;
                    setFilterValue("not_picked", val ? "true" : undefined);
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                    setActiveFilters((prev) => {
                      const existing = prev.filter(
                        (f) => f.id !== "not_picked"
                      );
                      if (val)
                        return [
                          ...existing,
                          { id: "not_picked", value: "true" },
                        ];
                      return existing;
                    });
                  }}
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
                    <Text c="dimmed">No warehouse tracking records found.</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Table.Tr key={row.id}>
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

      <WarehouseTrackingModal
        opened={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRow(null);
        }}
        jobId={selectedRow?.job_id || 0}
        initialData={selectedRow}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ["warehouse_tracking_view"],
          });
        }}
      />

      <Modal
        opened={isPdfOpen}
        onClose={() => setIsPdfOpen(false)}
        fullScreen
        title="Warehouse Tracking Report"
        styles={{ body: { height: "calc(100vh - 60px)" } }}
      >
        {pdfData && (
          <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
            <WarehouseTrackingPdf data={pdfData} generatedAt={new Date()} />
          </PDFViewer>
        )}
      </Modal>
    </Box>
  );
}
