"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
  PaginationState,
  ColumnFiltersState,
  getPaginationRowModel,
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
  ActionIcon,
  Tooltip,
  Button,
  Paper,
  Stack,
  Title,
  ThemeIcon,
  Modal,
  Textarea,
  Menu,
} from "@mantine/core";
import {
  FaSearch,
  FaCheckCircle,
  FaDollarSign,
  FaPlus,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaFileInvoiceDollar,
  FaPencilAlt,
  FaEllipsisH,
  FaBan,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import { Tables } from "@/types/db";
import { useDisclosure } from "@mantine/hooks";
import AddInvoice from "../AddInvoice/AddInvoice";

// 1. Extended Type Definition including nested Shipping fields
type InvoiceRow = Tables<"invoices"> & {
  job:
    | (Tables<"jobs"> & {
        sales_orders: (Tables<"sales_orders"> & {}) | null;
      })
    | null;
};

export default function InvoicesTable() {
  const { supabase, isAuthenticated } = useSupabase();
  const queryClient = useQueryClient();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });

  // Modal States
  const [addModalOpened, { open: openAddModal, close: closeAddModal }] =
    useDisclosure(false);

  const [
    commentModalOpened,
    { open: openCommentModal, close: closeCommentModal },
  ] = useDisclosure(false);
  const [editingComment, setEditingComment] = useState<{
    id: number;
    text: string;
  } | null>(null);

  // 2. Fetch Invoices
  const { data: invoices, isLoading } = useQuery<InvoiceRow[]>({
    queryKey: ["invoices_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          `
          *,
          job:jobs (
            job_number,
            sales_orders (
              shipping_street,
              shipping_city,
              shipping_province,
              shipping_zip,
              shipping_client_name
            )
          )
        `
        )
        .order("date_entered", { ascending: false })
        .order("invoice_id", { ascending: false });

      if (error) throw error;
      return data as unknown as InvoiceRow[];
    },
    enabled: isAuthenticated,
    placeholderData: (previousData) => previousData,
  });

  // 3. Mutation to Mark as Paid
  const togglePaidMutation = useMutation({
    mutationFn: async ({ id, isPaid }: { id: number; isPaid: boolean }) => {
      const { error } = await supabase
        .from("invoices")
        .update({
          paid_at: isPaid ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("invoice_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices_list"] });
      notifications.show({
        title: "Success",
        message: "Invoice payment status updated.",
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

  // 4. Mutation to Update Comment
  const updateCommentMutation = useMutation({
    mutationFn: async () => {
      if (!editingComment) return;
      const { error } = await supabase
        .from("invoices")
        .update({ comments: editingComment.text })
        .eq("invoice_id", editingComment.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices_list"] });
      notifications.show({
        title: "Success",
        message: "Comment updated successfully.",
        color: "green",
      });
      closeCommentModal();
    },
    onError: (err: any) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  // 5. Mutation to Toggle No Charge
  const toggleNoChargeMutation = useMutation({
    mutationFn: async ({ id, noCharge }: { id: number; noCharge: boolean }) => {
      const { error } = await supabase
        .from("invoices")
        .update({ no_charge: noCharge })
        .eq("invoice_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices_list"] });
      notifications.show({
        title: "Updated",
        message: "Invoice charge status updated.",
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

  const columnHelper = createColumnHelper<InvoiceRow>();

  const columns = [
    // --- Invoice Number ---
    columnHelper.accessor("invoice_number", {
      header: "Invoice #",
      size: 110,
      cell: (info) => <Text fw={700}>{info.getValue() || "—"}</Text>,
    }),

    // --- Job Number ---
    columnHelper.accessor("job.job_number", {
      id: "job_number",
      header: "Job #",
      size: 110,
      cell: (info) => <Text c="dimmed">{info.getValue() || "—"}</Text>,
    }),

    // --- Client Name ---
    columnHelper.accessor("job.sales_orders.shipping_client_name", {
      id: "client",
      header: "Client",
      size: 130,
      cell: (info) => (
        <Text size="sm" fw={500}>
          {info.getValue() || "—"}
        </Text>
      ),
    }),

    // --- Date Entered ---
    columnHelper.accessor("date_entered", {
      header: "Entered",
      size: 110,
      cell: (info) =>
        info.getValue() ? dayjs(info.getValue()).format("YYYY-MM-DD") : "—",
    }),

    // --- Date Due ---
    columnHelper.accessor("date_due", {
      header: "Due",
      size: 110,
      cell: (info) => {
        const date = info.getValue();
        if (!date) return "—";
        const isOverdue =
          dayjs(date).isBefore(dayjs()) && !info.row.original.paid_at;
        return (
          <Text c={isOverdue ? "red" : "dimmed"} fw={isOverdue ? 700 : 400}>
            {dayjs(date).format("YYYY-MM-DD")}
          </Text>
        );
      },
    }),

    // --- Shipping Address ---
    columnHelper.accessor(
      (row) => {
        const so = row.job?.sales_orders;
        if (!so) return "";
        return [
          so.shipping_street,
          so.shipping_city,
          so.shipping_province,
          so.shipping_zip,
        ]
          .filter(Boolean)
          .join(", ");
      },
      {
        id: "shipping",
        header: "Shipping Address",
        size: 250,
        cell: (info) => (
          <Tooltip label={info.getValue()} openDelay={500}>
            <Text size="sm" lineClamp={1} c="dimmed">
              {info.getValue() || "—"}
            </Text>
          </Tooltip>
        ),
      }
    ),

    // --- Paid in Full (Status Badge) ---
    columnHelper.accessor("paid_at", {
      id: "status",
      header: "Paid Status",
      size: 130,
      cell: (info) => {
        const paidAt = info.getValue();
        const noCharge = info.row.original.no_charge;

        if (noCharge)
          return (
            <Badge color="gray" variant="light">
              No Charge
            </Badge>
          );
        if (paidAt)
          return (
            <Badge
              variant="gradient"
              gradient={{ from: "teal", to: "lime", deg: 90 }}
              leftSection={<FaCheckCircle size={10} />}
            >
              PAID
            </Badge>
          );
        return (
          <Badge color="red" variant="light">
            Pending
          </Badge>
        );
      },
    }),

    // --- Date Paid ---
    columnHelper.accessor("paid_at", {
      id: "date_paid",
      header: "Date Paid",
      size: 110,
      cell: (info) =>
        info.getValue() ? (
          <Text size="sm" c="green.8" fw={500}>
            {dayjs(info.getValue()).format("YYYY-MM-DD")}
          </Text>
        ) : (
          <Text size="sm" c="dimmed">
            —
          </Text>
        ),
    }),

    // --- Comments (Editable) ---
    columnHelper.accessor("comments", {
      header: "Comments",
      size: 200,
      cell: (info) => (
        <Box
          onClick={() => {
            setEditingComment({
              id: info.row.original.invoice_id,
              text: info.getValue() || "",
            });
            openCommentModal();
          }}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minHeight: "24px",
          }}
        >
          <Text size="sm" c="dimmed" lineClamp={1} style={{ flex: 1 }}>
            {info.getValue() || ""}
          </Text>
          <FaPencilAlt size={12} color="gray" style={{ opacity: 0.5 }} />
        </Box>
      ),
    }),

    // --- Actions (Menu) ---
    columnHelper.display({
      id: "actions",
      header: "Actions",
      size: 80,
      cell: (info) => {
        const isPaid = !!info.row.original.paid_at;
        const isNoCharge = info.row.original.no_charge;

        return (
          <Menu withinPortal position="bottom-end" shadow="sm">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <FaEllipsisH />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item
                leftSection={<FaDollarSign size={14} />}
                onClick={() =>
                  togglePaidMutation.mutate({
                    id: info.row.original.invoice_id,
                    isPaid: !isPaid,
                  })
                }
                disabled={isNoCharge ? true : false}
                color={isPaid ? "red" : "green"}
              >
                {isPaid ? "Mark Unpaid" : "Mark Paid"}
              </Menu.Item>

              <Menu.Divider />

              <Menu.Item
                leftSection={
                  isNoCharge ? (
                    <FaFileInvoiceDollar size={14} />
                  ) : (
                    <FaBan size={14} />
                  )
                }
                onClick={() =>
                  toggleNoChargeMutation.mutate({
                    id: info.row.original.invoice_id,
                    noCharge: !isNoCharge,
                  })
                }
                color={isNoCharge ? "blue" : "gray"}
              >
                {isNoCharge ? "Revert to Chargeable" : "Mark as No Charge"}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: invoices || [],
    columns,
    state: { columnFilters, pagination },
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isLoading)
    return (
      <Center h="50vh">
        <Loader />
      </Center>
    );

  return (
    <Box
      p={20}
      h="calc(100vh - 60px)"
      display="flex"
      style={{ flexDirection: "column" }}
    >
      {/* --- Header Section --- */}
      <Paper
        p="xl"
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
              size={50}
              radius="md"
              variant="gradient"
              gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
            >
              <FaFileInvoiceDollar size={26} />
            </ThemeIcon>
            <Stack gap={0}>
              <Title order={2} style={{ color: "#343a40" }}>
                Invoices
              </Title>
              <Text size="sm" c="dimmed">
                Track payments and billing status.
              </Text>
            </Stack>
          </Group>

          <Group>
            <TextInput
              placeholder="Search Job #..."
              leftSection={<FaSearch size={14} />}
              onChange={(e) => {
                table.getColumn("job_number")?.setFilterValue(e.target.value);
              }}
              style={{ minWidth: 250 }}
            />
            <Button
              leftSection={<FaPlus size={14} />}
              onClick={openAddModal}
              variant="gradient"
              gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
            >
              Add Invoice
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* --- Table Section --- */}
      <ScrollArea style={{ flex: 1 }}>
        <Table striped highlightOnHover withColumnBorders layout="fixed">
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Th
                    key={header.id}
                    style={{
                      width: header.getSize(),
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <Group gap={4} wrap="nowrap">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "asc" ? (
                        <FaSortUp />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <FaSortDown />
                      ) : (
                        <FaSort style={{ opacity: 0.2 }} />
                      )}
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
                    <Text c="dimmed">No invoices found.</Text>
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

      <Center pt="md">
        <Pagination
          total={table.getPageCount()}
          value={pagination.pageIndex + 1}
          onChange={(p) => table.setPageIndex(p - 1)}
          color="#4A00E0"
        />
      </Center>

      <AddInvoice opened={addModalOpened} onClose={closeAddModal} />

      {/* --- Edit Comment Modal --- */}
      <Modal
        opened={commentModalOpened}
        onClose={closeCommentModal}
        title="Edit Invoice Comment"
        centered
      >
        <Stack>
          <Textarea
            label="Comment"
            minRows={4}
            value={editingComment?.text || ""}
            onChange={(e) => {
              const val = e.currentTarget.value;
              setEditingComment((prev) =>
                prev ? { ...prev, text: val } : null
              );
            }}
            data-autofocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCommentModal}>
              Cancel
            </Button>
            <Button
              onClick={() => updateCommentMutation.mutate()}
              loading={updateCommentMutation.isPending}
              color="purple"
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
