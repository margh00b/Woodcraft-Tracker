"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Drawer,
  Loader,
  Center,
  Text,
  Stack,
  Group,
  Badge,
  ThemeIcon,
  Paper,
  Divider,
  Box,
  SimpleGrid,
  ScrollArea,
  Title,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  FaCheckCircle,
  FaClipboardList,
  FaFire,
  FaShippingFast,
  FaUserTie,
  FaExternalLinkAlt,
  FaRegCircle,
} from "react-icons/fa";
import dayjs from "dayjs";
import { useSupabase } from "@/hooks/useSupabase";
import { Tables } from "@/types/db";
import Link from "next/link";
import PlantActuals from "@/components/Shared/PlantActuals/PlantActuals";

import ClientInfo from "@/components/Shared/ClientInfo/ClientInfo";
import CabinetSpecs from "@/components/Shared/CabinetSpecs/CabinetSpecs";
import OrderDetails from "@/components/Shared/OrderDetails/OrderDetails";
import RelatedServiceOrders from "@/components/Shared/RelatedServiceOrders/RelatedServiceOrders";
import RelatedBackorders from "@/components/Shared/RelatedBO/RelatedBO";
import JobAttachments from "../JobAttachments/JobAttachments";
import { usePermissions } from "@/hooks/usePermissions";
import { IoIosWarning } from "react-icons/io";
import { colors } from "@/theme";

type JoinedCabinet = Tables<"cabinets"> & {
  door_styles: { name: string } | null;
  species: { Species: string } | null;
  colors: { Name: string } | null;
};

type FullJobData = Tables<"jobs"> & {
  sales_orders:
    | (Tables<"sales_orders"> & {
        client: Tables<"client"> | null;
        cabinet: JoinedCabinet | null;
      })
    | null;
  production_schedule: Tables<"production_schedule"> | null;
  installation:
    | (Tables<"installation"> & {
        installer: Tables<"installers"> | null;
      })
    | null;
};

interface JobDetailsDrawerProps {
  jobId: number | null;
  opened: boolean;
  onClose: () => void;
}

const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <Text
    fw={600}
    size="lg"
    mb="md"
    c={colors.violet.primary}
    style={{ display: "flex", alignItems: "center" }}
  >
    <Icon style={{ marginRight: 8 }} /> {title}
  </Text>
);

const SectionCard = ({ children }: { children: React.ReactNode }) => (
  <Paper p="md" radius="md" withBorder shadow="sm" bg="white">
    {children}
  </Paper>
);

const CompactDateBlock = ({
  label,
  date,
  color = "gray",
  rightSection,
}: {
  label: string;
  date: string | null | undefined;
  color?: string;
  rightSection?: React.ReactNode;
}) => (
  <Box
    p={8}
    bg="gray.0"
    style={{
      borderRadius: 6,
      border: "1px solid #e9ecef",
      borderLeft: date
        ? `3px solid var(--mantine-color-${color}-5)`
        : undefined,
    }}
  >
    <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb={2}>
      {label}
    </Text>
    <Group gap={6} align="center">
      <Text size="sm" fw={600} c={date ? "dark" : "dimmed"}>
        {date ? dayjs(date).format("MMM D, YYYY") : "—"}
      </Text>
      {rightSection}
    </Group>
  </Box>
);

