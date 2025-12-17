import { Paper, Text, Group, Badge, SimpleGrid, Stack } from "@mantine/core";
import { FaClipboardList, FaCheck, FaTimes } from "react-icons/fa";
import { Tables } from "@/types/db";
import { colors } from "@/theme";

interface OrderDetailsProps {
  orderDetails: Partial<Tables<"sales_orders">> | null | undefined;
}

const InfoItem = ({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) => (
  <Stack gap={2}>
    <Text size="xs" c="dimmed" fw={700} tt="uppercase">
      {label}
    </Text>
    <Text component="div" size="sm" fw={600} style={{ lineHeight: 1.2 }}>
      {value || "—"}
    </Text>
  </Stack>
);

export default function OrderDetails({ orderDetails }: OrderDetailsProps) {
  if (!orderDetails) return null;

  return (
    <Paper p="md" radius="md" shadow="sm" style={{ background: "#ffffffff" }}>
      <Text
        fw={600}
        size="lg"
        mb="md"
        c={colors.violet.primary}
        style={{ display: "flex", alignItems: "center" }}
      >
        <FaClipboardList style={{ marginRight: 8 }} /> Order Details
      </Text>

      {}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <InfoItem label="Order Type" value={orderDetails.order_type} />
        <InfoItem label="Delivery Type" value={orderDetails.delivery_type} />
        <InfoItem
          label="Installation"
          value={
            orderDetails.install !== undefined &&
            orderDetails.install !== null ? (
              <Badge
                size="sm"
                variant="light"
                color={orderDetails.install ? "teal" : "gray"}
                leftSection={
                  orderDetails.install ? (
                    <FaCheck size={8} />
                  ) : (
                    <FaTimes size={8} />
                  )
                }
              >
                {orderDetails.install ? "Required" : "Not Required"}
              </Badge>
            ) : (
              "—"
            )
          }
        />
      </SimpleGrid>
    </Paper>
  );
}
