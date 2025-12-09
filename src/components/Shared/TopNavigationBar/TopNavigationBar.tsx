"use client";

import { Group, ActionIcon, Tooltip, Paper, Center } from "@mantine/core";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { useNavigationGuard } from "@/providers/NavigationGuardProvider";

export default function TopNavigationBar() {
  const { navigateBack, navigateForward } = useNavigationGuard();

  const buttonStyle = {
    transition: "all 0.2s ease",
    border: "1px solid #dee2e6",
    "&:hover": {
      color: "#7048e8",
    },
  };

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
              variant="default"
              size="lg"
              radius="md"
              w="auto"
              px="md"
              onClick={navigateBack}
              aria-label="Go Back"
              style={buttonStyle}
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
              variant="default"
              size="lg"
              radius="md"
              w="auto"
              px="md"
              onClick={navigateForward}
              aria-label="Go Forward"
              style={buttonStyle}
            >
              <FaArrowRight size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Center>
    </Paper>
  );
}
