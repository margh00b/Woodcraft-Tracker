"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  FilterFn,
} from "@tanstack/react-table";
import {
  Table,
  ScrollArea,
  Text,
  Badge,
  Group,
  TextInput,
  Pagination,
  Box,
  rem,
  Loader,
  Center,
  Menu,
  ActionIcon,
  Tooltip,
  Modal,
  Textarea,
  Button,
  Stack,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaCheck,
  FaTruckLoading,
  FaPencilAlt,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";

// --- Types ---
interface PurchaseTrackingRow {
  purchase_check_id: number;
  job_id: number;
  doors_ordered_at: string | null;
  doors_received_at: string | null;
  glass_ordered_at: string | null;
  glass_received_at: string | null;
  handles_ordered_at: string | null;
  handles_received_at: string | null;
  acc_ordered_at: string | null;
  acc_received_at: string | null;
  purchasing_comments: string | null;
  job: {
    job_number: string;
    production_schedule: {
      ship_schedule: string | null;
    } | null;
    sales_orders: {
      client: { lastName: string };
    };
  };
}

// --- Helper Component for Cells ---
const StatusCell = ({
  orderedAt,
  receivedAt,
  onUpdate,
  label,
}: {
  orderedAt: string | null;
  receivedAt: string | null;
  onUpdate: (field: "ordered" | "received", val: string | null) => void;
  label: string;
}) => {
  let badgeColor = "red";
  let statusText = "—";

  if (receivedAt) {
    badgeColor = "green";
    statusText = "Received";
  } else if (orderedAt) {
    badgeColor = "yellow";
    statusText = "Ordered";
  }

  return (
    <Menu shadow="md" width={200} withinPortal>
      <Menu.Target>
        <Badge
          color={badgeColor}
          variant="light"
          style={{ cursor: "pointer", width: "100%" }}
        >
          {statusText}
        </Badge>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          leftSection={<FaTruckLoading size={14} />}
          onClick={() => onUpdate("ordered", new Date().toISOString())}
          disabled={!!orderedAt}
        >
          Mark Ordered
        </Menu.Item>
        <Menu.Item
          leftSection={<FaCheck size={14} />}
          color="green"
          onClick={() => onUpdate("received", new Date().toISOString())}
          disabled={!!receivedAt}
        >
          Mark Received
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          color="red"
          onClick={() => {
            onUpdate("received", null);
            onUpdate("ordered", null);
          }}
        >
          Clear All
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

// --- Generic Filter ---
const genericFilter: FilterFn<PurchaseTrackingRow> = (
  row,
  columnId,
  filterValue
) => {
  const val = String(row.getValue(columnId) ?? "").toLowerCase();
  return val.includes(String(filterValue).toLowerCase());
};

export default function PurchasingTable() {
  const { supabase, isAuthenticated } = useSupabase();
  const queryClient = useQueryClient();
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  // Modal State
  const [
    commentModalOpened,
    { open: openCommentModal, close: closeCommentModal },
  ] = useDisclosure(false);
  const [editingComment, setEditingComment] = useState<{
    id: number;
    text: string;
  } | null>(null);

  // 1. Fetch Data
  const { data: trackingData, isLoading } = useQuery({
    queryKey: ["purchase_tracking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_tracking")
        .select(
          `
          *,
          job:jobs (
            job_number,
            production_schedule (
              ship_schedule
            ),
            sales_orders (
              client (lastName)
            )
          )
        `
        )
        .order("job_id", { ascending: false });

      if (error) throw error;
      return data as unknown as PurchaseTrackingRow[];
    },
    enabled: isAuthenticated,
  });

  // 2. Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const { error } = await supabase
        .from("purchase_tracking")
        .update(updates)
        .eq("purchase_check_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_tracking"] });
      notifications.show({
        title: "Updated",
        message: "Saved successfully",
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

  // Handle saving the comment from modal
  const handleSaveComment = () => {
    if (!editingComment) return;
    updateMutation.mutate({
      id: editingComment.id,
      updates: { purchasing_comments: editingComment.text },
    });
  };

  // 3. Columns
  const columnHelper = createColumnHelper<PurchaseTrackingRow>();

  // Helper to create Status Columns (Updated to be Sortable Accessors)
  const createStatusColumn = (keyPrefix: string, headerTitle: string) =>
    columnHelper.accessor(
      // We use the '_received_at' date as the sorting value
      (row) =>
        row[`${keyPrefix}_received_at` as keyof PurchaseTrackingRow] as string,
      {
        id: keyPrefix,
        header: headerTitle,
        size: 100,
        cell: (info) => {
          const row = info.row.original;
          const ordKey = `${keyPrefix}_ordered_at` as keyof PurchaseTrackingRow;
          const recKey =
            `${keyPrefix}_received_at` as keyof PurchaseTrackingRow;

          return (
            <StatusCell
              label={headerTitle}
              orderedAt={row[ordKey] as string}
              receivedAt={row[recKey] as string}
              onUpdate={(type, val) => {
                const field = type === "ordered" ? ordKey : recKey;
                updateMutation.mutate({
                  id: row.purchase_check_id,
                  updates: { [field]: val },
                });
              }}
            />
          );
        },
      }
    );

  const columns = [
    columnHelper.accessor("job.job_number", {
      header: "Job #",
      size: 120,
      filterFn: genericFilter,
    }),
    columnHelper.accessor("job.sales_orders.client.lastName", {
      header: "Client",
      size: 150,
      filterFn: genericFilter,
    }),
    // --- Ship Date Column ---
    columnHelper.accessor("job.production_schedule.ship_schedule", {
      id: "ship_date",
      header: "Ship Date",
      size: 130,
      cell: (info) => {
        const date = info.getValue();
        if (!date)
          return (
            <Text c="orange" size="sm">
              TBD
            </Text>
          );
        return <Text size="sm">{dayjs(date).format("YYYY-MM-DD")}</Text>;
      },
    }),
    createStatusColumn("doors", "Doors"),
    createStatusColumn("glass", "Glass"),
    createStatusColumn("handles", "Handles"),
    createStatusColumn("acc", "Accessories"),
    columnHelper.accessor("purchasing_comments", {
      header: "Comments",
      size: 200,
      cell: (info) => (
        <Box
          onClick={() => {
            setEditingComment({
              id: info.row.original.purchase_check_id,
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
          <Text size="xs" truncate c="dimmed" style={{ flex: 1 }}>
            {info.getValue() || "—"}
          </Text>
          <FaPencilAlt size={10} color="#adb5bd" style={{ opacity: 0.5 }} />
        </Box>
      ),
    }),
  ];

  // 4. Table Instance
  const table = useReactTable({
    data: trackingData || [],
    columns,
    state: { globalFilter, pagination },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isLoading)
    return (
      <Center h={400}>
        <Loader />
      </Center>
    );

  return (
    <Box
      p="md"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 60px)",
      }}
    >
      <Group justify="space-between" mb="md">
        <Text fw={700} size="xl">
          Purchase Tracking
        </Text>
        <TextInput
          placeholder="Search Jobs..."
          leftSection={<FaSearch size={14} />}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      </Group>

      <ScrollArea style={{ flex: 1 }}>
        <Table striped highlightOnHover withColumnBorders>
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Th
                    key={header.id}
                    style={{ width: header.getSize(), cursor: "pointer" }} // Cursor pointer enables UX hint
                    onClick={header.column.getToggleSortingHandler()} // Toggle sort on click
                  >
                    <Group gap={4}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {/* Sort Icons Logic */}
                      {header.column.getIsSorted() === "asc" && <FaSortUp />}
                      {header.column.getIsSorted() === "desc" && <FaSortDown />}
                      {!header.column.getIsSorted() && (
                        <FaSort style={{ opacity: 0.2 }} />
                      )}
                    </Group>
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {table.getRowModel().rows.map((row) => (
              <Table.Tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <Table.Td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
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

      {/* COMMENT MODAL */}
      <Modal
        opened={commentModalOpened}
        onClose={closeCommentModal}
        title="Edit Purchasing Comments"
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Add notes regarding materials, delays, or specific order details.
          </Text>
          <Textarea
            minRows={4}
            placeholder="Enter comments..."
            value={editingComment?.text || ""}
            onChange={(e) => {
              const newVal = e.currentTarget.value;
              setEditingComment((prev) =>
                prev ? { ...prev, text: newVal } : null
              );
            }}
            data-autofocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCommentModal}>
              Cancel
            </Button>
            <Button
              color="purple"
              onClick={handleSaveComment}
              loading={updateMutation.isPending}
            >
              Save Comment
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
