"use client";

import {
  Group,
  ActionIcon,
  Tooltip,
  Paper,
  useMantineTheme,
  rem,
} from "@mantine/core";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { useNavigationGuard } from "@/providers/NavigationGuardProvider";

export default function TopNavigationBar() {
  const { navigateBack, navigateForward } = useNavigationGuard();
  const theme = useMantineTheme();

  return (
    <Paper
      h={60}
      px="md"
      radius={0}
      style={{
        borderBottom: `1px solid ${theme.colors.gray[2]}`,
        backgroundColor: "white",
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between", // Prepared for future right-side content
      }}
    >
      <Group gap="xs">
        <Tooltip label="Go Back" withArrow position="bottom" openDelay={400}>
          <ActionIcon
            variant="light"
            color="violet" // Matches the Sidebar's purple theme
            size="lg"
            radius="xl" // Circular buttons are more modern
            onClick={navigateBack}
            aria-label="Go Back"
            style={{
              border: `1px solid ${theme.colors.violet[1]}`, // Subtle border definition
            }}
          >
            <FaArrowLeft size={16} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Go Forward" withArrow position="bottom" openDelay={400}>
          <ActionIcon
            variant="light"
            color="violet"
            size="lg"
            radius="xl"
            onClick={navigateForward}
            aria-label="Go Forward"
            style={{
              border: `1px solid ${theme.colors.violet[1]}`,
            }}
          >
            <FaArrowRight size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Paper>
  );
}
