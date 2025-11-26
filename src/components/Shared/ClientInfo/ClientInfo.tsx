import { Paper, Text, Stack } from "@mantine/core";
import { FaUser } from "react-icons/fa";
import { Tables } from "@/types/db";

// Interface is updated to only accept the shipping details
interface ClientInfoProps {
  shipping: Partial<Tables<"sales_orders">> | null | undefined;
}

// --- Helper Component ---
const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) => (
  <Text size="sm">
    <strong>{label}:</strong> {value || "—"}
  </Text>
);

export default function ClientInfo({ shipping }: ClientInfoProps) {
  // Use shipping fields for the combined address
  const formattedAddress = [
    shipping?.shipping_street,
    shipping?.shipping_city,
    shipping?.shipping_province,
    shipping?.shipping_zip,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Paper p="md" radius="md" shadow="sm" style={{ background: "#f5f5f5" }}>
      <Text
        fw={600}
        size="lg"
        mb="md"
        c="#4A00E0"
        style={{ display: "flex", alignItems: "center" }}
      >
        <FaUser style={{ marginRight: 8 }} /> Client Details
      </Text>
      <Stack gap={3}>
        {/* Use shipping client name as the primary identifier */}
        <InfoRow label="Client" value={shipping?.shipping_client_name} />
        <InfoRow label="Phone 1" value={shipping?.shipping_phone_1} />
        <InfoRow label="Phone 2" value={shipping?.shipping_phone_2} />
        <InfoRow label="Email 1" value={shipping?.shipping_email_1} />
        <InfoRow label="Email 2" value={shipping?.shipping_email_2} />
        {/* Use the combined shipping address */}
        <InfoRow label="Address" value={formattedAddress} />
      </Stack>
    </Paper>
  );
}
