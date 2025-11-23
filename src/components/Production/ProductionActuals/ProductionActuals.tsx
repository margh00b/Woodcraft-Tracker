"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import {
  Container,
  Paper,
  Stack,
  Group,
  Text,
  Button,
  Loader,
  Center,
  Box,
  Title,
  Badge,
  SimpleGrid,
  ThemeIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  FaCheckCircle,
  FaCogs,
  FaCut,
  FaDoorOpen,
  FaIndustry,
  FaPaintBrush,
  FaArrowLeft,
} from "react-icons/fa";
import dayjs from "dayjs";

// Define specific fields for type safety
type CompletionField =
  | "in_plant_actual"
  | "doors_completed_actual"
  | "cut_finish_completed_actual"
  | "custom_finish_completed_actual"
  | "drawer_completed_actual"
  | "cut_melamine_completed_actual"
  | "paint_completed_actual"
  | "assembly_completed_actual";

export default function ProductionActuals({ jobId }: { jobId: number }) {
  const router = useRouter();
  const { supabase, isAuthenticated } = useSupabase();
  const queryClient = useQueryClient();

  // Fetch only necessary data
  const { data: jobData, isLoading } = useQuery({
    queryKey: ["production-actuals", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
          job_number,
          production_schedule:production_schedule (*)
        `
        )
        .eq("id", jobId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated && !!jobId,
  });

  // Mutation to toggle status
  const updateMutation = useMutation({
    mutationFn: async ({
      field,
      value,
    }: {
      field: CompletionField;
      value: string | null;
    }) => {
      const prodId = (jobData?.production_schedule as any)?.prod_id;
      if (!prodId) throw new Error("No schedule found");

      const { error } = await supabase
        .from("production_schedule")
        .update({ [field]: value })
        .eq("prod_id", prodId);

      if (error) throw error;
    },
    onSuccess: () => {
      notifications.show({
        title: "Updated",
        message: "Status updated successfully",
        color: "green",
      });
      // Invalidate related queries to refresh UI elsewhere
      queryClient.invalidateQueries({
        queryKey: ["production-actuals", jobId],
      });
      queryClient.invalidateQueries({ queryKey: ["production_schedule_list"] });
      queryClient.invalidateQueries({
        queryKey: ["installation-editor", jobId],
      });
    },
    onError: (err: any) =>
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      }),
  });

  // Define steps configuration
  const actualSteps = useMemo(() => {
    const schedule = jobData?.production_schedule as any;
    if (!schedule) return [];

    const stepsData: {
      key: CompletionField;
      label: string;
      icon: React.ReactNode;
    }[] = [
      {
        key: "in_plant_actual",
        label: "In Plant Entry",
        icon: <FaIndustry size={20} />,
      },
      {
        key: "doors_completed_actual",
        label: "Doors Completed",
        icon: <FaDoorOpen size={20} />,
      },
      {
        key: "cut_finish_completed_actual",
        label: "Cut Finishing",
        icon: <FaCut size={20} />,
      },
      {
        key: "custom_finish_completed_actual",
        label: "Custom Finish",
        icon: <FaCut size={20} />,
      },
      {
        key: "drawer_completed_actual",
        label: "Drawers Completed",
        icon: <FaDoorOpen size={20} />,
      },
      {
        key: "cut_melamine_completed_actual",
        label: "Melamine Cut",
        icon: <FaCut size={20} />,
      },
      {
        key: "paint_completed_actual",
        label: "Paint Completed",
        icon: <FaPaintBrush size={20} />,
      },
      {
        key: "assembly_completed_actual",
        label: "Assembly Completed",
        icon: <FaCogs size={20} />,
      },
    ];

    return stepsData.map((step) => ({
      ...step,
      isCompleted: !!schedule[step.key],
      date: schedule[step.key] as string | null,
    }));
  }, [jobData]);

  const handleToggle = (
    field: CompletionField,
    currentValue: string | null
  ) => {
    // Toggle logic: if date exists -> set null, otherwise -> set now
    const newValue = currentValue ? null : new Date().toISOString();
    updateMutation.mutate({ field, value: newValue });
  };

  if (isLoading || !jobData) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Group mb="xl">
        <Button
          variant="subtle"
          leftSection={<FaArrowLeft />}
          onClick={() => router.back()}
        >
          Back
        </Button>
        <Title order={2}>Production Actuals: #{jobData.job_number}</Title>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3, lg: 4 }} spacing="lg">
        {actualSteps.map((step) => (
          <Paper
            key={step.key}
            shadow="sm"
            radius="md"
            p="lg"
            withBorder
            style={{
              borderColor: step.isCompleted
                ? "var(--mantine-color-green-6)"
                : undefined,
              borderWidth: step.isCompleted ? 2 : 1,
              display: "flex",
              flexDirection: "column",
              transition: "all 0.2s ease",
            }}
          >
            <Stack justify="space-between" style={{ flex: 1 }}>
              <Box>
                <Group justify="space-between" mb="md">
                  <ThemeIcon
                    size={48}
                    radius="md"
                    variant={step.isCompleted ? "filled" : "light"}
                    color={step.isCompleted ? "green" : "gray"}
                  >
                    {step.isCompleted ? <FaCheckCircle size={24} /> : step.icon}
                  </ThemeIcon>
                  {step.isCompleted ? (
                    <Badge color="green" variant="filled" size="lg">
                      Completed
                    </Badge>
                  ) : (
                    <Badge color="gray" variant="light" size="lg">
                      Pending
                    </Badge>
                  )}
                </Group>

                <Text size="xl" fw={700} mt="sm">
                  {step.label}
                </Text>

                <Text size="sm" c="dimmed" mt="xs">
                  {step.date
                    ? dayjs(step.date).format("MMM D, YYYY h:mm A")
                    : "—"}
                </Text>
              </Box>

              <Button
                fullWidth
                mt="xl"
                size="md"
                color={step.isCompleted ? "red" : "blue"}
                variant={step.isCompleted ? "outline" : "filled"}
                onClick={() => handleToggle(step.key, step.date)}
                loading={updateMutation.isPending}
              >
                {step.isCompleted ? "Undo" : "Mark Complete"}
              </Button>
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </Container>
  );
}
