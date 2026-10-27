"use client";

import { zodResolver } from "@/utils/zodResolver/zodResolver";
import { ClientFormValues, ClientSchema } from "@/zod/client.schema";

import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Stack,
  SimpleGrid,
  TextInput,
  Button,
  Group,
  Modal,
  Fieldset,
} from "@mantine/core";
import { useSupabase } from "@/hooks/useSupabase";
interface AddClientModalProps {
  opened: boolean;
  onClose: () => void;
}
export default function AddClient({ opened, onClose }: AddClientModalProps) {
  const { supabase, user, isLoading } = useSupabase();

  const username =
    user?.user_metadata?.username ?? user?.email?.split("@")[0] ?? "";
  const queryClient = useQueryClient();

  const form = useForm<ClientFormValues>({
    initialValues: {
      lastName: "",
      street: "",
      city: "",
      province: "",
      zip: "",
      phone1: "",
      phone2: "",
      email1: "",
      email2: "",
    },
    validate: zodResolver(ClientSchema),
  });

  useEffect(() => {
    if (!isLoading && username && form.values.designer === "") {
      form.setFieldValue("designer", username);
    }
  }, [isLoading, username, form]);

  const addMutation = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      if (isLoading || !username) {
        throw new Error("User information is not available. Please try again.");
      }

      const validatedInput = ClientSchema.parse(values);
      validatedInput.designer = username;

      const { data: newClient, error: dbError } = await supabase
        .from("client")
        .insert(validatedInput)
        .select()
        .single();

      if (dbError) {
        console.error("Supabase Create Error:", dbError);
        throw new Error(dbError.message || "Failed to create client");
      }

      return newClient;
    },
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Client added successfully",
        color: "green",
      });
      form.reset();

      queryClient.refetchQueries({ queryKey: ["clients"] });
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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Add New Client"
      size="xl"
      centered
    >
      <form
        onSubmit={form.onSubmit((values) => addMutation.mutate(values))}
        noValidate
      >
        <Stack>
          <Fieldset legend="Client Details">
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Client Name"
                withAsterisk
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
              loading={addMutation.isPending || isLoading}
              style={{
                background: "linear-gradient(135deg, #28a745 0%, #218838 100%)",
                color: "white",
                border: "none",
              }}
            >
              Add Client
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
