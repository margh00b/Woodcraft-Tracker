"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  Button,
  Paper,
  Stack,
  Title,
  ThemeIcon,
  Group,
  Text,
  Center,
  Loader,
  Tooltip,
  ScrollArea,
  Box,
} from "@mantine/core";
import { TbArchiveOff } from "react-icons/tb";
import { useSupabase } from "@/hooks/useSupabase";
import { notifications } from "@mantine/notifications";
import { colors, gradients } from "@/theme";
import { Tables } from "@/types/db";

type DeadJob = Tables<"jobs"> & {
  sales_orders: {
    shipping_client_name: string | null;
    shipping_street: string | null;
    shipping_city: string | null;
    shipping_province: string | null;
    shipping_zip: string | null;
  } | null;
};

export default function DeadJobsTable() {
  const { supabase, isAuthenticated } = useSupabase();
  const queryClient = useQueryClient();

  const { data: deadJobs, isLoading } = useQuery({
    queryKey: ["dead_jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
          *,
          sales_orders (
            shipping_client_name,
            shipping_street,
            shipping_city,
            shipping_province,
            shipping_zip
          )
        `,
        )
        .eq("is_active", false)
        .order("job_number", { ascending: false });

      if (error) throw error;
      return data as DeadJob[];
    },
    enabled: isAuthenticated,
  });

  const reactivateJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const { error } = await supabase
        .from("jobs")
        .update({ is_active: true })
        .eq("id", jobId);

      if (error) throw error;
      return jobId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dead_jobs"] });
      notifications.show({
        title: "Job Reactivated",
        message: "Job has been marked as active",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Failed to reactivate job",
        color: "red",
      });
    },
  });

  const formatAddress = (job: DeadJob) => {
    const parts = [
      job.sales_orders?.shipping_street,
      job.sales_orders?.shipping_city,
      job.sales_orders?.shipping_province,
      job.sales_orders?.shipping_zip,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : "—";
  };

  if (isLoading) {
    return (
      <Center h="50vh">
        <Loader />
      </Center>
    );
  }

  return (
    <Box p={20} h="100vh" display="flex" style={{ flexDirection: "column" }}>
      <Paper
        p="lg"
        radius="lg"
        mb="md"
        style={{
          background: "linear-gradient(135deg, #fff 0%, #f8f9fa 100%)",
          border: "1px solid #e9ecef",
        }}
        shadow="sm"
      >
        <Group justify="space-between" align="center">
          <Group>
            <ThemeIcon
              size={40}
              radius="md"
              variant="gradient"
              gradient={gradients.danger}
            >
              <TbArchiveOff size={20} />
            </ThemeIcon>
            <Stack gap={0}>
              <Title order={3} style={{ color: colors.gray.title }}>
                Dead Jobs
              </Title>
              <Text size="xs" c="dimmed">
                Jobs marked as inactive/dead
              </Text>
            </Stack>
          </Group>
        </Group>
      </Paper>

      <ScrollArea style={{ flex: 1 }}>
        <Table striped stickyHeader highlightOnHover withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Job Number</Table.Th>
              <Table.Th>Client</Table.Th>
              <Table.Th>Address</Table.Th>
              <Table.Th style={{ width: 120 }}>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {!deadJobs || deadJobs.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Center py="xl">
                    <Text c="dimmed">No dead jobs found.</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              deadJobs.map((job) => (
                <Table.Tr key={job.id}>
                  <Table.Td>
                    <Text fw={700}>{job.job_number}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {job.sales_orders?.shipping_client_name || "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label={formatAddress(job)} openDelay={500}>
                      <Text size="sm" c="dimmed" lineClamp={1} truncate="end">
                        {formatAddress(job)}
                      </Text>
                    </Tooltip>
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label="Mark as Active">
                      <Button
                        size="xs"
                        variant="gradient"
                        gradient={gradients.success}
                        onClick={() => reactivateJobMutation.mutate(job.id)}
                        loading={
                          reactivateJobMutation.isPending &&
                          reactivateJobMutation.variables === job.id
                        }
                      >
                        Reactivate
                      </Button>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Box>
  );
}
