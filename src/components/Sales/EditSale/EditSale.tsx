"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useForm } from "@mantine/form";
import { zodResolver } from "@/utils/zodResolver/zodResolver";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import {
  Container,
  Button,
  Group,
  Stack,
  TextInput,
  NumberInput,
  Select,
  Text,
  SimpleGrid,
  Fieldset,
  Paper,
  Switch,
  Loader,
  Center,
  Badge,
  Divider,
  Box,
  Autocomplete,
  Modal,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { FaCopy, FaPlus } from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import {
  MasterOrderInput,
  MasterOrderSchema,
} from "@/zod/salesOrder_Cabinets_Jobs.schema";
import { Tables } from "@/types/db";
import {
  DeliveryTypeOptions,
  DrawerBoxOptions,
  DrawerHardwareOptions,
  FinishOptions,
  flooringClearanceOptions,
  flooringTypeOptions,
  InteriorOptions,
  OrderTypeOptions,
  TopDrawerFrontOptions,
} from "@/dropdowns/dropdownOptions";
import { useJobBaseNumbers } from "@/hooks/useJobBaseNumbers";

const FEATURE_MANUAL_JOB_ENTRY = true;

type EditSaleProps = {
  salesOrderId: number;
};
type ClientSelectOption = {
  value: string;
  label: string;
  original: Tables<"client">;
};
type ReferenceOption = {
  value: string;
  label: string;
};

interface ExtendedMasterOrderInput extends MasterOrderInput {
  manual_job_base?: number;
  manual_job_suffix?: string;
}

export default function EditSale({ salesOrderId }: EditSaleProps) {
  const { supabase, isAuthenticated } = useSupabase();
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [selectedClientData, setSelectedClientData] =
    useState<Tables<"client"> | null>(null);

  const [speciesSearch, setSpeciesSearch] = useState("");
  const [colorSearch, setColorSearch] = useState("");
  const [newItemValue, setNewItemValue] = useState("");
  const [
    speciesModalOpened,
    { open: openSpeciesModal, close: closeSpeciesModal },
  ] = useDisclosure(false);
  const [colorModalOpened, { open: openColorModal, close: closeColorModal }] =
    useDisclosure(false);
  const { data: jobBaseOptions, isLoading: jobsLoading } =
    useJobBaseNumbers(isAuthenticated);

  const { data: colorsData, isLoading: colorsLoading } = useQuery<
    { Id: number; Name: string }[]
  >({
    queryKey: ["colors-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colors")
        .select("Id, Name")
        .order("Name");
      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated,
  });

  const { data: speciesData, isLoading: speciesLoading } = useQuery<
    { Id: number; Species: string }[]
  >({
    queryKey: ["species-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("species")
        .select("Id, Species")
        .order("Species");
      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated,
  });
  type DoorStyleOptionData = Pick<Tables<"door_styles">, "id" | "name">;
  const { data: doorStylesData, isLoading: doorStylesLoading } = useQuery<
    DoorStyleOptionData[]
  >({
    queryKey: ["door-styles-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("door_styles")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated,
  });

  const colorOptions = useMemo<ReferenceOption[]>(() => {
    return (colorsData || []).map((c) => ({
      value: String(c.Id),
      label: c.Name,
    }));
  }, [colorsData]);

  const speciesOptions = useMemo<ReferenceOption[]>(() => {
    return (speciesData || []).map((s) => ({
      value: String(s.Id),
      label: s.Species,
    }));
  }, [speciesData]);

  const doorStyleOptions = useMemo<ReferenceOption[]>(() => {
    return (doorStylesData || []).map((d) => ({
      value: String(d.id),
      label: d.name,
    }));
  }, [doorStylesData]);

  const addSpeciesMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("species")
        .insert({ Species: name })
        .select("Id")
        .single();
      if (error) throw error;
      return data.Id;
    },
    onSuccess: (newId) => {
      notifications.show({
        title: "Success",
        message: "Species added",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["species-list"] });
      form.setFieldValue("cabinet.species", String(newId));
      closeSpeciesModal();
      setNewItemValue("");
    },
    onError: (err: any) =>
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      }),
  });

  const addColorMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("colors")
        .insert({ Name: name })
        .select("Id")
        .single();
      if (error) throw error;
      return data.Id;
    },
    onSuccess: (newId) => {
      notifications.show({
        title: "Success",
        message: "Color added",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["colors-list"] });
      form.setFieldValue("cabinet.color", String(newId));
      closeColorModal();
      setNewItemValue("");
    },
    onError: (err: any) =>
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      }),
  });

  const { data: salesOrderData, isLoading: salesOrderLoading } = useQuery({
    queryKey: ["sales-order", salesOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select(
          `
            *, 
            client: client(*), 
            job: jobs(id, job_number, job_base_number, job_suffix),
            cabinet: cabinets(
                *, 
                species_name:species(Species), 
                color_name:colors(Name), 
                door_style_name:door_styles(name)
            )
          `
        )
        .eq("id", salesOrderId)
        .single();

      if (error) throw error;
      const transformedData = {
        ...data,
        cabinet: {
          ...data.cabinet,
          species_name:
            data.cabinet.species_name?.[0]?.Species ||
            data.cabinet.species_name,
          color_name:
            data.cabinet.color_name?.[0]?.Name || data.cabinet.color_name,
          door_style_name:
            data.cabinet.door_style_name?.[0]?.name ||
            data.cabinet.door_style_name,
        },
      };

      return transformedData as any;
    },
    enabled: isAuthenticated && !!salesOrderId,
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client")
        .select("*")
        .order("lastName");

      if (error) throw error;
      return data as Tables<"client">[];
    },
    enabled: isAuthenticated,
  });

  const clientSelectOptions = useMemo(() => {
    return (clientsData || []).map((c) => ({
      value: String(c.id),
      label: c.lastName,
      original: c,
    }));
  }, [clientsData]);

  const form = useForm<ExtendedMasterOrderInput>({
    initialValues: {
      client_id: 0,
      stage: "QUOTE",
      total: 0,
      deposit: 0,
      install: false,
      comments: "",
      order_type: "",
      delivery_type: "",
      manual_job_base: undefined,
      manual_job_suffix: "",
      cabinet: {
        species: "",
        color: "",
        door_style: "",
        finish: "",
        glaze: "",
        top_drawer_front: "",
        interior: "",
        drawer_box: "",
        drawer_hardware: "",
        box: "",
        piece_count: "",
        glass_type: "",
        hinge_soft_close: false,
        doors_parts_only: false,
        handles_supplied: false,
        handles_selected: false,
        glass: false,
      },
      shipping: {
        shipping_client_name: "",
        shipping_street: "",
        shipping_city: "",
        shipping_province: "",
        shipping_zip: "",
        shipping_phone_1: "",
        shipping_phone_2: "",
        shipping_email_1: "",
        shipping_email_2: "",
      },
      checklist: {
        layout_date: null,
        client_meeting_date: null,
        follow_up_date: null,
        appliance_specs_date: null,
        selections_date: null,
        markout_date: null,
        review_date: null,
        second_markout_date: null,
        flooring_type: "",
        flooring_clearance: "",
      },
    },
    validate: zodResolver(MasterOrderSchema),
  });

  useEffect(() => {
    if (salesOrderData) {
      const cabinet = salesOrderData.cabinet;
      form.setValues({
        client_id: salesOrderData.client_id,
        stage: salesOrderData.stage,
        total: salesOrderData.total,
        deposit: salesOrderData.deposit,
        install: salesOrderData.install,
        comments: salesOrderData.comments,
        order_type: salesOrderData.order_type,
        delivery_type: salesOrderData.delivery_type,
        manual_job_base: salesOrderData.job?.job_base_number,
        manual_job_suffix: salesOrderData.job?.job_suffix || "",
        cabinet: {
          species: String(cabinet.species_id || ""),
          color: String(cabinet.color_id || ""),
          door_style: String(cabinet.door_style_id || ""),
          finish: cabinet.finish,
          glaze: cabinet.glaze,
          top_drawer_front: cabinet.top_drawer_front,
          interior: cabinet.interior,
          drawer_box: cabinet.drawer_box,
          drawer_hardware: cabinet.drawer_hardware,
          box: cabinet.box,
          piece_count: cabinet.piece_count,
          glass_type: cabinet.glass_type,
          hinge_soft_close: cabinet.hinge_soft_close ?? false,
          doors_parts_only: cabinet.doors_parts_only ?? false,
          handles_supplied: cabinet.handles_supplied ?? false,
          handles_selected: cabinet.handles_selected ?? false,
          glass: cabinet.glass ?? false,
        },
        shipping: {
          shipping_client_name: salesOrderData.shipping_client_name || "",
          shipping_street: salesOrderData.shipping_street || "",
          shipping_city: salesOrderData.shipping_city || "",
          shipping_province: salesOrderData.shipping_province || "",
          shipping_zip: salesOrderData.shipping_zip || "",
          shipping_phone_1: salesOrderData.shipping_phone_1 || "",
          shipping_phone_2: salesOrderData.shipping_phone_2 || "",
          shipping_email_1: salesOrderData.shipping_email_1 || "",
          shipping_email_2: salesOrderData.shipping_email_2 || "",
        },
        checklist: {
          layout_date: salesOrderData.layout_date || null,
          client_meeting_date: salesOrderData.client_meeting_date || null,
          follow_up_date: salesOrderData.follow_up_date || null,
          appliance_specs_date: salesOrderData.appliance_specs_date || null,
          selections_date: salesOrderData.selections_date || null,
          markout_date: salesOrderData.markout_date || null,
          review_date: salesOrderData.review_date || null,
          second_markout_date: salesOrderData.second_markout_date || null,
          flooring_type: salesOrderData.flooring_type || "",
          flooring_clearance: salesOrderData.flooring_clearance || "",
        },
      });
      setSelectedClientData(salesOrderData.client);
    }
  }, [salesOrderData]);

  const copyClientToShipping = () => {
    if (!selectedClientData) return;
    form.setFieldValue("shipping", {
      shipping_client_name: `${selectedClientData.firstName ?? ""} ${
        selectedClientData.lastName
      }`,
      shipping_street: selectedClientData.street ?? "",
      shipping_city: selectedClientData.city ?? "",
      shipping_province: selectedClientData.province ?? "",
      shipping_zip: selectedClientData.zip ?? "",
      shipping_phone_1: selectedClientData.phone1 ?? "",
      shipping_phone_2: selectedClientData.phone2 ?? "",
      shipping_email_1: selectedClientData.email1 ?? "",
      shipping_email_2: selectedClientData.email2 ?? "",
    });
  };

  const updateMutation = useMutation({
    mutationFn: async (values: ExtendedMasterOrderInput) => {
      if (!user) throw new Error("User not authenticated");

      const cabinetPayload = {
        box: values.cabinet.box,
        finish: values.cabinet.finish,
        glaze: values.cabinet.glaze,
        top_drawer_front: values.cabinet.top_drawer_front,
        interior: values.cabinet.interior,
        drawer_box: values.cabinet.drawer_box,
        drawer_hardware: values.cabinet.drawer_hardware,
        hinge_soft_close: values.cabinet.hinge_soft_close,
        doors_parts_only: values.cabinet.doors_parts_only,
        handles_supplied: values.cabinet.handles_supplied,
        handles_selected: values.cabinet.handles_selected,
        glass: values.cabinet.glass,
        glass_type: values.cabinet.glass ? values.cabinet.glass_type : "",
        piece_count: values.cabinet.doors_parts_only
          ? values.cabinet.piece_count
          : "",
        species_id: values.cabinet.species
          ? Number(values.cabinet.species)
          : null,
        color_id: values.cabinet.color ? Number(values.cabinet.color) : null,
        door_style_id: values.cabinet.door_style
          ? Number(values.cabinet.door_style)
          : null,
      };

      await supabase
        .from("cabinets")
        .update(cabinetPayload)
        .eq("id", salesOrderData.cabinet.id);

      const { error: soError } = await supabase
        .from("sales_orders")
        .update({
          client_id: values.client_id,
          stage: values.stage,
          total: values.total,
          deposit: values.deposit,
          install: values.install,
          comments: values.comments,
          order_type: values.order_type,
          delivery_type: values.delivery_type,
          ...values.shipping,
          ...values.checklist,
        })
        .eq("id", salesOrderId);

      if (soError) throw soError;

      if (values.stage === "SOLD" && FEATURE_MANUAL_JOB_ENTRY) {
        const { manual_job_base, manual_job_suffix } = values;

        if (!manual_job_base) {
          throw new Error("Job Base Number is required for sold jobs.");
        }

        const suffixStr = manual_job_suffix
          ? manual_job_suffix.trim().toUpperCase()
          : null;

        let dupQuery = supabase
          .from("jobs")
          .select("id")
          .eq("job_base_number", manual_job_base);

        if (suffixStr) {
          dupQuery = dupQuery.eq("job_suffix", suffixStr);
        } else {
          dupQuery = dupQuery.is("job_suffix", null);
        }

        const currentJobId = salesOrderData.job?.id;
        if (currentJobId) {
          dupQuery = dupQuery.neq("id", currentJobId);
        }

        const { data: existingJob } = await dupQuery.maybeSingle();

        if (existingJob) {
          const errorSuffix = suffixStr ? `-${suffixStr}` : "";
          throw new Error(
            `Job ${manual_job_base}${errorSuffix} already exists!`
          );
        }

        if (currentJobId) {
          const { error: jobUpdateError } = await supabase
            .from("jobs")
            .update({
              job_base_number: manual_job_base,
              job_suffix: suffixStr,
            })
            .eq("id", currentJobId);

          if (jobUpdateError) throw jobUpdateError;
        } else {
          const { error: jobInsertError } = await supabase.from("jobs").insert({
            sales_order_id: salesOrderId,
            job_base_number: manual_job_base,
            job_suffix: suffixStr,
          });

          if (jobInsertError) throw jobInsertError;
        }
      }

      return true;
    },
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Sales order updated successfully",
        color: "green",
      });
      queryClient.invalidateQueries({
        queryKey: ["sales-order", salesOrderId],
      });
      router.push("/dashboard");
    },
    onError: (err: any) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  if (
    salesOrderLoading ||
    clientsLoading ||
    colorsLoading ||
    speciesLoading ||
    doorStylesLoading
  ) {
    return (
      <Center style={{ height: "100vh" }}>
        <Loader />
        <Text ml="md">Loading...</Text>
      </Center>
    );
  }

  const handleSubmit = (values: ExtendedMasterOrderInput) => {
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

  return (
    <Container
      size="100%"
      pl={10}
      w={"100%"}
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingRight: 0,
        background: "linear-gradient(135deg, #DDE6F5 0%, #E7D9F0 100%)",
      }}
    >
      <form
        noValidate
        onSubmit={form.onSubmit(handleSubmit)}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <Stack>
          <Paper p="md" radius="md" shadow="xl">
            <Text fw={600} size="md" c="#4c00ffff">
              {salesOrderData
                ? salesOrderData.stage === "SOLD"
                  ? `Editing Job # ${salesOrderData.job?.job_number || "—"}`
                  : `Editing Quote #${salesOrderData.sales_order_number || "—"}`
                : "Loading..."}
            </Text>
            <Group align="end" mt="md" style={{ width: "100%" }}>
              {salesOrderData?.stage !== "SOLD" && (
                <Paper p="xs" px="md" shadow="0">
                  <Switch
                    offLabel="Quote"
                    onLabel="Sold"
                    size="xl"
                    color="green"
                    checked={form.values.stage === "SOLD"}
                    onChange={(e) =>
                      form.setFieldValue(
                        "stage",
                        e.currentTarget.checked ? "SOLD" : "QUOTE"
                      )
                    }
                  />
                </Paper>
              )}
              <Select
                label="Suggest Job Base #"
                placeholder="Search existing jobs..."
                data={jobBaseOptions || []}
                searchable
                clearable
                disabled={form.values.stage != "SOLD"}
                style={{ flex: 1 }}
                styles={{
                  dropdown: {
                    boxShadow: "var(--mantine-shadow-xl)",
                    borderColor: "var(--mantine-color-gray-4)",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "var(--mantine-color-gray-2)",
                  },
                  root: { maxWidth: "200px" },
                }}
                comboboxProps={{
                  position: "bottom",
                  middlewares: { flip: false, shift: false },
                  offset: 0,
                }}
                value={
                  form.values.manual_job_base
                    ? String(form.values.manual_job_base)
                    : null
                }
                onChange={(val) => {
                  if (val) {
                    form.setFieldValue("manual_job_base", Number(val));
                  } else {
                    form.setFieldValue("manual_job_base", undefined);
                  }
                }}
              />
              {form.values.stage === "SOLD" && FEATURE_MANUAL_JOB_ENTRY && (
                <Group gap="xs" align="flex-end" style={{ flex: 1 }}>
                  <NumberInput
                    label="Job #"
                    placeholder="40000..."
                    allowNegative={false}
                    {...form.getInputProps("manual_job_base")}
                    style={{ width: 120 }}
                    withAsterisk
                  />
                  <TextInput
                    label="Variant"
                    placeholder="A, B..."
                    {...form.getInputProps("manual_job_suffix")}
                    style={{ width: 80 }}
                    maxLength={5}
                  />
                </Group>
              )}

              {!FEATURE_MANUAL_JOB_ENTRY &&
                salesOrderData?.stage === "SOLD" && (
                  <Box my="auto">
                    <Badge
                      size="lg"
                      color="green"
                      style={{
                        background:
                          "linear-gradient(135deg, #28a745 0%, #218838 100%)",
                        color: "white",
                        border: "none",
                      }}
                    >
                      {(() => {
                        const jobNum = salesOrderData?.job?.job_number;
                        if (!jobNum) return "—";
                        return jobNum;
                      })()}
                    </Badge>
                  </Box>
                )}

              <Select
                label="Switch Client"
                placeholder="Search clients..."
                clearable
                comboboxProps={{
                  position: "bottom",
                  middlewares: { flip: false, shift: false },
                  offset: 0,
                }}
                data={clientSelectOptions}
                searchable
                nothingFoundMessage={
                  <Stack align="center" p="xs" gap="xs">
                    <Text size="sm" c="dimmed">
                      No matching clients found.
                    </Text>
                    <Button
                      variant="filled"
                      size="xs"
                      onClick={() => setIsAddClientModalOpen(true)}
                      leftSection={<FaPlus size={12} />}
                      style={{
                        background:
                          "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
                        color: "white",
                        border: "none",
                      }}
                    >
                      Add New Client
                    </Button>
                  </Stack>
                }
                disabled={clientsLoading || clientSelectOptions.length === 0}
                style={{ flex: 1 }}
                styles={{
                  dropdown: {
                    boxShadow: "var(--mantine-shadow-xl)",
                    borderColor: "var(--mantine-color-gray-4)",
                    borderWidth: "1px",
                    borderStyle: "solid",
                  },
                  root: { maxWidth: "40%" },
                }}
                {...form.getInputProps("client_id")}
                renderOption={({ option }) => {
                  const clientOption = option as ClientSelectOption;
                  const clientData: Tables<"client"> = clientOption.original;
                  return (
                    <Group
                      justify="space-between"
                      wrap="nowrap"
                      gap="md"
                      style={{ width: "100%" }}
                    >
                      <Stack gap={0} style={{ flexGrow: 1 }}>
                        <Text fw={700} size="sm">
                          {clientData.lastName}{" "}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {clientData.street || "—"}, {clientData.city || "—"}
                        </Text>
                      </Stack>
                      <Badge variant="light" color="blue" size="sm" radius="sm">
                        {clientData.phone1 || "—"}
                      </Badge>
                    </Group>
                  );
                }}
                value={String(form.values.client_id)}
                onChange={(val) => {
                  form.setFieldValue("client_id", Number(val));
                  const fullObj = clientSelectOptions.find(
                    (c) => c.value === val
                  )?.original;
                  setSelectedClientData(fullObj as Tables<"client">);
                  form.setFieldValue("shipping", {
                    shipping_client_name: "",
                    shipping_street: "",
                    shipping_city: "",
                    shipping_province: "",
                    shipping_zip: "",
                    shipping_phone_1: "",
                    shipping_phone_2: "",
                    shipping_email_1: "",
                    shipping_email_2: "",
                  });
                }}
              />
            </Group>
          </Paper>

          {selectedClientData ? (
            <SimpleGrid
              cols={{ base: 1, lg: 2 }}
              spacing="md"
              bg={"gray.1"}
              p="10px"
            >
              <Fieldset legend="Billing Details" variant="filled" bg={"white"}>
                <Stack gap="sm">
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed">
                      Client Name
                    </Text>
                    <Text fw={600} size="sm">
                      {selectedClientData.lastName}
                    </Text>
                  </Stack>
                  <SimpleGrid cols={2} spacing="md">
                    <Stack gap={0}>
                      <Text size="xs" c="dimmed">
                        Phone 1
                      </Text>
                      <Text fw={500} size="sm">
                        {selectedClientData.phone1 || "N/A"}
                      </Text>
                    </Stack>
                    <Stack gap={0}>
                      <Text size="xs" c="dimmed">
                        Email 1
                      </Text>
                      <Text fw={500} size="sm">
                        {selectedClientData.email1 || "N/A"}
                      </Text>
                    </Stack>
                  </SimpleGrid>
                  <SimpleGrid cols={2} spacing="md">
                    <Stack gap={0}>
                      <Text size="xs" c="dimmed">
                        Phone 2
                      </Text>
                      <Text fw={500} size="sm">
                        {selectedClientData.phone2 || "—"}
                      </Text>
                    </Stack>
                    <Stack gap={0}>
                      <Text size="xs" c="dimmed">
                        Email 2
                      </Text>
                      <Text fw={500} size="sm">
                        {selectedClientData.email2 || "—"}
                      </Text>
                    </Stack>
                  </SimpleGrid>
                  <Divider my={2} />
                  <Stack gap="xs">
                    <Text size="xs" c="dimmed">
                      Billing Address
                    </Text>
                    <Text fw={500} size="sm" mt={-5}>
                      {`${selectedClientData.street || "—"}, ${
                        selectedClientData.city || "—"
                      }, ${selectedClientData.province || "—"} ${
                        selectedClientData.zip || "—"
                      }`}
                    </Text>
                  </Stack>
                </Stack>
              </Fieldset>

              <Fieldset legend="Shipping Details" variant="filled" bg={"white"}>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<FaCopy />}
                      onClick={copyClientToShipping}
                      disabled={!selectedClientData}
                      style={{
                        background:
                          "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
                        color: "white",
                        border: "none",
                      }}
                    >
                      Copy from Billing
                    </Button>
                  </Group>
                  <SimpleGrid cols={2} spacing="sm">
                    <TextInput
                      label="Client Name"
                      placeholder="Name of recipient"
                      {...form.getInputProps(`shipping.shipping_client_name`)}
                    />
                    <TextInput
                      label="Street Address"
                      placeholder="123 Main St"
                      {...form.getInputProps(`shipping.shipping_street`)}
                    />
                  </SimpleGrid>
                  <SimpleGrid cols={3} spacing="sm">
                    <TextInput
                      label="City"
                      {...form.getInputProps(`shipping.shipping_city`)}
                    />
                    <TextInput
                      label="Province"
                      {...form.getInputProps(`shipping.shipping_province`)}
                    />
                    <TextInput
                      label="Zip"
                      {...form.getInputProps(`shipping.shipping_zip`)}
                    />
                  </SimpleGrid>
                  <SimpleGrid cols={2} spacing="sm">
                    <TextInput
                      label="Phone 1"
                      {...form.getInputProps(`shipping.shipping_phone_1`)}
                    />
                    <TextInput
                      label="Phone 2"
                      {...form.getInputProps(`shipping.shipping_phone_2`)}
                    />
                  </SimpleGrid>
                  <SimpleGrid cols={2} spacing="sm">
                    <TextInput
                      label="Email 1"
                      {...form.getInputProps(`shipping.shipping_email_1`)}
                    />
                    <TextInput
                      label="Email 2"
                      {...form.getInputProps(`shipping.shipping_email_2`)}
                    />
                  </SimpleGrid>
                </Stack>
              </Fieldset>
            </SimpleGrid>
          ) : (
            <Center style={{ height: "100px" }} bg={"white"}>
              <Text c="dimmed" size="sm">
                Please select a Client to view billing details.
              </Text>
            </Center>
          )}

          <Paper p="md" bg={"gray.1"}>
            <SimpleGrid cols={{ base: 1, xl: 2 }} spacing={30}>
              <Stack>
                <Fieldset
                  legend="Cabinet Specifications"
                  variant="filled"
                  bg={"white"}
                >
                  <SimpleGrid cols={3}>
                    <Select
                      label="Species"
                      placeholder="Select Species"
                      data={speciesOptions}
                      searchable
                      searchValue={speciesSearch}
                      onSearchChange={setSpeciesSearch}
                      nothingFoundMessage={
                        speciesSearch.trim().length > 0 && (
                          <Button
                            fullWidth
                            variant="light"
                            size="xs"
                            onClick={() => {
                              setNewItemValue(speciesSearch);
                              openSpeciesModal();
                            }}
                          >
                            + Add "{speciesSearch}"
                          </Button>
                        )
                      }
                      {...form.getInputProps(`cabinet.species`)}
                    />
                    <Select
                      label="Color"
                      placeholder="Select Color"
                      data={colorOptions}
                      searchable
                      searchValue={colorSearch}
                      onSearchChange={setColorSearch}
                      nothingFoundMessage={
                        colorSearch.trim().length > 0 && (
                          <Button
                            fullWidth
                            variant="light"
                            size="xs"
                            onClick={() => {
                              setNewItemValue(colorSearch);
                              openColorModal();
                            }}
                          >
                            + Add "{colorSearch}"
                          </Button>
                        )
                      }
                      {...form.getInputProps(`cabinet.color`)}
                    />
                    <Select
                      label="Door Style"
                      placeholder="Select Door Style"
                      data={doorStyleOptions}
                      searchable
                      nothingFoundMessage="No door style found"
                      {...form.getInputProps(`cabinet.door_style`)}
                    />
                    <Select
                      label="Finish"
                      placeholder="Select Finish"
                      data={FinishOptions}
                      searchable
                      nothingFoundMessage="No finish found"
                      {...form.getInputProps(`cabinet.finish`)}
                    />
                    <TextInput
                      label="Glaze"
                      {...form.getInputProps(`cabinet.glaze`)}
                    />
                    <Select
                      label="Top Drawer Front"
                      placeholder="Select Top Drawer Front"
                      data={TopDrawerFrontOptions}
                      searchable
                      nothingFoundMessage="No top drawer front found"
                      {...form.getInputProps(`cabinet.top_drawer_front`)}
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={4} mt="md">
                    <TextInput
                      label="Box"
                      {...form.getInputProps(`cabinet.box`)}
                    />
                    <Select
                      label="Interior Material"
                      placeholder="Select Interior Material"
                      data={InteriorOptions}
                      searchable
                      nothingFoundMessage="No interior material found"
                      {...form.getInputProps(`cabinet.interior`)}
                    />
                    <Select
                      label="Drawer Box"
                      placeholder="Select Drawer Box"
                      data={DrawerBoxOptions}
                      searchable
                      nothingFoundMessage="No drawer box found"
                      {...form.getInputProps(`cabinet.drawer_box`)}
                    />
                    <Select
                      label="Drawer Hardware"
                      placeholder="Select Drawer Hardware"
                      data={DrawerHardwareOptions}
                      searchable
                      nothingFoundMessage="No drawer hardware found"
                      {...form.getInputProps(`cabinet.drawer_hardware`)}
                    />
                  </SimpleGrid>

                  <Divider mt="md" />

                  <SimpleGrid cols={2} mt="md">
                    <Stack gap={5}>
                      <Switch
                        label="Glass Doors Required"
                        color="#4a00e0"
                        style={{
                          display: "inline-flex",
                        }}
                        {...form.getInputProps(`cabinet.glass`, {
                          type: "checkbox",
                        })}
                      />
                      <TextInput
                        label="Glass Type"
                        placeholder="e.g., Frosted, Clear"
                        disabled={!form.values.cabinet.glass}
                        {...form.getInputProps(`cabinet.glass_type`)}
                      />
                    </Stack>

                    <Stack gap={5}>
                      <Switch
                        label="Doors/Parts Only Order"
                        color="#4a00e0"
                        style={{
                          display: "inline-flex",
                        }}
                        {...form.getInputProps(`cabinet.doors_parts_only`, {
                          type: "checkbox",
                        })}
                      />
                      <TextInput
                        label="Total Piece Count"
                        placeholder="e.g., 42"
                        disabled={!form.values.cabinet.doors_parts_only}
                        {...form.getInputProps(`cabinet.piece_count`)}
                      />
                    </Stack>
                  </SimpleGrid>

                  <Divider mt="md" />

                  <SimpleGrid cols={2} mt="md">
                    <Group>
                      <Switch
                        label="Soft Close Hinges"
                        size="md"
                        color="#4a00e0"
                        {...form.getInputProps(`cabinet.hinge_soft_close`, {
                          type: "checkbox",
                        })}
                      />
                      <Switch
                        label="Handles Supplied"
                        size="md"
                        color="#4a00e0"
                        {...form.getInputProps(`cabinet.handles_supplied`, {
                          type: "checkbox",
                        })}
                      />
                      <Switch
                        label="Handles Selected"
                        size="md"
                        color="#4a00e0"
                        {...form.getInputProps(`cabinet.handles_selected`, {
                          type: "checkbox",
                        })}
                      />
                    </Group>
                  </SimpleGrid>
                </Fieldset>

                <Fieldset
                  legend="Financials"
                  variant="filled"
                  bg={"white"}
                  mt="md"
                >
                  <SimpleGrid cols={3}>
                    <NumberInput
                      label="Total"
                      {...form.getInputProps("total")}
                    />
                    <NumberInput
                      label="Deposit"
                      {...form.getInputProps("deposit")}
                    />
                    <TextInput
                      label="Balance"
                      readOnly
                      value={`$${
                        (form.values.total || 0) - (form.values.deposit || 0)
                      }`}
                      variant="filled"
                    />
                  </SimpleGrid>
                </Fieldset>
              </Stack>

              <Stack>
                <Fieldset legend="Checklist" variant="filled" bg={"white"}>
                  <SimpleGrid cols={3}>
                    <Box w="100%">
                      <DateInput
                        label="Layout"
                        clearable
                        {...form.getInputProps(`checklist.layout_date`)}
                      />
                    </Box>
                    <DateInput
                      label="Client Meeting"
                      clearable
                      {...form.getInputProps(`checklist.client_meeting_date`)}
                    />
                    <DateInput
                      label="Follow Up"
                      clearable
                      {...form.getInputProps(`checklist.follow_up_date`)}
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={3} mt="sm">
                    <DateInput
                      label="Appliance Specs"
                      clearable
                      {...form.getInputProps(`checklist.appliance_specs_date`)}
                    />
                    <DateInput
                      label="Selections"
                      clearable
                      {...form.getInputProps(`checklist.selections_date`)}
                    />
                    <DateInput
                      label="Measure (Markout)"
                      clearable
                      {...form.getInputProps(`checklist.markout_date`)}
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={3} mt="sm">
                    <DateInput
                      label="Review"
                      clearable
                      {...form.getInputProps(`checklist.review_date`)}
                    />
                    <DateInput
                      label="Second Markout"
                      clearable
                      {...form.getInputProps(`checklist.second_markout_date`)}
                    />
                  </SimpleGrid>
                </Fieldset>

                <Fieldset legend="Details" variant="filled" bg={"white"}>
                  <TextInput
                    label="Comments"
                    {...form.getInputProps("comments")}
                  />
                  <SimpleGrid cols={2} mt="sm">
                    <Select
                      label="Order Type"
                      placeholder="Single Fam, Multi Fam, Reno..."
                      data={OrderTypeOptions}
                      searchable
                      nothingFoundMessage="No order type found"
                      {...form.getInputProps("order_type")}
                    />
                    <Select
                      label="Delivery Type"
                      placeholder="Pickup, Delivery..."
                      data={DeliveryTypeOptions}
                      searchable
                      nothingFoundMessage="No delivery type found"
                      {...form.getInputProps("delivery_type")}
                    />
                  </SimpleGrid>
                  <SimpleGrid cols={2} mt="sm">
                    <Autocomplete
                      label="Flooring Type"
                      placeholder="Hardwood, Tile, etc."
                      data={flooringTypeOptions}
                      {...form.getInputProps(`checklist.flooring_type`)}
                    />
                    <Autocomplete
                      label="Flooring Clearance"
                      placeholder="3/8, 1/2, etc."
                      data={flooringClearanceOptions}
                      {...form.getInputProps(`checklist.flooring_clearance`)}
                    />
                  </SimpleGrid>
                  <Switch
                    color="#4a00e0"
                    mt="md"
                    label="Installation Required"
                    style={{
                      display: "inline-flex",
                    }}
                    {...form.getInputProps("install", { type: "checkbox" })}
                  />
                </Fieldset>
              </Stack>
            </SimpleGrid>
          </Paper>

          <Paper
            withBorder
            p="md"
            pos="sticky"
            bottom={0}
            style={{ zIndex: 10 }}
          >
            <Group justify="flex-end">
              <Button
                variant="outline"
                style={{
                  background:
                    "linear-gradient(135deg, #FF6B6B 0%, #FF3B3B 100%)",
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
                Update Sale
              </Button>
            </Group>
          </Paper>
        </Stack>
      </form>

      <Modal
        opened={speciesModalOpened}
        onClose={closeSpeciesModal}
        title="Add New Species"
        centered
      >
        <Stack>
          <TextInput
            label="Species Name"
            value={newItemValue}
            onChange={(e) => setNewItemValue(e.target.value)}
            data-autofocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeSpeciesModal}>
              Cancel
            </Button>
            <Button
              onClick={() => addSpeciesMutation.mutate(newItemValue)}
              loading={addSpeciesMutation.isPending}
            >
              Save Species
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={colorModalOpened}
        onClose={closeColorModal}
        title="Add New Color"
        centered
      >
        <Stack>
          <TextInput
            label="Color Name"
            value={newItemValue}
            onChange={(e) => setNewItemValue(e.target.value)}
            data-autofocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeColorModal}>
              Cancel
            </Button>
            <Button
              onClick={() => addColorMutation.mutate(newItemValue)}
              loading={addColorMutation.isPending}
            >
              Save Color
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
