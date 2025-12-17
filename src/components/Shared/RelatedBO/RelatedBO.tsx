"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Paper,
  Group,
  Text,
  Button,
  Table,
  Badge,
  Tooltip,
  Center,
  Accordion,
  ActionIcon,
  Loader,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { FaBoxOpen, FaPlus, FaCheck, FaTimes, FaPrint } from "react-icons/fa";
import dayjs from "dayjs";
import { useSupabase } from "@/hooks/useSupabase";
import { Tables } from "@/types/db";
import EditBackorderModal from "@/components/Installation/EditBOModal/EditBOModal";
import BackorderPdfPreviewModal from "../BOPdfModal/BOPdfModal";
import { colors, linearGradients } from "@/theme";

type Backorder = Tables<"backorders">;

interface RelatedBackordersProps {
  jobId: string;
  readOnly?: boolean;
  onAddBackorder?: () => void;
}

export default function RelatedBackorders({
  jobId,
  readOnly,
  onAddBackorder,
}: RelatedBackordersProps) {
  const { supabase, isAuthenticated } = useSupabase();

  const [selectedBackorder, setSelectedBackorder] = useState<Backorder | null>(
    null
  );
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);

  const [printBackorderId, setPrintBackorderId] = useState<number | null>(null);
  const [printModalOpened, { open: openPrintModal, close: closePrintModal }] =
    useDisclosure(false);

  const { data: relatedBackorders } = useQuery({
    queryKey: ["related-backorders", jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("backorders")
        .select("*")
        .eq("job_id", jobId)
        .order("date_entered", { ascending: false });

      if (error) throw error;
      return data as Backorder[];
    },
    enabled: isAuthenticated && !!jobId,
  });

  const { data: printData, isLoading: isPrintLoading } = useQuery({
    queryKey: ["backorder-print-data", printBackorderId],
    queryFn: async () => {
      if (!printBackorderId) return null;

      const { data, error } = await supabase
        .from("backorders")
        .select(
          `
          *,
          jobs:job_id (
            job_number,
            sales_orders:sales_orders (
              shipping_client_name,
              shipping_street,
              shipping_city,
              shipping_province,
              shipping_zip,
              cabinet:cabinets (
                box,
                species:species (Species),
                colors:colors (Name),
                door_styles:door_styles (name)
              )
            )
          )
        `
        )
        .eq("id", printBackorderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated && !!printBackorderId,
  });

  const handleRowClick = (bo: Backorder) => {
    if (readOnly) return;
    setSelectedBackorder(bo);
    openEditModal();
  };

  const handlePrintClick = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setPrintBackorderId(id);
    openPrintModal();
  };

  const handleClosePrint = () => {
    closePrintModal();
    setPrintBackorderId(null);
  };

  const renderRows = (orders: Backorder[]) => {
    return orders.map((bo) => (
      <Table.Tr
        key={bo.id}
        style={{ cursor: readOnly ? "default" : "pointer" }}
        onClick={() => handleRowClick(bo)}
      >
        <Table.Td w={100}>
          <Text fw={500} size="sm">
            BO-{bo.id}
          </Text>
        </Table.Td>
        <Table.Td w={140}>
          {dayjs(bo.date_entered).format("MMM D, YYYY")}
        </Table.Td>
        <Table.Td w={140}>
          {bo.due_date ? dayjs(bo.due_date).format("MMM D, YYYY") : "—"}
        </Table.Td>
        <Table.Td>
          <Tooltip label={bo.comments || "No comments"} multiline w={300}>
            <Text size="sm" c="dimmed" truncate>
              {bo.comments || "—"}
            </Text>
          </Tooltip>
        </Table.Td>
        <Table.Td w={140}>
          <Badge
            color={bo.complete ? "green" : "red"}
            variant="light"
            fullWidth
            leftSection={
              bo.complete ? <FaCheck size={10} /> : <FaTimes size={10} />
            }
          >
            {bo.complete ? "Complete" : "Pending"}
          </Badge>
        </Table.Td>
        {}
        <Table.Td w={60}>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={(e) => handlePrintClick(e, bo.id)}
            loading={isPrintLoading && printBackorderId === bo.id}
          >
            <FaPrint size={14} />
          </ActionIcon>
        </Table.Td>
      </Table.Tr>
    ));
  };

  if (!jobId) return null;

  const visibleOrders = relatedBackorders?.slice(0, 3) || [];
  const hiddenOrders = relatedBackorders?.slice(3) || [];

  return (
    <>
      <Paper p="md" radius="md" shadow="sm" withBorder bg={"gray.1"}>
        <Paper p="md" radius="md" bg={"white"}>
          <Group mb="md">
            <FaBoxOpen size={18} color={colors.orange.secondary} />
            <Text fw={600} size="lg">
              Related Backorders
            </Text>

            {!readOnly && (
              <Button
                type="button"
                size="xs"
                variant="light"
                leftSection={<FaPlus size={10} />}
                onClick={onAddBackorder}
                color="white"
                styles={{
                  root: {
                    border: "none",
                  },
                }}
                bg={linearGradients.backorder}
              >
                Add Backorder
              </Button>
            )}
          </Group>

          {relatedBackorders && relatedBackorders.length > 0 ? (
            <>
              <Table
                striped
                highlightOnHover={!readOnly}
                withTableBorder
                bg="white"
                layout="fixed"
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={100}>ID</Table.Th>
                    <Table.Th w={140}>Date Entered</Table.Th>
                    <Table.Th w={140}>Due Date</Table.Th>
                    <Table.Th>Comments</Table.Th>
                    <Table.Th w={140}>Status</Table.Th>
                    <Table.Th w={60} />
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
                      View {hiddenOrders.length} older backorders
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Table
                        striped
                        highlightOnHover={!readOnly}
                        layout="fixed"
                      >
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
                No backorders found for this job.
              </Text>
            </Center>
          )}
        </Paper>
      </Paper>

      {}
      <EditBackorderModal
        opened={editModalOpened}
        onClose={() => {
          closeEditModal();
          setSelectedBackorder(null);
        }}
        backorder={selectedBackorder}
      />

      {}
      <BackorderPdfPreviewModal
        opened={printModalOpened}
        onClose={handleClosePrint}
        data={printData}
      />
    </>
  );
}
