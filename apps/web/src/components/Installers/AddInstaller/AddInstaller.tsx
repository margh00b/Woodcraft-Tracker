"use client";

import { useState } from "react";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { InstallerSchema, InstallerFormValues } from "@/zod/installer.schema";
import { useSupabase } from "@/hooks/useSupabase";
import { useInstallerAuthUsers } from "@/hooks/useInstallerAuthUsers";
import { zodResolver } from "@/utils/zodResolver/zodResolver";
import InstallerForm from "@/components/Installers/InstallerForm/InstallerForm";

interface AddInstallerProps {
  opened: boolean;
  onClose: () => void;
}

const initialValues: InstallerFormValues = {
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
  is_servicetech: false,
  notes: "",
};

export default function AddInstaller({ opened, onClose }: AddInstallerProps) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const {
    data: authUsers = [],
    isLoading: authUsersLoading,
    error: authUsersQueryError,
  } = useInstallerAuthUsers();

  const authUsersError =
    authUsersQueryError instanceof Error
      ? authUsersQueryError
      : authUsersQueryError
        ? new Error("Failed to load Auth users.")
        : null;

  const form = useForm<InstallerFormValues>({
    mode: "uncontrolled",
    initialValues,
    validate: zodResolver(InstallerSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (values: InstallerFormValues) => {
      const { data, error } = await supabase
        .from("installers")
        .insert({
          ...values,
          auth_user_id: authUserId,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: async () => {
      notifications.show({
        title: "Success",
        message: "Installer created successfully.",
        color: "green",
      });

      await queryClient.invalidateQueries({
        queryKey: ["installers"],
      });

      form.reset();
      setAuthUserId(null);
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

  function handleClose() {
    if (createMutation.isPending) return;

    form.reset();
    setAuthUserId(null);
    onClose();
  }

  return (
    <InstallerForm
      title="Add New Installer"
      submitLabel="Create Installer"
      opened={opened}
      onClose={handleClose}
      onSubmit={form.onSubmit((values) => createMutation.mutate(values))}
      form={form}
      authUserId={authUserId}
      onAuthUserIdChange={setAuthUserId}
      authUsers={authUsers}
      authUsersLoading={authUsersLoading}
      authUsersError={authUsersError}
      isSubmitting={createMutation.isPending}
    />
  );
}
