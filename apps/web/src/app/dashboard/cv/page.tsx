"use client";

import React, { useState, useEffect } from "react";
import { useSupabase } from "@/hooks/useSupabase";
import { gradients, linearGradients } from "@/theme";
import {
  Container,
  Title,
  Text,
  Button,
  Card,
  Group,
  Stack,
  Loader,
  Badge,
} from "@mantine/core";
import { FaTerminal, FaSync, FaServer, FaMicrochip } from "react-icons/fa";

export default function CVDataPage() {
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [machineData, setMachineData] = useState<any[]>([]);

  // 1. Set up Database Listener for Postgres INSERT/UPDATE changes via Realtime
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data, error } = await supabase.from("local_data").select("*");
      if (!error && data) {
        setMachineData(data);
      }
    };

    fetchInitialData();

    const channel = supabase
      .channel("public:local_data")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "local_data" },
        (payload) => {
          const newRecord = payload.new as any;
          setMachineData((prev) => {
            const index = prev.findIndex((item) => item.id === newRecord.id);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = newRecord;
              return updated;
            }
            return [newRecord, ...prev];
          });
          setLoading(false);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // 2. Pub/Sub Broadcast Function
  const handleFetchSignal = async () => {
    setLoading(true);
    try {
      const channel = supabase.channel("agent-commands");
      await channel.subscribe();

      await channel.send({
        type: "broadcast",
        event: "fetch_data",
        payload: { timestamp: new Date().toISOString() },
      });

      console.log("Broadcasted 'fetch_data' signal to local agents.");
    } catch (err) {
      console.error("Error broadcasting fetch signal:", err);
      setLoading(false);
    }
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Group>
            <FaTerminal size={28} color={gradients.primary.from} />
            <div>
              <Title order={2}>Local Agent Command Panel</Title>
              <Text c="dimmed" size="sm">
                Trigger script execution on local factory node machines via
                Supabase Realtime
              </Text>
            </div>
          </Group>
          <Button
            size="md"
            onClick={handleFetchSignal}
            loading={loading}
            leftSection={<FaSync className={loading ? "animate-spin" : ""} />}
            style={{ background: linearGradients.primary }}
          >
            Fetch Local Data
          </Button>
        </Group>

        <Title order={3} mt="md">
          Connected Machine Metrics
        </Title>

        {machineData.length === 0 ? (
          <Card withBorder p="xl" radius="md" ta="center">
            <Text c="dimmed">
              No agent data retrieved yet. Click the button above to broadcast.
            </Text>
          </Card>
        ) : (
          <Stack gap="md">
            {machineData.map((row) => (
              <Card key={row.id} withBorder shadow="sm" radius="md" p="lg">
                <Group justify="space-between" mb="xs">
                  <Group>
                    <FaServer color="#6C63FF" />
                    <Text fw={700} size="lg">
                      {row.machine_name}
                    </Text>
                  </Group>
                  <Badge variant="light" color="blue">
                    Updated: {new Date(row.updated_at).toLocaleTimeString()}
                  </Badge>
                </Group>

                <Group grow mt="md">
                  <div>
                    <Text size="xs" c="dimmed">
                      OS Version
                    </Text>
                    <Text fw={500}>{row.payload?.os_version || "N/A"}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      Total Memory
                    </Text>
                    <Text fw={500}>{row.payload?.total_memory || "N/A"}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      CPU Usage
                    </Text>
                    <Text fw={500}>{row.payload?.cpu_usage || "N/A"}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      Timestamp
                    </Text>
                    <Text fw={500}>{row.payload?.current_time || "N/A"}</Text>
                  </div>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
