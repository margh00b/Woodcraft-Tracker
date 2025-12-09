"use client";

import { useState, useEffect } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  PaginationState,
  ColumnFiltersState,
  SortingState,
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
  Tooltip,
  Modal,
  Textarea,
  Button,
  Stack,
  ThemeIcon,
  Title,
  Accordion,
  SimpleGrid,
  Anchor,
  ActionIcon,
  NumberInput,
  Paper,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import {
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaCheck,
  FaTruckLoading,
  FaPencilAlt,
  FaShoppingBag,
  FaTrash,
  FaPlus,
  FaList,
  FaExclamationCircle,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import { usePurchasingTable } from "@/hooks/usePurchasingTable";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import { Views, Tables, TablesInsert } from "@/types/db";
import JobDetailsDrawer from "@/components/Shared/JobDetailsDrawer/JobDetailsDrawer";

type PurchasingTableView = Views<"purchasing_table_view"> & {
  doors_received_incomplete_at: string | null;
  glass_received_incomplete_at: string | null;
  handles_received_incomplete_at: string | null;
  acc_received_incomplete_at: string | null;
};

type PurchaseOrderItemRow = Tables<"purchase_order_items"> & {
  po_number?: string | null;
  qty_received?: number | null;
};

type PurchaseOrderItemState =
  | PurchaseOrderItemRow
  | (TablesInsert<"purchase_order_items"> & {
      id?: number;
      po_number?: string | null;
      qty_received?: number | null;
    });

const OrderPartsModal = ({
  opened,
  onClose,
  purchaseTrackingId,
  itemType,
  onSave,
}: {
  opened: boolean;
  onClose: () => void;
  purchaseTrackingId: number | null;
  itemType: string;
  onSave: (items: PurchaseOrderItemState[]) => void;
}) => {
  const { supabase } = useSupabase();
  const [items, setItems] = useState<PurchaseOrderItemState[]>([]);

  const { data: fetchedItems, isLoading } = useQuery({
    queryKey: ["purchase_order_items", purchaseTrackingId, itemType],
    queryFn: async () => {
      if (!purchaseTrackingId) return [];
      const { data } = await supabase
        .from("purchase_order_items")
        .select("*")
        .eq("purchase_tracking_id", purchaseTrackingId)
        .eq("item_type", itemType)
        .order("id", { ascending: true });
      return data || [];
    },
    enabled: opened && !!purchaseTrackingId,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (fetchedItems && opened) {
      if (fetchedItems.length > 0) {
        setItems(fetchedItems);
      } else {
        setItems([
          {
            quantity: 1,
            part_description: "",
            company: "",
            po_number: "",
            is_received: false,
            qty_received: 0,
            purchase_tracking_id: purchaseTrackingId!,
            item_type: itemType,
          },
        ]);
      }
    }
  }, [fetchedItems, opened, purchaseTrackingId, itemType]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        quantity: 1,
        part_description: "",
        company: "",
        po_number: "",
        is_received: false,
        qty_received: 0,
        purchase_tracking_id: purchaseTrackingId!,
        item_type: itemType,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateItem = (
    index: number,
    field: keyof PurchaseOrderItemState,
    value: any
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const isPoEditable = ["handles", "acc"].includes(itemType);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <ThemeIcon variant="light" color="violet" radius="md" size="lg">
            <FaList />
          </ThemeIcon>
          <Text fw={700} c="violet.9">
            Order Details: {itemType?.toUpperCase()}
          </Text>
        </Group>
      }
      size="xl"
      padding="xl"
      radius="md"
      centered
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
    >
      <Stack>
        {isLoading && items.length === 0 ? (
          <Center h={100}>
            <Loader type="dots" color="violet" />
          </Center>
        ) : (
          <Box>
            <Paper withBorder p="xs" bg="gray.0" mb="sm" radius="md">
              <SimpleGrid cols={14} spacing="xs">
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  style={{ gridColumn: "span 2" }}
                >
                  PO #
                </Text>
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  style={{ gridColumn: "span 2" }}
                >
                  QTY
                </Text>
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  style={{ gridColumn: "span 6" }}
                >
                  PART DESCRIPTION
                </Text>
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  style={{ gridColumn: "span 3" }}
                >
                  SUPPLIER
                </Text>

                <Box style={{ gridColumn: "span 1" }} />
              </SimpleGrid>
            </Paper>

            <Stack gap="xs">
              {items.map((item, idx) => (
                <SimpleGrid
                  key={idx}
                  cols={14}
                  spacing="xs"
                  style={{ alignItems: "center" }}
                >
                  <TextInput
                    style={{ gridColumn: "span 2" }}
                    value={item.po_number || ""}
                    onChange={(e) =>
                      updateItem(idx, "po_number", e.currentTarget.value)
                    }
                    placeholder="PO #"
                    disabled={!isPoEditable}
                  />
                  <NumberInput
                    style={{ gridColumn: "span 2" }}
                    min={1}
                    value={item.quantity || 1}
                    onChange={(v) => updateItem(idx, "quantity", v)}
                    placeholder="1"
                  />
                  <TextInput
                    style={{ gridColumn: "span 6" }}
                    value={item.part_description || ""}
                    onChange={(e) =>
                      updateItem(idx, "part_description", e.currentTarget.value)
                    }
                    placeholder="Description"
                  />
                  <TextInput
                    style={{ gridColumn: "span 3" }}
                    value={item.company || ""}
                    onChange={(e) =>
                      updateItem(idx, "company", e.currentTarget.value)
                    }
                    placeholder="Supplier"
                  />

                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => handleRemoveItem(idx)}
                    style={{ gridColumn: "span 1" }}
                  >
                    <FaTrash size={14} />
                  </ActionIcon>
                </SimpleGrid>
              ))}
            </Stack>

            <Button
              fullWidth
              mt="md"
              variant="light"
              color="violet"
              leftSection={<FaPlus size={12} />}
              onClick={handleAddItem}
              style={{ borderStyle: "dashed" }}
            >
              Add Another Part
            </Button>
          </Box>
        )}
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(items)}
            variant="gradient"
            gradient={{ from: "violet", to: "indigo", deg: 90 }}
            leftSection={<FaCheck size={14} />}
          >
            Save Order Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

const IncompletePartsModal = ({
  opened,
  onClose,
  purchaseTrackingId,
  itemType,
  onSave,
}: {
  opened: boolean;
  onClose: () => void;
  purchaseTrackingId: number | null;
  itemType: string;
  onSave: (items: PurchaseOrderItemState[], comments: string) => void;
}) => {
  const { supabase } = useSupabase();
  const [items, setItems] = useState<PurchaseOrderItemState[]>([]);
  const [comments, setComments] = useState("");

  const { data: fetchedItems, isLoading } = useQuery({
    queryKey: ["purchase_order_items", purchaseTrackingId, itemType],
    queryFn: async () => {
      if (!purchaseTrackingId) return [];
      const { data } = await supabase
        .from("purchase_order_items")
        .select("*")
        .eq("purchase_tracking_id", purchaseTrackingId)
        .eq("item_type", itemType)
        .order("id", { ascending: true });
      return data || [];
    },
    enabled: opened && !!purchaseTrackingId,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (fetchedItems && opened) {
      setItems(fetchedItems);
    }
  }, [fetchedItems, opened]);

  const updateReceivedQty = (index: number, val: number | string) => {
    const newItems = [...items];
    const qty = typeof val === "number" ? val : 0;
    newItems[index].qty_received = qty;
    // Auto-update legacy boolean for consistency, though logic relies on qty now
    newItems[index].is_received = qty >= (newItems[index].quantity || 0);
    setItems(newItems);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon variant="light" color="orange" radius="md" size="lg">
            <FaExclamationCircle />
          </ThemeIcon>
          <Text fw={700} c="orange.9">
            Receive Parts: {itemType?.toUpperCase()}
          </Text>
        </Group>
      }
      size="lg"
      padding="lg"
      radius="md"
      centered
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
    >
      <Stack gap="md">
        <Paper
          withBorder
          p="sm"
          bg="orange.0"
          style={{ borderColor: "var(--mantine-color-orange-2)" }}
        >
          <Text size="sm" c="orange.9" lh={1.4}>
            Enter the <b>Quantity Received</b> for each item. The order status
            will automatically update to <b>Complete</b> only when all items are
            fully received.
          </Text>
        </Paper>

        {isLoading && items.length === 0 ? (
          <Center h={100}>
            <Loader type="dots" color="orange" />
          </Center>
        ) : items.length === 0 ? (
          <Center h={100}>
            <Text c="dimmed">No parts logged for this order.</Text>
          </Center>
        ) : (
          <Box>
            <SimpleGrid cols={12} spacing="xs" mb="xs" mt="xs">
              <Text
                size="xs"
                fw={700}
                c="dimmed"
                style={{ gridColumn: "span 2", textAlign: "center" }}
              >
                ORDERED
              </Text>
              <Text
                size="xs"
                fw={700}
                c="dimmed"
                style={{ gridColumn: "span 3", textAlign: "center" }}
              >
                RECEIVED
              </Text>
              <Text
                size="xs"
                fw={700}
                c="dimmed"
                style={{ gridColumn: "span 7" }}
              >
                PART DESCRIPTION
              </Text>
            </SimpleGrid>

            <Stack gap={6}>
              {items.map((item, idx) => {
                const isFullyReceived =
                  (item.qty_received || 0) >= (item.quantity || 0);
                return (
                  <Paper
                    key={idx}
                    withBorder
                    p={6}
                    radius="sm"
                    style={{
                      backgroundColor: isFullyReceived
                        ? "var(--mantine-color-green-0)"
                        : "white",
                      borderColor: isFullyReceived
                        ? "var(--mantine-color-green-3)"
                        : "var(--mantine-color-gray-3)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <SimpleGrid
                      cols={12}
                      spacing="xs"
                      style={{ alignItems: "center" }}
                    >
                      <Text
                        fw={600}
                        size="sm"
                        style={{ gridColumn: "span 2", textAlign: "center" }}
                      >
                        {item.quantity}
                      </Text>
                      <Box style={{ gridColumn: "span 3" }}>
                        <NumberInput
                          size="xs"
                          min={0}
                          max={item.quantity || undefined}
                          value={item.qty_received || 0}
                          onChange={(val) => updateReceivedQty(idx, val)}
                          styles={{ input: { textAlign: "center" } }}
                        />
                      </Box>
                      <Stack gap={0} style={{ gridColumn: "span 7" }}>
                        <Text size="sm" fw={500} style={{ lineHeight: 1.2 }}>
                          {item.part_description}
                        </Text>
                        {item.po_number && (
                          <Badge
                            size="xs"
                            variant="outline"
                            color="gray"
                            mt={2}
                          >
                            PO: {item.po_number}
                          </Badge>
                        )}
                      </Stack>
                    </SimpleGrid>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}

        <Textarea
          label="Notes / Discrepancies"
          placeholder="e.g. 2 doors arrived damaged, waiting on replacement..."
          minRows={2}
          autosize
          value={comments}
          onChange={(e) => setComments(e.currentTarget.value)}
        />

        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose} size="sm">
            Cancel
          </Button>
          <Button
            onClick={() => onSave(items, comments)}
            variant="gradient"
            gradient={{ from: "orange", to: "red", deg: 90 }}
            size="sm"
          >
            Update Receipt Status
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

const StatusCell = ({
  orderedAt,
  receivedAt,
  receivedIncompleteAt,
  onMarkOrdered,
  onEditOrder,
  onMarkReceived,
  onReceiveIncomplete,
  onClear,
}: {
  orderedAt: string | null;
  receivedAt: string | null;
  receivedIncompleteAt: string | null;
  onMarkOrdered: () => void;
  onEditOrder: () => void;
  onMarkReceived: () => void;
  onReceiveIncomplete: () => void;
  onClear: () => void;
}) => {
  let badgeColor = "red";
  let statusText = "—";
  let variant = "light";

  if (receivedIncompleteAt) {
    badgeColor = "orange";
    statusText = "Incomplete";
    variant = "filled";
  } else if (receivedAt) {
    badgeColor = "green";
    statusText = "Received";
    variant = "light";
  } else if (orderedAt) {
    badgeColor = "yellow";
    statusText = "Ordered";
    variant = "outline";
  }

  return (
    <Menu shadow="xl" width={240} withinPortal position="bottom-end" withArrow>
      <Menu.Target>
        <Badge
          color={badgeColor}
          variant={variant}
          size="lg"
          radius="sm"
          style={{
            cursor: "pointer",
            width: "100%",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {statusText}
        </Badge>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Change Status</Menu.Label>
        {!orderedAt && (
          <Menu.Item
            leftSection={<FaTruckLoading size={14} />}
            onClick={onMarkOrdered}
          >
            Mark Ordered (Add Parts)
          </Menu.Item>
        )}

        {orderedAt && (
          <Menu.Item leftSection={<FaList size={14} />} onClick={onEditOrder}>
            View/Edit Order Details
          </Menu.Item>
        )}

        <Menu.Item
          leftSection={<FaCheck size={14} color="green" />}
          onClick={onMarkReceived}
          disabled={!orderedAt}
        >
          Mark Received Complete
        </Menu.Item>

        <Menu.Item
          leftSection={<FaExclamationCircle size={14} color="orange" />}
          onClick={onReceiveIncomplete}
          disabled={!orderedAt}
        >
          Manage / Incomplete Receipt
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          color="red"
          leftSection={<FaTrash size={14} />}
          onClick={onClear}
        >
          Clear All
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default function PurchasingTable() {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [inputFilters, setInputFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([]);

  const [drawerJobId, setDrawerJobId] = useState<number | null>(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [
    commentModalOpened,
    { open: openCommentModal, close: closeCommentModal },
  ] = useDisclosure(false);
  const [editingComment, setEditingComment] = useState<{
    id: number;
    text: string;
  } | null>(null);

  const [orderModalOpened, { open: openOrderModal, close: closeOrderModal }] =
    useDisclosure(false);
  const [
    incompleteModalOpened,
    { open: openIncompleteModal, close: closeIncompleteModal },
  ] = useDisclosure(false);

  const [activeRowContext, setActiveRowContext] = useState<{
    id: number;
    keyPrefix: "doors" | "glass" | "handles" | "acc";
    initialComment: string;
  } | null>(null);

  const handleJobClick = (id: number) => {
    setDrawerJobId(id);
    openDrawer();
  };

  const setInputFilterValue = (
    id: string,
    value: string | undefined | null
  ) => {
    setInputFilters((prev) => {
      const existing = prev.filter((f) => f.id !== id);
      if (!value) return existing;
      return [...existing, { id, value }];
    });
  };

  const getInputFilterValue = (id: string) => {
    return (inputFilters.find((f) => f.id === id)?.value as string) || "";
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

  const { data, isLoading, isError, error } = usePurchasingTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });

  const tableData = (data?.data as PurchasingTableView[]) || [];
  const pageCount = Math.ceil((data?.count || 0) / pagination.pageSize);

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
      logMessage,
      initialComment,
    }: {
      id: number;
      updates: any;
      logMessage?: string;
      initialComment?: string;
    }) => {
      let finalUpdates = { ...updates };
      if (logMessage) {
        const timestamp = dayjs().format("YYYY-MM-DD HH:mm");
        const newCommentLine = `${logMessage} [${timestamp}]`;
        finalUpdates.purchasing_comments = initialComment
          ? `${initialComment}\n${newCommentLine}`
          : newCommentLine;
      }
      const { error } = await supabase
        .from("purchase_tracking")
        .update(finalUpdates)
        .eq("purchase_check_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchasing_table_view"] });
      notifications.show({
        title: "Updated",
        message: "Order status updated successfully",
        color: "green",
      });
    },
  });

  const saveOrderItemsMutation = useMutation({
    mutationFn: async ({
      items,
      trackingId,
      type,
    }: {
      items: PurchaseOrderItemState[];
      trackingId: number;
      type: string;
    }) => {
      await supabase
        .from("purchase_order_items")
        .delete()
        .eq("purchase_tracking_id", trackingId)
        .eq("item_type", type);

      if (items.length > 0) {
        const itemsToInsert: TablesInsert<"purchase_order_items">[] = items.map(
          (i) => ({
            purchase_tracking_id: trackingId,
            item_type: type,
            quantity: i.quantity || 1,
            part_description: i.part_description,
            company: i.company,
            is_received: i.is_received || false,
            po_number: i.po_number || null,
            qty_received: i.qty_received || 0,
          })
        );
        const { error } = await supabase
          .from("purchase_order_items")
          .insert(itemsToInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchasing_table_view"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_order_items"] });
    },
  });

  const updateIncompleteItemsMutation = useMutation({
    mutationFn: async ({ items }: { items: PurchaseOrderItemState[] }) => {
      const updates = items
        .filter((i) => i.id !== undefined)
        .map((i) => ({
          id: i.id!,
          qty_received: i.qty_received,
          is_received: (i.qty_received || 0) >= (i.quantity || 0),
        }));

      for (const update of updates) {
        await supabase
          .from("purchase_order_items")
          .update({
            is_received: update.is_received,
            qty_received: update.qty_received,
          })
          .eq("id", update.id);
      }
    },
  });

  const handleSaveOrder = async (items: PurchaseOrderItemState[]) => {
    if (!activeRowContext) return;
    const { id, keyPrefix, initialComment } = activeRowContext;

    await saveOrderItemsMutation.mutateAsync({
      items,
      trackingId: id,
      type: keyPrefix,
    });

    const allReceived =
      items.length > 0 &&
      items.every((i) => (i.qty_received || 0) >= (i.quantity || 0));
    const currentRow = tableData.find((r) => r.purchase_check_id === id);
    const wasReceived = !!currentRow?.[`${keyPrefix}_received_at`];

    const ordKey = `${keyPrefix}_ordered_at`;
    const recKey = `${keyPrefix}_received_at`;
    const incKey = `${keyPrefix}_received_incomplete_at`;

    let updates: any = {};
    let logMsg = "";

    updates[ordKey] = new Date().toISOString();

    if (!allReceived) {
      if (wasReceived) {
        updates[recKey] = null;
        updates[incKey] = new Date().toISOString();
        logMsg = `${keyPrefix.toUpperCase()} Updated: New parts added, status changed to Incomplete.`;
      } else {
        logMsg = `${keyPrefix.toUpperCase()} Order Details Updated`;
      }
    } else {
      logMsg = `${keyPrefix.toUpperCase()} Order Details Updated`;
    }

    await updateStatusMutation.mutateAsync({
      id,
      updates,
      logMessage: logMsg,
      initialComment,
    });

    closeOrderModal();
  };

  const handleSaveIncomplete = async (
    items: PurchaseOrderItemState[],
    comments: string
  ) => {
    if (!activeRowContext) return;
    const { id, keyPrefix, initialComment } = activeRowContext;

    await updateIncompleteItemsMutation.mutateAsync({ items });

    // Use Quantity logic for completion
    const allReceived =
      items.length > 0 &&
      items.every((i) => (i.qty_received || 0) >= (i.quantity || 0));
    const recKey = `${keyPrefix}_received_at`;
    const incKey = `${keyPrefix}_received_incomplete_at`;

    let updates: any = {};
    let logMsg = "";

    if (allReceived) {
      updates[recKey] = new Date().toISOString();
      updates[incKey] = null;
      logMsg = `${keyPrefix.toUpperCase()} Status Upgrade: All items received.`;
    } else {
      updates[recKey] = null;
      updates[incKey] = new Date().toISOString();
      logMsg = `${keyPrefix.toUpperCase()} Partial Receipt Logged.`;
    }

    if (comments) logMsg += ` Note: ${comments}`;

    await updateStatusMutation.mutateAsync({
      id,
      updates,
      logMessage: logMsg,
      initialComment,
    });

    closeIncompleteModal();
  };

  const columnHelper = createColumnHelper<PurchasingTableView>();

  const createStatusColumn = (
    keyPrefix: "doors" | "glass" | "handles" | "acc",
    headerTitle: string
  ) =>
    columnHelper.accessor(`${keyPrefix}_received_at` as any, {
      id: keyPrefix,
      header: headerTitle,
      size: 140,
      cell: (info) => {
        const row = info.row.original;
        if (row.purchase_check_id === null) return null;

        const ordKey = `${keyPrefix}_ordered_at` as keyof PurchasingTableView;
        const recKey = `${keyPrefix}_received_at` as keyof PurchasingTableView;
        const incKey =
          `${keyPrefix}_received_incomplete_at` as keyof PurchasingTableView;

        return (
          <StatusCell
            orderedAt={row[ordKey] as string}
            receivedAt={row[recKey] as string}
            receivedIncompleteAt={row[incKey] as string}
            onMarkOrdered={() => {
              setActiveRowContext({
                id: row.purchase_check_id!,
                keyPrefix,
                initialComment: row.purchasing_comments || "",
              });
              openOrderModal();
            }}
            onEditOrder={() => {
              setActiveRowContext({
                id: row.purchase_check_id!,
                keyPrefix,
                initialComment: row.purchasing_comments || "",
              });
              openOrderModal();
            }}
            onMarkReceived={() => {
              updateStatusMutation.mutate({
                id: row.purchase_check_id!,
                updates: {
                  [recKey]: new Date().toISOString(),
                  [incKey]: null,
                },
                logMessage: `${keyPrefix.toUpperCase()} Marked Fully Received`,
                initialComment: row.purchasing_comments || "",
              });
            }}
            onReceiveIncomplete={() => {
              setActiveRowContext({
                id: row.purchase_check_id!,
                keyPrefix,
                initialComment: row.purchasing_comments || "",
              });
              openIncompleteModal();
            }}
            onClear={() => {
              updateStatusMutation.mutate({
                id: row.purchase_check_id!,
                updates: { [ordKey]: null, [recKey]: null, [incKey]: null },
                logMessage: `${keyPrefix.toUpperCase()} Status Cleared`,
                initialComment: row.purchasing_comments || "",
              });
            }}
          />
        );
      },
    });

  const columns = [
    columnHelper.accessor("job_number", {
      header: "Job Number",
      size: 120,
      cell: (info) => (
        <Text fw={600} size="sm">
          <Anchor
            component="button"
            size="sm"
            fw={600}
            c="violet.9"
            onClick={(e) => {
              e.stopPropagation();
              if (info.row.original.job_id)
                handleJobClick(info.row.original.job_id);
            }}
          >
            {info.getValue()}
          </Anchor>
        </Text>
      ),
    }),
    columnHelper.accessor("client_name", {
      header: "Client",
      size: 150,
      cell: (info) => <Text size="sm">{info.getValue() || "—"}</Text>,
    }),
    columnHelper.accessor("ship_schedule", {
      header: "Ship Date",
      size: 130,
      cell: (info) => {
        const date = info.getValue();
        return date ? (
          <Text size="sm">{dayjs(date).format("YYYY-MM-DD")}</Text>
        ) : (
          <Text c="orange" size="sm">
            TBD
          </Text>
        );
      },
    }),
    createStatusColumn("doors", "Doors"),
    createStatusColumn("glass", "Glass"),
    createStatusColumn("handles", "Handles"),
    createStatusColumn("acc", "Accessories"),
    columnHelper.accessor("purchasing_comments", {
      header: "History",
      size: 250,
      cell: (info) => (
        <Box
          onClick={() => {
            if (info.row.original.purchase_check_id === null) return;
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
            maxWidth: "100%",
          }}
        >
          <Tooltip
            label={info.getValue()}
            multiline
            w={300}
            withinPortal
            disabled={!info.getValue()}
          >
            <Text size="xs" truncate c="dimmed" style={{ flex: 1 }}>
              {info.getValue() || "—"}
            </Text>
          </Tooltip>
          <FaPencilAlt size={10} color="#adb5bd" />
        </Box>
      ),
    }),
  ];

  const table = useReactTable({
    data: tableData,
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
      <Center h={400}>
        <Loader color="violet" />
      </Center>
    );
  if (isError)
    return (
      <Center h={400}>
        <Text c="red">{(error as any)?.message}</Text>
      </Center>
    );

  return (
    <Box
      p={rem(20)}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 45px)",
      }}
    >
      <Group mb="md">
        <ThemeIcon
          size={50}
          radius="md"
          variant="gradient"
          gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
        >
          <FaShoppingBag size={26} />
        </ThemeIcon>
        <Stack gap={0}>
          <Title order={2} style={{ color: "#343a40" }}>
            Purchase Tracking
          </Title>
          <Text size="sm" c="dimmed">
            Track and manage purchase orders
          </Text>
        </Stack>
      </Group>

      <Accordion variant="contained" radius="md" mb="md" chevronPosition="left">
        <Accordion.Item value="filters">
          <Accordion.Control icon={<FaSearch size={16} color="#8E2DE2" />}>
            Search Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <TextInput
                label="Job Number"
                placeholder="Search..."
                value={getInputFilterValue("job_number")}
                onChange={(e) =>
                  setInputFilterValue("job_number", e.target.value)
                }
              />
              <TextInput
                label="Client Name"
                placeholder="Search..."
                value={getInputFilterValue("client_name")}
                onChange={(e) =>
                  setInputFilterValue("client_name", e.target.value)
                }
              />
              <DateInput
                label="Ship Date"
                placeholder="Filter by Date"
                clearable
                value={
                  getInputFilterValue("ship_schedule")
                    ? dayjs(getInputFilterValue("ship_schedule")).toDate()
                    : null
                }
                onChange={(date) =>
                  setInputFilterValue(
                    "ship_schedule",
                    date ? dayjs(date).format("YYYY-MM-DD") : undefined
                  )
                }
                valueFormat="YYYY-MM-DD"
              />
            </SimpleGrid>
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleClearFilters}>
                Clear Filters
              </Button>
              <Button
                variant="filled"
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
                    style={{ width: header.getSize(), cursor: "pointer" }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <Group gap={4}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
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
            {table.getRowModel().rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Center py="xl">
                    <Text c="dimmed">No purchasing records found.</Text>
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

      <Box
        style={{
          borderTop: "1px solid #eee",
          padding: "1rem",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Pagination
          total={table.getPageCount()}
          value={pagination.pageIndex + 1}
          onChange={(p) => table.setPageIndex(p - 1)}
          color="violet"
        />
      </Box>

      {/* --- Modals --- */}

      <Modal
        opened={commentModalOpened}
        onClose={closeCommentModal}
        title="Edit Purchasing Comments"
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Edit full comment history manually.
          </Text>
          <Textarea
            minRows={12}
            placeholder="Enter comments..."
            styles={{ input: { minHeight: "200px" } }}
            value={editingComment?.text || ""}
            onChange={(e) => {
              const newVal = e.currentTarget.value;
              setEditingComment((prev) =>
                prev ? { ...prev, text: newVal } : null
              );
            }}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCommentModal}>
              Cancel
            </Button>
            <Button
              color="violet"
              onClick={() => {
                if (editingComment)
                  updateStatusMutation.mutate({
                    id: editingComment.id,
                    updates: { purchasing_comments: editingComment.text },
                  });
                closeCommentModal();
              }}
            >
              Save Comment
            </Button>
          </Group>
        </Stack>
      </Modal>

      <OrderPartsModal
        opened={orderModalOpened}
        onClose={closeOrderModal}
        purchaseTrackingId={activeRowContext?.id || null}
        itemType={activeRowContext?.keyPrefix || ""}
        onSave={handleSaveOrder}
      />

      <IncompletePartsModal
        opened={incompleteModalOpened}
        onClose={closeIncompleteModal}
        purchaseTrackingId={activeRowContext?.id || null}
        itemType={activeRowContext?.keyPrefix || ""}
        onSave={handleSaveIncomplete}
      />

      <JobDetailsDrawer
        jobId={drawerJobId}
        opened={drawerOpened}
        onClose={closeDrawer}
      />
    </Box>
  );
}
