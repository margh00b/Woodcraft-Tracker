import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Modal,
  Group,
  ThemeIcon,
  Text,
  Stack,
  Center,
  Loader,
  Box,
  Paper,
  SimpleGrid,
  TextInput,
  NumberInput,
  ActionIcon,
  Button,
} from "@mantine/core";
import { FaList, FaTrash, FaPlus, FaCheck } from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import { PurchaseOrderItemState } from "../types";

export const OrderPartsModal = ({
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
                {(itemType === "handles" || itemType === "acc") && (
                  <Text
                    size="xs"
                    fw={700}
                    c="dimmed"
                    style={{ gridColumn: "span 3" }}
                  >
                    PO #
                  </Text>
                )}
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  style={{ gridColumn: "span 2" }}
                >
                  QTY
                </Text>
                {itemType === "handles" || itemType === "acc" ? (
                  <Text
                    size="xs"
                    fw={700}
                    c="dimmed"
                    style={{ gridColumn: "span 5" }}
                  >
                    PART DESCRIPTION
                  </Text>
                ) : (
                  <Text
                    size="xs"
                    fw={700}
                    c="dimmed"
                    style={{ gridColumn: "span 8" }}
                  >
                    PART DESCRIPTION
                  </Text>
                )}

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
                  {(itemType === "handles" || itemType === "acc") && (
                    <TextInput
                      style={{ gridColumn: "span 3" }}
                      value={item.po_number || ""}
                      onChange={(e) =>
                        updateItem(idx, "po_number", e.currentTarget.value)
                      }
                      placeholder="PO #"
                      disabled={!isPoEditable}
                    />
                  )}
                  <NumberInput
                    style={{ gridColumn: "span 2" }}
                    min={1}
                    value={item.quantity || 1}
                    onChange={(v) => updateItem(idx, "quantity", v)}
                    placeholder="1"
                  />
                  {itemType === "handles" || itemType === "acc" ? (
                    <TextInput
                      style={{ gridColumn: "span 5" }}
                      value={item.part_description || ""}
                      onChange={(e) =>
                        updateItem(
                          idx,
                          "part_description",
                          e.currentTarget.value
                        )
                      }
                      placeholder="Description"
                    />
                  ) : (
                    <TextInput
                      style={{ gridColumn: "span 8" }}
                      value={item.part_description || ""}
                      onChange={(e) =>
                        updateItem(
                          idx,
                          "part_description",
                          e.currentTarget.value
                        )
                      }
                      placeholder="Description"
                    />
                  )}
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
