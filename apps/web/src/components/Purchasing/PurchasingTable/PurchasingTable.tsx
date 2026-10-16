"use client";

import { useState, useMemo } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
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
  Group,
  TextInput,
  Pagination,
  Box,
  rem,
  Loader,
  Center,
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
  Tabs,
  Timeline,
  Divider,
  ActionIcon,
  Badge,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import {
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaPencilAlt,
  FaShoppingBag,
  FaHistory,
  FaList,
  FaEdit,
  FaPlus,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import { usePurchasingTable } from "@/hooks/usePurchasingTable";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import { TablesInsert } from "@/types/db";
import JobDetailsDrawer from "@/components/Shared/JobDetailsDrawer/JobDetailsDrawer";
import { PurchasingTableView, PurchaseOrderItemState } from "./types";
import { OrderPartsModal } from "./subComponents/OrderPartsModal";
import { IncompletePartsModal } from "./subComponents/IncompletePartsModal";
import { StatusCell } from "./subComponents/StatusCell";

const parseCommentHistory = (rawText: string | null) => {
  if (!rawText) return [];
  const lines = rawText.split("\n");
  const history: { message: string; date: string | null }[] = [];
  let currentMessage: string[] = [];

  const timestampRegex = /\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]$/;

  lines.forEach((line) => {
    const match = line.match(timestampRegex);
    if (match) {
      const date = match[1];
      const text = line.replace(timestampRegex, "").trim();
      const fullMessage = [...currentMessage, text].join("\n").trim();
      history.push({ message: fullMessage, date });
      currentMessage = [];
    } else {
      currentMessage.push(line);
    }
  });

  if (currentMessage.length > 0) {
    history.push({ message: currentMessage.join("\n").trim(), date: null });
  }

  return history.reverse();
};

