"use client";

import type { FormEvent } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  LoadingOverlay,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  rem,
} from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import type { InstallerFormValues } from "@/zod/installer.schema";
import type { AuthUserOption } from "@/hooks/useInstallerAuthUsers";

interface InstallerFormProps {
  title: string;
  submitLabel: string;
  opened: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  form: UseFormReturnType<InstallerFormValues>;
  authUserId: string | null;
  onAuthUserIdChange: (value: string | null) => void;
  authUsers: AuthUserOption[];
  authUsersLoading: boolean;
  authUsersError: Error | null;
  isSubmitting: boolean;
  submitDisabled?: boolean;
}

function FormSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Paper
      withBorder
      radius="lg"
      p={{ base: "sm", sm: "md" }}
      style={{ position: "relative" }}
    >
      <Group align="flex-start" gap="sm" mb="md" wrap="nowrap">
        <ThemeIcon
          size={36}
          radius="md"
          variant="light"
          color="violet"
          style={{ flexShrink: 0 }}
        >
          <Text size="sm" fw={700}>
            {number}
          </Text>
        </ThemeIcon>

        <Stack gap={2}>
          <Text fw={600} size="sm">
            {title}
          </Text>
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        </Stack>
      </Group>

      {children}
    </Paper>
  );
}

export default function InstallerForm({
  title,
  submitLabel,
  opened,
  onClose,
  onSubmit,
  form,
  authUserId,
  onAuthUserIdChange,
  authUsers,
  authUsersLoading,
  authUsersError,
  isSubmitting,
  submitDisabled = false,
}: InstallerFormProps) {
  const authUserOptions = authUsers.map((user) => ({
    value: user.id,
    label: user.username,
  }));

  const selectedAuthUser = authUsers.find((user) => user.id === authUserId);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Stack gap={2}>
          <Text fw={700} size="lg">
            {title}
          </Text>
          <Text size="xs" c="dimmed" fw={400}>
            Manage installer information and account access.
          </Text>
        </Stack>
      }
      size={680}
      centered
      radius="xl"
      padding={0}
      overlayProps={{ backgroundOpacity: 0.45, blur: 3 }}
      styles={{
        content: {
          display: "flex",
          flexDirection: "column",
          maxHeight: "90dvh",
          overflow: "hidden",
        },
        header: {
          flexShrink: 0,
          padding: `${rem(20)} ${rem(24)}`,
          borderBottom: "1px solid var(--mantine-color-default-border)",
        },
        title: {
          flex: 1,
        },
        body: {
          position: "relative",
          overflowY: "auto",
          minHeight: 0,
          flex: 1,
        },
      }}
    >
      <LoadingOverlay
        visible={isSubmitting}
        zIndex={10}
        overlayProps={{ radius: "md", blur: 1 }}
      />

      <form onSubmit={onSubmit}>
        <Stack gap="lg" p={{ base: "md", sm: "xl" }}>
          <FormSection
            number="01"
            title="Personal & contact details"
            description="Basic information and how to reach this installer."
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput
                key={form.key("first_name")}
                label="First name"
                placeholder="John"
                withAsterisk
                autoComplete="given-name"
                {...form.getInputProps("first_name")}
              />

              <TextInput
                key={form.key("last_name")}
                label="Last name"
                placeholder="Doe"
                withAsterisk
                autoComplete="family-name"
                {...form.getInputProps("last_name")}
              />

              <TextInput
                key={form.key("email")}
                label="Email address"
                placeholder="john@example.com"
                type="email"
                autoComplete="email"
                {...form.getInputProps("email")}
              />

              <TextInput
                key={form.key("phone_number")}
                label="Phone number"
                placeholder="555-0123"
                type="tel"
                autoComplete="tel"
                {...form.getInputProps("phone_number")}
              />

              <TextInput
                key={form.key("street_address")}
                label="Street address"
                placeholder="123 Main Street"
                autoComplete="street-address"
                {...form.getInputProps("street_address")}
              />

              <TextInput
                key={form.key("city")}
                label="City"
                placeholder="Calgary"
                autoComplete="address-level2"
                {...form.getInputProps("city")}
              />

              <TextInput
                key={form.key("zip_code")}
                label="Postal code"
                placeholder="T2P 1A1"
                autoComplete="postal-code"
                {...form.getInputProps("zip_code")}
              />
            </SimpleGrid>
          </FormSection>

          <FormSection
            number="02"
            title="Business information"
            description="Company and account details for your records."
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <TextInput
                key={form.key("company_name")}
                label="Company name"
                placeholder="JD Installations"
                {...form.getInputProps("company_name")}
              />

              <TextInput
                key={form.key("acc_number")}
                label="Account number"
                placeholder="ACC-001"
                {...form.getInputProps("acc_number")}
              />

              <TextInput
                key={form.key("gst_number")}
                label="GST number"
                placeholder="GST registration number"
                {...form.getInputProps("gst_number")}
              />

              <TextInput
                key={form.key("wcb_number")}
                label="WCB number"
                placeholder="WCB account number"
                {...form.getInputProps("wcb_number")}
              />
            </SimpleGrid>
          </FormSection>

          <FormSection
            number="03"
            title="Insite account"
            description="Connect this installer to their mobile app login."
          >
            <Stack gap="sm">
              <Select
                label="Linked authentication account"
                description="Choose the existing account this installer will use to sign in."
                placeholder={
                  authUsersLoading
                    ? "Loading accounts..."
                    : "Search by username"
                }
                data={authUserOptions}
                value={authUserId}
                onChange={onAuthUserIdChange}
                disabled={authUsersLoading || isSubmitting}
                error={
                  authUsersError
                    ? "Unable to load authentication accounts."
                    : undefined
                }
                searchable
                clearable
                nothingFoundMessage="No matching accounts"
                maxDropdownHeight={220}
                comboboxProps={{ withinPortal: true }}
              />

              {authUsersError ? (
                <Alert
                  color="red"
                  variant="light"
                  radius="md"
                  title="Accounts could not be loaded"
                >
                  <Text size="sm">{authUsersError.message}</Text>
                </Alert>
              ) : selectedAuthUser ? (
                <Paper
                  withBorder
                  radius="md"
                  p="sm"
                  bg="var(--mantine-color-violet-light)"
                >
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon
                      color="violet"
                      variant="light"
                      radius="xl"
                      size={36}
                    >
                      <Text fw={700} size="sm">
                        {(
                          selectedAuthUser.username ||
                          selectedAuthUser.email ||
                          "U"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </ThemeIcon>

                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={600} truncate>
                        {selectedAuthUser.username || "Username unavailable"}
                      </Text>
                    </Stack>

                    <Badge color="violet" variant="light">
                      Linked
                    </Badge>
                  </Group>
                </Paper>
              ) : (
                <Text size="xs" c="dimmed">
                  No account linked. You can leave this blank and link an
                  account later.
                </Text>
              )}
            </Stack>
          </FormSection>

          <FormSection
            number="04"
            title="Status & qualifications"
            description="Set the installer's availability and qualifications."
          >
            <Stack gap="md">
              <Checkbox
                key={form.key("is_active")}
                color="violet"
                label="Active installer"
                description="This installer is currently active."
                {...form.getInputProps("is_active", { type: "checkbox" })}
              />

              <Divider color="var(--mantine-color-default-border)" />

              <Checkbox
                key={form.key("is_servicetech")}
                color="violet"
                label="Service technician"
                description="Can be assigned service technician work."
                {...form.getInputProps("is_servicetech", {
                  type: "checkbox",
                })}
              />

              <Divider color="var(--mantine-color-default-border)" />

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Checkbox
                  key={form.key("has_first_aid")}
                  color="violet"
                  label="First aid certified"
                  {...form.getInputProps("has_first_aid", {
                    type: "checkbox",
                  })}
                />

                <Checkbox
                  key={form.key("has_insurance")}
                  color="violet"
                  label="Insurance on file"
                  {...form.getInputProps("has_insurance", {
                    type: "checkbox",
                  })}
                />
              </SimpleGrid>
            </Stack>
          </FormSection>

          <FormSection
            number="05"
            title="Additional notes"
            description="Optional information for office staff."
          >
            <Textarea
              key={form.key("notes")}
              placeholder="Add any relevant details..."
              autosize
              minRows={3}
              maxRows={7}
              {...form.getInputProps("notes")}
            />
          </FormSection>
        </Stack>

        <Divider />

        <Group
          justify="space-between"
          p={{ base: "md", sm: "lg" }}
          bg="var(--mantine-color-body)"
        >
          <Text size="xs" c="dimmed">
            Fields marked with * are required.
          </Text>

          <Group gap="sm">
            <Button
              type="button"
              variant="default"
              radius="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              color="violet"
              radius="md"
              loading={isSubmitting}
              disabled={submitDisabled || authUsersLoading || !!authUsersError}
            >
              {submitLabel}
            </Button>
          </Group>
        </Group>
      </form>
    </Modal>
  );
}
