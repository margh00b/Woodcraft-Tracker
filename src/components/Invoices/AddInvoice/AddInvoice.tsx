"use client";

import { useEffect } from "react";
import {
  Modal,
  Button,
  Stack,
  TextInput,
  SimpleGrid,
  Group,
  Select,
  Textarea,
  Switch,
  LoadingOverlay,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { zodResolver } from "@/utils/zodResolver/zodResolver";
import { InvoiceSchema, InvoiceFormInput } from "@/zod/invoice.schema";
import { useSupabase } from "@/hooks/useSupabase";
import { useJobSearch } from "@/hooks/useJobSearch";

interface AddInvoiceProps {
  opened: boolean;
  onClose: () => void;
  isCreditMemo?: Boolean;
}

export default function AddInvoice({
  opened,
  onClose,
  isCreditMemo,
}: AddInvoiceProps) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  const form = useForm<InvoiceFormInput>({
    initialValues: {
      invoice_number: "",
      job_id: "",
      date_entered: new Date(),
      paid_at: null,
      no_charge: false,
      comments: "",
    },
    validate: zodResolver(InvoiceSchema),
  });

  const {
    options: jobOptions,
    isLoading: jobsLoading,
    search,
    setSearch,
  } = useJobSearch(form.values.job_id ? String(form.values.job_id) : null);

  useEffect(() => {
    if (opened) {
      form.reset();
      form.setFieldValue("date_entered", new Date());
      setSearch("");
    }
  }, [opened]);

  const createMutation = useMutation({
    mutationFn: async (values: InvoiceFormInput) => {
      const payload = {
        ...values,
        is_creditmemo: isCreditMemo,
        job_id: Number(values.job_id),
      };

      const { error } = await supabase.from("invoices").insert(payload);

      if (error) throw error;
    },
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: isCreditMemo
          ? "Invoice created successfully"
          : "Credit Memo created Successfully",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["invoices_list_server"] });
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
      title={isCreditMemo ? "Add New Credit Memo" : "Add New Invoice"}
      size="lg"
      centered
    >
      <LoadingOverlay visible={createMutation.isPending || jobsLoading} />

      <form
        onSubmit={form.onSubmit((values) =>
          createMutation.mutate(values as InvoiceFormInput)
        )}
      >
        <Stack gap="md">
          <SimpleGrid cols={2}>
            <Select
              label="Link to Job"
              placeholder="Search Job Number"
              data={jobOptions}
              searchable
              searchValue={search}
              onSearchChange={setSearch}
              nothingFoundMessage={
                jobsLoading ? "Searching..." : "No jobs found"
              }
              filter={({ options }) => options}
              withAsterisk
              clearable
              {...form.getInputProps("job_id")}
            />
            <TextInput
              label={isCreditMemo ? "Credit No." : "Invoice Number"}
              placeholder="e.g. 27000..."
              withAsterisk
              data-autofocus
              disabled={!form.values.job_id}
              {...form.getInputProps("invoice_number")}
            />
          </SimpleGrid>

          <SimpleGrid cols={2}>
            <DateInput
              label="Date Entered"
              placeholder="YYYY-MM-DD"
              valueFormat="YYYY-MM-DD"
              disabled={!form.values.job_id}
              clearable
              {...form.getInputProps("date_entered")}
            />
            {!isCreditMemo && (
              <Switch
                label="No Charge"
                color="violet"
                disabled={!form.values.job_id}
                styles={{
                  root: {
                    display: "flex",
                    alignItems: "flex-end",
                    marginBottom: "10px",
                  },
                  track: {
                    cursor: "pointer",
                  },
                }}
                checked={form.values.no_charge || false}
                onChange={(event) =>
                  form.setFieldValue("no_charge", event.currentTarget.checked)
                }
              />
            )}
          </SimpleGrid>

          <Textarea
            label="Comments"
            placeholder="Additional notes..."
            disabled={!form.values.job_id}
            minRows={3}
            {...form.getInputProps("comments")}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending}
              disabled={!form.values.job_id}
              style={{
                background: !form.values.job_id
                  ? "#ccc"
                  : "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
                color: !form.values.job_id ? "#000000ff" : "white",
              }}
            >
              {isCreditMemo ? "Create Credit Memo" : "Create Invoice"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
