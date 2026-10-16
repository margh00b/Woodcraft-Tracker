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
import { Tables } from "@/types/db";
import { gradients } from "@/theme";

type InvoiceRow = Tables<"invoices"> & {
  job?: { job_number: string } | null;
  service_orders?: { service_order_number: string } | null;
};

interface EditInvoiceProps {
  opened: boolean;
  onClose: () => void;
  invoice: InvoiceRow | null;
  isCreditMemo?: Boolean;
}

export default function EditInvoice({
  opened,
  onClose,
  invoice,
  isCreditMemo,
}: EditInvoiceProps) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  const form = useForm<InvoiceFormInput>({
    initialValues: {
      invoice_number: "",
      job_id: "",
      date_entered: null,
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
    if (opened && invoice) {
      form.setValues({
        invoice_number: invoice.invoice_number,
        job_id: String(invoice.job_id),
        date_entered: invoice.date_entered ? invoice.date_entered : null,
        paid_at: invoice.paid_at ? new Date(invoice.paid_at) : null,
        no_charge: invoice.no_charge ?? false,
        comments: invoice.comments || "",
      });
      setSearch("");
    }
  }, [opened, invoice]);

  const updateMutation = useMutation({
    mutationFn: async (values: InvoiceFormInput) => {
      if (!invoice) return;

      const payload = {
        ...values,
        job_id: Number(values.job_id),
        is_creditmemo: isCreditMemo,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("invoices")
        .update(payload)
        .eq("invoice_id", invoice.invoice_id);

      if (error) throw error;
    },
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: isCreditMemo
          ? "Invoice updated successfully"
          : "Credit Memo updated Successfully",
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
      title={isCreditMemo ? "Edit Credit Memo" : "Edit Invoice"}
      size="lg"
      centered
    >
      <LoadingOverlay visible={updateMutation.isPending || jobsLoading} />

      <form
        onSubmit={form.onSubmit((values) =>
          updateMutation.mutate(values as InvoiceFormInput)
        )}
      >
        <Stack gap="md">
          <SimpleGrid cols={2}>
            {invoice?.service_order_id ? (
              <TextInput
                label="Service Order #"
                value={invoice.service_orders?.service_order_number || ""}
                readOnly
                variant="filled"
              />
            ) : (
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
            )}
            <TextInput
              label={isCreditMemo ? "Credit No." : "Invoice Number"}
              withAsterisk
              {...form.getInputProps("invoice_number")}
            />
          </SimpleGrid>

          <SimpleGrid cols={2}>
            <DateInput
              label="Date Entered"
              valueFormat="YYYY-MM-DD"
              clearable
              {...form.getInputProps("date_entered")}
            />
            {!isCreditMemo && (
              <Switch
                label="No Charge"
                color="violet"
                styles={{
                  root: {
                    display: "flex",
                    alignItems: "flex-end",
                    marginBottom: "10px",
                  },
                  track: { cursor: "pointer" },
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
            minRows={3}
            {...form.getInputProps("comments")}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={updateMutation.isPending}
              variant="gradient"
              gradient={gradients.primary}
            >
              Save Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
