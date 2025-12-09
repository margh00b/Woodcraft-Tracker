"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Container,
  Paper,
  Group,
  Stack,
  Text,
  Badge,
  Divider,
  Loader,
  Center,
  Button,
  ThemeIcon,
  Box,
  Grid,
  Title,
} from "@mantine/core";
import {
  FaUser,
  FaBoxOpen,
  FaClipboardList,
  FaMoneyBillWave,
  FaTruck,
  FaLayerGroup,
  FaArrowLeft,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";
import RelatedServiceOrders from "@/components/Shared/RelatedServiceOrders/RelatedServiceOrders";

type ReadOnlySaleProps = {
  salesOrderId: number;
};

const SectionTitle = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <Group mb="sm" gap="xs">
    <ThemeIcon size="sm" radius="sm" variant="light" color="violet">
      <Icon size={12} />
    </ThemeIcon>
    <Text fw={700} size="sm" tt="uppercase" c="dimmed">
      {title}
    </Text>
  </Group>
);

const InfoRow = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) => (
  <Group
    justify="space-between"
    align="center"
    style={{
      borderBottom: "1px dashed #f1f3f5",
      paddingBottom: 4,
      minHeight: 24,
    }}
  >
    <Text size="xs" c="dimmed" fw={500}>
      {label}
    </Text>
    <Text
      size="sm"
      fw={highlight ? 700 : 500}
      c={highlight ? "dark" : "dimmed"}
      style={{ textAlign: "right", maxWidth: "65%" }}
      truncate
    >
      {value || "—"}
    </Text>
  </Group>
);

const BooleanBadge = ({ value, label }: { value: boolean; label: string }) => (
  <Badge
    variant={value ? "filled" : "outline"}
    color={value ? "violet" : "gray"}
    leftSection={value ? <FaCheck size={8} /> : <FaTimes size={8} />}
    size="xs"
    radius="sm"
    styles={{ root: { opacity: value ? 1 : 0.6 } }}
  >
    {label}
  </Badge>
);

