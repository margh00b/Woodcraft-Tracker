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
  ThemeIcon,
  Box,
  Grid,
  Title,
  Card,
  rem,
} from "@mantine/core";
import {
  FaUser,
  FaBoxOpen,
  FaClipboardList,
  FaTruck,
  FaLayerGroup,
  FaCommentAlt,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";
import RelatedServiceOrders from "@/components/Shared/RelatedServiceOrders/RelatedServiceOrders";

type ReadOnlySaleProps = {
  salesOrderId: number;
};

const SectionTitle = ({
  icon: Icon,
  title,
  color = "violet",
}: {
  icon: any;
  title: string;
  color?: string;
}) => (
  <Group mb="md" gap="xs">
    <ThemeIcon size="md" radius="md" variant="light" color={color}>
      <Icon size={14} />
    </ThemeIcon>
    <Text
      fw={700}
      size="sm"
      tt="uppercase"
      c="dimmed"
      style={{ letterSpacing: "0.5px" }}
    >
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
    align="flex-start"
    style={{
      borderBottom: "1px dashed #e9ecef",
      paddingBottom: 8,
      marginBottom: 8,
    }}
  >
    <Text size="sm" c="dimmed" fw={500}>
      {label}
    </Text>
    <Text
      component="div"
      size="sm"
      fw={highlight ? 700 : 500}
      c={highlight ? "dark" : "dimmed"}
      style={{ textAlign: "right", maxWidth: "60%", lineHeight: 1.4 }}
    >
      {value || "—"}
    </Text>
  </Group>
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
      <Center h="100vh" bg="gray.0">
        <Loader color="violet" type="bars" />
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
      pl={10}
      w="100%"
      style={{
        paddingRight: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #DDE6F5 0%, #E7D9F0 100%)",
      }}
    >
      <Box style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {}
        <Paper p="md" radius="md" shadow="sm" bg="white" mb="md">
          <Group justify="space-between" align="center">
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
                <Text size="sm" c="dimmed" mt={4}>
                  Created by {order.designer || "Unknown"} on{" "}
                  {dayjs(order.created_at).format("MMMM D, YYYY")}
                </Text>
              </Stack>
            </Group>
          </Group>
        </Paper>

        {}
        <Grid gutter="lg" align="stretch">
          {}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="lg" h="100%">
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <SectionTitle
                  icon={FaUser}
                  title="Client Details"
                  color="blue"
                />
                <Stack gap="xs">
                  <Box>
                    <Text size="xs" c="dimmed" fw={700} mb={4}>
                      BILLING
                    </Text>
                    <Text fw={600} size="sm">
                      {client?.lastName}
                    </Text>
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.3 }}>
                      {formatAddress(
                        client?.street,
                        client?.city,
                        client?.province,
                        client?.zip
                      )}
                    </Text>
                    <Group gap="xs" mt={8}>
                      <Badge variant="light" color="gray" size="sm">
                        {client?.phone1 || "No Phone"}
                      </Badge>
                      <Text size="sm" c="blue" td="underline">
                        {client?.email1}
                      </Text>
                    </Group>
                  </Box>

                  <Divider my="sm" />

                  <Box>
                    <Text size="xs" c="dimmed" fw={700} mb={4}>
                      SHIPPING
                    </Text>
                    <Text fw={600} size="sm">
                      {order.shipping_client_name || client?.lastName}
                    </Text>
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.3 }}>
                      {formatAddress(
                        order.shipping_street,
                        order.shipping_city,
                        order.shipping_province,
                        order.shipping_zip
                      )}
                    </Text>
                    <Group gap="xs" mt={8}>
                      {order.shipping_phone_1 && (
                        <Badge variant="light" color="gray" size="sm">
                          {order.shipping_phone_1}
                        </Badge>
                      )}
                      {order.shipping_email_1 && (
                        <Text size="sm" c="blue" td="underline">
                          {order.shipping_email_1}
                        </Text>
                      )}
                    </Group>
                  </Box>
                </Stack>
              </Card>

              <Card
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
                style={{ flex: 1 }}
              >
                <SectionTitle
                  icon={FaTruck}
                  title="Logistics & Details"
                  color="orange"
                />
                <Stack gap="xs">
                  <InfoRow label="Order Type" value={order.order_type} />
                  <InfoRow label="Delivery" value={order.delivery_type} />
                  <InfoRow
                    label="Installation"
                    value={
                      <Badge
                        variant={order.install ? "filled" : "light"}
                        color={order.install ? "teal" : "gray"}
                        size="sm"
                      >
                        {order.install ? "REQUIRED" : "NO"}
                      </Badge>
                    }
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
              </Card>
            </Stack>
          </Grid.Col>

          {}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
              <SectionTitle
                icon={FaLayerGroup}
                title="Cabinet Specifications"
                color="violet"
              />

              <Stack gap="xs">
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

                <Divider
                  label="Features & Parts"
                  labelPosition="center"
                  my="sm"
                />

                <InfoRow
                  label="Handles Supplied"
                  value={
                    <Badge
                      variant={cab.handles_supplied ? "filled" : "light"}
                      color={cab.handles_supplied ? "violet" : "gray"}
                      size="sm"
                    >
                      {cab.handles_supplied ? "YES" : "NO"}
                    </Badge>
                  }
                />
                <InfoRow
                  label="Handles Selected"
                  value={
                    <Badge
                      variant={cab.handles_selected ? "filled" : "light"}
                      color={cab.handles_selected ? "violet" : "gray"}
                      size="sm"
                    >
                      {cab.handles_selected ? "YES" : "NO"}
                    </Badge>
                  }
                />

                {(cab.glass || cab.doors_parts_only) && (
                  <>
                    {cab.glass && (
                      <InfoRow label="Glass Type" value={cab.glass_type} />
                    )}
                    {cab.doors_parts_only && (
                      <InfoRow label="Piece Count" value={cab.piece_count} />
                    )}
                  </>
                )}
              </Stack>
            </Card>
          </Grid.Col>

          {}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="lg" h="100%">
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <SectionTitle icon={FaCommentAlt} title="Notes" color="gray" />
                <Paper
                  p="sm"
                  bg="gray.0"
                  radius="sm"
                  style={{
                    minHeight: rem(120),
                    border: "1px dashed #ced4da",
                  }}
                >
                  {order.comments ? (
                    <Text
                      size="sm"
                      c="dimmed"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {order.comments}
                    </Text>
                  ) : (
                    <Center h="100%">
                      <Text size="sm" c="dimmed" fs="italic">
                        No comments available.
                      </Text>
                    </Center>
                  )}
                </Paper>
              </Card>

              {}
              <Box style={{ flex: 1 }}>
                {jobId && <RelatedServiceOrders jobId={jobId} readOnly />}
              </Box>
            </Stack>
          </Grid.Col>
        </Grid>
      </Box>
    </Container>
  );
}
