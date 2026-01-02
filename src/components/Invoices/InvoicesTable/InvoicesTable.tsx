"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Accordion,
  SimpleGrid,
  Select,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  FaSearch,
  FaCheckCircle,
  FaPlus,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaFileInvoiceDollar,
  FaPencilAlt,
  FaEllipsisH,
  FaBan,
  FaCheckSquare,
  FaTrash,
  FaEdit,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import { Tables } from "@/types/db";
import { useDisclosure } from "@mantine/hooks";
import AddInvoice from "../AddInvoice/AddInvoice";
import EditInvoice from "../EditInvoice/EditInvoice";
import { usePermissions } from "@/hooks/usePermissions";
import { useInvoicesTable } from "@/hooks/useInvoicesTable";
import { colors, gradients } from "@/theme";

type InvoiceRow = Tables<"invoices"> & {
  job:
    | (Tables<"jobs"> & {
        sales_orders: (Tables<"sales_orders"> & {}) | null;
      })
    | null;
};

export default function InvoicesTable() {
  const permissions = usePermissions();
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const [inputFilters, setInputFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([]);

  const [
    addInvoiceModalOpened,
    { open: openAddInvoiceModal, close: closeAddInvoiceModal },
  ] = useDisclosure(false);
  const [
    editInvoiceModalOpened,
    { open: openEditInvoiceModal, close: closeEditInvoiceModal },
  ] = useDisclosure(false);
  const [
    addCreditModalOpened,
    { open: openAddCreditModal, close: closeAddCreditModal },
  ] = useDisclosure(false);
  const [
    editCreditModalOpened,
    { open: openEditCreditModal, close: closeEditCreditModal },
  ] = useDisclosure(false);

  const [
    commentModalOpened,
    { open: openCommentModal, close: closeCommentModal },
  ] = useDisclosure(false);

  const [editingComment, setEditingComment] = useState<{
    id: number;
    text: string;
  } | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(
    null
  );

  const { data, isLoading } = useInvoicesTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });

  const invoices = data?.data || [];
  const totalCount = data?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  const setInputFilterValue = (id: string, value: any) => {
    setInputFilters((prev) => {
      const existing = prev.filter((f) => f.id !== id);
      if (value === undefined || value === null || value === "")
        return existing;
      return [...existing, { id, value }];
    });
  };

  const getInputFilterValue = (id: string) => {
    return inputFilters.find((f) => f.id === id)?.value ?? "";
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
      queryClient.invalidateQueries({ queryKey: ["invoices_list_server"] });
      notifications.show({
        title: "Success",
        message: "Posted status updated.",
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
      queryClient.invalidateQueries({ queryKey: ["invoices_list_server"] });
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

  const toggleNoChargeMutation = useMutation({
    mutationFn: async ({ id, noCharge }: { id: number; noCharge: boolean }) => {
      const { error } = await supabase
        .from("invoices")
        .update({ no_charge: noCharge })
        .eq("invoice_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices_list_server"] });
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

  const deleteInvoiceMutation = useMutation({
    mutationFn: async ({
      id,
      isCreditMemo,
    }: {
      id: number;
      isCreditMemo: boolean;
    }) => {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("invoice_id", id);
      if (error) throw error;
    },
    onSuccess: (_, isCreditMemo) => {
      queryClient.invalidateQueries({ queryKey: ["invoices_list_server"] });
      notifications.show({
        title: "Deleted",
        message: !isCreditMemo
          ? "Invoice deleted permanently"
          : "Credit Memo deleted permanently",
        color: "red",
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
    columnHelper.accessor("is_creditmemo", {
      header: "Type",
      size: 110,
      cell: (info) => (
        <Badge
          variant="gradient"
          gradient={
            info.getValue()
              ? { from: "#002e41ff", to: "#007c53ff", deg: 270 }
              : { from: "#2600ffff", to: "#ae00ffff", deg: 270 }
          }
        >
          {info.getValue() ? "Credit" : "Invoice"}
        </Badge>
      ),
    }),
    columnHelper.accessor("invoice_number", {
      header: "Invoice/Credit No.",
      size: 150,
      cell: (info) => <Text fw={700}>{info.getValue() || "—"}</Text>,
    }),
    columnHelper.accessor("job.job_number", {
      id: "job_number",
      header: "Job #",
      size: 110,
      cell: (info) => <Text c="dimmed">{info.getValue() || "—"}</Text>,
    }),
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
    columnHelper.accessor("date_entered", {
      header: "Entered",
      size: 110,
      cell: (info) =>
        info.getValue() ? dayjs(info.getValue()).format("YYYY-MM-DD") : "—",
    }),
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
        enableSorting: false,
        cell: (info) => (
          <Tooltip label={info.getValue()} openDelay={500}>
            <Text size="sm" lineClamp={1} c="dimmed">
              {info.getValue() || "—"}
            </Text>
          </Tooltip>
        ),
      }
    ),
    columnHelper.accessor("paid_at", {
      id: "status",
      header: "Paid Status",
      size: 130,
      enableSorting: false,
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
              POSTED
            </Badge>
          );
        return (
          <Badge color="red" variant="light">
            NOT POSTED
          </Badge>
        );
      },
    }),
    columnHelper.accessor("comments", {
      header: "Comments",
      size: 200,
      enableSorting: false,
      cell: (info) => (
        <Box
          onClick={() => {
            if (!permissions.canEditInvoices) return;
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
    permissions.canEditInvoices
      ? columnHelper.display({
          id: "actions",
          header: "Actions",
          size: 80,
          cell: (info) => {
            const isPosted = !!info.row.original.paid_at;
            const isNoCharge = info.row.original.no_charge;
            return (
              <Menu withinPortal position="bottom-end" shadow="sm">
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray">
                    <FaEllipsisH />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Status</Menu.Label>
                  <Menu.Item
                    leftSection={<FaCheckSquare size={14} />}
                    onClick={() =>
                      togglePaidMutation.mutate({
                        id: info.row.original.invoice_id,
                        isPaid: !isPosted,
                      })
                    }
                    disabled={!!isNoCharge}
                    color={isPosted ? "red" : "green"}
                  >
                    {isPosted ? "Mark Not Posted" : "Mark Posted"}
                  </Menu.Item>
                  {!info.row.original.is_creditmemo && (
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
                      {isNoCharge
                        ? "Revert to Chargeable"
                        : "Mark as No Charge"}
                    </Menu.Item>
                  )}

                  <Menu.Divider />
                  <Menu.Label>Edit</Menu.Label>
                  <Menu.Item
                    leftSection={<FaEdit size={14} />}
                    onClick={() => {
                      setSelectedInvoice(info.row.original);
                      {
                        info.row.original.is_creditmemo
                          ? openEditCreditModal()
                          : openEditInvoiceModal();
                      }
                    }}
                  >
                    Edit
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<FaTrash size={14} />}
                    color="red"
                    onClick={() => {
                      if (
                        info.row.original.is_creditmemo
                          ? confirm(
                              "Are you sure you want to delete this Credit Memo?"
                            )
                          : confirm(
                              "Are you sure you want to delete this invoice?"
                            )
                      ) {
                        deleteInvoiceMutation.mutate({
                          id: info.row.original.invoice_id,
                          isCreditMemo: !!info.row.original.is_creditmemo,
                        });
                      }
                    }}
                  >
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            );
          },
        })
      : null,
  ].filter((col) => col !== null);

  const table = useReactTable({
    data: invoices,
    columns,
    pageCount: pageCount,
    state: { pagination, sorting, columnFilters: activeFilters },
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
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
        <Group justify="space-between" align="center" mb="md">
          <Group>
            <ThemeIcon
              size={40}
              radius="md"
              variant="gradient"
              gradient={gradients.primary}
            >
              <FaFileInvoiceDollar size={20} />
            </ThemeIcon>
            <Stack gap={0}>
              <Title order={3} style={{ color: colors.gray.title }}>
                Invoices
              </Title>
              <Text size="xs" c="dimmed">
                Track payments and billing.
              </Text>
            </Stack>
          </Group>
          {permissions.canEditInvoices && (
            <Group>
              <Button
                leftSection={<FaPlus size={14} />}
                onClick={openAddInvoiceModal}
                variant="gradient"
                gradient={gradients.primary}
              >
                Add Invoice
              </Button>
              <Button
                leftSection={<FaPlus size={14} />}
                onClick={openAddCreditModal}
                variant="gradient"
                gradient={{ from: "#004d1dff", to: "#007c53ff", deg: 90 }}
              >
                Add Credit Memo
              </Button>
            </Group>
          )}
        </Group>

        <Accordion variant="contained" radius="md">
          <Accordion.Item value="filters">
            <Accordion.Control icon={<FaSearch size={14} />}>
              <Text size="sm" fw={500}>
                Search & Filters
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md">
                <TextInput
                  label="Job Number"
                  placeholder="12345-A..."
                  value={getInputFilterValue("job_number") as string}
                  onChange={(e) =>
                    setInputFilterValue("job_number", e.target.value)
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                />
                <TextInput
                  label="Invoice Number"
                  placeholder="12345..."
                  value={getInputFilterValue("invoice_number") as string}
                  onChange={(e) =>
                    setInputFilterValue("invoice_number", e.target.value)
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                />
                <TextInput
                  label="Client Name"
                  placeholder="Genesis..."
                  value={getInputFilterValue("client") as string}
                  onChange={(e) =>
                    setInputFilterValue("client", e.target.value)
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                />
                <Select
                  label="Type"
                  placeholder="All"
                  data={[
                    { value: "invoices", label: "Invoices" },
                    { value: "creditmemos", label: "Credit Memos" },
                    { value: "all", label: "All" },
                  ]}
                  value={(getInputFilterValue("type") as string) || "all"}
                  onChange={(val) =>
                    setInputFilterValue("type", val === "all" ? undefined : val)
                  }
                />
                <Select
                  label="Payment Status"
                  placeholder="All"
                  data={[
                    { value: "all", label: "All" },
                    { value: "paid", label: "Paid" },
                    { value: "pending", label: "Pending" },
                    { value: "noCharge", label: "No Charge" },
                  ]}
                  value={(getInputFilterValue("status") as string) || "all"}
                  onChange={(val) =>
                    setInputFilterValue(
                      "status",
                      val === "all" ? undefined : val
                    )
                  }
                />
                <DatePickerInput
                  type="range"
                  allowSingleDateInRange
                  label="Date Entered"
                  placeholder="Pick dates"
                  value={
                    (getInputFilterValue("date_entered") as [
                      Date | null,
                      Date | null
                    ]) || [null, null]
                  }
                  onChange={(val) => setInputFilterValue("date_entered", val)}
                  clearable
                />
              </SimpleGrid>
              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={handleClearFilters}>
                  Clear
                </Button>
                <Button color="violet" onClick={handleApplyFilters}>
                  Apply Filters
                </Button>
              </Group>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Paper>

      <ScrollArea style={{ flex: 1 }}>
        <Table
          striped
          stickyHeader
          highlightOnHover
          withColumnBorders
          layout="fixed"
        >
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
          color={colors.violet.primary}
        />
      </Center>

      {addInvoiceModalOpened && (
        <AddInvoice
          opened={addInvoiceModalOpened}
          onClose={closeAddInvoiceModal}
        />
      )}

      {addCreditModalOpened && (
        <AddInvoice
          opened={addCreditModalOpened}
          onClose={closeAddCreditModal}
          isCreditMemo={true}
        />
      )}

      {editInvoiceModalOpened && selectedInvoice && (
        <EditInvoice
          opened={editInvoiceModalOpened}
          onClose={() => {
            closeEditInvoiceModal();
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
        />
      )}

      {editCreditModalOpened && selectedInvoice && (
        <EditInvoice
          opened={editCreditModalOpened}
          onClose={() => {
            closeEditCreditModal();
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
          isCreditMemo={true}
        />
      )}

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
            onChange={(e) =>
              setEditingComment((prev) =>
                prev ? { ...prev, text: e.currentTarget.value } : null
              )
            }
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