export default function ReadOnlySale({ salesOrderId }: ReadOnlySaleProps) {
  const { supabase, isAuthenticated } = useSupabase();
  const router = useRouter();

  const { data: order, isLoading } = useQuery({
    queryKey: ["sales-order-readonly", salesOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select(
          `*, 
           client:client(*), 
           job:jobs(id, job_number),
           cabinet:cabinets(
             *, 
             species_name:species(Species), 
             color_name:colors(Name), 
             door_style_name:door_styles(name)
           )`
        )
        .eq("id", salesOrderId)
        .single();

      if (error) throw error;

      const cab: any = data.cabinet;
      const flattenedCabinet = {
        ...cab,
        species_name: Array.isArray(cab.species_name)
          ? cab.species_name[0]?.Species
          : cab.species_name?.Species,
        color_name: Array.isArray(cab.color_name)
          ? cab.color_name[0]?.Name
          : cab.color_name?.Name,
        door_style_name: Array.isArray(cab.door_style_name)
          ? cab.door_style_name[0]?.name
          : cab.door_style_name?.name,
      };

      return { ...data, cabinet: flattenedCabinet };
    },
    enabled: isAuthenticated && !!salesOrderId,
  });

  const jobId = order?.job?.id;

  if (isLoading || !order) {
    return (
      <Center h="100vh">
        <Loader color="violet" />
      </Center>
    );
  }

  const cab = order.cabinet;
  const client = order.client;
  const isSold = order.stage === "SOLD";

  const formatAddress = (
    street?: string | null,
    city?: string | null,
    prov?: string | null,
    zip?: string | null
  ) => {
    const parts = [street, city, prov, zip].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "—";
  };

  return (
    <Container
      size="100%"
      w={"100%"}
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingRight: 0,
        background: "linear-gradient(135deg, #DDE6F5 0%, #E7D9F0 100%)",
      }}
    >
      <Stack
        gap="lg"
        px={10}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <Paper p="md" radius="md" shadow="xs" withBorder>
          <Group justify="space-between" align="flex-start">
            <Group align="center">
              <ThemeIcon
                size={50}
                radius="md"
                variant="gradient"
                gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
              >
                {isSold ? (
                  <FaBoxOpen size={24} />
                ) : (
                  <FaClipboardList size={24} />
                )}
              </ThemeIcon>
              <Stack gap={0}>
                <Group gap="xs">
                  <Title order={2} style={{ lineHeight: 1 }}>
                    {isSold
                      ? `Job #${order.job?.job_number}`
                      : `Quote #${order.sales_order_number}`}
                  </Title>
                  <Badge
                    size="md"
                    variant="gradient"
                    gradient={
                      isSold
                        ? { from: "teal", to: "green", deg: 90 }
                        : { from: "blue", to: "cyan", deg: 90 }
                    }
                  >
                    {order.stage}
                  </Badge>
                  {order.is_memo && (
                    <Badge
                      size="md"
                      variant="gradient"
                      gradient={{ from: "blue", to: "cyan", deg: 90 }}
                    >
                      Memo
                    </Badge>
                  )}
                </Group>
                <Text size="sm" c="dimmed">
                  Created by {order.designer || "Unknown"} on{" "}
                  {dayjs(order.created_at).format("MMMM D, YYYY")}
                </Text>
              </Stack>
            </Group>
          </Group>
        </Paper>

        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <Paper p="md" radius="md" shadow="xs" withBorder>
                <SectionTitle icon={FaUser} title="Client Details" />
                <Stack gap="xs" mt="md">
                  <Box>
                    <Text size="xs" c="dimmed" fw={700}>
                      BILLING
                    </Text>
                    <Text fw={600}>{client?.lastName}</Text>
                    <Text size="sm" c="dimmed">
                      {formatAddress(
                        client?.street,
                        client?.city,
                        client?.province,
                        client?.zip
                      )}
                    </Text>
                    <Group gap="xs" mt={4}>
                      <Badge variant="outline" color="gray" size="xs">
                        {client?.phone1 || "No Phone"}
                      </Badge>
                      <Text size="xs" c="blue">
                        {client?.email1}
                      </Text>
                    </Group>
                  </Box>

                  <Divider />

                  <Box>
                    <Text size="xs" c="dimmed" fw={700}>
                      SHIPPING
                    </Text>
                    <Text fw={600}>
                      {order.shipping_client_name || client?.lastName}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {formatAddress(
                        order.shipping_street,
                        order.shipping_city,
                        order.shipping_province,
                        order.shipping_zip
                      )}
                    </Text>
                    <Group gap="xs" mt={4}>
                      {order.shipping_phone_1 && (
                        <Badge variant="outline" color="gray" size="xs">
                          {order.shipping_phone_1}
                        </Badge>
                      )}
                      {order.shipping_email_1 && (
                        <Text size="xs" c="blue">
                          {order.shipping_email_1}
                        </Text>
                      )}
                    </Group>
                  </Box>
                </Stack>
              </Paper>

              <Paper p="md" radius="md" shadow="xs" withBorder>
                <SectionTitle icon={FaMoneyBillWave} title="Financials" />
                <Stack gap="xs" mt="sm">
                  <InfoRow
                    label="Total"
                    value={`$${order.total?.toLocaleString() ?? "0.00"}`}
                    highlight
                  />
                  <InfoRow
                    label="Deposit"
                    value={`$${order.deposit?.toLocaleString() ?? "0.00"}`}
                  />
                  <Paper
                    p="xs"
                    radius="sm"
                    bg="gray.1"
                    style={{ border: "1px solid #dee2e6" }}
                  >
                    <Group justify="space-between">
                      <Text size="sm" fw={700}>
                        Balance Due
                      </Text>
                      <Text size="sm" fw={700} c="red.7">
                        $
                        {(
                          (order.total || 0) - (order.deposit || 0)
                        ).toLocaleString()}
                      </Text>
                    </Group>
                  </Paper>
                </Stack>
              </Paper>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="md" radius="md" shadow="xs" withBorder h="100%">
              <SectionTitle
                icon={FaLayerGroup}
                title="Cabinet Specifications"
              />

              <Stack gap="xs" mt="md">
                <InfoRow
                  label="Species"
                  value={String(cab.species_name || "")}
                />
                <InfoRow label="Color" value={String(cab.color_name || "")} />
                <InfoRow
                  label="Door Style"
                  value={String(cab.door_style_name || "")}
                />
                <InfoRow label="Top Drawer" value={cab.top_drawer_front} />
                <InfoRow label="Box" value={cab.box} />
                <InfoRow label="Interior" value={cab.interior} />
                <InfoRow label="Drawer Box" value={cab.drawer_box} />
                <InfoRow label="Drawer Hardware" value={cab.drawer_hardware} />

                <Text size="xs" fw={700} c="violet" mt="md">
                  FEATURES & PARTS
                </Text>
                <InfoRow
                  label="Handles Supplied"
                  value={cab.handles_supplied ? "Yes" : "No"}
                />
                <InfoRow
                  label="Handles Selected"
                  value={cab.handles_selected ? "Yes" : "No"}
                />

                {(cab.glass || cab.doors_parts_only) && (
                  <Stack gap={4}>
                    {cab.glass && (
                      <InfoRow label="Glass Type" value={cab.glass_type} />
                    )}
                    {cab.doors_parts_only && (
                      <InfoRow label="Piece Count" value={cab.piece_count} />
                    )}
                  </Stack>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md" h="100%">
              <Paper p="md" radius="md" shadow="xs" withBorder>
                <SectionTitle icon={FaTruck} title="Logistics & Details" />
                <Stack gap="xs" mt="sm">
                  <InfoRow label="Order Type" value={order.order_type} />
                  <InfoRow label="Delivery" value={order.delivery_type} />
                  <InfoRow
                    label="Installation"
                    value={order.install ? "Required" : "No"}
                  />
                  <InfoRow
                    label="Flooring Type"
                    value={`${order.flooring_type || "TBD"}`}
                  />
                  <InfoRow
                    label="Flooring Clearance"
                    value={`${order.flooring_clearance || ""}`}
                  />
                </Stack>

                <Divider my="md" />
                <Text size="xs" fw={700} c="violet" mt="xs">
                  Notes
                </Text>
                <Text
                  size="sm"
                  c="dimmed"
                  mih={"100px"}
                  style={{
                    whiteSpace: "pre-wrap",
                    border: "1px solid #dee2e6",
                    padding: "4px",
                  }}
                >
                  {order.comments || "No comments available."}
                </Text>
              </Paper>
              {jobId && <RelatedServiceOrders jobId={jobId} readOnly />}
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
