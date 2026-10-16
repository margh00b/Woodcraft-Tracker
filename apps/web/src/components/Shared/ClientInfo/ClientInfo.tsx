import { Paper, Text, Stack } from "@mantine/core";
import { FaUser } from "react-icons/fa";
import { Tables } from "@/types/db";
import { colors } from "@/theme";
import { ReactNode } from "react";

interface ClientInfoProps {
  shipping: Partial<Tables<"sales_orders">> | null | undefined;
}

const InfoRow = ({ label, value }: { label: string; value?: ReactNode }) => (
  <Text size="sm">
    <strong>{label}:</strong> {value || "—"}
  </Text>
);

export default function ClientInfo({ shipping }: ClientInfoProps) {
  const formattedAddress = [
    shipping?.shipping_street,
    shipping?.shipping_city,
    shipping?.shipping_province,
    shipping?.shipping_zip,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Paper p="md" radius="md" shadow="sm" style={{ background: "#ffffffff" }}>
      <Text
        fw={600}
        size="lg"
        mb="md"
        c={colors.violet.primary}
        style={{ display: "flex", alignItems: "center" }}
      >
        <FaUser style={{ marginRight: 8 }} /> Client Details
      </Text>
      <Stack gap={3}>
        <InfoRow
          label="Client"
          value={
            shipping?.project_name ? (
              <>
                <Text span fs="italic">
                  {shipping.project_name}
                </Text>
                {" - "}
                {shipping.shipping_client_name}
              </>
            ) : (
              shipping?.shipping_client_name
            )
          }
        />
        <InfoRow label="Phone 1" value={shipping?.shipping_phone_1} />
        <InfoRow label="Phone 2" value={shipping?.shipping_phone_2} />
        <InfoRow label="Email 1" value={shipping?.shipping_email_1} />
        <InfoRow label="Email 2" value={shipping?.shipping_email_2} />
        <InfoRow label="Address" value={formattedAddress} />
      </Stack>
    </Paper>
  );
}
