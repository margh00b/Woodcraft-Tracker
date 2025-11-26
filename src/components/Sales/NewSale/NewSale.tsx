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
  Title,
  Autocomplete,
  Modal,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import {
  FaCopy,
  FaPlus,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import {
  MasterOrderInput,
  MasterOrderSchema,
} from "@/zod/salesOrder_Cabinets_Jobs.schema";
import { Tables } from "@/types/db";
import AddClient from "@/components/Clients/AddClient/AddClient";
import { useJobBaseNumbers } from "@/hooks/useJobBaseNumbers";
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

// --- NEW TYPES FOR RELATIONAL DATA ---
type DoorStyleOptionData = Pick<Tables<"door_styles">, "id" | "name">;
type ReferenceOption = {
  value: string; // ID as string for Select component
  label: string; // Name for display
};

interface ExtendedMasterOrderInput extends MasterOrderInput {
  manual_job_base?: number;
  manual_job_suffix?: string;
}

export default function NewSale() {
  const { supabase, isAuthenticated } = useSupabase();
  const { user } = useUser();
  const { data: jobBaseOptions, isLoading: jobsLoading } =
    useJobBaseNumbers(isAuthenticated);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedClientData, setSelectedClientData] =
    useState<Tables<"client"> | null>(null);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);

  const [successBannerData, setSuccessBannerData] = useState<{
    jobNum: string;
    type: string;
  } | null>(null);

  const [parentBaseSelection, setParentBaseSelection] = useState<string | null>(
    null
  );

  const [speciesSearch, setSpeciesSearch] = useState("");
  const [colorSearch, setColorSearch] = useState("");
  const [newItemValue, setNewItemValue] = useState("");
  const [
    speciesModalOpened,
    { open: openSpeciesModal, close: closeSpeciesModal },
  ] = useDisclosure(false);
  const [colorModalOpened, { open: openColorModal, close: closeColorModal }] =
    useDisclosure(false);

  const {
    data: clientsData,
    isLoading: clientsLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client")
        .select(
          "id, firstName, lastName, street, city, province, zip, phone1, email1, phone2, email2"
        )
        .order("lastName");
      if (error) throw error;
      return data as Tables<"client">[];
    },
    enabled: isAuthenticated,
  });

  type ClientSelectOption = {
    value: string;
    label: string;
    original: Tables<"client">;
  };

  const clientSelectOptions = useMemo(() => {
    const safeClients = clientsData || [];
    return safeClients.map((c) => {
      const clientItem = c as Tables<"client">;
      return {
        value: String(clientItem.id),
        label: clientItem.lastName,
        original: clientItem,
      };
    });
  }, [clientsData]);

  // --- FETCH REFERENCE DATA (now fetching IDs) ---
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
      return data as DoorStyleOptionData[];
    },
    enabled: isAuthenticated,
  });

  // --- CREATE OPTIONS (useMemo) ---
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

  const doorStylesOptions = useMemo<ReferenceOption[]>(() => {
    return (doorStylesData || []).map((d) => ({
      value: String(d.id),
      label: d.name,
    }));
  }, [doorStylesData]);

  // --- Mutations for Adding Color/Species (Updated to set ID) ---
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
        species: "", // Now stores ID as string
        color: "", // Now stores ID as string
        door_style: "", // Now stores ID as string
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
    if (parentBaseSelection) {
      const baseNumber = Number(parentBaseSelection);
      if (!isNaN(baseNumber) && baseNumber > 0) {
        form.setFieldValue("manual_job_base", baseNumber);
        form.setFieldValue("manual_job_suffix", "");
      }
    } else if (form.values.stage !== "SOLD") {
      form.setFieldValue("manual_job_base", undefined);
      form.setFieldValue("manual_job_suffix", "");
    }
  }, [parentBaseSelection, form.values.stage]);

  const submitMutation = useMutation({
    mutationFn: async (values: ExtendedMasterOrderInput) => {
      if (!user) throw new Error("User not authenticated");

      const {
        client_id,
        stage,
        total,
        deposit,
        comments,
        install,
        order_type,
        delivery_type,
        shipping,
        checklist,
        manual_job_base,
        manual_job_suffix,
      } = values;

      if (stage === "SOLD" && !manual_job_base) {
        throw new Error("Job Base Number is required for Sold jobs.");
      }

      // --- FIX: Construct Cabinet Payload with new FKs (Converting string IDs to Number/null) ---
      const cabinetPayload = {
        // NEW FKs (Converting string IDs to Number/null)
        species_id: values.cabinet.species
          ? Number(values.cabinet.species)
          : null,
        color_id: values.cabinet.color ? Number(values.cabinet.color) : null,
        door_style_id: values.cabinet.door_style
          ? Number(values.cabinet.door_style)
          : null,

        // Existing fields
        box: values.cabinet.box,
        finish: values.cabinet.finish,
        glaze: values.cabinet.glaze,
        top_drawer_front: values.cabinet.top_drawer_front,
        interior: values.cabinet.interior,
        drawer_box: values.cabinet.drawer_box,
        drawer_hardware: values.cabinet.drawer_hardware,
        hinge_soft_close: values.cabinet.hinge_soft_close,
        handles_supplied: values.cabinet.handles_supplied,
        handles_selected: values.cabinet.handles_selected,
        glass: values.cabinet.glass,

        // Conditional text fields
        glass_type: values.cabinet.glass ? values.cabinet.glass_type : "",
        piece_count: values.cabinet.doors_parts_only
          ? values.cabinet.piece_count
          : "",
      };
      // --- END FIX ---

      const transactionPayload = {
        client_id: client_id,
        stage: stage,
        total: total,
        deposit: deposit,
        comments: comments,
        install: install,
        order_type: order_type,
        delivery_type: delivery_type,
        cabinet: cabinetPayload, // Use the new FK payload
        designer: user?.username || "Staff",
        shipping: shipping,
        checklist: checklist,
        manual_job_base: manual_job_base,
        manual_job_suffix: manual_job_suffix
          ? manual_job_suffix.trim().toUpperCase()
          : null,
      };

      const { data: transactionResult, error: rpcError } = await supabase.rpc(
        "create_master_order_transaction",
        {
          p_payload: transactionPayload,
        }
      );

      if (rpcError) throw new Error(`Transaction Failed: ${rpcError.message}`);

      if (!transactionResult || transactionResult.length === 0)
        throw new Error("No order data returned from transaction.");

      const { out_job_number, out_sales_order_number } = transactionResult[0];

      return {
        success: true,
        salesOrderNum: out_sales_order_number,
        finalJobNum: out_job_number,
        jobStage: stage,
      };
    },

    onSuccess: (data) => {
      notifications.show({
        title: "Order Processed",
        message: `Order ${data.salesOrderNum} saved successfully.`,
        color: "green",
      });

      setSuccessBannerData({
        jobNum: data.finalJobNum || data.salesOrderNum,
        type: data.jobStage,
      });
    },

    onError: (err) => {
      notifications.show({
        title: "CRITICAL Error: Submission Failed",
        message: `${err.message}. The form state must be reset. Redirecting...`,
        color: "red",
      });
      router.push("/dashboard");
    },
  });

  useEffect(() => {
    let timer: any;
    if (successBannerData) {
      timer = setTimeout(() => {
        form.reset();
        setSelectedClientData(null);
        queryClient.invalidateQueries({ queryKey: ["sales_orders"] });
        router.push("/dashboard");
        setSuccessBannerData(null);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [successBannerData, router, form, queryClient]);

  const copyClientToShipping = () => {
    if (!selectedClientData) {
      notifications.show({
        message: "Please select a client first",
        color: "orange",
      });
      return;
    }

    form.setFieldValue(`shipping`, {
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

  if (
    !isAuthenticated ||
    clientsLoading ||
    colorsLoading ||
    speciesLoading ||
    doorStylesLoading
  ) {
    return (
      <Center style={{ height: "100vh", width: "100%" }}>
        <Loader />
        <Text ml="md">Loading...</Text>
      </Center>
    );
  }

  if (isError) {
    return (
      <Center style={{ height: "100vh", width: "100%" }}>
        <Text c="red">Error loading clients: {error?.message}</Text>
      </Center>
    );
  }
  const handleSubmit = (values: ExtendedMasterOrderInput) => {
    if (Object.keys(form.errors).length > 0) {
      console.error("Zod Validation Blocked Submission:", form.errors);

      notifications.show({
        title: "Validation Failed",
        message: "Please correct the highlighted fields before submitting.",
        color: "red",
      });
      return;
    }

    submitMutation.mutate(values);
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
        id="single-order-form"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <Stack>
          {/* 1. MASTER DETAILS (Client & Stage) */}
          <Paper withBorder p="md" radius="md" shadow="xl">
            <Group align="end" mt="md" style={{ width: "100%" }}>
              <Paper p="xs" px="md" shadow="false">
                <Switch
                  offLabel="Quote"
                  onLabel="Sold"
                  size="xl"
                  thumbIcon={<FaCheckCircle />}
                  styles={{
                    track: {
                      background:
                        form.values.stage === "SOLD"
                          ? "linear-gradient(135deg, #28a745 0%, #218838 100%)"
                          : "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)",
                      color: "white",
                      border: "none",
                    },
                    thumb: {
                      background:
                        form.values.stage === "SOLD" ? "#218838" : "#4a00e0",
                    },
                  }}
                  checked={form.values.stage === "SOLD"}
                  onChange={(e) =>
                    form.setFieldValue(
                      "stage",
                      e.currentTarget.checked ? "SOLD" : "QUOTE"
                    )
                  }
                />
              </Paper>

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
                value={parentBaseSelection}
                onChange={(val) => {
                  setParentBaseSelection(val);
                }}
              />

              {form.values.stage === "SOLD" && (
                <Group gap="xs" align="flex-end" style={{ flex: 1 }}>
                  <NumberInput
                    label="Base Job #"
                    placeholder="40000..."
                    allowNegative={false}
                    disabled={!!parentBaseSelection}
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

              <Select
                label="Client"
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
                style={{
                  flex: 1,
                }}
                styles={{
                  dropdown: {
                    boxShadow: "var(--mantine-shadow-xl)",
                    borderColor: "var(--mantine-color-gray-4)",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    backgroundColor: "var(--mantine-color-gray-2)",
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
                  form.setFieldValue(`shipping`, {
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

          {/* CONDITIONAL BILLING / SHIPPING */}
          {selectedClientData ? (
            <SimpleGrid
              cols={{ base: 1, lg: 2 }}
              spacing="md"
              bg={"white"}
              p="10px"
            >
              {/* BILLING */}
              <Fieldset legend="Billing Details" variant="filled" bg={"gray.2"}>
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

              {/* SHIPPING */}
              <Fieldset
                legend="Shipping Details"
                variant="filled"
                bg={"gray.2"}
              >
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

          <Paper withBorder p="md" radius="md" shadow="xl">
            <SimpleGrid cols={{ base: 1, xl: 2 }} spacing={30}>
              {/* LEFT COLUMN: Cabinet & Financials */}
              <Stack>
                <Fieldset
                  legend="Cabinet Specifications"
                  variant="filled"
                  bg={"gray.2"}
                >
                  {/* Row 1: Core Aesthetics */}
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
                      data={doorStylesOptions}
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

                  {/* Row 2: Box, Drawers, and Interior Details */}
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

                  {/* Row 3: CONDITIONAL GROUPS (Glass & Parts Count) */}
                  <SimpleGrid cols={2} mt="md">
                    {/* COLUMN 1: GLASS SPECIFICATIONS */}
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

                    {/* COLUMN 2: PIECE COUNT SPECIFICATIONS */}
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

                  {/* Row 4: Hardware & General */}
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

                <Fieldset legend="Financials" variant="filled" bg={"gray.2"}>
                  <SimpleGrid cols={3}>
                    <NumberInput
                      label="Total Amount"
                      prefix="$"
                      min={0}
                      {...form.getInputProps(`total`)}
                    />
                    <NumberInput
                      label="Deposit"
                      prefix="$"
                      min={0}
                      {...form.getInputProps(`deposit`)}
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

              {/* RIGHT COLUMN: Production Checklist & Details */}
              <Stack>
                <Fieldset
                  legend="Production Checklist (Dates)"
                  variant="filled"
                  bg={"gray.2"}
                >
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
                    <div></div>
                  </SimpleGrid>
                </Fieldset>

                <Fieldset legend="Details" variant="filled" bg={"gray.2"}>
                  <TextInput
                    label="Comments"
                    {...form.getInputProps(`comments`)}
                  />
                  <SimpleGrid cols={2} mt="sm">
                    <Select
                      label="Order Type"
                      placeholder="Single Fam, Multi Fam, Reno..."
                      data={OrderTypeOptions}
                      searchable
                      nothingFoundMessage="No order type found"
                      {...form.getInputProps(`order_type`)}
                    />
                    <Select
                      label="Delivery Type"
                      placeholder="Pickup, Delivery..."
                      data={DeliveryTypeOptions}
                      searchable
                      nothingFoundMessage="No delivery type found"
                      {...form.getInputProps(`delivery_type`)}
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

          {/* SUBMIT BAR */}
        </Stack>
        <Paper
          withBorder
          p="md"
          radius="md"
          pos="sticky"
          bottom={0}
          style={{ zIndex: 10 }}
        >
          <Group justify="flex-end">
            <Button
              size="md"
              variant="outline"
              style={{
                background: "linear-gradient(135deg, #FF6B6B 0%, #FF3B3B 100%)",
                color: "white",
                border: "none",
              }}
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="md"
              loading={submitMutation.isPending}
              style={{
                background:
                  form.values.stage === "SOLD"
                    ? "linear-gradient(135deg, #28a745 0%, #218838 100%)"
                    : "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)",
                color: "white",
                border: "none",
              }}
              form="single-order-form"
            >
              {form.values.stage === "SOLD" ? "Process Sale" : "Save Quote"}
            </Button>
          </Group>
        </Paper>
      </form>
      <AddClient
        opened={isAddClientModalOpen}
        onClose={() => {
          setIsAddClientModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["clients-list"] });
        }}
      />

      {successBannerData &&
        (successBannerData.type === "SOLD" ? (
          <Center
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(238, 240, 243, 0.98)",
              zIndex: 1000,
            }}
          >
            <Paper
              shadow="xl"
              radius="lg"
              p={40}
              withBorder
              style={{
                minWidth: "350px",
                maxWidth: "450px",
                borderColor: "var(--mantine-color-green-5)",
                borderWidth: "3px",
                textAlign: "center",
              }}
            >
              <Stack align="center" gap="md">
                <FaCheckCircle size={56} color="var(--mantine-color-green-6)" />
                <Title
                  order={3}
                  c="dark"
                  mt="sm"
                  style={{ textTransform: "uppercase", letterSpacing: "1px" }}
                >
                  New Job Created!
                </Title>
                <Badge
                  color="green"
                  size="xl"
                  variant="filled"
                  radius="md"
                  p="md"
                >
                  <Text component="span" fw={900} size="xl">
                    {successBannerData.jobNum}
                  </Text>
                </Badge>
                <Text size="sm" c="dimmed" mt="lg">
                  Redirecting to dashboard...
                </Text>
              </Stack>
            </Paper>
          </Center>
        ) : (
          <Center
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(238, 240, 243, 0.98)",
              zIndex: 1000,
            }}
          >
            <Paper
              shadow="xl"
              radius="lg"
              p={40}
              withBorder
              style={{
                minWidth: "350px",
                maxWidth: "450px",
                borderColor: "var(--mantine-color-blue-5)",
                borderWidth: "3px",
                textAlign: "center",
              }}
            >
              <Stack align="center" gap="md">
                <FaCheckCircle size={56} color="var(--mantine-color-blue-6)" />
                <Title
                  order={3}
                  c="dark"
                  mt="sm"
                  style={{ textTransform: "uppercase", letterSpacing: "1px" }}
                >
                  Quote Saved Successfully
                </Title>
                <Text size="sm" c="dimmed" mt="lg">
                  Redirecting to dashboard...
                </Text>
              </Stack>
            </Paper>
          </Center>
        ))}

      {/* --- MODALS --- */}
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
