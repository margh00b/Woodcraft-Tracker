"use client";

import { Group, ActionIcon, Tooltip, Paper, Center } from "@mantine/core";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { useNavigationGuard } from "@/providers/NavigationGuardProvider";

export default function TopNavigationBar() {
  const { navigateBack, navigateForward } = useNavigationGuard();

  return (
    <Paper
      p="md"
      mb="md"
      radius={0}
      style={{
        width: "100%",
        backgroundColor: "transparent",
        borderBottom: "1px solid #dee2e6",
      }}
    >
      <Center>
        <Group gap="sm">
          <Tooltip label="Go Back" withArrow position="bottom" openDelay={500}>
            <ActionIcon
              variant="light"
              color="white"
              bg="transparent"
              style={{
                border: "2px solid #dee2e6",
              }}
              size="lg"
              w="auto"
              px="lg"
              onClick={navigateBack}
              aria-label="Go Back"
            >
              <FaArrowLeft size={14} />
            </ActionIcon>
          </Tooltip>

          <Tooltip
            label="Go Forward"
            withArrow
            position="bottom"
            openDelay={500}
          >
            <ActionIcon
              variant="light"
              color="white"
              bg="transparent"
              style={{
                border: "2px solid #dee2e6",
              }}
              size="lg"
              w="auto"
              px="lg"
              onClick={navigateForward}
              aria-label="Go Forward"
            >
              <FaArrowRight size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Center>
    </Paper>
  );
}