export default function JobDetailsDrawer({
  jobId,
  opened,
  onClose,
}: JobDetailsDrawerProps) {
  const { supabase, isAuthenticated } = useSupabase();
  const permissions = usePermissions();

  const { data: job, isLoading } = useQuery<FullJobData>({
    queryKey: ["job_quick_view", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("Job ID is required");
      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
          *,
          sales_orders!fk_jobs_sales_order_id (
            *,
            cabinet:cabinet_id (
              *,
              door_styles(name),
              species(Species),
              colors(Name)
            )
          ),
          production_schedule:prod_id (*),
          installation:installation_id (
            *,
            installer:installer_id (*)
          )
        `
        )
        .eq("id", jobId)
        .single();

      if (error) throw error;
      return data as unknown as FullJobData;
    },
    enabled: isAuthenticated && !!jobId && opened,
  });

  const renderContent = () => {
    if (isLoading)
      return (
        <Center h="100%">
          <Loader type="bars" color="violet" />
        </Center>
      );
    if (!job)
      return (
        <Center h="100%">
          <Text c="dimmed">Job not found.</Text>
        </Center>
      );

    const so = job.sales_orders;
    const cabinet = so?.cabinet;
    const prod = job.production_schedule;
    const install = job.installation;

    return (
      <Stack gap="lg" pb="xl">
        {}
        <SectionCard>
          <Group justify="space-between" align="flex-start">
            <Group align="flex-start" gap="md">
              <ThemeIcon
                size={56}
                radius="md"
                variant="gradient"
                gradient={{
                  from: colors.violet.secondary,
                  to: colors.violet.primary,
                  deg: 135,
                }}
              >
                <FaClipboardList size={28} />
              </ThemeIcon>
              <Stack gap={2}>
                <Group gap="xs" align="center">
                  <Title order={3} style={{ lineHeight: 1.2 }}>
                    Job #{job.job_number}
                  </Title>
                  {prod?.rush && (
                    <Badge
                      color="red"
                      variant="filled"
                      size="sm"
                      leftSection={<FaFire size={10} />}
                    >
                      RUSH
                    </Badge>
                  )}
                </Group>
                <Text size="md" fw={500} c="dark">
                  {so?.shipping_client_name}
                </Text>
                <Text size="sm" c="dimmed">
                  Designer: {so?.designer || "N/A"}
                </Text>
                <Text size="xs" c="dimmed">
                  Created On: {dayjs(so?.created_at).format("MMM D, YYYY")}
                </Text>
              </Stack>
            </Group>

            <Group>
              <Tooltip label="Open Full Edit Page">
                <ActionIcon
                  component={Link}
                  href={`/dashboard/sales/editsale/${so?.id}`}
                  variant="light"
                  color="violet"
                  size="xl"
                  radius="md"
                  onClick={onClose}
                >
                  <FaExternalLinkAlt size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          <Box mt="lg">
            <JobAttachments jobId={jobId as number} />
          </Box>
        </SectionCard>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <Stack gap="lg">
            <ClientInfo
              shipping={{
                shipping_client_name: so?.shipping_client_name,
                project_name: so?.project_name,
                shipping_phone_1: so?.shipping_phone_1,
                shipping_email_1: so?.shipping_email_1,
                shipping_street: so?.shipping_street,
                shipping_city: so?.shipping_city,
                shipping_zip: so?.shipping_zip,
                shipping_phone_2: so?.shipping_phone_2,
                shipping_email_2: so?.shipping_email_2,
                shipping_province: so?.shipping_province,
              }}
            />
            <OrderDetails
              orderDetails={{
                order_type: so?.order_type,
                delivery_type: so?.delivery_type,
                install: so?.install,
              }}
            />
          </Stack>
          <CabinetSpecs cabinet={cabinet} />
        </SimpleGrid>

        {}
        <SectionCard>
          <Box mb="lg">
            <PlantActuals
              schedule={prod}
              isCanopyRequired={so?.is_canopy_required}
              isWoodtopRequired={so?.is_woodtop_required}
              isCustomCabRequired={so?.is_custom_cab_required}
              variant="compact"
            />
          </Box>

          <Divider
            mb="lg"
            label="Production & Shipping Schedule"
            labelPosition="center"
          />

          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            <CompactDateBlock label="Placement" date={prod?.placement_date} />
            <CompactDateBlock label="Wrap Date" date={install?.wrap_date} />
            <CompactDateBlock
              label="Ship Date"
              date={prod?.ship_schedule}
              color="blue"
              rightSection={
                <>
                  {prod?.ship_status === "confirmed" && (
                    <Tooltip label="Confirmed Ship Date">
                      <Box style={{ display: "flex" }}>
                        <FaCheckCircle size={14} color={colors.green.primary} />
                      </Box>
                    </Tooltip>
                  )}
                  {prod?.ship_status === "tentative" && (
                    <Tooltip label="Tentative Ship Date">
                      <Box style={{ display: "flex" }}>
                        <IoIosWarning size={14} color={colors.orange.primary} />
                      </Box>
                    </Tooltip>
                  )}
                </>
              }
            />

            <Box
              p={8}
              bg="gray.0"
              style={{
                borderRadius: 6,
                border: "1px solid #e9ecef",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb={4}>
                Shipped
              </Text>
              {!install?.partially_shipped ? (
                <Badge
                  color={install?.has_shipped ? "green" : "gray"}
                  variant="dot"
                  size="sm"
                >
                  {install?.has_shipped ? "YES" : "NO"}
                </Badge>
              ) : (
                <Badge color="orange" variant="light" size="sm">
                  PARTIAL
                </Badge>
              )}
            </Box>
          </SimpleGrid>
        </SectionCard>

        {}
        <SectionCard>
          <SectionHeader
            icon={FaShippingFast}
            title="Installation & Logistics"
          />

          <Stack gap="md">
            <Group
              justify="space-between"
              p="xs"
              bg="gray.0"
              style={{ borderRadius: 8 }}
            >
              <Text size="sm" c="dimmed" fw={600}>
                Assigned Installer
              </Text>
              <Group gap="xs">
                <FaUserTie size={14} color="gray" />
                <Text size="sm" fw={700} c="dark">
                  {install?.installer?.company_name ||
                    install?.installer?.first_name ||
                    "Unassigned"}
                </Text>
              </Group>
            </Group>

            <SimpleGrid cols={2} spacing="md">
              <CompactDateBlock
                label="Install Date"
                date={install?.installation_date}
                color="orange"
                rightSection={
                  install?.installation_completed && (
                    <Tooltip label="Installation Complete">
                      <Box style={{ display: "flex" }}>
                        <FaCheckCircle size={14} color={colors.green.primary} />
                      </Box>
                    </Tooltip>
                  )
                }
              />
              <CompactDateBlock
                label="Inspect Date"
                date={install?.inspection_date}
                color="cyan"
                rightSection={
                  install?.inspection_completed && (
                    <Tooltip label="Inspection Complete">
                      <Box style={{ display: "flex" }}>
                        <FaCheckCircle size={14} color={colors.blue.primary} />
                      </Box>
                    </Tooltip>
                  )
                }
              />
            </SimpleGrid>
          </Stack>
        </SectionCard>

        {}
        <SectionCard>
          <SectionHeader icon={FaClipboardList} title="Comments & Notes" />

          <Stack gap="lg">
            <Box>
              <Text size="sm" fw={700} c="dark" mb={4}>
                Sales Order Comments
              </Text>
              <Paper p="sm" withBorder bg="gray.0" radius="md">
                <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                  {so?.comments || "No sales comments available."}
                </Text>
              </Paper>
            </Box>

            <Box>
              <Text size="sm" fw={700} c="dark" mb={4}>
                Production Notes
              </Text>
              <Paper p="sm" withBorder bg="gray.0" radius="md">
                <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                  {prod?.production_comments ||
                    "No production notes available."}
                </Text>
              </Paper>
            </Box>

            <Box>
              <Text size="sm" fw={700} c="dark" mb={4}>
                Installation/Site Notes
              </Text>
              <Paper p="sm" withBorder bg="gray.0" radius="md">
                <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                  {install?.installation_notes ||
                    "No installation notes available."}
                </Text>
              </Paper>
            </Box>
          </Stack>
        </SectionCard>

        <RelatedServiceOrders
          jobId={jobId}
          readOnly={!(permissions.isService || permissions.isAdmin)}
        />
        <RelatedBackorders jobId={String(jobId)} readOnly />
      </Stack>
    );
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="xl"
      zIndex={999}
      title={
        <Text
          fw={700}
          size="xl"
          c="dark.4"
          style={{ fontFamily: "var(--mantine-font-family)" }}
        >
          Job Details
        </Text>
      }
      overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
      styles={{
        body: { backgroundColor: colors.gray.backgroundAlt },
        header: { borderBottom: `1px solid ${colors.gray.borderLight}` },
        content: { overflowY: "hidden" },
      }}
    >
      <ScrollArea h="calc(100vh - 80px)" type="hover">
        {renderContent()}
      </ScrollArea>
    </Drawer>
  );
}
