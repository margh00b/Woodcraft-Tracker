import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Modal,
  Group,
  ThemeIcon,
  Text,
  Stack,
  Paper,
  Center,
  Loader,
  Box,
  SimpleGrid,
  NumberInput,
  Badge,
  Textarea,
  Button,
} from "@mantine/core";
import { FaExclamationCircle } from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import { PurchaseOrderItemState } from "../types";

export const IncompletePartsModal = ({
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
