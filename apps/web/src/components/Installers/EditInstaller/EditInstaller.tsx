"use client";

import { useEffect, useState } from "react";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import type { Tables } from "@/types/db";
import { InstallerSchema, InstallerFormValues } from "@/zod/installer.schema";
import { useSupabase } from "@/hooks/useSupabase";
import { useInstallerAuthUsers } from "@/hooks/useInstallerAuthUsers";
import { zodResolver } from "@/utils/zodResolver/zodResolver";
import InstallerForm from "@/components/Installers/InstallerForm/InstallerForm";

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

  const [authUserId, setAuthUserId] = useState<string | null>(
    installer.auth_user_id ?? null,
  );

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
      is_servicetech: false,
      notes: "",
    },
    validate: zodResolver(InstallerSchema),
  });

  useEffect(() => {
    if (!opened) return;

    const values: InstallerFormValues = {
      first_name: installer.first_name ?? "",
      last_name: installer.last_name ?? "",
      company_name: installer.company_name ?? "",
      acc_number: installer.acc_number ?? "",
      email: installer.email ?? "",
      phone_number: installer.phone_number ?? "",
      street_address: installer.street_address ?? "",
      city: installer.city ?? "",
      zip_code: installer.zip_code ?? "",
      gst_number: installer.gst_number ?? "",
      wcb_number: installer.wcb_number ?? "",
      is_active: installer.is_active ?? true,
      has_first_aid: installer.has_first_aid ?? false,
      has_insurance: installer.has_insurance ?? false,
      is_servicetech: installer.is_servicetech ?? false,
      notes: installer.notes ?? "",
    };

    form.setInitialValues(values);
    form.setValues(values);
    form.resetDirty(values);
    setAuthUserId(installer.auth_user_id ?? null);
  }, [installer, opened]);

  const updateMutation = useMutation({
    mutationFn: async (values: InstallerFormValues) => {
      const { error } = await supabase
        .from("installers")
        .update({
          ...values,
          auth_user_id: authUserId,
        })
        .eq("installer_id", installer.installer_id);

      if (error) throw error;
    },
    onSuccess: async () => {
      notifications.show({
        title: "Success",
        message: "Installer updated successfully.",
        color: "green",
      });

      await queryClient.invalidateQueries({
        queryKey: ["installers"],
      });

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

  const isDirty =
    form.isDirty() || authUserId !== (installer.auth_user_id ?? null);

  function handleClose() {
    if (updateMutation.isPending) return;
    onClose();
  }

  return (
    <InstallerForm
      title="Edit Installer"
      submitLabel="Save Changes"
      opened={opened}
      onClose={handleClose}
      onSubmit={form.onSubmit((values) => updateMutation.mutate(values))}
      form={form}
      authUserId={authUserId}
      onAuthUserIdChange={setAuthUserId}
      authUsers={authUsers}
      authUsersLoading={authUsersLoading}
      authUsersError={authUsersError}
      isSubmitting={updateMutation.isPending}
      submitDisabled={!isDirty}
    />
  );
}
