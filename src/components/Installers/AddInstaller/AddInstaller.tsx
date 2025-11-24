"use client";

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
import { InstallerSchema } from "@/zod/installer.schema";
import { useSupabase } from "@/hooks/useSupabase";
import { notifications } from "@mantine/notifications";
import { zodResolver } from "@/utils/zodResolver/zodResolver";

interface AddInstallerProps {
  opened: boolean;
  onClose: () => void;
}

export default function AddInstaller({ opened, onClose }: AddInstallerProps) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  const form = useForm({
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

  const createMutation = useMutation({
    mutationFn: async (values: typeof form.values) => {
      const { data, error } = await supabase
        .from("installers")
        .insert(values)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Installer created successfully",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["installers"] });
      form.reset();
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
      title="Add New Installer"
      size="lg"
    >
      <LoadingOverlay visible={createMutation.isPending} />
      <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
        <SimpleGrid cols={2}>
          <TextInput
            label="First Name"
            placeholder="John"
            withAsterisk
            {...form.getInputProps("first_name")}
          />
          <TextInput
            label="Last Name"
            placeholder="Doe"
            withAsterisk
            {...form.getInputProps("last_name")}
          />

          <TextInput
            label="Company Name"
            placeholder="JD Installations"
            {...form.getInputProps("company_name")}
          />
          <TextInput
            label="Account #"
            placeholder="ACC-001"
            {...form.getInputProps("acc_number")}
          />

          <TextInput
            label="Email"
            placeholder="john@example.com"
            {...form.getInputProps("email")}
          />
          <TextInput
            label="Phone"
            placeholder="555-0123"
            {...form.getInputProps("phone_number")}
          />

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
            loading={createMutation.isPending}
            style={{
              background: "linear-gradient(135deg, #28a745 0%, #218838 100%)",
            }}
          >
            Create Installer
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
