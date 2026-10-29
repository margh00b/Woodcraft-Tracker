"use client";

import { Button, Group, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { TbClipboardCheck } from "react-icons/tb";

export default function InstallationReportsHeader({
  jobId,
}: {
  jobId: number | null;
}) {
  return (
    <Group justify="space-between" align="center" wrap="wrap">
      <Group gap="md" wrap="nowrap">
        <ThemeIcon
          size={52}
          radius="lg"
          variant="gradient"
          gradient={{ from: "violet.6", to: "indigo.7", deg: 135 }}
        >
          <TbClipboardCheck size={27} />
        </ThemeIcon>

        <Stack gap={3}>
          <Title order={2}>Installation Reports</Title>
          <Text size="sm" c="dimmed">
            Review installation reports submitted through Insite.
          </Text>
        </Stack>
      </Group>

      {jobId !== null && (
        <Button
          variant="default"
          component="a"
          href="/dashboard/installation-reports"
          radius="md"
        >
          View all reports
        </Button>
      )}
    </Group>
  );
}