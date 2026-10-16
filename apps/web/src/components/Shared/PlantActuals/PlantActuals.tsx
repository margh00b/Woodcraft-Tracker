"use client";

import {
  Box,
  Paper,
  Text,
  Timeline,
  Center,
  Group,
  Stack,
  Badge,
  ThemeIcon,
} from "@mantine/core";
import {
  FaCheckCircle,
  FaCogs,
  FaCut,
  FaDoorOpen,
  FaIndustry,
  FaPaintBrush,
  FaCalendarCheck,
  FaClock,
} from "react-icons/fa";
import dayjs from "dayjs";
import { useMemo } from "react";
import { Tables } from "@/types/db";
import { colors } from "@/theme";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
type ActualKey =
  | "in_plant_actual"
  | "in_plant_cabinets_actual"
  | "doors_completed_actual"
  | "drawer_completed_actual"
  | "cut_melamine_completed_actual"
  | "paint_doors_completed_actual"
  | "paint_canopy_completed_actual"
  | "paint_cust_cab_completed_actual"
  | "canopy_completed_actual"
  | "woodtop_completed_actual"
  | "panel_completed_actual"
  | "assembly_completed_actual";

type GroupConfig = {
  title: string;
  icon: React.ReactNode;
  steps: {
    key: ActualKey;
    label: string;
    requiredRule?: "always" | "custom" | "canopy" | "woodtop";
  }[];
};

const GROUPS_CONFIG: GroupConfig[] = [
  {
    title: "In Plant",
    icon: <FaIndustry size={14} />,
    steps: [
      { key: "in_plant_actual", label: "Doors" },
      { key: "in_plant_cabinets_actual", label: "Cabinets" },
    ],
  },
  {
    title: "Cut",
    icon: <FaCut size={14} />,
    steps: [{ key: "cut_melamine_completed_actual", label: "Melamine" }],
  },
  {
    title: "Prep",
    icon: <FaDoorOpen size={14} />,
    steps: [
      { key: "panel_completed_actual", label: "Panels" },
      { key: "doors_completed_actual", label: "Doors" },
      { key: "drawer_completed_actual", label: "Drawers" },

      {
        key: "woodtop_completed_actual",
        label: "Woodtop",
        requiredRule: "woodtop",
      },
      {
        key: "canopy_completed_actual",
        label: "Canopy",
        requiredRule: "canopy",
      },
    ],
  },
  {
    title: "Paint",
    icon: <FaPaintBrush size={14} />,
    steps: [
      { key: "paint_doors_completed_actual", label: "Doors/Panels" },
      {
        key: "paint_canopy_completed_actual",
        label: "Canopy",
        requiredRule: "canopy",
      },
      {
        key: "paint_cust_cab_completed_actual",
        label: "Custom",
        requiredRule: "custom",
      },
    ],
  },
  {
    title: "Assembly",
    icon: <FaCogs size={14} />,
    steps: [{ key: "assembly_completed_actual", label: "Main Assembly" }],
  },
];

interface PlantActualsProps {
  schedule: Partial<Tables<"production_schedule">> | null | undefined;
  title?: string;
  showTitle?: boolean | null;
  isCanopyRequired?: boolean | null;
  isWoodtopRequired?: boolean | null;
  isCustomCabRequired?: boolean | null;
  variant?: "default" | "compact";
}

