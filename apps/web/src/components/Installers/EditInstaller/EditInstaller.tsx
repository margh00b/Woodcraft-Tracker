"use client";

import { useEffect } from "react";
import {
  Modal,
  TextInput,
  Button,
  Group,
  SimpleGrid,
  Checkbox,
  Textarea,
  LoadingOverlay,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InstallerSchema, InstallerFormValues } from "@/zod/installer.schema";
import { Tables } from "@/types/db";
import { useSupabase } from "@/hooks/useSupabase";
import { notifications } from "@mantine/notifications";
import { zodResolver } from "@/utils/zodResolver/zodResolver";

interface EditInstallerProps {
  opened: boolean;
  onClose: () => void;
  installer: Tables<"installers">;
}

export default function EditInstaller({
  opened,
  onClose,
  installer,
}: EditInstallerProps) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  const form = useForm<InstallerFormValues>({
    mode: "uncontrolled",
    initialValues: {
      first_name: "",
      last_name: "",
      company_name: "",
      acc_number: "",
      email: "",
      phone_number: "",
      street_address: "",
      city: "",
      zip_code: "",
      gst_number: "",
      wcb_number: "",
      is_active: true,
      has_first_aid: false,
      has_insurance: false,
      notes: "",
    },
    validate: zodResolver(InstallerSchema),
  });

  useEffect(() => {
    if (opened) {
      form.setValues({
        first_name: installer.first_name || "",
        last_name: installer.last_name || "",
        company_name: installer.company_name || "",
        acc_number: installer.acc_number || "",
        email: installer.email || "",
        phone_number: installer.phone_number || "",
        street_address: installer.street_address || "",
        city: installer.city || "",
        zip_code: installer.zip_code || "",
        gst_number: installer.gst_number || "",
        wcb_number: installer.wcb_number || "",
        is_active: installer.is_active ?? true,
        has_first_aid: installer.has_first_aid ?? false,
        has_insurance: installer.has_insurance ?? false,
        notes: installer.notes || "",
      });

      form.resetDirty();
    }
  }, [installer, opened]);

  const updateMutation = useMutation({
    mutationFn: async (values: InstallerFormValues) => {
      const { error } = await supabase
        .from("installers")
        .update(values)
        .eq("installer_id", installer.installer_id);
      if (error) throw error;
    },
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Installer updated successfully",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["installers"] });
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
    <Modal opened={opened} onClose={onClose} title="Edit Installer" size="lg">
      <LoadingOverlay visible={updateMutation.isPending} />
      <form onSubmit={form.onSubmit((values) => updateMutation.mutate(values))}>
        <SimpleGrid cols={2}>
          <TextInput
            label="First Name"
            withAsterisk
            {...form.getInputProps("first_name")}
          />
          <TextInput
            label="Last Name"
            withAsterisk
            {...form.getInputProps("last_name")}
          />
          <TextInput
            label="Company Name"
            {...form.getInputProps("company_name")}
          />
          <TextInput label="Account #" {...form.getInputProps("acc_number")} />
          <TextInput label="Email" {...form.getInputProps("email")} />
          <TextInput label="Phone" {...form.getInputProps("phone_number")} />
          <TextInput
            label="Street Address"
            {...form.getInputProps("street_address")}
          />
          <Group grow>
            <TextInput label="City" {...form.getInputProps("city")} />
            <TextInput label="Zip Code" {...form.getInputProps("zip_code")} />
          </Group>
          <TextInput label="GST #" {...form.getInputProps("gst_number")} />
          <TextInput label="WCB #" {...form.getInputProps("wcb_number")} />
        </SimpleGrid>

        <Group mt="md">
          <Checkbox
            color="purple"
            label="Active Installer"
            {...form.getInputProps("is_active", { type: "checkbox" })}
          />
          <Checkbox
            color="purple"
            label="Has First Aid"
            {...form.getInputProps("has_first_aid", { type: "checkbox" })}
          />
          <Checkbox
            color="purple"
            label="Has Insurance"
            {...form.getInputProps("has_insurance", { type: "checkbox" })}
          />
        </Group>

        <Textarea
          label="Notes"
          mt="md"
          autosize
          minRows={2}
          {...form.getInputProps("notes")}
        />

        <Group justify="flex-end" mt="xl">
          <Button
            type="submit"
            loading={form.submitting}
            disabled={!form.isDirty()}
            style={{
              background: !form.isDirty()
                ? "linear-gradient(135deg, #c6e2c6 0%, #a1d6a1 100%)"
                : "linear-gradient(135deg, #28a745 0%, #218838 100%)",
              color: !form.isDirty() ? "gray" : "white",
              border: "none",
              cursor: !form.isDirty() ? "not-allowed" : "pointer",
            }}
          >
            Save Changes
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
