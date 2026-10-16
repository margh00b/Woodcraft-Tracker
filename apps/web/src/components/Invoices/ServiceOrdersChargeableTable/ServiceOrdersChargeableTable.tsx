"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  flexRender,
  PaginationState,
  SortingState,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import {
  Table,
  Group,
  Loader,
  Pagination,
  ScrollArea,
  Center,
  Text,
  Box,
  Button,
  Paper,
  Stack,
  Title,
  ThemeIcon,
  Tooltip,
  Badge,
  SegmentedControl,
} from "@mantine/core";
import {
  FaSort,
  FaSortUp,
  FaSortDown,
  FaWrench,
  FaPlus,
  FaFilePdf,
  FaTable,
} from "react-icons/fa";
import dayjs from "dayjs";
import { useDisclosure } from "@mantine/hooks";
import { colors, gradients } from "@/theme";
import AddInvoice from "@/components/Invoices/AddInvoice/AddInvoice";
import {
  useServiceOrdersChargeable,
  ServiceOrderChargeableItem,
} from "@/hooks/useServiceOrdersChargeable";
import { usePermissions } from "@/hooks/usePermissions";
import { ServiceOrdersPdf } from "@/documents/invoiceServiceOrderPdf";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <Center h="300px">
        <Loader color="blue" size="md" />
      </Center>
    ),
  },
);

