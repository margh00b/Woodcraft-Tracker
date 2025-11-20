"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@mantine/form";
import { zodResolver } from "@/utils/zodResolver/zodResolver";
import { useSupabase } from "@/hooks/useSupabase";
import {
  Container,
  Paper,
  Stack,
  Group,
  Text,
  Switch,
  Button,
  SimpleGrid,
  Loader,
  Center,
  Divider,
  Select,
  Box,
  Timeline,
  TimelineItem,
  Grid,
  Textarea,
  TextInput,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import {
  FaCalendarCheck,
  FaCheck,
  FaCheckCircle,
  FaCogs,
  FaCut,
  FaDoorOpen,
  FaIndustry,
  FaPaintBrush,
  FaTools,
  FaTruckLoading,
  FaUser,
} from "react-icons/fa";
import { MdOutlineDoorSliding } from "react-icons/md";

import z from "zod";

// --- Nested Types & Schema Definition ---
const installationSchema = z.object({
  installation_id: z.number().optional(),
  installer_id: z.number().nullable(),
  installation_notes: z.string().nullable(),
  wrap_date: z.coerce.date().nullable(),
  has_shipped: z.boolean(),
  installation_date: z.coerce.date().nullable(),
  installation_completed: z.string().nullable(), // ISO String timestamp for completion
  inspection_date: z.coerce.date().nullable(),
  inspection_completed: z.string().nullable(), // ISO String timestamp for inspection sign-off
  legacy_ref: z.string().nullable(),
});
type InstallationType = z.infer<typeof installationSchema>;

type ProductionScheduleType = {
  prod_id: number;
  rush: boolean;
  placement_date: string | null;
  doors_in_schedule: string | null;
  doors_out_schedule: string | null;
  cut_finish_schedule: string | null;
  cut_melamine_schedule: string | null;
  paint_in_schedule: string | null;
  paint_out_schedule: string | null;
  assembly_schedule: string | null;
  ship_schedule: string | null;
  in_plant_actual: string | null;
  ship_status: "unprocessed" | "tentative" | "confirmed";
  doors_completed_actual: string | null;
  cut_finish_completed_actual: string | null;
  custom_finish_completed_actual: string | null;
  drawer_completed_actual: string | null;
  cut_melamine_completed_actual: string | null;
  paint_completed_actual: string | null;
  assembly_completed_actual: string | null;
};

const combinedFormSchema = installationSchema.extend({
  prod_id: z.number(), // Hidden field to know which prod_schedule to update
  ship_schedule: z.coerce.date().nullable(), // Editable here
  ship_status: z.enum(["unprocessed", "tentative", "confirmed"]), // Editable here

  in_plant_actual: z.string().nullable(),
  doors_completed_actual: z.string().nullable(),
  cut_finish_completed_actual: z.string().nullable(),
  custom_finish_completed_actual: z.string().nullable(),
  drawer_completed_actual: z.string().nullable(),
  cut_melamine_completed_actual: z.string().nullable(),
  paint_completed_actual: z.string().nullable(),
  assembly_completed_actual: z.string().nullable(),
});

type CombinedInstallFormValues = z.infer<typeof combinedFormSchema>;

type CompletionField =
  | "installation_completed"
  | "inspection_completed"
  | "in_plant_actual"
  | "doors_completed_actual"
  | "cut_finish_completed_actual"
  | "custom_finish_completed_actual"
  | "drawer_completed_actual"
  | "cut_melamine_completed_actual"
  | "paint_completed_actual"
  | "assembly_completed_actual";

type InstallerLookup = {
  installer_id: number;
  company_name: string;
  first_name: string;
  last_name: string;
};

type CabinetSpecs = {
  id: number;
  box: string;
  color: string;
  glass: boolean;
  glaze: string;
  finish: string;
  species: string;
  interior: string;
  door_style: string;
  drawer_box: string;
  glass_type: string;
  piece_count: string;
  doors_parts_only: boolean;
  handles_selected: boolean;
  handles_supplied: boolean;
  hinge_soft_close: boolean;
  top_drawer_front: string;
};

type JobData = {
  id: number;
  job_number: string;
  installation: (InstallationType & { installation_id: number }) | null;
  production_schedule: ProductionScheduleType | null;
  sales_orders: {
    shipping_street: string;
    shipping_city: string;
    shipping_province: string;
    shipping_zip: string;
    client: {
      lastName: string;
      phone1: string;
      phone2?: string;
      email1: string;
      email2?: string;
    };
    cabinet: CabinetSpecs;
  };
};

// --- Component ---
export default function InstallationEditor({ jobId }: { jobId: number }) {
  const router = useRouter();
  const { supabase, isAuthenticated } = useSupabase();
  const queryClient = useQueryClient();

  // --- 1. Fetch Job and Installation Data (Expanded Query) ---
  const { data: jobData, isLoading: isJobLoading } = useQuery<JobData>({
    queryKey: ["installation-editor", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
          job_number,
          installation:installation_id (*),
          production_schedule:production_schedule (*),
          sales_orders:sales_orders (
            shipping_street, shipping_city, shipping_province, shipping_zip,
            client:client_id (lastName, phone1, phone2, email1, email2),
            cabinet:cabinets (
              id,
              box,
              color,
              glass,
              glaze,
              finish,
              species,
              interior,
              door_style,
              drawer_box,
              glass_type,
              piece_count,
              doors_parts_only,
              handles_selected,
              handles_supplied,
              hinge_soft_close,
              top_drawer_front
            )
          )
        `
        )
        .eq("id", jobId)
        .single();
      if (error) throw error;
      return data as unknown as JobData;
    },
    enabled: isAuthenticated && !!jobId,
  });

  // --- 2. Fetch Installers Lookup Data ---
  const { data: installers, isLoading: isInstallersLoading } = useQuery<
    InstallerLookup[]
  >({
    queryKey: ["installers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installers")
        .select("installer_id, company_name, first_name, last_name")
        .eq("is_active", true)
        .order("company_name");
      if (error) throw error;
      return data as InstallerLookup[];
    },
    enabled: isAuthenticated,
  });

  const installerOptions = useMemo(() => {
    return (installers || []).map((i) => ({
      value: String(i.installer_id),
      label: i.company_name || `${i.first_name} ${i.last_name}`,
    }));
  }, [installers]);

  // --- 3. Form Initialization ---
  const form = useForm<CombinedInstallFormValues>({
    initialValues: {
      installation_id: undefined,
      installer_id: null,
      // FIX: Initialize nullable strings to "" for Mantine/React compatibility
      installation_notes: "",
      wrap_date: null,
      has_shipped: false,
      installation_date: null,
      installation_completed: null,
      inspection_date: null,
      inspection_completed: null,
      legacy_ref: "",

      // Production Schedule Editable Fields
      prod_id: 0,
      ship_schedule: null,
      ship_status: "unprocessed",

      // NEW EDITABLE PRODUCTION ACTUAL FIELDS
      in_plant_actual: null,
      doors_completed_actual: null,
      cut_finish_completed_actual: null,
      custom_finish_completed_actual: null,
      drawer_completed_actual: null,
      cut_melamine_completed_actual: null,
      paint_completed_actual: null,
      assembly_completed_actual: null,
    },
    validate: zodResolver(combinedFormSchema),
  });

  // Prefill form when data is loaded
  useEffect(() => {
    if (jobData) {
      const install = jobData.installation;
      const prod = jobData.production_schedule;

      if (install) {
        form.setValues({
          installation_id: install.installation_id,
          installer_id: install.installer_id,
          // FIX: Use nullish coalescing to ensure string fields are set to "" if null
          installation_notes: install.installation_notes ?? "",
          wrap_date: install.wrap_date
            ? dayjs(install.wrap_date).toDate()
            : null,
          has_shipped: install.has_shipped,
          installation_date: install.installation_date
            ? dayjs(install.installation_date).toDate()
            : null,
          installation_completed: install.installation_completed,
          inspection_date: install.inspection_date
            ? dayjs(install.inspection_date).toDate()
            : null,
          inspection_completed: install.inspection_completed,
          legacy_ref: install.legacy_ref ?? "",

          // Merge production fields
          prod_id: prod?.prod_id || 0,
          ship_schedule: prod?.ship_schedule
            ? dayjs(prod.ship_schedule).toDate()
            : null,
          ship_status: prod?.ship_status || "unprocessed",

          // NEW EDITABLE PRODUCTION ACTUAL FIELDS
          in_plant_actual: prod?.in_plant_actual || null,
          doors_completed_actual: prod?.doors_completed_actual || null,
          cut_finish_completed_actual:
            prod?.cut_finish_completed_actual || null,
          custom_finish_completed_actual:
            prod?.custom_finish_completed_actual || null,
          drawer_completed_actual: prod?.drawer_completed_actual || null,
          cut_melamine_completed_actual:
            prod?.cut_melamine_completed_actual || null,
          paint_completed_actual: prod?.paint_completed_actual || null,
          assembly_completed_actual: prod?.assembly_completed_actual || null,
        });
        form.resetDirty();
      }
    }
  }, [jobData]);

  // --- 4. Mutation (Multi-Table Update) ---
  const updateMutation = useMutation({
    mutationFn: async (values: CombinedInstallFormValues) => {
      if (!jobData?.installation?.installation_id) {
        throw new Error("Installation record not found for this job.");
      }
      if (!values.prod_id) {
        throw new Error("Production Schedule record not found for this job.");
      }

      const {
        prod_id,
        ship_schedule,
        ship_status,
        in_plant_actual,
        doors_completed_actual,
        cut_finish_completed_actual,
        custom_finish_completed_actual,
        drawer_completed_actual,
        cut_melamine_completed_actual,
        paint_completed_actual,
        assembly_completed_actual,
        ...installValues
      } = values;

      // 4a. Update Installation Table
      const installPayload = {
        ...installValues,
        wrap_date: installValues.wrap_date
          ? dayjs(installValues.wrap_date).format("YYYY-MM-DD")
          : null,
        installation_date: installValues.installation_date
          ? dayjs(installValues.installation_date).format("YYYY-MM-DD")
          : null,
        inspection_date: installValues.inspection_date
          ? dayjs(installValues.inspection_date).format("YYYY-MM-DD")
          : null,
        // Ensure nullable strings are null if empty string before sending to DB
        installation_notes: installValues.installation_notes || null,
        legacy_ref: installValues.legacy_ref || null,
      };

      const { error: installError } = await supabase
        .from("installation")
        .update(installPayload)
        .eq("installation_id", jobData.installation.installation_id);
      if (installError) throw installError;

      // 4b. Update Production Schedule Table
      const prodPayload = {
        ship_schedule: ship_schedule
          ? dayjs(ship_schedule).format("YYYY-MM-DD")
          : null,
        ship_status: ship_status,

        // Actual completion fields
        in_plant_actual,
        doors_completed_actual,
        cut_finish_completed_actual,
        custom_finish_completed_actual,
        drawer_completed_actual,
        cut_melamine_completed_actual,
        paint_completed_actual,
        assembly_completed_actual,
      };

      const { error: prodError } = await supabase
        .from("production_schedule")
        .update(prodPayload)
        .eq("prod_id", prod_id);
      if (prodError) throw prodError;
    },
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Installation and Schedule updated successfully",
        color: "green",
      });
      queryClient.invalidateQueries({
        queryKey: ["installation-editor", jobId],
      });
      queryClient.invalidateQueries({
        queryKey: ["installation_schedule_list"],
      });
      queryClient.invalidateQueries({
        queryKey: ["production_schedule_list"],
      });
      router.push("/dashboard/installation");
    },
    onError: (err: any) =>
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      }),
  });

  if (isJobLoading || isInstallersLoading || !jobData)
    return (
      <Center h="100vh">
        <Loader />
        <Text ml="md">Loading Installation Editor...</Text>
      </Center>
    );

  const client = jobData.sales_orders?.client;
  const cabinet = jobData.sales_orders?.cabinet;
  const shipping = jobData.sales_orders;
  const prodSchedule = jobData.production_schedule;
  const installRecordId = jobData.installation?.installation_id;

  if (!installRecordId) {
    return (
      <Center h="100vh">
        <Text c="red">
          Error: No installation record found for Job #{jobData.job_number}.
        </Text>
      </Center>
    );
  }

  const handleSubmit = (values: CombinedInstallFormValues) => {
    if (Object.keys(form.errors).length > 0) {
      notifications.show({
        title: "Validation Failed",
        message: "Please correct the highlighted fields before submitting.",
        color: "red",
      });
      return;
    }
    updateMutation.mutate(values);
  };

  // Function to toggle any completion timestamp field (using the explicit type)
  const handleCompletionToggle = (field: CompletionField) => {
    const currentValue = form.values[field];
    if (currentValue) {
      form.setFieldValue(field, null);
    } else {
      form.setFieldValue(field, new Date().toISOString());
    }
  };

  // Array for Read-Only Production Schedule Dates
  const productionScheduledSteps: {
    key: keyof ProductionScheduleType;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "placement_date",
      label: "Placement Date",
      icon: <FaIndustry size={12} />,
    },
    {
      key: "doors_in_schedule",
      label: "Doors In",
      icon: <FaDoorOpen size={12} />,
    },
    {
      key: "doors_out_schedule",
      label: "Doors Out",
      icon: <FaDoorOpen size={12} />,
    },
    {
      key: "cut_finish_schedule",
      label: "Cut Finish",
      icon: <FaCut size={12} />,
    },
    {
      key: "cut_melamine_schedule",
      label: "Cut Melamine",
      icon: <FaCut size={12} />,
    },
    {
      key: "paint_in_schedule",
      label: "Paint In",
      icon: <FaPaintBrush size={12} />,
    },
    {
      key: "paint_out_schedule",
      label: "Paint Out",
      icon: <FaPaintBrush size={12} />,
    },
    { key: "assembly_schedule", label: "Assembly", icon: <FaCogs size={12} /> },
  ];

  // Array for Editable Production Actual Dates
  const productionActualSteps: {
    key: CompletionField;
    label: string;
  }[] = [
    { key: "in_plant_actual", label: "In Plant Entry" },
    { key: "doors_completed_actual", label: "Doors Complete" },
    { key: "cut_finish_completed_actual", label: "Cut Finish Complete" },
    { key: "custom_finish_completed_actual", label: "Custom Finish Complete" },
    { key: "drawer_completed_actual", label: "Drawers Complete" },
    { key: "cut_melamine_completed_actual", label: "Cut Melamine Complete" },
    { key: "paint_completed_actual", label: "Paint Complete" },
    { key: "assembly_completed_actual", label: "Assembly Complete" },
  ];

  // --- JSX Rendering ---
  return (
    <Container
      size="100%"
      pl={10}
      w="100%"
      style={{
        paddingRight: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <form
        onSubmit={form.onSubmit(handleSubmit)}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <Grid gutter="xl">
          <Grid.Col span={9}>
            <Stack>
              {/* HEADER: Job Number & Basic Info */}
              <Paper
                p="md"
                radius="md"
                shadow="sm"
                style={{ background: "#e3e3e3" }}
              >
                <Group justify="space-between" align="center">
                  <Text
                    fw={600}
                    size="lg"
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    Installation Job # {jobData.job_number}
                  </Text>
                </Group>
                <Divider my="sm" color="violet" />

                {/* DETAILED INFO: CLIENT, SHIPPING, CABINET (UPDATED) */}
                <SimpleGrid cols={3}>
                  {/* CLIENT & CONTACTS */}
                  <Paper
                    p="md"
                    radius="md"
                    shadow="xs"
                    style={{ background: "#f5f5f5" }}
                  >
                    <Text
                      fw={600}
                      size="lg"
                      mb="md"
                      c="#4A00E0"
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      <FaUser style={{ marginRight: 8 }} /> Client Details
                    </Text>
                    <Stack gap={3}>
                      <Text size="sm">
                        <strong>Client:</strong> {client?.lastName || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Phone 1:</strong> {client?.phone1 || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Phone 2:</strong> {client?.phone2 || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Email 1:</strong> {client?.email1 || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Email 2:</strong> {client?.email2 || "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Address:</strong>{" "}
                        {[
                          shipping?.shipping_street,
                          shipping?.shipping_city,
                          shipping?.shipping_province,
                          shipping?.shipping_zip,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </Text>
                    </Stack>
                  </Paper>

                  {/* CABINET SPECS (FIXED to requested format) */}
                  <Paper
                    p="md"
                    radius="md"
                    shadow="xs"
                    style={{ background: "#f5f5f5" }}
                  >
                    <Text
                      fw={600}
                      size="lg"
                      mb="md"
                      c="#4A00E0"
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      <MdOutlineDoorSliding style={{ marginRight: 8 }} />{" "}
                      Cabinet Specs
                    </Text>

                    <Grid>
                      <Grid.Col span={6}>
                        <Text size="sm">
                          <strong>Box:</strong> {cabinet?.box || "—"}
                        </Text>
                        <Text size="sm">
                          <strong>Color:</strong> {cabinet?.color || "—"}
                        </Text>
                        <Text size="sm">
                          <strong>Finish:</strong> {cabinet?.finish || "—"}
                        </Text>
                        <Text size="sm">
                          <strong>Species:</strong> {cabinet?.species || "—"}
                        </Text>
                        <Text size="sm">
                          <strong>Interior:</strong> {cabinet?.interior || "—"}
                        </Text>
                        <Text size="sm">
                          <strong>Piece Count:</strong>{" "}
                          {cabinet?.piece_count || "—"}
                        </Text>
                        <Text size="sm">
                          <strong>Glass Type:</strong>{" "}
                          {cabinet?.glass_type || "—"}
                        </Text>
                        <Text size="sm">
                          <strong>Door Style:</strong>{" "}
                          {cabinet?.door_style || "—"}
                        </Text>
                        <Text size="sm">
                          <strong>Top Drawer Front:</strong>{" "}
                          {cabinet?.top_drawer_front || "—"}
                        </Text>
                        <Text size="sm">
                          <strong>Drawer Box:</strong>{" "}
                          {cabinet?.drawer_box || "—"}
                        </Text>
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <Text
                          size="sm"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <strong>Glass:</strong>{" "}
                          {cabinet?.glass && (
                            <FaCheck color="#8e2de2" size={12} />
                          )}
                        </Text>
                        <Text
                          size="sm"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <strong>Doors Parts Only:</strong>{" "}
                          {cabinet?.doors_parts_only && (
                            <FaCheck color="#8e2de2" size={12} />
                          )}
                        </Text>
                        <Text
                          size="sm"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <strong>Handles Selected:</strong>{" "}
                          {cabinet?.handles_selected && (
                            <FaCheck color="#8e2de2" size={12} />
                          )}
                        </Text>
                        <Text
                          size="sm"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <strong>Handles Supplied:</strong>{" "}
                          {cabinet?.handles_supplied && (
                            <FaCheck color="#8e2de2" size={12} />
                          )}
                        </Text>
                        <Text
                          size="sm"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <strong>Hinge Soft Close:</strong>{" "}
                          {cabinet?.hinge_soft_close && (
                            <FaCheck color="#8e2de2" size={12} />
                          )}
                        </Text>
                      </Grid.Col>
                    </Grid>
                  </Paper>
                  <Paper
                    p="md"
                    radius="md"
                    shadow="xs"
                    style={{ background: "#f5f5f5" }}
                  >
                    {prodSchedule && (
                      <Box>
                        <Text
                          fw={600}
                          size="lg"
                          mb="md"
                          c="#4A00E0"
                          style={{ display: "flex", alignItems: "center" }}
                        >
                          <FaCogs style={{ marginRight: 8 }} /> Production
                          Scheduled Dates
                        </Text>

                        <Stack gap="xs">
                          {productionScheduledSteps.map((step) => (
                            <Group
                              key={step.key}
                              justify="space-between"
                              wrap="nowrap"
                            >
                              <Group gap="xs" wrap="nowrap">
                                {step.icon}
                                <Text size="sm" fw={500}>
                                  {step.label}:
                                </Text>
                              </Group>
                              <Text
                                size="sm"
                                c={prodSchedule[step.key] ? "dark" : "dimmed"}
                                style={{ whiteSpace: "nowrap" }}
                              >
                                {prodSchedule[step.key]
                                  ? dayjs(
                                      prodSchedule[step.key] as string
                                    ).format("YYYY-MM-DD")
                                  : "—"}
                              </Text>
                            </Group>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Paper>
                </SimpleGrid>
              </Paper>
            </Stack>

            <Paper p="md" radius="md" pb={30}>
              <Stack gap="xl">
                {/* ---------------------------------------------------- */}
                {/* 1. INSTALLER & SCHEDULE (Installation Table Fields) */}
                {/* ---------------------------------------------------- */}
                <Box>
                  <Group mb={8} style={{ color: "#4A00E0" }}>
                    <FaTools size={18} />
                    <Text fw={600}>Installer & Key Dates</Text>
                  </Group>
                  <SimpleGrid cols={3} spacing="md">
                    <Select
                      label="Assigned Installer"
                      placeholder="Select Installer"
                      data={installerOptions}
                      searchable
                      clearable
                      value={String(form.values.installer_id)}
                      onChange={(val) => {
                        form.setFieldValue(
                          "installer_id",
                          val ? Number(val) : null
                        );
                      }}
                    />
                    <DateInput
                      label="Scheduled Installation Date"
                      placeholder="Start Date"
                      clearable
                      valueFormat="YYYY-MM-DD"
                      {...form.getInputProps("installation_date")}
                    />
                    <DateInput
                      label="Scheduled Inspection Date"
                      placeholder="Date"
                      clearable
                      valueFormat="YYYY-MM-DD"
                      {...form.getInputProps("inspection_date")}
                    />
                  </SimpleGrid>
                </Box>

                <Divider />

                {/* ---------------------------------------------------- */}
                {/* 2. SHIPPING (Installation & Production Editable Fields) */}
                {/* ---------------------------------------------------- */}
                <Box>
                  <Group mb={8} style={{ color: "#218838" }}>
                    <FaTruckLoading size={18} />
                    <Text fw={600}>Shipping Management</Text>
                  </Group>
                  <SimpleGrid cols={4} spacing="md">
                    <DateInput
                      label="Wrap Date"
                      placeholder="Date Cabinets Wrapped"
                      clearable
                      valueFormat="YYYY-MM-DD"
                      {...form.getInputProps("wrap_date")}
                    />

                    {/* Editable Production Fields (Ship Date & Status) */}
                    <DateInput
                      label="Scheduled Ship Date"
                      placeholder="Prod Ship Date"
                      clearable
                      valueFormat="YYYY-MM-DD"
                      {...form.getInputProps("ship_schedule")}
                    />
                    <Select
                      label="Ship Status"
                      data={[
                        { value: "unprocessed", label: "Unprocessed" },
                        { value: "tentative", label: "Tentative" },
                        { value: "confirmed", label: "Confirmed" },
                      ]}
                      {...form.getInputProps("ship_status")}
                      styles={() => {
                        const v = form.values.ship_status;
                        let gradient =
                          "linear-gradient(135deg, #B0BEC5, #78909C)";
                        if (v === "confirmed")
                          gradient =
                            "linear-gradient(135deg, #4A00E0, #8E2DE2)";
                        else if (v === "tentative")
                          gradient =
                            "linear-gradient(135deg, #FF6A00, #FFB347)";
                        return {
                          input: {
                            background: gradient,
                            color: "white",
                            fontWeight: 600,
                            border: "none",
                            transition: "background 200ms ease",
                          },
                        };
                      }}
                    />
                    <Box style={{ display: "flex", alignItems: "flex-end" }}>
                      <Switch
                        size="lg"
                        offLabel="Not Shipped"
                        onLabel="SHIPPED"
                        color="green"
                        {...form.getInputProps("has_shipped", {
                          type: "checkbox",
                        })}
                        checked={form.values.has_shipped}
                        styles={{
                          track: {
                            padding: "5px",
                            cursor: "pointer",
                            background: form.values.has_shipped
                              ? "linear-gradient(135deg, #28a745 0%, #218838 100%)"
                              : "linear-gradient(135deg, #FF6B6B 0%, #FF3B3B 100%)",
                            border: "none",
                            color: form.values.has_shipped ? "white" : "black",
                            transition: "background 200ms ease",
                          },
                        }}
                      />
                    </Box>
                  </SimpleGrid>
                </Box>

                <Divider />

                {/* ---------------------------------------------------- */}
                {/* 3. NOTES & REFERENCE (FIXED SECTION) */}
                {/* ---------------------------------------------------- */}
                <Box>
                  <Group mb={8}>
                    <FaCalendarCheck size={18} />
                    <Text fw={600}>Notes & Reference</Text>
                  </Group>
                  <Stack>
                    <Textarea
                      label="Installation/Site Notes"
                      placeholder="Document site conditions, issues, or specific instructions here."
                      rows={4}
                      {...form.getInputProps("installation_notes")}
                    />
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          </Grid.Col>

          {/* RIGHT COLUMN: STICKY SIDEBAR FOR STATUS AND TRACKING */}
          <Grid.Col span={3}>
            {/* Implements the sticky/fixed position inspired by Scheduler.tsx */}
            <Box pt="md" pos="sticky">
              <Stack gap="xl">
                {/* Block 1: Installation Completion Status (SIDE-BY-SIDE Timeline) */}
                <Text
                  fw={600}
                  size="lg"
                  c="violet"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <FaCalendarCheck style={{ marginRight: 8 }} /> Completion
                  Status
                </Text>
                {/* MODIFICATION START: Use SimpleGrid to put timelines side-by-side */}
                <SimpleGrid cols={2} spacing="xl">
                  {/* LEFT TIMELINE: Production Progress Steps (Actuals) */}
                  {prodSchedule && (
                    <Paper p="md" radius="md">
                      <Timeline
                        bulletSize={20} // Reduced bullet size for smaller column
                        lineWidth={2}
                        active={-1}
                        styles={{ root: { "--tl-color": "green" } }}
                      >
                        <TimelineItem
                          key="prod-header"
                          title="Production Actuals" // Shortened title
                          lineVariant="solid"
                          bullet={
                            <Box
                              style={{
                                backgroundColor: "#4A00E0",
                                borderRadius: "50%",
                                width: 20,
                                height: 20,
                                minWidth: 20,
                                minHeight: 20,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                aspectRatio: "1 / 1",
                              }}
                            >
                              <FaCogs size={10} color="white" />
                            </Box>
                          }
                          styles={{
                            item: {
                              "--tl-color": "#e0e0e0",
                            },
                            itemTitle: {
                              color: "#4A00E0",
                              fontWeight: 700,
                              fontSize: "14px", // Adjusted font size
                            },
                          }}
                        ></TimelineItem>
                        {productionActualSteps.map((step) => {
                          const isCompleted = form.values[step.key];
                          const date = isCompleted
                            ? dayjs(isCompleted as string).format("YY-MM-DD")
                            : "—";
                          const bulletColor = isCompleted
                            ? "#28a745"
                            : "#6b6b6b";

                          return (
                            <TimelineItem
                              key={step.key}
                              title={step.label}
                              lineVariant="dashed"
                              my={"20px"}
                              bullet={
                                <Box
                                  style={{
                                    backgroundColor: bulletColor,
                                    borderRadius: "50%",
                                    width: 20,
                                    height: 20,
                                    minWidth: 20,
                                    minHeight: 20,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    aspectRatio: "1 / 1",
                                  }}
                                >
                                  <FaCheckCircle size={10} color="white" />
                                </Box>
                              }
                              style={{
                                my: "5px", // Reduced margin
                              }}
                              styles={{
                                item: {
                                  "--tl-color": isCompleted
                                    ? "#28a745"
                                    : "#e0e0e0",
                                },
                                itemTitle: {
                                  color: isCompleted ? "#28a745" : "#6b6b6b",
                                  fontSize: "12px", // Adjusted font size
                                },
                              }}
                            >
                              <Text
                                size="xs"
                                c="dimmed"
                                display={"flex"}
                                style={{
                                  alignItems: "flex-start",
                                  flexDirection: "column",
                                }}
                              >
                                {isCompleted ? `Done: (${date})` : "Pending"}
                              </Text>
                              <Button
                                size="xs"
                                mt={2}
                                variant="light"
                                color={isCompleted ? "red" : "green"}
                                onClick={() => handleCompletionToggle(step.key)}
                              >
                                {isCompleted ? "Reset" : "Mark Done"}
                              </Button>
                            </TimelineItem>
                          );
                        })}
                      </Timeline>
                    </Paper>
                  )}

                  {/* RIGHT TIMELINE: Installation Phase */}
                  <Paper p="md" radius="md">
                    <Timeline
                      bulletSize={20} // Reduced bullet size for smaller column
                      lineWidth={2}
                      active={-1}
                      styles={{ root: { "--tl-color": "green" } }}
                    >
                      <TimelineItem
                        key="install-header"
                        title="Installation Phase"
                        lineVariant="solid"
                        bullet={
                          <Box
                            style={{
                              backgroundColor: "#4A00E0",
                              borderRadius: "50%",
                              width: 20,
                              height: 20,
                              minWidth: 20,
                              minHeight: 20,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              aspectRatio: "1 / 1",
                            }}
                          >
                            <FaTools size={10} color="white" />
                          </Box>
                        }
                        styles={{
                          item: {
                            "--tl-color": "#e0e0e0",
                          },
                          itemTitle: {
                            color: "#4A00E0",
                            fontWeight: 700,
                            fontSize: "14px",
                          },
                        }}
                      ></TimelineItem>
                      <TimelineItem
                        title="Installation Complete"
                        lineVariant="solid"
                        bullet={
                          <Box
                            style={{
                              backgroundColor: form.values
                                .installation_completed
                                ? "#28a745"
                                : "#6b6b6b",
                              borderRadius: "50%",
                              width: 20,
                              height: 20,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              aspectRatio: "1 / 1",
                            }}
                          >
                            <FaCheckCircle size={10} color="white" />
                          </Box>
                        }
                        styles={{
                          item: {
                            "--tl-color": form.values.installation_completed
                              ? "#28a745"
                              : "#e0e0e0",
                          },
                          itemTitle: {
                            color: form.values.installation_completed
                              ? "#28a745"
                              : "#6b6b6b",
                            fontSize: "12px",
                          },
                        }}
                      >
                        <Text size="xs" c="dimmed">
                          {form.values.installation_completed
                            ? "Signed Off:"
                            : "Pending Sign-off"}
                        </Text>
                        <Text size="xs" fw={500}>
                          {form.values.installation_completed
                            ? dayjs(form.values.installation_completed).format(
                                "YYYY-MM-DD HH:mm"
                              )
                            : "—"}
                        </Text>
                        <Button
                          size="xs"
                          mt={2}
                          variant="light"
                          color={
                            form.values.installation_completed ? "red" : "green"
                          }
                          onClick={() =>
                            handleCompletionToggle("installation_completed")
                          }
                        >
                          {form.values.installation_completed
                            ? "Reset"
                            : "Sign Off"}
                        </Button>
                      </TimelineItem>

                      <TimelineItem
                        title="Final Inspection Completed"
                        lineVariant="solid"
                        bullet={
                          <Box
                            style={{
                              backgroundColor: form.values.inspection_completed
                                ? "#28a745"
                                : "#6b6b6b",
                              borderRadius: "50%",
                              width: 20,
                              height: 20,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              aspectRatio: "1 / 1",
                            }}
                          >
                            <FaCheckCircle size={10} color="white" />
                          </Box>
                        }
                        styles={{
                          item: {
                            "--tl-color": form.values.inspection_completed
                              ? "#28a745"
                              : "#e0e0e0",
                          },
                          itemTitle: {
                            color: form.values.inspection_completed
                              ? "#28a745"
                              : "#6b6b6b",
                            fontSize: "12px",
                          },
                        }}
                      >
                        <Text size="xs" c="dimmed">
                          {form.values.inspection_completed
                            ? "Signed Off:"
                            : "Pending Sign-off"}
                        </Text>
                        <Text size="xs" fw={500}>
                          {form.values.inspection_completed
                            ? dayjs(form.values.inspection_completed).format(
                                "YYYY-MM-DD HH:mm"
                              )
                            : "—"}
                        </Text>
                        <Button
                          size="xs"
                          mt={2}
                          variant="light"
                          color={
                            form.values.inspection_completed ? "red" : "green"
                          }
                          onClick={() =>
                            handleCompletionToggle("inspection_completed")
                          }
                        >
                          {form.values.inspection_completed
                            ? "Reset"
                            : "Sign Off"}
                        </Button>
                      </TimelineItem>
                    </Timeline>
                  </Paper>
                </SimpleGrid>
                {/* MODIFICATION END */}
              </Stack>
            </Box>
          </Grid.Col>
        </Grid>
      </form>

      {/* Footer Buttons */}
      <Paper
        p="md"
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 10,
          background: "linear-gradient(135deg, #DDE6F5 0%, #E7D9F0 100%)",
        }}
      >
        <Group justify="flex-end">
          <Button
            variant="outline"
            style={{
              background: "linear-gradient(135deg, #FF6B6B 0%, #FF3B3B 100%)",
              color: "white",
              border: "none",
            }}
            size="md"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="md"
            color="blue"
            loading={updateMutation.isPending}
            disabled={!form.isDirty() || updateMutation.isPending}
            style={{
              background: !form.isDirty()
                ? "linear-gradient(135deg, #c6c6c6 0%, #9e9e9e 100%)"
                : "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
              color: "white",
              border: "none",
            }}
            onClick={() => form.onSubmit(handleSubmit)()}
          >
            Update Installation
          </Button>
        </Group>
      </Paper>
    </Container>
  );
}
