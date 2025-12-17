"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Paper,
  Group,
  Text,
  Button,
  Table,
  Badge,
  Accordion,
  ActionIcon,
  Modal,
  Loader,
  Center,
} from "@mantine/core";
import { FaTools, FaPlus, FaPrint } from "react-icons/fa";
import dayjs from "dayjs";
import { useSupabase } from "@/hooks/useSupabase";
import { Tables } from "@/types/db";
import { useDisclosure } from "@mantine/hooks";
import PdfPreview from "@/components/serviceOrders/PdfPreview/PdfPreview";
import { colors, linearGradients } from "@/theme";

interface RelatedServiceOrdersProps {
  jobId: number | null | undefined;
  readOnly?: boolean;
}

type ServiceOrderData = Tables<"service_orders"> & {
  service_order_parts: Tables<"service_order_parts">[];
  installers: Tables<"installers"> | null;
  jobs:
    | (Tables<"jobs"> & {
        sales_orders: Tables<"sales_orders"> & {
          cabinet: Tables<"cabinets"> | null;
        };
      })
    | null;
};

export default function RelatedServiceOrders({
  jobId,
  readOnly,
}: RelatedServiceOrdersProps) {
  const { supabase, isAuthenticated } = useSupabase();
  const router = useRouter();
  const [previewOpened, { open: openPreview, close: closePreview }] =
    useDisclosure(false);
  const [selectedPrintId, setSelectedPrintId] = useState<number | null>(null);

  const { data: relatedServiceOrders } = useQuery({
    queryKey: ["related-service-orders", jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("service_orders")
        .select("*")
        .eq("job_id", jobId)
        .order("date_entered", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated && !!jobId,
  });

  const { data: printData, isLoading: isPrintLoading } =
    useQuery<ServiceOrderData>({
      queryKey: ["service-order-pdf-data", selectedPrintId],
      queryFn: async () => {
        if (!selectedPrintId) throw new Error("No ID selected");
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
              designer,
              shipping_street,
              shipping_city,
              shipping_province,
              shipping_zip,
              shipping_client_name,
              shipping_phone_1,
              shipping_phone_2,
              shipping_email_1,
              shipping_email_2,
              order_type,
              delivery_type,
              install,
              cabinet:cabinets (
                box,
                glass,
                glaze,
                finish,
                interior,
                drawer_box,
                drawer_hardware,
                glass_type,
                piece_count,
                doors_parts_only,
                handles_selected,
                handles_supplied,
                hinge_soft_close,
                top_drawer_front,
                door_styles(name),
                species(Species),
                colors(Name)
              )
            )
          )
        `
          )
          .eq("service_order_id", selectedPrintId)
          .single();

        if (error) throw error;
        return data as unknown as ServiceOrderData;
      },
      enabled: isAuthenticated && !!selectedPrintId,
    });

  const handlePrintClick = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setSelectedPrintId(id);
    openPreview();
  };

  const handleClosePreview = () => {
    closePreview();
    setSelectedPrintId(null);
  };

  const renderRows = (orders: Tables<"service_orders">[]) => {
    return orders.map((so) => (
      <Table.Tr
        key={so.service_order_id}
        onClick={() =>
          router.push(`/dashboard/serviceorders/${so.service_order_id}`)
        }
        style={{ cursor: "pointer" }}
      >
        <Table.Td w={100}>
          <Text fw={500} size="sm">
            {so.service_order_number}
          </Text>
        </Table.Td>
        <Table.Td w={140}>
          {dayjs(so.date_entered).format("YYYY-MM-DD")}
        </Table.Td>
        <Table.Td w={140}>{dayjs(so.due_date).format("YYYY-MM-DD")}</Table.Td>
        <Table.Td w={140}>
          {so.completed_at ? (
            <Badge color="green" variant="light">
              Completed
            </Badge>
          ) : (
            <Badge color="blue" variant="light">
              Open
            </Badge>
          )}
        </Table.Td>
        <Table.Td w={60}>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={(e) => handlePrintClick(e, so.service_order_id)}
            loading={isPrintLoading && selectedPrintId === so.service_order_id}
          >
            <FaPrint size={14} />
          </ActionIcon>
        </Table.Td>
      </Table.Tr>
    ));
  };

  const visibleOrders = relatedServiceOrders?.slice(0, 3) || [];
  const hiddenOrders = relatedServiceOrders?.slice(3) || [];

  if (!jobId) return null;

  return (
    <Paper p="md" radius="md" shadow="sm" withBorder bg={"gray.1"}>
      <Paper p="md" radius="md" bg={"white"}>
        <Group mb="md">
          <FaTools size={18} color={colors.violet.primary} />
          <Text fw={600} size="lg">
            Related Service Orders
          </Text>

          {!readOnly && (
            <Button
              type="button"
              size="xs"
              variant="light"
              leftSection={<FaPlus size={10} />}
              onClick={() => {
                const targetUrl = `/dashboard/serviceorders/new/${jobId}`;
                router.push(targetUrl);
              }}
              style={{
                background: linearGradients.primary,
                color: "white",
                border: "none",
              }}
            >
              New Service Order
            </Button>
          )}
        </Group>

        {relatedServiceOrders && relatedServiceOrders.length > 0 ? (
          <>
            <Table striped highlightOnHover withTableBorder bg="white">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>SO #</Table.Th>
                  <Table.Th>Date Entered</Table.Th>
                  <Table.Th>Due Date</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{renderRows(visibleOrders)}</Table.Tbody>
            </Table>

            {hiddenOrders.length > 0 && (
              <Accordion
                variant="contained"
                radius="md"
                mt="sm"
                styles={{
                  control: {},
                  label: { fontWeight: 500, color: colors.violet.primary },
                  item: {
                    border: `1px solid ${colors.gray.border}`,
                    backgroundColor: "white",
                  },
                  content: { padding: 0 },
                }}
              >
                <Accordion.Item value="more-orders">
                  <Accordion.Control>
                    View {hiddenOrders.length} older service orders
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Table striped highlightOnHover>
                      <Table.Tbody>{renderRows(hiddenOrders)}</Table.Tbody>
                    </Table>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            )}
          </>
        ) : (
          <Center p="sm" bg="white" style={{ borderRadius: "8px" }}>
            <Text c="dimmed" size="sm">
              No service orders found for this job.
            </Text>
          </Center>
        )}
      </Paper>
      <Modal
        opened={previewOpened}
        onClose={handleClosePreview}
        title="Service Order Preview"
        fullScreen
        styles={{
          body: { height: "80vh" },
        }}
      >
        {isPrintLoading ? (
          <Center h="100%">
            <Loader size="lg" color="violet" />
          </Center>
        ) : (
          <PdfPreview data={printData} />
        )}
      </Modal>
    </Paper>
  );
}
