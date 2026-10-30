"use client";

import {
  Badge,
  Box,
  Divider,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { TbCheck, TbX } from "react-icons/tb";
import {
  displayValue,
  formatSectionTitle,
} from "@/utils/installationReportUtils";

type ReportDetails = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isEmpty(value: unknown): boolean {
  return (
    value == null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    (isRecord(value) && Object.keys(value).length === 0)
  );
}

function BooleanValue({ value }: { value: boolean }) {
  return (
    <Badge
      variant="light"
      color={value ? "green" : "gray"}
      radius="sm"
      size="sm"
      leftSection={value ? <TbCheck size={12} /> : <TbX size={12} />}
    >
      {value ? "Yes" : "No"}
    </Badge>
  );
}

function ValueDisplay({ value }: { value: unknown }) {
  if (typeof value === "boolean") {
    return <BooleanValue value={value} />;
  }

  if (isEmpty(value)) {
    return (
      <Text size="sm" c="dimmed">
        —
      </Text>
    );
  }

  if (Array.isArray(value)) {
    if (value.every((item) => typeof item !== "object" || item === null)) {
      return <Text size="sm">{displayValue(value)}</Text>;
    }

    return (
      <Stack gap="sm">
        {value.map((item, index) => (
          <Paper key={index} p="sm" withBorder radius="sm">
            <ValueDisplay value={item} />
          </Paper>
        ))}
      </Stack>
    );
  }

  if (isRecord(value)) {
    return <KeyValueTable entries={Object.entries(value)} />;
  }

  return (
    <Text
      size="sm"
      style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
    >
      {displayValue(value)}
    </Text>
  );
}

function KeyValueTable({ entries }: { entries: [string, unknown][] }) {
  if (!entries.length) {
    return (
      <Text size="sm" c="dimmed">
        No details recorded
      </Text>
    );
  }

  return (
    <Table
      horizontalSpacing="md"
      verticalSpacing="xs"
      withRowBorders
      styles={{
        td: {
          borderColor: "var(--mantine-color-default-border)",
        },
      }}
    >
      <Table.Tbody>
        {entries.map(([key, value]) => (
          <Table.Tr key={key}>
            <Table.Td w="38%" style={{ verticalAlign: "top" }}>
              <Text size="sm" c="dimmed">
                {formatSectionTitle(key)}
              </Text>
            </Table.Td>
            <Table.Td style={{ verticalAlign: "top" }}>
              <ValueDisplay value={value} />
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function ReportSection({
  title,
  children,
  description,
}: {
  title: string;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <Stack gap="sm">
      <Box>
        <Title order={5} fw={600}>
          {title}
        </Title>
        {description && (
          <Text size="sm" c="dimmed" mt={3}>
            {description}
          </Text>
        )}
      </Box>
      {children}
    </Stack>
  );
}

function ChecklistTable({ entries }: { entries: [string, unknown][] }) {
  return (
    <Paper withBorder radius="sm" style={{ overflow: "hidden" }}>
      <Table
        horizontalSpacing="md"
        verticalSpacing="sm"
        withRowBorders
        styles={{
          td: {
            borderColor: "var(--mantine-color-default-border)",
          },
        }}
      >
        <Table.Tbody>
          {entries.map(([key, value]) => (
            <Table.Tr key={key}>
              <Table.Td>
                <Text size="sm">{formatSectionTitle(key)}</Text>
              </Table.Td>
              <Table.Td w={110} style={{ textAlign: "right" }}>
                <ValueDisplay value={value} />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}

function MeasurementsTable({ value }: { value: unknown }) {
  if (!isRecord(value) || isEmpty(value)) {
    return <ValueDisplay value={value} />;
  }

  return (
    <Paper withBorder radius="sm" style={{ overflow: "hidden" }}>
      {Object.entries(value).map(([opening, measurements], index) => (
        <Box key={opening}>
          {index > 0 && <Divider />}
          <Box p="md">
            <Text size="sm" fw={600} mb="xs">
              {formatSectionTitle(opening)}
            </Text>
            {isRecord(measurements) ? (
              <KeyValueTable entries={Object.entries(measurements)} />
            ) : (
              <ValueDisplay value={measurements} />
            )}
          </Box>
        </Box>
      ))}
    </Paper>
  );
}

export default function InstallationReportsDetails({
  details,
}: {
  details: ReportDetails;
}) {
  const validEntries = Object.entries(details ?? {}).filter(
    ([, value]) => !isEmpty(value),
  );

  if (!validEntries.length) {
    return (
      <Text size="sm" c="dimmed" py="md">
        No report details were submitted.
      </Text>
    );
  }

  const detailsMap = Object.fromEntries(validEntries);
  const { measurements, notApplicableOpenings, notes, ...rest } = detailsMap;

  const checklistEntries: [string, unknown][] = [];
  const otherEntries: [string, unknown][] = [];

  Object.entries(rest).forEach(([key, value]) => {
    if (typeof value === "boolean") {
      checklistEntries.push([key, value]);
    } else {
      otherEntries.push([key, value]);
    }
  });

  return (
    <Stack gap="xl">
      {checklistEntries.length > 0 && (
        <ReportSection
          title="Installation Checklist"
          description="Recorded checklist responses"
        >
          <ChecklistTable entries={checklistEntries} />
        </ReportSection>
      )}

      {measurements && (
        <ReportSection
          title="Opening Measurements"
          description="Measurements recorded for each opening"
        >
          <MeasurementsTable value={measurements} />
        </ReportSection>
      )}

      {notApplicableOpenings && (
        <ReportSection
          title="Not Applicable"
          description="Openings / Areas Not Applicable to installation"
        >
          <Paper withBorder radius="sm" p="md">
            <ValueDisplay value={notApplicableOpenings} />
          </Paper>
        </ReportSection>
      )}

      {notes && (
        <ReportSection title="Installer Notes">
          <Paper withBorder radius="sm" p="md">
            <Text
              size="sm"
              style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {displayValue(notes)}
            </Text>
          </Paper>
        </ReportSection>
      )}

      {otherEntries.map(([key, value]) => (
        <ReportSection key={key} title={formatSectionTitle(key)}>
          <Paper withBorder radius="sm" p="md">
            <ValueDisplay value={value} />
          </Paper>
        </ReportSection>
      ))}
    </Stack>
  );
}