export default function ServiceOrdersChargeableTable() {
  const permissions = usePermissions();
  const { data: reportData, isLoading } = useServiceOrdersChargeable();

  const [viewMode, setViewMode] = useState<string>("table");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const [
    addInvoiceModalOpened,
    { open: openAddInvoiceModal, close: closeAddInvoiceModal },
  ] = useDisclosure(false);

  const [selectedJobId, setSelectedJobId] = useState<number | undefined>(
    undefined,
  );
  const [selectedServiceOrderId, setSelectedServiceOrderId] = useState<
    number | undefined
  >(undefined);
  const [selectedServiceOrderNumber, setSelectedServiceOrderNumber] = useState<
    string | undefined
  >(undefined);

  const handleCreateInvoice = (
    jobId: number,
    serviceOrderId: number,
    serviceOrderNumber: string,
  ) => {
    setSelectedJobId(jobId);
    setSelectedServiceOrderId(serviceOrderId);
    setSelectedServiceOrderNumber(serviceOrderNumber);
    openAddInvoiceModal();
  };

  const columnHelper = createColumnHelper<ServiceOrderChargeableItem>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("service_order_number", {
        header: "Service Order #",
        size: 150,
        cell: (info) => <Text fw={700}>{info.getValue() || "—"}</Text>,
      }),
      columnHelper.accessor("job_number", {
        header: "Job #",
        size: 110,
        cell: (info) => <Text c="dimmed">{info.getValue() || "—"}</Text>,
      }),
      columnHelper.accessor("client_name", {
        header: "Client",
        size: 200,
        cell: (info) => (
          <Text size="sm" fw={500}>
            {info.getValue() || "—"}
          </Text>
        ),
      }),
      columnHelper.accessor("shipping_address", {
        header: "Address",
        size: 300,
        cell: (info) => (
          <Tooltip label={info.getValue()} openDelay={500}>
            <Text size="sm" lineClamp={1} c="dimmed">
              {info.getValue() || "—"}
            </Text>
          </Tooltip>
        ),
      }),
      columnHelper.accessor("due_date", {
        header: "Due Date",
        size: 130,
        cell: (info) =>
          info.getValue() ? dayjs(info.getValue()).format("MMM D, YYYY") : "—",
      }),
      columnHelper.accessor("completed_at", {
        header: "Status",
        size: 130,
        cell: (info) => {
          const completed = !!info.getValue();
          return (
            <Badge
              variant="gradient"
              gradient={completed ? gradients.success : gradients.service}
            >
              {completed ? "Completed" : "Open"}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        size: 150,
        cell: (info) =>
          permissions.canEditInvoices ? (
            <Button
              leftSection={<FaPlus size={12} />}
              size="xs"
              variant="gradient"
              gradient={gradients.primary}
              onClick={() =>
                handleCreateInvoice(
                  info.row.original.job_id,
                  info.row.original.service_order_id,
                  info.row.original.service_order_number,
                )
              }
            >
              Create Invoice
            </Button>
          ) : null,
      }),
    ],
    [permissions.canEditInvoices],
  );

  const table = useReactTable({
    data: reportData || [],
    columns,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (isLoading)
    return (
      <Center h="50vh">
        <Loader />
      </Center>
    );

  return (
    <Box p={20} h="100vh" display="flex" style={{ flexDirection: "column" }}>
      <Paper
        p="lg"
        radius="lg"
        mb="md"
        style={{
          background: "linear-gradient(135deg, #fff 0%, #f8f9fa 100%)",
          border: "1px solid #e9ecef",
        }}
        shadow="sm"
      >
        <Group justify="space-between" align="center">
          <Group>
            <ThemeIcon
              size={40}
              radius="md"
              variant="gradient"
              gradient={{
                from: colors.blue.secondary,
                to: colors.blue.primary,
                deg: 135,
              }}
            >
              <FaWrench size={20} />
            </ThemeIcon>
            <Stack gap={0}>
              <Title order={3} style={{ color: colors.gray.title }}>
                Chargeable Service Orders
              </Title>
              <Text size="xs" c="dimmed">
                Service orders marked as chargeable but not yet invoiced.
              </Text>
            </Stack>
          </Group>

          <SegmentedControl
            value={viewMode}
            onChange={setViewMode}
            data={[
              {
                value: "table",
                label: (
                  <Group gap="xs" wrap="nowrap">
                    <FaTable size={14} />
                    <Text size="sm">Live Table</Text>
                  </Group>
                ),
              },
              {
                value: "pdf",
                label: (
                  <Group gap="xs" wrap="nowrap">
                    <FaFilePdf size={14} color="#e03131" />
                    <Text size="sm">Print / PDF Preview</Text>
                  </Group>
                ),
              },
            ]}
          />
        </Group>
      </Paper>

      {viewMode === "pdf" ? (
        <Paper
          shadow="md"
          radius="md"
          style={{
            flex: 1,
            overflow: "hidden",
            border: "1px solid #dee2e6",
          }}
        >
          {reportData && reportData.length > 0 ? (
            <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
              <ServiceOrdersPdf data={reportData} />
            </PDFViewer>
          ) : (
            <Center h="100%">
              <Text c="dimmed" fs="italic">
                No dataset metrics generated to display in PDF layout.
              </Text>
            </Center>
          )}
        </Paper>
      ) : (
        <>
          <ScrollArea style={{ flex: 1 }}>
            <Table striped stickyHeader highlightOnHover withColumnBorders>
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
                        <Group gap={4} wrap="nowrap">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {{
                            asc: <FaSortUp />,
                            desc: <FaSortDown />,
                          }[header.column.getIsSorted() as string] ??
                            (header.column.getCanSort() ? (
                              <FaSort style={{ opacity: 0.2 }} />
                            ) : null)}
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
                        <Text c="dimmed">
                          No chargeable service orders found.
                        </Text>
                      </Center>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <Table.Tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <Table.Td
                          key={cell.id}
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
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

          <Center pt="md">
            <Pagination
              total={table.getPageCount()}
              value={pagination.pageIndex + 1}
              onChange={(p) => table.setPageIndex(p - 1)}
              color={colors.violet.primary}
            />
          </Center>
        </>
      )}

      {addInvoiceModalOpened && (
        <AddInvoice
          opened={addInvoiceModalOpened}
          onClose={() => {
            closeAddInvoiceModal();
            setSelectedJobId(undefined);
            setSelectedServiceOrderId(undefined);
            setSelectedServiceOrderNumber(undefined);
          }}
          initialJobId={selectedJobId}
          serviceOrderId={selectedServiceOrderId}
          serviceOrderNumber={selectedServiceOrderNumber}
        />
      )}
    </Box>
  );
}
