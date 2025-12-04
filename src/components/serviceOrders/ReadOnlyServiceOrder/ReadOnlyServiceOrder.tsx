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
  Loader,
  Center,
  Button,
  ThemeIcon,
  Box,
  Grid,
  Title,
  Table,
  Divider,
  Avatar,
  Card,
  rem,
  Typography,
} from "@mantine/core";
import {
  FaUser,
  FaTools,
  FaCalendarAlt,
  FaArrowLeft,
  FaCheck,
  FaTimes,
  FaHammer,
  FaBoxOpen,
  FaMapMarkerAlt,
  FaDollarSign,
  FaShieldAlt,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";

type ReadOnlyServiceOrderProps = {
  serviceOrderId: string;
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

const BooleanBadge = ({ value, label }: { value: boolean; label: string }) => (
  <Badge
    variant={value ? "filled" : "light"}
    color={value ? "teal" : "gray"}
    leftSection={value ? <FaCheck size={10} /> : <FaTimes size={10} />}
    size="sm"
    radius="sm"
  >
    {label}
  </Badge>
);

export default function ReadOnlyServiceOrder({
  serviceOrderId,
}: ReadOnlyServiceOrderProps) {
  const { supabase, isAuthenticated } = useSupabase();
  const router = useRouter();

  const { data: so, isLoading } = useQuery({
    queryKey: ["service_order_readonly", serviceOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select(
          `
          *,
          service_order_parts (*),
          installers:installer_id (
            first_name,
            last_name,
            company_name
          ),
          jobs:job_id (
            job_number,
            sales_orders:sales_orders (
              shipping_street,
              shipping_city,
              shipping_province,
              shipping_zip,
              shipping_client_name,
              shipping_phone_1,
              shipping_email_1
            )
          )
        `
        )
        .eq("service_order_id", Number(serviceOrderId))
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated && !!serviceOrderId,
  });

  if (isLoading || !so) {
    return (
      <Center h="100vh" bg="gray.0">
        <Loader color="violet" type="bars" />
      </Center>
    );
  }

  const job = so.jobs;
  const shipping = job?.sales_orders;
  const installer = so.installers;
  const isCompleted = !!so.completed_at;
  const statusColor = isCompleted ? "green" : "violet";

  const formatAddress = (
    street?: string | null,
    city?: string | null,
    prov?: string | null,
    zip?: string | null
  ) => {
    return [street, city, prov, zip].filter(Boolean).join(", ");
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
      }}
    >
      <Paper
        p="md"
        radius={0}
        shadow="sm"
        style={{
          borderBottom: "1px solid #e0e0e0",
          zIndex: 10,
          background: "white",
        }}
      >
        <Container size="100%" px="xs">
          <Group justify="space-between" align="center">
            <Group gap="md">
              <ThemeIcon
                size={48}
                radius="md"
                variant="gradient"
                gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
              >
                <FaTools size={22} />
              </ThemeIcon>
              <Stack gap={0}>
                <Group gap="sm" align="center">
                  <Title order={2} style={{ color: "#343a40" }}>
                    SO #{so.service_order_number}
                  </Title>
                  <Badge
                    size="lg"
                    variant="light"
                    color={statusColor}
                    radius="sm"
                    tt="uppercase"
                  >
                    {isCompleted ? "Completed" : "In Progress"}
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  Job #{job?.job_number} • Created{" "}
                  {dayjs(so.date_entered).format("MMM D, YYYY")}
                </Text>
              </Stack>
            </Group>

            <Button
              variant="default"
              leftSection={<FaArrowLeft size={12} />}
              onClick={() => router.back()}
            >
              Back
            </Button>
          </Group>
        </Container>
      </Paper>

      <Box style={{ flex: 1, overflowY: "auto" }} p="md">
        <Container size="100%" px="xs">
          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Stack>
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <SectionTitle
                    icon={FaUser}
                    title="Client Details"
                    color="blue"
                  />
                  <Stack gap="xs">
                    <Group align="center" mb={4}>
                      <Avatar color="blue" radius="xl">
                        {shipping?.shipping_client_name?.[0] || "C"}
                      </Avatar>
                      <Box>
                        <Text fw={600} size="md">
                          {shipping?.shipping_client_name || "Unknown Client"}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Primary Contact
                        </Text>
                      </Box>
                    </Group>
                    <Divider />
                    <InfoRow label="Phone" value={shipping?.shipping_phone_1} />
                    <InfoRow label="Email" value={shipping?.shipping_email_1} />
                    <Box mt="xs">
                      <Group gap={6} mb={4}>
                        <FaMapMarkerAlt size={12} color="#868e96" />
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                          Site Address
                        </Text>
                      </Group>
                      <Paper p="xs" bg="gray.0" radius="sm">
                        <Text size="sm" style={{ lineHeight: 1.4 }}>
                          {formatAddress(
                            shipping?.shipping_street,
                            shipping?.shipping_city,
                            shipping?.shipping_province,
                            shipping?.shipping_zip
                          ) || "No address provided"}
                        </Text>
                      </Paper>
                    </Box>
                  </Stack>
                </Card>

                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <SectionTitle
                    icon={FaHammer}
                    title="Service Logistics"
                    color="orange"
                  />
                  <Stack gap="xs">
                    <InfoRow
                      label="Assigned Installer"
                      value={
                        installer ? (
                          <Group gap={6} justify="flex-end">
                            <Avatar size={20} color="orange" radius="xl">
                              {installer.first_name?.[0]}
                            </Avatar>
                            <Text size="sm">
                              {installer.first_name} {installer.last_name}
                            </Text>
                          </Group>
                        ) : (
                          <Badge color="gray" variant="dot">
                            Unassigned
                          </Badge>
                        )
                      }
                    />
                    {installer?.company_name && (
                      <InfoRow label="Company" value={installer.company_name} />
                    )}
                    <InfoRow label="Service Type" value={so.service_type} />
                    <InfoRow label="Detail" value={so.service_type_detail} />
                    <InfoRow label="Service By" value={so.service_by} />
                    <Divider my={4} />
                    <InfoRow
                      label="Chargeable"
                      value={
                        <BooleanBadge
                          value={so.chargeable || false}
                          label={so.chargeable ? "YES" : "NO"}
                        />
                      }
                    />
                    <InfoRow
                      label="Warranty"
                      value={
                        <BooleanBadge
                          value={so.is_warranty_so || false}
                          label={so.is_warranty_so ? "YES" : "NO"}
                        />
                      }
                    />
                    {so.is_warranty_so && (
                      <InfoRow
                        label="Warranty Cost"
                        value={`$${so.warranty_order_cost ?? 0}`}
                        highlight
                      />
                    )}
                  </Stack>
                </Card>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Stack>
                <Card
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  style={{
                    borderTop: `4px solid var(--mantine-color-${statusColor}-5)`,
                  }}
                >
                  <SectionTitle
                    icon={FaCalendarAlt}
                    title="Schedule"
                    color={statusColor}
                  />
                  <Stack gap="xs">
                    <InfoRow
                      label="Due Date"
                      value={
                        so.due_date ? (
                          <Text c={isCompleted ? "dimmed" : "red.7"} fw={700}>
                            {dayjs(so.due_date).format("MMM D, YYYY")}
                          </Text>
                        ) : (
                          "TBD"
                        )
                      }
                    />
                    <InfoRow
                      label="Est. Hours"
                      value={
                        so.hours_estimated ? `${so.hours_estimated} hrs` : "0"
                      }
                    />
                    <InfoRow
                      label="Completed"
                      value={
                        so.completed_at ? (
                          <Badge color="teal" variant="light">
                            {dayjs(so.completed_at).format("MMM D, YYYY")}
                          </Badge>
                        ) : (
                          "Pending"
                        )
                      }
                    />
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
                    icon={FaTools}
                    title="Work Description"
                    color="gray"
                  />
                  <Paper
                    p="sm"
                    bg="gray.0"
                    radius="sm"
                    style={{ minHeight: rem(150), border: "1px solid #e9ecef" }}
                  >
                    {so.comments ? (
                      <Typography p={0}>
                        <div
                          dangerouslySetInnerHTML={{ __html: so.comments }}
                          style={{ fontSize: "14px", color: "#495057" }}
                        />
                      </Typography>
                    ) : (
                      <Center h="100%">
                        <Text size="sm" c="dimmed" fs="italic">
                          No description provided.
                        </Text>
                      </Center>
                    )}
                  </Paper>
                </Card>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                <SectionTitle
                  icon={FaBoxOpen}
                  title="Required Parts"
                  color="grape"
                />

                {so.service_order_parts && so.service_order_parts.length > 0 ? (
                  <Box
                    style={{
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    <Table striped highlightOnHover verticalSpacing="sm">
                      <Table.Thead bg="gray.1">
                        <Table.Tr>
                          <Table.Th w={60} style={{ textAlign: "center" }}>
                            Qty
                          </Table.Th>
                          <Table.Th>Part Details</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {so.service_order_parts.map((part: any) => (
                          <Table.Tr key={part.id}>
                            <Table.Td style={{ textAlign: "center" }}>
                              <Badge
                                variant="outline"
                                color="dark"
                                size="md"
                                radius="sm"
                              >
                                {part.qty}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" fw={600}>
                                {part.part}
                              </Text>
                              {part.description && (
                                <Text
                                  size="xs"
                                  c="dimmed"
                                  style={{ lineHeight: 1.2 }}
                                >
                                  {part.description}
                                </Text>
                              )}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Box>
                ) : (
                  <Center
                    p="xl"
                    bg="gray.0"
                    mt="md"
                    style={{
                      borderRadius: 8,
                      flexDirection: "column",
                      border: "1px dashed #ced4da",
                    }}
                  >
                    <ThemeIcon
                      color="gray"
                      variant="light"
                      size="xl"
                      radius="xl"
                      mb="sm"
                    >
                      <FaBoxOpen size={24} />
                    </ThemeIcon>
                    <Text c="dimmed" size="sm" fw={500}>
                      No parts listed for this order.
                    </Text>
                  </Center>
                )}
              </Card>
            </Grid.Col>
          </Grid>
        </Container>
      </Box>
    </Container>
  );
}
