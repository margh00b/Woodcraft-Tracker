import { useEffect } from "react";
import {
  Modal,
  Stack,
  Textarea,
  Button,
  Group,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useSupabase } from "@/hooks/useSupabase";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { linearGradients } from "@/theme";

interface SiteChangeModalProps {
  opened: boolean;
  onClose: () => void;
  job?: any; 
}

export default function SiteChangeModal({
  opened,
  onClose,
  job,
}: SiteChangeModalProps) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  const form = useForm({
    initialValues: {
      site_changes_detail: "",
    },
  });

  useEffect(() => {
    if (job?.installation) {
      form.setValues({
        site_changes_detail: job.installation.site_changes_detail || "",
      });
    } else {
      form.reset();
    }
  }, [job, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    if (!job?.installation?.installation_id) return;

    try {
      const { error } = await supabase
        .from("installation")
        .update({
          site_changes_detail: values.site_changes_detail,
        })
        .eq("installation_id", job.installation.installation_id);

      if (error) throw error;

      notifications.show({
        title: "Success",
        message: "Site changes updated successfully",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["site_changes"] });
      onClose();
    } catch (error: any) {
      console.error(error);
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Edit Site Changes - Job #${job?.job_number || ""}`}
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Job Number"
            value={job?.job_number || ""}
            disabled
          />
          <Textarea
            label="Site Changes Details"
            placeholder="Details about site changes..."
            minRows={5}
            autosize
            {...form.getInputProps("site_changes_detail")}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              style={{
                background: linearGradients.primary,
                border: "none",
              }}
            >
              Update
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
