import { useState, useMemo } from "react";
import {
  Modal,
  Button,
  Group,
  Select,
  Stack,
  Text,
  SimpleGrid,
  Box,
  ThemeIcon,
  Badge,
  ScrollArea,
  Divider,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import {
  FaCalendarCheck,
  FaShippingFast,
  FaDoorOpen,
  FaCut,
  FaPaintBrush,
  FaCogs,
} from "react-icons/fa";
import dayjs from "dayjs";
import {
  useBulkProductionSchedule,
  BulkProductionSchedulePayload,
} from "@/hooks/useBulkProductionSchedule";

interface BulkProductionScheduleModalProps {
  opened: boolean;
  onClose: () => void;
  selectedRows: any[];
  clearSelection: () => void;
}

export default function BulkProductionScheduleModal({
  opened,
  onClose,
  selectedRows,
  clearSelection,
}: BulkProductionScheduleModalProps) {
  const { mutate, isPending } = useBulkProductionSchedule();

  const [updates, setUpdates] = useState<
    Partial<BulkProductionSchedulePayload>
  >({});

  const handleUpdate = (
    key: keyof BulkProductionSchedulePayload,
    value: any
  ) => {
    setUpdates((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const ids = selectedRows
      .map((row) => row.original.prod_id)
      .filter((id) => id !== null) as number[];

    mutate({ prodIds: ids, ...updates } as BulkProductionSchedulePayload, {
      onSuccess: () => {
        clearSelection();
        handleClose();
      },
    });
  };

  const handleClose = () => {
    setUpdates({});
    onClose();
  };

  const selectedJobNumbers = useMemo(() => {
    return selectedRows.map((row) => row.original.job_number).filter(Boolean);
  }, [selectedRows]);

  const getDateValue = (val: string | null | undefined) => {
    return val ? dayjs(val).toDate() : null;
  };

  const handleDateChange =
    (key: keyof BulkProductionSchedulePayload) =>
    (val: Date | string | null) => {
      handleUpdate(key, val ? dayjs(val).format("YYYY-MM-DD") : null);
    };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group>
          <ThemeIcon variant="light" color="violet" size="lg">
            <FaCalendarCheck />
          </ThemeIcon>
          <Text fw={600}>
            Bulk Production Schedule ({selectedRows.length} Jobs)
          </Text>
        </Group>
      }
      size="xl"
    >
      <Stack gap="lg">
        {/* Selected Job Numbers Display */}
        <Box>
          <Text size="sm" fw={500} mb={4}>
            Selected Jobs:
          </Text>
          <ScrollArea h={selectedJobNumbers.length > 10 ? 60 : "auto"}>
            <Group gap={6}>
              {selectedJobNumbers.map((jobNum) => (
                <Badge key={jobNum} variant="light" color="gray">
                  {jobNum}
                </Badge>
              ))}
            </Group>
          </ScrollArea>
        </Box>

        <Text size="sm" c="dimmed" mb={-10}>
          Adjust fields below. Leave empty to keep existing values.
        </Text>

        {/* Placement & Shipping */}
        <Box>
          <Group mb="xs" c="violet.9">
            <FaShippingFast />
            <Text fw={600} size="sm">
              Placement & Shipping
            </Text>
          </Group>
          <SimpleGrid cols={3}>
            <DateInput
              label="Received Date"
              placeholder="No Change"
              clearable
              valueFormat="YYYY-MM-DD"
              value={getDateValue(updates.received_date)}
              onChange={handleDateChange("received_date")}
            />
            <DateInput
              label="Placement Date"
              placeholder="No Change"
              clearable
              valueFormat="YYYY-MM-DD"
              value={getDateValue(updates.placement_date)}
              onChange={handleDateChange("placement_date")}
            />
            <DateInput
              label="Wrap Date"
              placeholder="No Change"
              clearable
              valueFormat="YYYY-MM-DD"
              value={getDateValue(updates.wrap_date)}
              onChange={handleDateChange("wrap_date")}
            />
            <DateInput
              label="Ship Date"
              placeholder="No Change"
              clearable
              valueFormat="YYYY-MM-DD"
              value={getDateValue(updates.ship_schedule)}
              onChange={handleDateChange("ship_schedule")}
            />
            <Select
              label="Shipping Date Status"
              placeholder="No Change"
              data={[
                { value: "unprocessed", label: "Unprocessed" },
                { value: "tentative", label: "Tentative" },
                { value: "confirmed", label: "Confirmed" },
              ]}
              clearable
              value={updates.ship_status}
              onChange={(val) => handleUpdate("ship_status", val)}
            />
          </SimpleGrid>
        </Box>

        <Divider />

        {/* Doors Schedule */}
        <Box>
          <Group mb="xs" c="blue.9">
            <FaDoorOpen />
            <Text fw={600} size="sm">
              Doors Schedule
            </Text>
          </Group>
          <SimpleGrid cols={2}>
            <DateInput
              label="Doors In Schedule"
              placeholder="No Change"
              clearable
              valueFormat="YYYY-MM-DD"
              value={getDateValue(updates.doors_in_schedule)}
              onChange={handleDateChange("doors_in_schedule")}
            />
            <DateInput
              label="Doors Out Schedule"
              placeholder="No Change"
              clearable
              valueFormat="YYYY-MM-DD"
              value={getDateValue(updates.doors_out_schedule)}
              onChange={handleDateChange("doors_out_schedule")}
            />
          </SimpleGrid>
        </Box>

        <Divider />

        {/* Cutting Schedule */}
        <Box>
          <Group mb="xs" c="orange.9">
            <FaCut />
            <Text fw={600} size="sm">
              Cutting Schedule
            </Text>
          </Group>
          <SimpleGrid cols={2}>
            <DateInput
              label="Cut Finish Schedule"
              placeholder="No Change"
              clearable
              valueFormat="YYYY-MM-DD"
              value={getDateValue(updates.cut_finish_schedule)}
              onChange={handleDateChange("cut_finish_schedule")}
            />
            <DateInput
              label="Cut Melamine Schedule"
              placeholder="No Change"
              clearable
              valueFormat="YYYY-MM-DD"
              value={getDateValue(updates.cut_melamine_schedule)}
              onChange={handleDateChange("cut_melamine_schedule")}
            />
          </SimpleGrid>
        </Box>

        <Divider />

        {/* Paint Schedule */}
        <Box>
          <Group mb="xs" c="pink.9">
            <FaPaintBrush />
            <Text fw={600} size="sm">
              Paint Schedule
            </Text>
          </Group>
          <SimpleGrid cols={2}>
            <DateInput
              label="Paint In Schedule"
              placeholder="No Change"
              clearable
              valueFormat="YYYY-MM-DD"
              value={getDateValue(updates.paint_in_schedule)}
              onChange={handleDateChange("paint_in_schedule")}
            />
            <DateInput
              label="Paint Out Schedule"
              placeholder="No Change"
              clearable
              valueFormat="YYYY-MM-DD"
              value={getDateValue(updates.paint_out_schedule)}
              onChange={handleDateChange("paint_out_schedule")}
            />
          </SimpleGrid>
        </Box>

        <Divider />

        {/* Assembly */}
        <Box>
          <Group mb="xs" c="green.9">
            <FaCogs />
            <Text fw={600} size="sm">
              Assembly
            </Text>
          </Group>
          <DateInput
            label="Assembly Schedule"
            placeholder="No Change"
            clearable
            valueFormat="YYYY-MM-DD"
            value={getDateValue(updates.assembly_schedule)}
            onChange={handleDateChange("assembly_schedule")}
            style={{ maxWidth: "50%" }}
          />
        </Box>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            loading={isPending}
            onClick={handleSave}
            color="violet"
            disabled={Object.keys(updates).length === 0}
          >
            Apply Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