export default function PlantActuals({
  schedule,
  title = "Plant Progress",
  showTitle = true,
  isCanopyRequired,
  isWoodtopRequired,
  isCustomCabRequired,
  variant = "default",
}: PlantActualsProps) {
  const groups = useMemo(() => {
    if (!schedule) return [];

    return GROUPS_CONFIG.map((group) => {
      const activeSteps = group.steps.filter((step) => {
        if (step.requiredRule === "canopy") return !!isCanopyRequired;
        if (step.requiredRule === "woodtop") return !!isWoodtopRequired;
        if (step.requiredRule === "custom") return !!isCustomCabRequired;
        return true;
      });

      if (activeSteps.length === 0) return null;

      const stepsWithStatus = activeSteps.map((step) => {
        const dateStr = schedule[step.key] as string | null;
        const isCompleted = !!dateStr;
        return {
          ...step,
          isCompleted,
          date: dateStr,
        };
      });

      const allCompleted = stepsWithStatus.every((s) => s.isCompleted);
      const someCompleted = stepsWithStatus.some((s) => s.isCompleted);

      return {
        ...group,
        steps: stepsWithStatus,
        status: allCompleted
          ? "completed"
          : someCompleted
          ? "in-progress"
          : "pending",
      };
    }).filter(Boolean);
  }, [schedule, isCanopyRequired, isWoodtopRequired, isCustomCabRequired]);

  if (!schedule) return null;

  if (variant === "compact") {
    return (
      <Paper radius="md" shadow="unset">
        {showTitle && (
          <Group mb="xs" gap="xs">
            <FaCalendarCheck
              color={colors.violet.primary}
              size={18}
              radius="md"
            />

            <Text fw={700} size="lg" c={colors.violet.primary}>
              {title}
            </Text>
          </Group>
        )}
        <Group
          align="flex-start"
          gap="md"
          mt={20}
          style={{ overflowX: "auto", flexWrap: "nowrap", paddingBottom: 4 }}
        >
          {groups.map((group, idx) => {
            if (!group) return null;
            const isGroupComplete = group.status === "completed";

            return (
              <Box key={group.title} style={{ minWidth: 120 }}>
                <Group gap={6} mb={4}>
                  <ThemeIcon
                    size="sm"
                    radius="xl"
                    variant={isGroupComplete ? "filled" : "light"}
                    color={isGroupComplete ? "green" : "gray"}
                  >
                    {isGroupComplete ? <FaCheckCircle size={10} /> : group.icon}
                  </ThemeIcon>
                  <Text
                    size="sm"
                    fw={700}
                    c={isGroupComplete ? "dark" : "dimmed"}
                  >
                    {group.title}
                  </Text>
                </Group>
                <Stack gap={2} mt={10}>
                  {group.steps.map((step) => (
                    <Group key={step.key} gap={4} wrap="nowrap" pl={6}>
                      <FaCheckCircle
                        size={10}
                        color={step.isCompleted ? "#00bd39ff" : "#d6d6d6ff"}
                      />
                      <Text
                        size="xs"
                        c={step.isCompleted ? "dark" : "dimmed"}
                        lineClamp={1}
                      >
                        {step.label}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Group>
      </Paper>
    );
  }

  return (
    <Paper p="md" radius="md" w="100%" h="100%">
      {showTitle && (
        <Center mb="lg">
          <Group gap="xs">
            <ThemeIcon variant="light" color="violet" size="lg" radius="md">
              <FaCalendarCheck size={18} />
            </ThemeIcon>
            <Text fw={700} size="lg" c="violet.9">
              {title}
            </Text>
          </Group>
        </Center>
      )}

      <Timeline
        bulletSize={30}
        lineWidth={2}
        active={-1}
        style={{ paddingLeft: 6 }}
      >
        {groups.map((group, idx) => {
          if (!group) return null;

          const isGroupComplete = group.status === "completed";
          const isGroupInProgress = group.status === "in-progress";

          return (
            <Timeline.Item
              key={group.title}
              bullet={
                <Center>
                  {isGroupComplete ? <FaCheckCircle size={16} /> : group.icon}
                </Center>
              }
              title={
                <Text
                  fw={600}
                  size="sm"
                  c={isGroupComplete ? "dark" : "dimmed"}
                >
                  {group.title}
                </Text>
              }
              color={
                isGroupComplete ? "green" : isGroupInProgress ? "blue" : "gray"
              }
              lineVariant={isGroupComplete ? "solid" : "dashed"}
            >
              <Stack gap={6} mt={4}>
                {group.steps.map((step) => (
                  <Group key={step.key} justify="space-between" wrap="nowrap">
                    <Group gap={6}>
                      <ThemeIcon
                        size={6}
                        radius="xl"
                        color={step.isCompleted ? "green" : "gray.4"}
                        variant="filled"
                      />
                      <Text size="xs" c={step.isCompleted ? "dark" : "dimmed"}>
                        {step.label}
                      </Text>
                    </Group>
                    {step.isCompleted ? (
                      <Text size="xs" fw={500} c="green.7">
                        {step.date === "1999-09-19T00:00:00+00:00"
                          ? "Done"
                          : dayjs.utc(step.date).format("MMM D")}
                      </Text>
                    ) : (
                      <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                        Pending
                      </Text>
                    )}
                  </Group>
                ))}
              </Stack>
            </Timeline.Item>
          );
        })}
      </Timeline>
    </Paper>
  );
}
