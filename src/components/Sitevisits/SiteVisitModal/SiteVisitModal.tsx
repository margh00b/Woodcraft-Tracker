import { useEffect } from "react";
import {
  Modal,
  Stack,
  Select,
  Textarea,
  TextInput,
  Button,
  Group,
  LoadingOverlay,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useJobSearch } from "@/hooks/useJobSearch";
import { useSupabase } from "@/hooks/useSupabase";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { linearGradients } from "@/theme";

interface SiteVisitModalProps {
  opened: boolean;
  onClose: () => void;
  visit?: any; 
}

export default function SiteVisitModal({
  opened,
  onClose,
  visit,
}: SiteVisitModalProps) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  const form = useForm({
    initialValues: {
      job_id: "",
      visit_date: new Date(),
      notes: "",
      created_by: "",
    },
    validate: {
      visit_date: (value) => (value ? null : "Date is required"),
    },
  });

  const {
    options: jobOptions,
    search: jobSearch,
    setSearch: setJobSearch,
    isLoading: isJobSearchLoading,
  } = useJobSearch(form.values.job_id);

  useEffect(() => {
    if (visit) {
      form.setValues({
        job_id: visit.job_id ? String(visit.job_id) : "",
        visit_date: visit.visit_date
          ? new Date(visit.visit_date + "T12:00:00")
          : new Date(),
        notes: visit.notes || "",
        created_by: visit.created_by || "",
      });
    } else {
      form.reset();
      setJobSearch(""); 
    }
  }, [visit, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const payload = {
        job_id: values.job_id ? Number(values.job_id) : null,
        visit_date: values.visit_date,
        notes: values.notes,
        created_by: values.created_by,
      };

      let error;
      if (visit?.id) {
        const { error: updateError } = await supabase
          .from("site_visits")
          .update(payload)
          .eq("id", visit.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("site_visits")
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      notifications.show({
        title: "Success",
        message: `Site visit ${visit ? "updated" : "created"} successfully`,
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["site_visits"] });
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

  const handleDelete = async () => {
    if (
      !visit?.id ||
      !confirm("Are you sure you want to delete this site visit?")
    )
      return;

    try {
      const { error } = await supabase
        .from("site_visits")
        .delete()
        .eq("id", visit.id);

      if (error) throw error;

      notifications.show({
        title: "Success",
        message: "Site visit deleted successfully",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["site_visits"] });
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
      title={visit ? "Edit Site Visit" : "Log Site Visit"}
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Select
            label="Job Number"
            placeholder="Search job number..."
            data={jobOptions}
            searchable
            searchValue={jobSearch}
            onSearchChange={setJobSearch}
            nothingFoundMessage={
              isJobSearchLoading ? "Searching..." : "No jobs found"
            }
            {...form.getInputProps("job_id")}
            disabled={false}
          />
          <DatePickerInput
            label="Visit Date"
            placeholder="Pick date"
            {...form.getInputProps("visit_date")}
          />
          <TextInput
            label="Visited By"
            placeholder="James etc. ....."
            {...form.getInputProps("created_by")}
          />
          <Textarea
            label="Notes"
            placeholder="Visit notes..."
            minRows={3}
            autosize
            {...form.getInputProps("notes")}
          />
          <Group justify="space-between" mt="md">
            {visit ? (
              <Button color="red" variant="outline" onClick={handleDelete}>
                Delete
              </Button>
            ) : (
              <div />
            )}
            <Group>
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
                {visit ? "Update" : "Create"}
              </Button>
            </Group>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
