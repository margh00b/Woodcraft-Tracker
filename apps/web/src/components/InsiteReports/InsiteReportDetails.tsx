"use client";

import {
  Badge,
  Box,
  Divider,
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

type RecordValue = Record<string, unknown>;
type DetailsVariant = "default" | "installation";

function isRecord(value: unknown): value is RecordValue {
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

function Value({ value }: { value: unknown }) {
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
      <Stack gap="xs">
        {value.map((item, index) => (
          <Paper key={index} withBorder radius="sm" p="xs">
            <Value value={item} />
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
              <Value value={value} />
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
                <Value value={value} />
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
    return <Value value={value} />;
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
              <Value value={measurements} />
            )}
          </Box>
        </Box>
      ))}
    </Paper>
  );
}

function InstallationDetails({ details }: { details: RecordValue }) {
  const validEntries = Object.entries(details).filter(
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
  const { measurements, notApplicableOpenings, notes, ...otherDetails } =
    detailsMap;

  const checklistEntries: [string, unknown][] = [];
  const additionalEntries: [string, unknown][] = [];

  Object.entries(otherDetails).forEach(([key, value]) => {
    if (typeof value === "boolean") {
      checklistEntries.push([key, value]);
    } else {
      additionalEntries.push([key, value]);
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

      {!isEmpty(measurements) && (
        <ReportSection
          title="Opening Measurements"
          description="Measurements recorded for each opening"
        >
          <MeasurementsTable value={measurements} />
        </ReportSection>
      )}

      {!isEmpty(notApplicableOpenings) && (
        <ReportSection
          title="Not Applicable"
          description="Openings / Areas Not Applicable to installation"
        >
          <Paper withBorder radius="sm" p="md">
            <Value value={notApplicableOpenings} />
          </Paper>
        </ReportSection>
      )}

      {!isEmpty(notes) && (
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

      {additionalEntries.map(([key, value]) => (
        <ReportSection key={key} title={formatSectionTitle(key)}>
          <Paper withBorder radius="sm" p="md">
            <Value value={value} />
          </Paper>
        </ReportSection>
      ))}
    </Stack>
  );
}

export default function InsiteReportDetails({
  details,
  variant = "default",
}: {
  details: Record<string, unknown>;
  variant?: DetailsVariant;
}) {
  if (variant === "installation") {
    return <InstallationDetails details={details ?? {}} />;
  }

  const entries = Object.entries(details ?? {}).filter(
    ([, value]) => !isEmpty(value),
  );

  if (!entries.length) {
    return (
      <Text size="sm" c="dimmed">
        No report details were submitted.
      </Text>
    );
  }

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
