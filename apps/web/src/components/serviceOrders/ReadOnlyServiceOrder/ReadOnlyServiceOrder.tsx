"use client";

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
  Divider,
  Card,
  rem,
  Typography,
  Table,
  SimpleGrid,
  Modal,
} from "@mantine/core";
import {
  FaUser,
  FaTools,
  FaCalendarAlt,
  FaCheck,
  FaTimes,
  FaHammer,
  FaBoxOpen,
  FaMapMarkerAlt,
  FaEye,
  FaDesktop,
  FaBuilding,
  FaDoorClosed,
  FaQuestionCircle,
  FaCheckCircle,
} from "react-icons/fa";
import { IoIosWarning } from "react-icons/io";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";
import ClientInfo from "@/components/Shared/ClientInfo/ClientInfo";
import OrderDetails from "@/components/Shared/OrderDetails/OrderDetails";
import CabinetSpecs from "@/components/Shared/CabinetSpecs/CabinetSpecs";
import { useDisclosure } from "@mantine/hooks";
import PdfPreview from "../PdfPreview/PdfPreview";

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
  const [previewOpened, { open: openPreview, close: closePreview }] =
    useDisclosure(false);

  const getLocationIcon = (value: string | null) => {
    switch (value) {
      case "In Bin":
        return <FaBoxOpen size={14} />;
      case "At Wall":
        return <FaMapMarkerAlt size={14} />;
      case "On Desk":
        return <FaDesktop size={14} />;
      case "In Office":
        return <FaBuilding size={14} />;
      case "In Closet":
        return <FaDoorClosed size={14} />;
      case "Unknown":
        return <FaQuestionCircle size={14} />;
      default:
        return null;
    }
  };

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
            homeowners_info (*),
            sales_orders:sales_orders (
              designer,
              shipping_street,
              shipping_city,
              shipping_province,
              shipping_zip,
              shipping_client_name,
              project_name,
              shipping_phone_1,
              shipping_email_1,
              order_type,
              delivery_type,
              install,
              cabinet:cabinets (
                box,
                glass,
                interior,
                drawer_box,
                drawer_hardware,
                glass_type,
                piece_count,
                doors_parts_only,
                handles_selected,
                handles_supplied,
                top_drawer_front,
                door_styles(name),
                species(Species),
                colors(Name)
              )
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
  const cabinet = job?.sales_orders?.cabinet;
  const shipping = job?.sales_orders
    ? {
        shipping_client_name: job.sales_orders.shipping_client_name,
        project_name: so?.project_name,
        shipping_phone_1: job.sales_orders.shipping_phone_1,
        shipping_phone_2: job.sales_orders.shipping_phone_2,
        shipping_email_1: job.sales_orders.shipping_email_1,
        shipping_email_2: job.sales_orders.shipping_email_2,
        shipping_street: job.sales_orders.shipping_street,
        shipping_city: job.sales_orders.shipping_city,
        shipping_province: job.sales_orders.shipping_province,
        shipping_zip: job.sales_orders.shipping_zip,
      }
    : null;
  const orderDetails = job?.sales_orders
    ? {
        order_type: job.sales_orders.order_type,
        delivery_type: job.sales_orders.delivery_type,
        install: job.sales_orders.install,
      }
    : null;
  const installer = so.installers;
  const hoInfo = job?.homeowners_info;
  const isCompleted = !!so.completed_at;
  const statusColor = isCompleted ? "green" : "violet";

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
      <Paper p="md" radius="md" shadow="sm" bg="gray.1" mb="md">
        <Group
          justify="space-between"
          align="center"
          bg="white"
          p="md"
          style={{ borderRadius: "6px" }}
        >
          <Stack>
            <Text
              fw={600}
              size="lg"
              style={{ display: "flex", alignItems: "center" }}
            >
              <FaTools size={20} style={{ marginRight: 8 }} color="#4A00E0" />
              Service Order: {so?.service_order_number || "—"}
            </Text>
            <Text size="xs" c="dimmed">
              Entered: {dayjs(so?.date_entered).format("YYYY-MM-DD") || "—"}
            </Text>
          </Stack>

          <Group>
            {so && (
              <>
                <Button
                  variant="light"
                  color="white"
                  bg="linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%"
                  rightSection={<Text size="xs">PDF</Text>}
                  onClick={openPreview}
                >
                  <FaEye />
                </Button>
              </>
            )}
            <Divider orientation="vertical" />
            <Text fw={600} size="md">
              Job # {job?.job_number || "—"}
            </Text>
          </Group>
        </Group>
      </Paper>

      <Box style={{ flex: 1, overflowY: "auto" }}>
        <Container size="100%" p={0}>
          <Paper p="md" radius="md" mb="md" bg="gray.1">
            <SimpleGrid cols={2}>
              <Stack>
                <ClientInfo shipping={shipping} />
                <OrderDetails orderDetails={orderDetails} />
              </Stack>
              <CabinetSpecs cabinet={cabinet} />
            </SimpleGrid>
          </Paper>
          <Paper p="md" radius="md" shadow="sm" bg="gray.1">
            <Grid gutter="lg">
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Stack>
                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <SectionTitle
                      icon={FaHammer}
                      title="Service Logistics"
                      color="orange"
                    />
                    <Stack gap="xs">
                      <InfoRow
                        label="Assigned Service Tech"
                        value={
                          installer ? (
                            <Text size="sm">
                              {installer.first_name} {installer.last_name}
                            </Text>
                          ) : so.installer_requested ? (
                            <Badge color="orange" variant="light">
                              Installer Requested
                            </Badge>
                          ) : (
                            <Badge color="gray" variant="dot">
                              Unassigned
                            </Badge>
                          )
                        }
                      />
                      {installer?.company_name && (
                        <InfoRow
                          label="Company"
                          value={installer.company_name}
                        />
                      )}

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

                      <InfoRow
                        label="Associated Cost"
                        value={`$${so.warranty_order_cost ?? 0}`}
                        highlight
                      />
                    </Stack>
                  </Card>

                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <SectionTitle
                      icon={FaUser}
                      title="Homeowner Info"
                      color="blue"
                    />
                    {hoInfo ? (
                      <Stack gap="xs">
                        <InfoRow label="Name" value={hoInfo.homeowner_name} />
                        <InfoRow label="Phone" value={hoInfo.homeowner_phone} />
                        <InfoRow label="Email" value={hoInfo.homeowner_email} />
                        <InfoRow
                          label="Details"
                          value={hoInfo.homeowner_details}
                        />
                      </Stack>
                    ) : (
                      <Text size="sm" c="dimmed" fs="italic">
                        No homeowner information available.
                      </Text>
                    )}
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
                      style={{
                        minHeight: rem(150),
                        border: "1px solid #e9ecef",
                      }}
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
                <Card
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  mb="md"
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
                      label="Service Date"
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
                  h="fit-content"
                >
                  <SectionTitle
                    icon={FaBoxOpen}
                    title="Required Parts"
                    color="grape"
                  />

                  {so.service_order_parts &&
                  so.service_order_parts.length > 0 ? (
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
                            <Table.Th>Location</Table.Th>
                            <Table.Th>Due Date</Table.Th>
                            <Table.Th>Status</Table.Th>
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
                              <Table.Td>
                                <Group gap="xs">
                                  {getLocationIcon(part.location)}
                                  <Text size="sm">
                                    {part.location || "Unknown"}
                                  </Text>
                                </Group>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm">
                                  {part.part_due_date
                                    ? dayjs(part.part_due_date).format(
                                        "MMM D, YYYY"
                                      )
                                    : "—"}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                {part.status === "completed" ? (
                                  <Badge
                                    color="green"
                                    variant="light"
                                    leftSection={<FaCheckCircle size={12} />}
                                  >
                                    Completed
                                  </Badge>
                                ) : (
                                  <Badge
                                    color="orange"
                                    variant="light"
                                    leftSection={<IoIosWarning size={12} />}
                                  >
                                    {part.status || "Pending"}
                                  </Badge>
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
          </Paper>
        </Container>
      </Box>
      <Modal
        opened={previewOpened}
        onClose={closePreview}
        title="Service Order Preview"
        fullScreen
        styles={{
          body: { height: "80vh" },
        }}
      >
        <PdfPreview data={so} />
      </Modal>
    </Container>
  );
}
