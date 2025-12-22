"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import { useJobSearch } from "@/hooks/useJobSearch";
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
  Select,
  Divider,
  rem,
  RingProgress,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  FaCheck,
  FaCogs,
  FaCut,
  FaDoorOpen,
  FaIndustry,
  FaPaintBrush,
  FaSearch,
  FaClipboardList,
  FaClipboardCheck,
} from "react-icons/fa";
import dayjs from "dayjs";

type CompletionField =
  | "in_plant_actual"
  | "doors_completed_actual"
  | "cut_finish_completed_actual"
  | "custom_finish_completed_actual"
  | "drawer_completed_actual"
  | "cut_melamine_completed_actual"
  | "paint_completed_actual"
  | "assembly_completed_actual";

const ScheduleDateBlock = ({
  label,
  date,
}: {
  label: string;
  date: string | null | undefined;
}) => (
  <Stack gap={2}>
    <Text size="xs" c="dimmed" fw={700} tt="uppercase">
      {label}
    </Text>
    <Text size="sm" fw={600} c={date ? "dark" : "dimmed"}>
      {date ? dayjs(date).format("MMM D, YYYY") : "TBD"}
    </Text>
  </Stack>
);

export default function ProductionActuals() {
  const { supabase, isAuthenticated } = useSupabase();
  const queryClient = useQueryClient();

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const {
    options: jobOptions,
    isLoading: jobsLoading,
    setSearch: setJobSearch,
    search: jobSearchValue,
  } = useJobSearch(selectedJobId);

  const { data: jobData, isLoading: dataLoading } = useQuery({
    queryKey: ["production-actuals", selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) return null;
      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
          job_number,
          production_schedule:production_schedule (*),
          installation:installation_id (
            wrap_date
          )
        `
        )
        .eq("id", Number(selectedJobId))
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated && !!selectedJobId,
  });

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
      queryClient.invalidateQueries({
        queryKey: ["production-actuals", selectedJobId],
      });
      queryClient.invalidateQueries({ queryKey: ["production_schedule_list"] });
      queryClient.invalidateQueries({
        queryKey: ["plant_jobs_list"],
      });
    },
    onError: (err: any) =>
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      }),
  });

  const actualSteps = useMemo(() => {
    const schedule = jobData?.production_schedule as any;
    if (!schedule) return [];

    const stepsData: {
      key: CompletionField;
      label: string;
      icon: React.ReactNode;
    }[] = [
      {
        key: "doors_completed_actual",
        label: "Doors Completed",
        icon: <FaDoorOpen size={22} />,
      },
      {
        key: "cut_finish_completed_actual",
        label: "Cut Finishing",
        icon: <FaCut size={22} />,
      },
      {
        key: "custom_finish_completed_actual",
        label: "Custom Finish",
        icon: <FaPaintBrush size={22} />,
      },
      {
        key: "drawer_completed_actual",
        label: "Drawers Completed",
        icon: <FaDoorOpen size={22} />,
      },
      {
        key: "cut_melamine_completed_actual",
        label: "Melamine Cut",
        icon: <FaCut size={22} />,
      },
      {
        key: "paint_completed_actual",
        label: "Paint Completed",
        icon: <FaPaintBrush size={22} />,
      },
      {
        key: "assembly_completed_actual",
        label: "Assembly Completed",
        icon: <FaCogs size={22} />,
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
    const newValue = currentValue ? null : new Date().toISOString();
    updateMutation.mutate({ field, value: newValue });
  };

  const progress = useMemo(() => {
    if (!actualSteps.length) return 0;
    const completed = actualSteps.filter((s) => s.isCompleted).length;
    return Math.round((completed / actualSteps.length) * 100);
  }, [actualSteps]);

  const productionSchedule = jobData?.production_schedule as any;
  const installationData = jobData?.installation as any;

  return (
    <Box>
      <Paper
        p="md"
        radius="lg"
        style={{
          background: "linear-gradient(135deg, #fff 0%, #f8f9fa 100%)",
          border: "1px solid #e9ecef",
        }}
        shadow="sm"
      >
        <Group justify="space-between" align="center">
          <Group>
            <ThemeIcon
              size={50}
              radius="md"
              variant="gradient"
              gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
            >
              <FaClipboardCheck size={26} />
            </ThemeIcon>
            <Stack gap={0}>
              <Title order={2} style={{ color: "#343a40" }}>
                Plant Actuals
              </Title>
              <Text size="sm" c="dimmed">
                Track real-time production milestones on the floor.
              </Text>
            </Stack>
          </Group>

          <Select
            placeholder="Search Job Number..."
            data={jobOptions || []}
            searchable
            clearable
            nothingFoundMessage={jobsLoading ? "Searching..." : "No jobs found"}
            leftSection={<FaSearch size={14} />}
            value={selectedJobId}
            onChange={setSelectedJobId}
            onSearchChange={setJobSearch}
            searchValue={jobSearchValue}
            rightSection={jobsLoading ? <Loader size={16} /> : null}
            w={300}
            size="md"
            styles={{
              input: {
                border: "1px solid #ced4da",
                "&:focus": {
                  borderColor: "#8E2DE2",
                },
              },
            }}
          />
        </Group>
      </Paper>
      <Container size={"xl"}>
        <Stack gap="xl">
          {}
          {!selectedJobId ? (
            <Center
              h={400}
              bg="gray.0"
              style={{ borderRadius: 16, marginTop: "10%" }}
            >
              <Stack align="center" gap="md">
                <ThemeIcon
                  size={80}
                  radius="xl"
                  color="gray"
                  variant="light"
                  style={{ opacity: 0.5 }}
                >
                  <FaSearch size={40} />
                </ThemeIcon>
                <Text c="dimmed" size="lg" fw={500}>
                  Select a job above to view its production status.
                </Text>
              </Stack>
            </Center>
          ) : dataLoading ? (
            <Center h={400}>
              <Loader color="violet" type="bars" />
            </Center>
          ) : !jobData ? (
            <Center h={400}>
              <Text c="red">Job data could not be loaded.</Text>
            </Center>
          ) : (
            <Stack gap="lg">
              {}
              <Group justify="space-between" align="flex-end">
                <Stack gap={4}>
                  <Text
                    tt="uppercase"
                    c="dimmed"
                    fw={700}
                    size="xs"
                    style={{ letterSpacing: "1px" }}
                  >
                    Current Job
                  </Text>
                  <Text
                    fw={800}
                    size={rem(32)}
                    variant="gradient"
                    gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 90 }}
                  >
                    #{jobData.job_number}
                  </Text>
                </Stack>

                {}
                <Group gap="xs">
                  <Text fw={600} size="sm" c="dimmed">
                    Completion
                  </Text>
                  <RingProgress
                    size={80}
                    thickness={8}
                    roundCaps
                    sections={[{ value: progress, color: "#4A00E0" }]}
                    label={
                      <Text c="blue" fw={700} ta="center" size="xs">
                        {progress}%
                      </Text>
                    }
                  />
                </Group>
              </Group>

              <Divider />

              {}
              <Paper p="lg" radius="md" shadow="xs" withBorder>
                <Group mb="md" style={{ color: "#4A00E0" }}>
                  <FaClipboardList size={18} />
                  <Text fw={600} size="lg">
                    Production Schedule
                  </Text>
                </Group>
                <SimpleGrid
                  cols={{ base: 2, sm: 3, md: 4, lg: 6 }}
                  spacing="lg"
                >
                  <ScheduleDateBlock
                    label="Doors In"
                    date={productionSchedule?.doors_in_schedule}
                  />
                  <ScheduleDateBlock
                    label="Doors Out"
                    date={productionSchedule?.doors_out_schedule}
                  />
                  <ScheduleDateBlock
                    label="Cut Finish"
                    date={productionSchedule?.cut_finish_schedule}
                  />
                  <ScheduleDateBlock
                    label="Cut Melamine"
                    date={productionSchedule?.cut_melamine_schedule}
                  />
                  <ScheduleDateBlock
                    label="Paint In"
                    date={productionSchedule?.paint_in_schedule}
                  />
                  <ScheduleDateBlock
                    label="Paint Out"
                    date={productionSchedule?.paint_out_schedule}
                  />
                  <ScheduleDateBlock
                    label="Assembly"
                    date={productionSchedule?.assembly_schedule}
                  />
                  <ScheduleDateBlock
                    label="Wrap Date"
                    date={installationData?.wrap_date}
                  />
                  <ScheduleDateBlock
                    label="Ship Date"
                    date={productionSchedule?.ship_schedule}
                  />
                </SimpleGrid>
              </Paper>

              <Divider />

              {}
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
                {actualSteps.map((step) => (
                  <Paper
                    key={step.key}
                    shadow={step.isCompleted ? "md" : "sm"}
                    radius="md"
                    p="lg"
                    withBorder
                    style={{
                      borderColor: step.isCompleted ? "#28a745" : "#dee2e6",
                      borderWidth: step.isCompleted ? 2 : 1,
                      background: step.isCompleted
                        ? "linear-gradient(145deg, #ffffff 0%, #f0fff4 100%)"
                        : "#fff",
                      display: "flex",
                      flexDirection: "column",
                      transition: "all 0.3s ease",
                      transform: step.isCompleted ? "translateY(-2px)" : "none",
                    }}
                  >
                    <Stack justify="space-between" style={{ flex: 1 }}>
                      <Box>
                        <Group justify="space-between" mb="md">
                          <ThemeIcon
                            size={30}
                            radius="md"
                            variant="gradient"
                            gradient={
                              step.isCompleted
                                ? { from: "#28a745", to: "#218838", deg: 135 }
                                : { from: "#e9ecef", to: "#dee2e6", deg: 135 }
                            }
                          >
                            {step.isCompleted ? (
                              <FaCheck size={22} color="white" />
                            ) : (
                              <Box style={{ color: "#adb5bd" }}>
                                {step.icon}
                              </Box>
                            )}
                          </ThemeIcon>

                          {step.isCompleted ? (
                            <Badge
                              variant="gradient"
                              gradient={{
                                from: "#28a745",
                                to: "#218838",
                                deg: 90,
                              }}
                              size="lg"
                              radius="sm"
                            >
                              DONE
                            </Badge>
                          ) : (
                            <Badge color="gray" variant="light" size="lg">
                              PENDING
                            </Badge>
                          )}
                        </Group>

                        <Text
                          size="lg"
                          fw={700}
                          mt="sm"
                          c={step.isCompleted ? "dark" : "dimmed"}
                        >
                          {step.label}
                        </Text>

                        <Text size="sm" c="dimmed" mt={4}>
                          {step.date ? (
                            <span style={{ color: "#218838", fontWeight: 500 }}>
                              {dayjs(step.date).format("MMM D, h:mm A")}
                            </span>
                          ) : (
                            "—"
                          )}
                        </Text>
                      </Box>

                      <Button
                        fullWidth
                        mt="md"
                        size="sm"
                        radius="md"
                        variant={step.isCompleted ? "outline" : "gradient"}
                        color={step.isCompleted ? "red" : undefined}
                        gradient={
                          !step.isCompleted
                            ? { from: "#8E2DE2", to: "#4A00E0", deg: 135 }
                            : undefined
                        }
                        style={{
                          transition: "all 0.2s",
                          boxShadow: !step.isCompleted
                            ? "0 4px 12px rgba(74, 0, 224, 0.2)"
                            : "none",
                        }}
                        onClick={() => handleToggle(step.key, step.date)}
                        loading={updateMutation.isPending}
                      >
                        {step.isCompleted ? "Undo Completion" : "Mark Complete"}
                      </Button>
                    </Stack>
                  </Paper>
                ))}
              </SimpleGrid>
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
