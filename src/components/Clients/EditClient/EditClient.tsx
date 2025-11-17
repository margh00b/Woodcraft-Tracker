"use client";

import {
  Modal,
  Button,
  Stack,
  TextInput,
  SimpleGrid,
  Group,
  Fieldset,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import {
  ClientInput,
  ClientInputSchema,
  ClientType,
} from "@/zod/client.schema";
import { zodResolver } from "@/utils/zodResolver/zodResolver";
import { useEffect } from "react";
import { useSupabase } from "@/hooks/useSupabase";

interface EditClientModalProps {
  opened: boolean;
  onClose: () => void;
  client: ClientType;
}

export default function EditClient({
  opened,
  onClose,
  client,
}: EditClientModalProps) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const form = useForm<ClientInput>({
    mode: "uncontrolled",
    initialValues: {
      lastName: client.lastName,
      street: client.street ?? "",
      city: client.city ?? "",
      province: client.province ?? "",
      zip: client.zip ?? "",
      phone1: client.phone1 ?? "",
      phone2: client.phone2 ?? "",
      email1: client.email1 ?? "",
      email2: client.email2 ?? "",
    },
    validate: zodResolver(ClientInputSchema),
  });
  const editMutation = useMutation({
    mutationFn: async (values: ClientInput) => {
      const validated = ClientInputSchema.partial().parse(values);
      const { data: updatedClient, error: dbError } = await supabase
        .from("client")
        .update(validated)
        .eq("id", client.id)
        .select()
        .single();

      if (dbError) {
        console.error("Supabase Update Error:", dbError);
        throw new Error(dbError.message || "Failed to update client");
      }

      if (!updatedClient) {
        throw new Error("Update failed or client not found.");
      }

      return updatedClient;
    },
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Client updated successfully.",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client", client.id] });
      onClose();
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });
  useEffect(() => {
    if (opened) {
      form.setValues({
        lastName: client.lastName,
        street: client.street ?? "",
        city: client.city ?? "",
        province: client.province ?? "",
        zip: client.zip ?? "",
        phone1: client.phone1 ?? "",
        phone2: client.phone2 ?? "",
        email1: client.email1 ?? "",
        email2: client.email2 ?? "",
      });
      form.resetDirty();
    }
  }, [client, opened]);

  const handleSubmit = async (values: ClientInput) => {
    form.setSubmitting(true);

    try {
      await editMutation.mutateAsync(values);
    } finally {
      form.setSubmitting(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Edit Client" size="xl">
      <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
        <Stack>
          <Fieldset legend="Client Details">
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Client Name"
                withAsterisk // Keep this if it's required
                {...form.getInputProps("lastName")}
              />
            </SimpleGrid>
          </Fieldset>

          <Fieldset legend="Address">
            <Stack>
              <TextInput label="Street" {...form.getInputProps("street")} />
              <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <TextInput label="City" {...form.getInputProps("city")} />
                <TextInput
                  label="Province"
                  {...form.getInputProps("province")}
                />
                <TextInput label="Zip Code" {...form.getInputProps("zip")} />
              </SimpleGrid>
            </Stack>
          </Fieldset>

          <Fieldset legend="Contact Information">
            <Stack>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput label="Phone 1" {...form.getInputProps("phone1")} />
                <TextInput label="Phone 2" {...form.getInputProps("phone2")} />
              </SimpleGrid>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput label="Email 1" {...form.getInputProps("email1")} />
                <TextInput label="Email 2" {...form.getInputProps("email2")} />
              </SimpleGrid>
            </Stack>
          </Fieldset>

          <Group justify="flex-end" mt="md">
            <Button
              type="submit"
              loading={form.submitting}
              disabled={!form.isDirty()}
            >
              Save Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
