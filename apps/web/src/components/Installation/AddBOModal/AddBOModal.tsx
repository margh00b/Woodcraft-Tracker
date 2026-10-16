"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal, Button, Stack, Textarea, Group } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import { useSupabase } from "@/hooks/useSupabase";
import { zodResolver } from "@/utils/zodResolver/zodResolver";
import { BackorderFormValues, BackorderSchema } from "@/zod/backorders.schema";
import { useEffect } from "react";

interface AddBackorderModalProps {
  opened: boolean;
  onClose: () => void;
  jobId: string;
  jobNumber: string;
  onSuccess?: () => void;
  onSaveDraft?: (values: BackorderFormValues) => void;
  initialData?: BackorderFormValues | null;
  jobIds?: number[];
  isBulk?: boolean;
}

export default function AddBackorderModal({
  opened,
  onClose,
  jobId,
  jobNumber,
  onSuccess,
  onSaveDraft,
  initialData,
  jobIds,
  isBulk,
}: AddBackorderModalProps) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  const form = useForm<BackorderFormValues>({
    initialValues: {
      job_id: jobId,
      due_date: null,
      comments: "",
      complete: false,
    },
    validate: zodResolver(BackorderSchema),
  });

  useEffect(() => {
    if (opened) {
      if (initialData) {
        form.setValues(initialData);
      } else {
        form.reset();
        form.setFieldValue("job_id", String(jobId));
      }
    }
  }, [opened, initialData, jobId]);

  const createMutation = useMutation({
    mutationFn: async (values: BackorderFormValues) => {
      if (isBulk && jobIds && jobIds.length > 0) {
        const payloads = jobIds.map((id) => ({
          job_id: id,
          due_date: values.due_date
            ? dayjs(values.due_date).format("YYYY-MM-DD")
            : null,
          comments: values.comments || null,
        }));

        const { error } = await supabase.from("backorders").insert(payloads);
        if (error) throw error;
      } else {
        const payload = {
          job_id: values.job_id,
          due_date: values.due_date
            ? dayjs(values.due_date).format("YYYY-MM-DD")
            : null,
          comments: values.comments || null,
        };

        const { error } = await supabase.from("backorders").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: isBulk
          ? `Backorders logged for ${jobIds?.length} jobs.`
          : `Backorder for Job #${jobNumber} logged successfully.`,
        color: "green",
      });
      queryClient.invalidateQueries({
        queryKey: ["related-backorders"],
      });
      queryClient.invalidateQueries({
        queryKey: ["installation-editor"],
      });
      queryClient.invalidateQueries({
        queryKey: ["plant_shipping_table"],
      });
      queryClient.invalidateQueries({
        queryKey: ["backorder-status"],
      });
      if (onSuccess) onSuccess();
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleSubmit = (values: BackorderFormValues) => {
    if (onSaveDraft) {
      onSaveDraft(values);
      onClose();
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Log Backorder for Job #${jobNumber}`}
      centered
      overlayProps={{ opacity: 0.55, blur: 3 }}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <DateInput
            label="Expected Due Date"
            placeholder="Select expected date"
            clearable
            valueFormat="YYYY-MM-DD"
            minDate={dayjs().toDate()}
            {...form.getInputProps("due_date")}
          />
          <Textarea
            label="Backorder Details / Comments"
            minRows={12}
            styles={{ input: { minHeight: "200px" } }}
            placeholder="E.g., Missing 5 doors, 1 drawer box damaged."
            {...form.getInputProps("comments")}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending}
              color="orange"
              style={{
                background: "linear-gradient(135deg, #FF5E62 0%, #FF9966 100%)",
              }}
            >
              {onSaveDraft ? "Save to Job" : "Log Backorder"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
