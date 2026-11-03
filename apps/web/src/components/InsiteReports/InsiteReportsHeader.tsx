"use client";

import { Button, Group, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import type { ReactNode } from "react";

export default function InsiteReportsHeader({
  title,
  description,
  icon,
  jobId,
  allReportsHref,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  jobId: number | null;
  allReportsHref: string;
}) {
  return (
    <Group justify="space-between" align="center" wrap="wrap">
      <Group gap="md" wrap="nowrap">
        <ThemeIcon size={52} radius="lg" variant="gradient" gradient={{ from: "violet.6", to: "indigo.7", deg: 135 }}>
          {icon}
        </ThemeIcon>
        <Stack gap={3}>
          <Title order={2}>{title}</Title>
          <Text size="sm" c="dimmed">{description}</Text>
        </Stack>
      </Group>
      {jobId !== null && <Button variant="default" component="a" href={allReportsHref} radius="md">View all reports</Button>}
    </Group>
  );
}
