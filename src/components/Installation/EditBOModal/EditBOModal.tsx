"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Modal,
  Button,
  Stack,
  Textarea,
  Group,
  Switch,
  LoadingOverlay,
  ThemeIcon,
  Text,
  Paper,
  Divider,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import { useSupabase } from "@/hooks/useSupabase";
import { zodResolver } from "@/utils/zodResolver/zodResolver";
import { BackorderFormValues, BackorderSchema } from "@/zod/backorders.schema";
import { Tables } from "@/types/db";
import { FaBoxOpen, FaCheck, FaSave, FaTimes } from "react-icons/fa";
import { bg } from "zod/v4/locales";
import { read } from "fs";

type Backorder = Tables<"backorders">;

interface EditBackorderModalProps {
  opened: boolean;
  onClose: () => void;
  backorder: Backorder | null;
  readOnly?: boolean;
}

export default function EditBackorderModal({
  opened,
  onClose,
  backorder,
  readOnly,
}: EditBackorderModalProps) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  const form = useForm<BackorderFormValues>({
    initialValues: {
      job_id: "",
      due_date: null,
      comments: "",
      complete: false,
    },
    validate: zodResolver(BackorderSchema),
  });

  useEffect(() => {
    if (backorder && opened) {
      form.setValues({
        job_id: String(backorder.job_id),
        due_date: backorder.due_date
          ? dayjs(backorder.due_date).toDate()
          : null,
        comments: backorder.comments || "",
        complete: backorder.complete ?? false,
      });
    }
  }, [backorder, opened]);

  const updateMutation = useMutation({
    mutationFn: async (values: BackorderFormValues) => {
      if (!backorder) return;

      const payload = {
        due_date: values.due_date
          ? dayjs(values.due_date).format("YYYY-MM-DD")
          : null,
        comments: values.comments,
        complete: values.complete,
      };

      const { error } = await supabase
        .from("backorders")
        .update(payload)
        .eq("id", backorder.id);

      if (error) throw error;

      if (values.complete && !backorder.complete) {
        const { data: jobData, error: jobError } = await supabase
          .from("jobs")
          .select("installation_id")
          .eq("id", backorder.job_id)
          .single();

        if (jobError) {
          console.error("Error fetching job to get installation_id:", jobError);
        } else if (jobData?.installation_id) {
          const { data: installData, error: fetchError } = await supabase
            .from("installation")
            .select("installation_id, partially_shipped")
            .eq("installation_id", jobData.installation_id)
            .single();

          if (fetchError) {
            console.error("Error fetching installation for backorder completion:", fetchError);
          } else if (installData && installData.partially_shipped) {
            const { error: installError } = await supabase
              .from("installation")
              .update({
                partially_shipped: false,
                has_shipped: true,
              })
              .eq("installation_id", installData.installation_id);

            if (installError) {
              console.error("Error updating installation when completing backorder:", installError);
              throw installError;
            }
          }
        }
      }
    },
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Backorder updated successfully",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["backorders_view"] });
      queryClient.invalidateQueries({ queryKey: ["related-backorders"] });
      onClose();
    },
    onError: (error: any) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon variant="light" color="orange" size="md" radius="md">
            <FaBoxOpen size={16} />
          </ThemeIcon>
          <Text fw={600} size="lg" style={{ letterSpacing: "-0.5px" }}>
            Edit Backorder #{backorder?.id || ""}
          </Text>
        </Group>
      }
      centered
      radius="md"
      overlayProps={{ blur: 3, opacity: 0.55 }}
      transitionProps={{ transition: "pop", duration: 200 }}
    >
      <LoadingOverlay
        visible={updateMutation.isPending}
        overlayProps={{ blur: 2 }}
      />
      <form onSubmit={form.onSubmit((values) => updateMutation.mutate(values))}>
        <Stack gap="lg">
          <DateInput
            label="Expected Due Date"
            placeholder="Select date"
            clearable
            style={{ pointerEvents: readOnly ? 'none' : 'auto' }}
            styles={{
              section: {
                display: readOnly ? "none" : "flex"
              }
            }}

            valueFormat="YYYY-MM-DD"
            {...form.getInputProps("due_date")}
          />

          <Textarea
            label="Comments / Details"
            minRows={5}
            autosize
            placeholder="Describe missing or damaged items..."
            style={{ pointerEvents: readOnly ? 'none' : 'auto' }}
            {...form.getInputProps("comments")}
          />

          <Paper p="sm" withBorder radius="md" bg="gray.0">
            <Group justify="space-between">
              <Group gap="xs">
                <Text size="sm" fw={500}>
                  Status
                </Text>
                <Text size="xs" c="dimmed">
                  Mark Complete
                </Text>
              </Group>
              <Switch
                size="md"
                color="green"
                styles={{
                  track: {
                    cursor: "pointer",
                  },
                }}
                onLabel={<FaCheck size={12} />}
                offLabel={<FaTimes size={12} />}
                {...form.getInputProps("complete", { type: "checkbox" })}
                checked={form.values.complete}
                style={{ pointerEvents: readOnly ? 'none' : 'auto' }}
              />
            </Group>
          </Paper>

          <Divider />

          <Group justify="flex-end" mt={0}>
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              leftSection={<FaSave size={16} />}
              disabled={readOnly}
              loading={updateMutation.isPending}
              style={{
                background: "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)",
                border: "none",
              }}
            >
              Save Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
