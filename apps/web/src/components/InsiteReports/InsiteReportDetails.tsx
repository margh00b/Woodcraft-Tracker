"use client";

import { Badge, Paper, Stack, Table, Text } from "@mantine/core";
import { TbCheck, TbX } from "react-icons/tb";
import {
  displayValue,
  formatSectionTitle,
} from "@/utils/installationReportUtils";

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isEmpty = (value: unknown) =>
  value == null ||
  value === "" ||
  (Array.isArray(value) && !value.length) ||
  (isRecord(value) && !Object.keys(value).length);

function Value({ value }: { value: unknown }) {
  if (typeof value === "boolean")
    return (
      <Badge
        variant="light"
        color={value ? "green" : "gray"}
        leftSection={value ? <TbCheck size={12} /> : <TbX size={12} />}
      >
        {value ? "Yes" : "No"}
      </Badge>
    );
  if (isEmpty(value))
    return (
      <Text size="sm" c="dimmed">
        —
      </Text>
    );
  if (Array.isArray(value))
    return (
      <Stack gap="xs">
        {value.map((item, index) => (
          <Paper key={index} withBorder radius="sm" p="xs">
            <Value value={item} />
          </Paper>
        ))}
      </Stack>
    );
  if (isRecord(value))
    return (
      <Table horizontalSpacing="md" verticalSpacing="xs">
        <Table.Tbody>
          {Object.entries(value).map(([key, nested]) => (
            <Table.Tr key={key}>
              <Table.Td w="38%">
                <Text size="sm" c="dimmed">
                  {formatSectionTitle(key)}
                </Text>
              </Table.Td>
              <Table.Td>
                <Value value={nested} />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    );
  return (
    <Text
      size="sm"
      style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
    >
      {displayValue(value)}
    </Text>
  );
}

export default function InsiteReportDetails({
  details,
}: {
  details: Record<string, unknown>;
}) {
  const entries = Object.entries(details ?? {}).filter(
    ([, value]) => !isEmpty(value),
  );
  if (!entries.length)
    return (
      <Text size="sm" c="dimmed">
        No report details were submitted.
      </Text>
    );
  return (
    <Stack gap="md">
      {entries.map(([key, value]) => (
        <Stack key={key} gap="xs">
          <Text fw={600} size="sm">
            {formatSectionTitle(key)}
          </Text>
          <Paper withBorder radius="md" p="md">
            <Value value={value} />
          </Paper>
        </Stack>
      ))}
    </Stack>
  );
}
