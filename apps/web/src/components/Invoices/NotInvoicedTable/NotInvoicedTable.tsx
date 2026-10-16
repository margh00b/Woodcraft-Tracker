"use client";

import { useState, useMemo, useEffect } from "react";
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
  Menu,
  ActionIcon,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  FaSort,
  FaSortUp,
  FaSortDown,
  FaFileInvoiceDollar,
  FaPlus,
  FaExclamationTriangle,
  FaEllipsisH,
  FaBan,
} from "react-icons/fa";
import dayjs from "dayjs";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useSupabase } from "@/hooks/useSupabase";
import { colors, gradients } from "@/theme";
import AddInvoice from "@/components/Invoices/AddInvoice/AddInvoice";
import {
  useShippedNotInvoiced,
  ShippedNotInvoicedItem,
} from "@/hooks/useShippedNotInvoiced";
import { usePermissions } from "@/hooks/usePermissions";

export default function NotInvoicedTable() {
  const permissions = usePermissions();
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    dayjs().subtract(1, "year").startOf("year").toDate(),
    dayjs().endOf("year").toDate(),
  ]);

  const [queryRange, setQueryRange] =
    useState<[Date | null, Date | null]>(dateRange);

  useEffect(() => {
    const [start, end] = dateRange;
    if ((start && end) || (!start && !end)) {
      setQueryRange(dateRange);
    }
  }, [dateRange]);

  const { data: reportData, isLoading } = useShippedNotInvoiced(queryRange);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 16,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const [
    addInvoiceModalOpened,
    { open: openAddInvoiceModal, close: closeAddInvoiceModal },
  ] = useDisclosure(false);

  const [selectedJobId, setSelectedJobId] = useState<number | undefined>(
    undefined
  );
  const [isCreditMemoMode, setIsCreditMemoMode] = useState(false);

  const handleCreateInvoice = (jobId: number, isCredit: boolean = false) => {
    setSelectedJobId(jobId);
    setIsCreditMemoMode(isCredit);
    openAddInvoiceModal();
  };

  const markNoChargeMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const { error } = await supabase.from("invoices").insert({
        job_id: jobId,
        no_charge: true,
        date_entered: new Date().toISOString(),
        invoice_number: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["shipped_not_invoiced_view"],
      });
      queryClient.invalidateQueries({ queryKey: ["invoices_list_server"] });
      notifications.show({
        title: "Success",
        message: "Marked as No Charge",
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

  const columnHelper = createColumnHelper<ShippedNotInvoicedItem>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("job_number", {
        header: "Job #",
        size: 110,
        cell: (info) => <Text fw={700}>{info.getValue() || "—"}</Text>,
      }),
      columnHelper.accessor("ship_date", {
        header: "Ship Date",
        size: 130,
        cell: (info) =>
          info.getValue() ? dayjs(info.getValue()).format("MMM D, YYYY") : "—",
      }),
      columnHelper.accessor("shipping_client_name", {
        header: "Client",
        size: 200,
        cell: (info) => (
          <Text size="sm" fw={500}>
            {info.getValue() || "—"}
          </Text>
        ),
      }),
      columnHelper.accessor("shipping_address", {
        header: "Shipping Address",
        size: 300,
        cell: (info) => (
          <Tooltip label={info.getValue()} openDelay={500}>
            <Text size="sm" lineClamp={1} c="dimmed">
              {info.getValue() || "Pick Up / No Address"}
            </Text>
          </Tooltip>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        size: 100,
        cell: (info) =>
          permissions.canEditInvoices ? (
            <Menu withinPortal position="bottom-end" shadow="sm">
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray">
                  <FaEllipsisH />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Actions</Menu.Label>
                <Menu.Item
                  leftSection={<FaPlus size={14} />}
                  onClick={() =>
                    handleCreateInvoice(info.row.original.id, false)
                  }
                >
                  Create Invoice
                </Menu.Item>
                <Menu.Item
                  leftSection={<FaPlus size={14} />}
                  onClick={() =>
                    handleCreateInvoice(info.row.original.id, true)
                  }
                >
                  Create Credit Memo
                </Menu.Item>
                <Menu.Item
                  leftSection={<FaBan size={14} />}
                  color="gray"
                  onClick={() => {
                    if (
                      confirm(
                        "Are you sure you want to mark this job as No Charge?"
                      )
                    ) {
                      markNoChargeMutation.mutate(info.row.original.id);
                    }
                  }}
                >
                  Mark as No Charge
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : null,
      }),
    ],
    [permissions.canEditInvoices, markNoChargeMutation.mutate]
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
                from: colors.red.primary,
                to: colors.red.secondary,
                deg: 135,
              }}
            >
              <FaExclamationTriangle size={20} />
            </ThemeIcon>
            <Stack gap={0}>
              <Title order={3} style={{ color: colors.gray.title }}>
                Shipped Not Invoiced
              </Title>
              <Text size="xs" c="dimmed">
                Jobs shipped but not yet invoiced.
              </Text>
            </Stack>
          </Group>
          <Group>
            <DatePickerInput
              allowSingleDateInRange
              type="range"
              label="Filter by Ship Date"
              placeholder="Select date range"
              value={dateRange}
              onChange={(value) =>
                setDateRange(value as [Date | null, Date | null])
              }
              clearable={false}
              presets={[
                {
                  label: "This Year",
                  value: [
                    dayjs().startOf("year").format("YYYY-MM-DD"),
                    dayjs().endOf("year").format("YYYY-MM-DD"),
                  ] as [string, string],
                },
                {
                  label: "Previous Year",
                  value: [
                    dayjs()
                      .subtract(1, "year")
                      .startOf("year")
                      .format("YYYY-MM-DD"),
                    dayjs()
                      .subtract(1, "year")
                      .endOf("year")
                      .format("YYYY-MM-DD"),
                  ] as [string, string],
                },
                ...[2024, 2023, 2022, 2021].map((year) => ({
                  label: String(year),
                  value: [
                    dayjs().year(year).startOf("year").format("YYYY-MM-DD"),
                    dayjs().year(year).endOf("year").format("YYYY-MM-DD"),
                  ] as [string, string],
                })),
              ]}
            />
          </Group>
        </Group>
      </Paper>

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
                        header.getContext()
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
                    <Text c="dimmed">No records found.</Text>
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

      <Center>
        <Pagination
          total={table.getPageCount()}
          value={pagination.pageIndex + 1}
          onChange={(p) => table.setPageIndex(p - 1)}
          color={colors.violet.primary}
        />
      </Center>

      {addInvoiceModalOpened && (
        <AddInvoice
          opened={addInvoiceModalOpened}
          onClose={() => {
            closeAddInvoiceModal();
            setSelectedJobId(undefined);
            setIsCreditMemoMode(false);
          }}
          initialJobId={selectedJobId}
          isCreditMemo={isCreditMemoMode}
        />
      )}
    </Box>
  );
}