export default function PurchasingTable() {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

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
  const [
    commentModalOpened,
    { open: openCommentModal, close: closeCommentModal },
  ] = useDisclosure(false);

  const [editingComment, setEditingComment] = useState<{
    id: number;
    text: string;
  } | null>(null);
  const [newNote, setNewNote] = useState("");

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
      const finalUpdates = { ...updates };
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
        message: "Order updated successfully",
        color: "green",
      });
      setNewNote("");
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
      const { error: deleteError } = await supabase
        .from("purchase_order_items")
        .delete()
        .eq("purchase_tracking_id", trackingId)
        .eq("item_type", type);

      if (deleteError) throw deleteError;

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

        const { error: insertError } = await supabase
          .from("purchase_order_items")
          .insert(itemsToInsert);

        if (insertError) throw insertError;
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

  const markAllItemsReceivedMutation = useMutation({
    mutationFn: async ({
      id,
      keyPrefix,
      initialComment,
    }: {
      id: number;
      keyPrefix: string;
      initialComment: string;
    }) => {
      const { data: items } = await supabase
        .from("purchase_order_items")
        .select("id, quantity, part_description, company")
        .eq("purchase_tracking_id", id)
        .eq("item_type", keyPrefix);

      if (items && items.length > 0) {
        const itemUpdates = items.map((item) =>
          supabase
            .from("purchase_order_items")
            .update({
              qty_received: item.quantity,
              is_received: true,
            })
            .eq("id", item.id)
        );
        await Promise.all(itemUpdates);
      }

      const recKey = `${keyPrefix}_received_at`;
      const incKey = `${keyPrefix}_received_incomplete_at`;

      const timestamp = dayjs().format("YYYY-MM-DD HH:mm");

      let itemDetails = "";
      if (items && items.length > 0) {
        itemDetails = items
          .map(
            (i) =>
              `• ${i.quantity}x ${i.part_description || "Part"} (${
                i.company || "Unknown"
              })`
          )
          .join("\n");
      }

      const logMessage = `${keyPrefix.toUpperCase()} Marked Fully Received:\n${itemDetails}`;
      const newComment = initialComment
        ? `${initialComment}\n${logMessage} [${timestamp}]`
        : `${logMessage} [${timestamp}]`;

      const { error } = await supabase
        .from("purchase_tracking")
        .update({
          [recKey]: new Date().toISOString(),
          [incKey]: null,
          purchasing_comments: newComment,
        })
        .eq("purchase_check_id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchasing_table_view"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_order_items"] });
      notifications.show({
        title: "Updated",
        message: "Marked Complete & Items Updated",
        color: "green",
      });
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

    const updates: any = {};
    let logMsg = "";

    updates[ordKey] = new Date().toISOString();

    const itemDetails = items
      .map(
        (i) =>
          `• ${i.quantity}x ${i.part_description || "Part"} (${
            i.company || "Unknown"
          })`
      )
      .join("\n");

    if (!allReceived) {
      if (wasReceived) {
        updates[recKey] = null;
        updates[incKey] = new Date().toISOString();
        logMsg = `${keyPrefix.toUpperCase()} Updated (Incomplete):\n${itemDetails}`;
      } else {
        logMsg = `${keyPrefix.toUpperCase()} Order Placed/Updated:\n${itemDetails}`;
      }
    } else {
      logMsg = `${keyPrefix.toUpperCase()} Order Details Updated:\n${itemDetails}`;
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

    const allReceived =
      items.length > 0 &&
      items.every((i) => (i.qty_received || 0) >= (i.quantity || 0));
    const recKey = `${keyPrefix}_received_at`;
    const incKey = `${keyPrefix}_received_incomplete_at`;

    const updates: any = {};
    let logMsg = "";

    const itemDetails = items
      .map((i) => {
        const received = i.qty_received || 0;
        const total = i.quantity || 0;
        const status = received >= total ? "Done" : "Partial";
        return `• [${status}] ${received}/${total} ${
          i.part_description || "Part"
        }`;
      })
      .join("\n");

    if (allReceived) {
      updates[recKey] = new Date().toISOString();
      updates[incKey] = null;
      logMsg = `${keyPrefix.toUpperCase()} All Items Received:\n${itemDetails}`;
    } else {
      updates[recKey] = null;
      updates[incKey] = new Date().toISOString();
      logMsg = `${keyPrefix.toUpperCase()} Partial Receipt:\n${itemDetails}`;
    }

    if (comments) logMsg += `\nNote: ${comments}`;

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
              markAllItemsReceivedMutation.mutate({
                id: row.purchase_check_id!,
                keyPrefix,
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
      cell: (info) => {
        const fullComment = info.getValue();
        const parsed = useMemo(
          () => parseCommentHistory(fullComment),
          [fullComment]
        );
        const latest = parsed[0];

        return (
          <Box
            onClick={() => {
              if (info.row.original.purchase_check_id === null) return;
              setEditingComment({
                id: info.row.original.purchase_check_id,
                text: fullComment || "",
              });
              setNewNote("");
              openCommentModal();
            }}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              height: "100%",
            }}
          >
            <ActionIcon
              size="sm"
              variant="light"
              color={latest ? "violet" : "gray"}
            >
              <FaHistory size={12} />
            </ActionIcon>
            <Box style={{ flex: 1, minWidth: 0 }}>
              {latest ? (
                <Stack gap={0}>
                  <Group gap="xs">
                    <Text size="xs" fw={700} c="violet.9">
                      {latest.date
                        ? dayjs(latest.date).format("MMM D")
                        : "Note"}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {latest.message.split("\n")[0]}
                    </Text>
                  </Group>
                  {parsed.length > 1 && (
                    <Text size="10px" c="dimmed">
                      +{parsed.length - 1} more entries
                    </Text>
                  )}
                </Stack>
              ) : (
                <Text size="xs" c="dimmed" fs="italic">
                  No history
                </Text>
              )}
            </Box>
          </Box>
        );
      },
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

  const renderCommentModalContent = () => {
    if (!editingComment) return null;

    const history = parseCommentHistory(editingComment.text);

    return (
      <Tabs defaultValue="timeline" color="violet">
        <Tabs.List mb="sm">
          <Tabs.Tab value="timeline" leftSection={<FaList size={14} />}>
            Timeline
          </Tabs.Tab>
          <Tabs.Tab value="raw" leftSection={<FaEdit size={14} />}>
            Raw Editor
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="timeline">
          <ScrollArea h={400} type="auto" offsetScrollbars>
            {history.length > 0 ? (
              <Timeline
                active={-1}
                bulletSize={24}
                lineWidth={2}
                color="violet"
                p="sm"
              >
                {history.map((item, index) => (
                  <Timeline.Item
                    key={index}
                    bullet={<FaHistory size={10} />}
                    title={
                      <Text size="sm" fw={600} c="dark">
                        {item.date
                          ? dayjs(item.date).format("MMM D, YYYY · h:mm A")
                          : "Manual Note"}
                      </Text>
                    }
                  >
                    <Text
                      size="sm"
                      c="dimmed"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {item.message}
                    </Text>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Center h={100}>
                <Text c="dimmed" fs="italic">
                  No history found.
                </Text>
              </Center>
            )}
          </ScrollArea>

          <Divider my="md" label="Add New Note" labelPosition="center" />

          <Stack gap="xs">
            <Textarea
              placeholder="Type a new note here..."
              minRows={2}
              value={newNote}
              onChange={(e) => setNewNote(e.currentTarget.value)}
            />
            <Button
              fullWidth
              leftSection={<FaPlus size={12} />}
              color="violet"
              onClick={() => {
                if (!newNote.trim()) return;
                updateStatusMutation.mutate({
                  id: editingComment.id,
                  updates: {},
                  logMessage: newNote,
                  initialComment: editingComment.text,
                });
                setEditingComment((prev) =>
                  prev
                    ? {
                        ...prev,
                        text: prev.text
                          ? `${prev.text}\n${newNote} [${dayjs().format(
                              "YYYY-MM-DD HH:mm"
                            )}]`
                          : `${newNote} [${dayjs().format(
                              "YYYY-MM-DD HH:mm"
                            )}]`,
                      }
                    : null
                );
              }}
            >
              Add Note
            </Button>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="raw">
          <Stack>
            <Text size="xs" c="dimmed">
              Warning: Editing raw text may break the timeline parsing if
              timestamps are modified.
            </Text>
            <Textarea
              minRows={20}
              styles={{ input: { minHeight: "250px" } }}
              placeholder="Enter raw comments..."
              value={editingComment.text}
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
                  updateStatusMutation.mutate({
                    id: editingComment.id,
                    updates: { purchasing_comments: editingComment.text },
                  });
                  closeCommentModal();
                }}
              >
                Save Changes
              </Button>
            </Group>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    );
  };

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
      style={{
        display: "flex",
        flexDirection: "column",
        padding: rem(20),
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
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Client Name"
                placeholder="Search..."
                value={getInputFilterValue("client_name")}
                onChange={(e) =>
                  setInputFilterValue("client_name", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
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
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
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

      <ScrollArea
        style={{ flex: 1, minHeight: 0, padding: rem(10) }}
        styles={{
          thumb: {
            cursor: "pointer",
            background: "linear-gradient(135deg, #dfc9f2, #ba9bfa)",
          },
        }}
        type="auto"
      >
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
          total={table.getPageCount()}
          value={pagination.pageIndex + 1}
          onChange={(p) => table.setPageIndex(p - 1)}
          color="violet"
        />
      </Box>

      <Modal
        opened={commentModalOpened}
        onClose={closeCommentModal}
        title="Purchasing History"
        centered
        size="lg"
      >
        {renderCommentModalContent()}
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
