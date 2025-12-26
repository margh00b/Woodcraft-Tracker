"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useForm } from "@mantine/form";
import { zodResolver } from "@/utils/zodResolver/zodResolver";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import utc from "dayjs/plugin/utc";
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
  Checkbox,
  Collapse,
  Radio,
  Textarea,
} from "@mantine/core";
import { FaCopy, FaPlus, FaCheckCircle, FaCircle } from "react-icons/fa";
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
  flooringClearanceOptions,
  flooringTypeOptions,
  InteriorOptions,
  OrderTypeOptions,
  TopDrawerFrontOptions,
} from "@/dropdowns/dropdownOptions";
import RelatedServiceOrders from "@/components/Shared/RelatedServiceOrders/RelatedServiceOrders";
import AddClient from "@/components/Clients/AddClient/AddClient";
import { useNavigationGuard } from "@/providers/NavigationGuardProvider";

import { useClientSearch } from "@/hooks/useClientSearch";
import { useSpeciesSearch } from "@/hooks/useSpeciesSearch";
import { useColorSearch } from "@/hooks/useColorSearch";
import { useDoorStyleSearch } from "@/hooks/useDoorStyleSearch";
import dayjs from "dayjs";
dayjs.extend(utc);
const FEATURE_MANUAL_JOB_ENTRY = true;

type EditSaleProps = {
  salesOrderId: number;
};

interface ExtendedMasterOrderInput extends MasterOrderInput {
  manual_job_base?: string;
  manual_job_suffix?: string;
}

interface NewDoorStyleState {
  name: string;
  model: string;
  is_pre_manufactured: boolean;
  is_made_in_house: boolean;
}

export default function EditSale({ salesOrderId }: EditSaleProps) {
  const { supabase, isAuthenticated } = useSupabase();
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [selectedClientData, setSelectedClientData] =
    useState<Tables<"client"> | null>(null);

  const [newItemValue, setNewItemValue] = useState("");

  const [newDoorStyle, setNewDoorStyle] = useState<NewDoorStyleState>({
    name: "",
    model: "",
    is_pre_manufactured: false,
    is_made_in_house: false,
  });

  const [viewGst, setViewGst] = useState(false);
  const [viewPst, setViewPst] = useState(false);

  const getInclusiveTotal = () => {
    const base = form.values.total || 0;
    let multiplier = 1;
    if (viewGst) multiplier += 0.05;
    if (viewPst) multiplier += 0.07;

    return (base * multiplier).toLocaleString("en-CA", {
      style: "currency",
      currency: "CAD",
    });
  };

  const [
    speciesModalOpened,
    { open: openSpeciesModal, close: closeSpeciesModal },
  ] = useDisclosure(false);
  const [colorModalOpened, { open: openColorModal, close: closeColorModal }] =
    useDisclosure(false);
  const [
    doorStyleModalOpened,
    { open: openDoorStyleModal, close: closeDoorStyleModal },
  ] = useDisclosure(false);

  const form = useForm<ExtendedMasterOrderInput>({
    initialValues: {
      date_sold: null,
      designer: "",
      client_id: 0,
      stage: "QUOTE",
      total: 0,
      deposit: 0,
      install: false,
      comments: "",
      order_type: "",
      delivery_type: "",
      manual_job_base: "",
      manual_job_suffix: "",
      is_active: true,
      is_memo: false,
      flooring_type: "",
      flooring_clearance: "",
      cabinet: {
        species: "",
        color: "",
        door_style: "",
        top_drawer_front: "",
        interior: "",
        drawer_box: "",
        drawer_hardware: "",
        box: "",
        piece_count: "",
        glass_type: "",
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
    },
    validate: zodResolver(MasterOrderSchema),
  });

  const {
    options: clientOptions,
    isLoading: clientsLoading,
    setSearch: setClientSearch,
    search: clientSearch,
  } = useClientSearch(form.values.client_id || null);

  const {
    options: speciesOptions,
    setSearch: setSpeciesSearch,
    search: speciesSearch,
  } = useSpeciesSearch(form.values.cabinet.species || null);

  const {
    options: colorOptions,
    setSearch: setColorSearch,
    search: colorSearch,
  } = useColorSearch(form.values.cabinet.color || null);

  const {
    options: doorStyleOptions,
    setSearch: setDoorStyleSearch,
    search: doorStyleSearch,
  } = useDoorStyleSearch(form.values.cabinet.door_style || null);

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
      queryClient.invalidateQueries({ queryKey: ["species-search"] });
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
      queryClient.invalidateQueries({ queryKey: ["color-search"] });
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

  const addDoorStyleMutation = useMutation({
    mutationFn: async (values: NewDoorStyleState) => {
      const { data, error } = await supabase
        .from("door_styles")
        .insert(values)
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (newId) => {
      notifications.show({
        title: "Success",
        message: "Door Style added",
        color: "green",
      });
      queryClient.invalidateQueries({ queryKey: ["door-style-search"] });
      form.setFieldValue("cabinet.door_style", String(newId));
      closeDoorStyleModal();
      setNewDoorStyle({
        name: "",
        model: "",
        is_pre_manufactured: false,
        is_made_in_house: false,
      });
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
            job: jobs(id, job_number, job_base_number, job_suffix, is_active),
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
      return data as any;
    },
    enabled: isAuthenticated && !!salesOrderId,
  });

  const jobId = salesOrderData?.job?.id;

  const { setIsDirty } = useNavigationGuard();
  const isDirty = form.isDirty();
  useEffect(() => {
    setIsDirty(isDirty);
    return () => setIsDirty(false);
  }, [isDirty, setIsDirty]);

  useEffect(() => {
    if (salesOrderData) {
      const cabinet = salesOrderData.cabinet;
      form.initialize({
        date_sold: salesOrderData.date_sold,
        designer: salesOrderData.designer,
        client_id: salesOrderData.client_id,
        stage: salesOrderData.stage,
        total: salesOrderData.total,
        deposit: salesOrderData.deposit,
        install: salesOrderData.install,
        comments: salesOrderData.comments || "",
        order_type: salesOrderData.order_type,
        delivery_type: salesOrderData.delivery_type,
        manual_job_base: salesOrderData.job?.job_base_number || "",
        manual_job_suffix: salesOrderData.job?.job_suffix || "",
        is_active: salesOrderData.job?.is_active || true,
        is_memo: salesOrderData.is_memo,
        flooring_type: salesOrderData.flooring_type || "",
        flooring_clearance: salesOrderData.flooring_clearance || "",
        cabinet: {
          species: String(cabinet.species_id || ""),
          color: String(cabinet.color_id || ""),
          door_style: String(cabinet.door_style_id || ""),
          top_drawer_front: cabinet.top_drawer_front || "",
          interior: cabinet.interior || "",
          drawer_box: cabinet.drawer_box || "",
          drawer_hardware: cabinet.drawer_hardware || "",
          box: cabinet.box || "",
          piece_count: cabinet.piece_count || "",
          glass_type: cabinet.glass_type || "",
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
      });
      setSelectedClientData(salesOrderData.client);
    }
  }, [salesOrderData]);

  const copyClientToShipping = () => {
    if (!selectedClientData) return;
    form.setFieldValue("shipping", {
      shipping_client_name: `${selectedClientData.lastName}`,
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
      const effectiveIsMemo =
        values.is_memo === true ||
        values.manual_job_suffix?.toLowerCase().includes("x") ||
        false;
      const cabinetPayload = {
        species_id: values.cabinet.species
          ? Number(values.cabinet.species)
          : null,
        color_id: values.cabinet.color ? Number(values.cabinet.color) : null,
        door_style_id: values.cabinet.door_style
          ? Number(values.cabinet.door_style)
          : null,
        box: values.cabinet.box,
        top_drawer_front: values.cabinet.top_drawer_front,
        interior: values.cabinet.interior,
        drawer_box: values.cabinet.drawer_box,
        drawer_hardware: values.cabinet.drawer_hardware,
        doors_parts_only: values.cabinet.doors_parts_only,
        handles_supplied: values.cabinet.handles_supplied,
        handles_selected: values.cabinet.handles_selected,
        glass: values.cabinet.glass,
        glass_type: values.cabinet.glass ? values.cabinet.glass_type : "",
        piece_count: values.cabinet.doors_parts_only
          ? values.cabinet.piece_count
          : "",
      };

      await supabase
        .from("cabinets")
        .update(cabinetPayload)
        .eq("id", salesOrderData.cabinet.id);

      const dateSold =
        salesOrderData.date_sold === null && values.stage === "SOLD"
          ? dayjs.utc().format()
          : salesOrderData.stage === "SOLD"
          ? salesOrderData.date_sold
          : null;
      const { error: soError } = await supabase
        .from("sales_orders")
        .update({
          date_sold: dateSold,
          client_id: values.client_id,
          stage: values.stage,
          total: values.total,
          deposit: values.deposit,
          install: values.install,
          comments: values.comments,
          order_type: values.order_type,
          delivery_type: values.delivery_type,
          is_memo: effectiveIsMemo,
          flooring_type: values.flooring_type,
          flooring_clearance: values.flooring_clearance,
          ...values.shipping,
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
              is_active: values.is_active,
            })
            .eq("id", currentJobId);

          if (jobUpdateError) throw jobUpdateError;
        } else {
          const { error: jobInsertError } = await supabase.from("jobs").insert({
            sales_order_id: salesOrderId,
            job_base_number: manual_job_base,
            job_suffix: suffixStr,
            is_active: values.is_active,
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
      queryClient.invalidateQueries({
        queryKey: ["sales_table"],
      });
      router.push("/dashboard/sales");
    },
    onError: (err: any) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  if (salesOrderLoading) {
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

  const isMemoChecked =
    form.values.stage === "SOLD" &&
    (form.values.is_memo === true ||
      form.values.manual_job_suffix?.toLowerCase().includes("x"));

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
        <Stack gap={5}>
          {}
          <Paper p="md" radius="md" shadow="xl" withBorder>
            <SimpleGrid cols={3}>
              <Group align="end">
                <Switch
                  offLabel="Quote"
                  onLabel="Sold"
                  size="xl"
                  thumbIcon={<FaCheckCircle />}
                  styles={{
                    track: {
                      cursor: "pointer",
                      background:
                        form.values.stage === "SOLD"
                          ? "linear-gradient(135deg, #28a745 0%, #218838 100%)"
                          : "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)",
                      color: "white",
                      border: "none",
                      padding: "0 0.2rem",
                      width: "6rem",
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

                <Collapse in={form.values.stage === "SOLD"}>
                  <Group gap="xs" align="flex-end" style={{ flex: 1 }}>
                    <TextInput
                      label="Job #"
                      placeholder="40000..."
                      {...form.getInputProps("manual_job_base")}
                      style={{ width: 120 }}
                      withAsterisk
                    />
                    <TextInput
                      label="Variant"
                      placeholder="A, B..."
                      {...form.getInputProps("manual_job_suffix")}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        form.setFieldValue("manual_job_suffix", value);
                        form.setFieldValue(
                          "is_memo",
                          value.toLowerCase().includes("x")
                        );
                      }}
                      style={{ width: 80 }}
                      maxLength={10}
                    />
                  </Group>
                </Collapse>
              </Group>

              <Select
                label="Switch Client"
                placeholder="Search clients..."
                clearable
                comboboxProps={{
                  position: "bottom",
                  middlewares: { flip: false, shift: false },
                  offset: 0,
                }}
                data={clientOptions}
                searchable
                searchValue={clientSearch}
                onSearchChange={setClientSearch}
                nothingFoundMessage={
                  clientsLoading ? (
                    "Searching..."
                  ) : (
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
                  )
                }
                disabled={clientsLoading}
                style={{ flex: 1 }}
                styles={{
                  dropdown: {
                    boxShadow: "var(--mantine-shadow-xl)",
                    borderColor: "var(--mantine-color-gray-4)",
                    borderWidth: "1px",
                    borderStyle: "solid",
                  },
                  root: { width: "100%" },
                }}
                {...form.getInputProps("client_id")}
                value={String(form.values.client_id)}
                onChange={(val) => {
                  form.setFieldValue("client_id", Number(val));
                  const fullObj = clientOptions.find(
                    (c: any) => c.value === val
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
              <Stack
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "flex-end",
                }}
              >
                <Group>
                  {salesOrderData?.date_sold && (
                    <Text size="xs" c="dimmed">
                      Date Sold:{" "}
                      {dayjs
                        .utc(salesOrderData?.date_sold)
                        .format("DD-MM-YYYY")}
                    </Text>
                  )}

                  <Text size="xs" c="dimmed">
                    Created By: {salesOrderData?.designer}
                  </Text>
                </Group>
                <Group>
                  <Switch
                    onLabel="Memo"
                    offLabel="Memo"
                    size="xl"
                    thumbIcon={isMemoChecked ? <FaCheckCircle /> : <FaCircle />}
                    checked={!!isMemoChecked}
                    onChange={(e) =>
                      form.setFieldValue(
                        "is_memo",
                        e.currentTarget.checked ? true : false
                      )
                    }
                    disabled
                    styles={{
                      track: {
                        cursor: "not-allowed",
                        background: isMemoChecked
                          ? "linear-gradient(135deg, #28a745 0%, #218838 100%)"
                          : "linear-gradient(135deg, #ddddddff 0%, #dadadaff 100%)",
                        color: isMemoChecked ? "white" : "black",
                        border: "none",
                        padding: "0 0.2rem",
                        width: "6rem",
                      },
                      thumb: {
                        background: isMemoChecked ? "#218838" : "#ffffffff",
                      },
                    }}
                  />
                  {form.values.stage === "SOLD" && (
                    <Switch
                      onLabel="Active"
                      offLabel="Dead"
                      size="xl"
                      thumbIcon={
                        form.values.is_active ? <FaCheckCircle /> : <FaCircle />
                      }
                      checked={form.values.is_active}
                      onChange={(e) =>
                        form.setFieldValue("is_active", e.currentTarget.checked)
                      }
                      styles={{
                        track: {
                          cursor: "pointer",
                          background: form.values.is_active
                            ? "linear-gradient(135deg, #28a745 0%, #218838 100%)"
                            : "linear-gradient(135deg, #ff0000ff 0%, #ff6363ff 100%)",
                          color: form.values.is_active ? "white" : "white",
                          border: "none",
                          padding: "0 0.2rem",
                          width: "6rem",
                        },
                        thumb: {
                          background: form.values.is_active
                            ? "#218838"
                            : "#cf0000ff",
                        },
                      }}
                    />
                  )}
                </Group>
              </Stack>
            </SimpleGrid>
          </Paper>

          {}
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

          {}
          <Paper p="md" withBorder bg={"gray.1"}>
            <SimpleGrid cols={{ base: 1, xl: 2 }} spacing={30}>
              {}
              <Stack>
                <Fieldset
                  legend="Basic Information"
                  variant="filled"
                  bg={"white"}
                >
                  <SimpleGrid cols={2} mt="sm">
                    <Autocomplete
                      label="Order Type"
                      withAsterisk
                      placeholder="Single Fam, Multi Fam, Reno..."
                      data={OrderTypeOptions}
                      {...form.getInputProps("order_type")}
                    />
                    <Select
                      label="Delivery Type"
                      withAsterisk
                      placeholder="Pickup, Delivery..."
                      data={DeliveryTypeOptions}
                      searchable
                      nothingFoundMessage="No delivery type found"
                      {...form.getInputProps("delivery_type")}
                    />
                  </SimpleGrid>
                </Fieldset>

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
                      searchValue={doorStyleSearch}
                      onSearchChange={setDoorStyleSearch}
                      nothingFoundMessage={
                        doorStyleSearch.trim().length > 0 && (
                          <Button
                            fullWidth
                            variant="light"
                            size="xs"
                            onClick={() => {
                              setNewDoorStyle((prev) => ({
                                ...prev,
                                name: doorStyleSearch,
                              }));
                              openDoorStyleModal();
                            }}
                          >
                            + Add "{doorStyleSearch}"
                          </Button>
                        )
                      }
                      {...form.getInputProps(`cabinet.door_style`)}
                    />
                    <Autocomplete
                      label="Top Drawer Front"
                      placeholder="Select or type Top Drawer Front"
                      data={TopDrawerFrontOptions}
                      {...form.getInputProps(`cabinet.top_drawer_front`)}
                    />
                    <Autocomplete
                      label="Interior Material"
                      placeholder="Select Interior Material"
                      data={InteriorOptions}
                      {...form.getInputProps(`cabinet.interior`)}
                    />
                    <Autocomplete
                      label="Drawer Box"
                      placeholder="Select Drawer Box"
                      data={DrawerBoxOptions}
                      {...form.getInputProps(`cabinet.drawer_box`)}
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={4} mt="md">
                    <Autocomplete
                      label="Box"
                      data={[]}
                      {...form.getInputProps(`cabinet.box`)}
                    />
                    <Autocomplete
                      label="Drawer Hardware"
                      placeholder="Select Drawer Hardware"
                      data={DrawerHardwareOptions}
                      {...form.getInputProps(`cabinet.drawer_hardware`)}
                    />
                    <Autocomplete
                      label="Flooring Type"
                      placeholder="Hardwood, Tile, etc."
                      data={flooringTypeOptions}
                      {...form.getInputProps(`flooring_type`)}
                    />
                    <Autocomplete
                      label="Flooring Clearance"
                      placeholder="3/8, 1/2, etc."
                      data={flooringClearanceOptions}
                      {...form.getInputProps(`flooring_clearance`)}
                    />
                  </SimpleGrid>

                  <Divider mt="md" />

                  <SimpleGrid cols={3} mt="md">
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
                    <Stack justify="center" align="end">
                      <Switch
                        label="Handles Supplied"
                        color="#4a00e0"
                        {...form.getInputProps(`cabinet.handles_supplied`, {
                          type: "checkbox",
                        })}
                      />
                      <Switch
                        label="Handles Selected"
                        color="#4a00e0"
                        {...form.getInputProps(`cabinet.handles_selected`, {
                          type: "checkbox",
                        })}
                      />
                    </Stack>
                  </SimpleGrid>
                  <Divider mt="md" />
                </Fieldset>
              </Stack>

              {}
              <Stack>
                <Fieldset legend="Details" variant="filled" bg={"white"}>
                  <Textarea
                    label="Comments"
                    minRows={10}
                    styles={{ input: { minHeight: "200px" } }}
                    {...form.getInputProps("comments")}
                  />

                  <Radio.Group
                    label="Installation Required"
                    withAsterisk
                    mt="md"
                    value={
                      form.values.install === true
                        ? "true"
                        : form.values.install === false
                        ? "false"
                        : ""
                    }
                    onChange={(val) =>
                      form.setFieldValue("install", val === "true")
                    }
                    error={form.errors.install}
                  >
                    <Group mt="xs">
                      <Radio value="true" label="Yes" color="#4a00e0" />
                      <Radio value="false" label="No" color="#4a00e0" />
                    </Group>
                  </Radio.Group>
                </Fieldset>

                <Fieldset legend="Financials" variant="filled" bg={"white"}>
                  <SimpleGrid cols={3}>
                    <Stack gap={6}>
                      <NumberInput
                        label="Total Amount"
                        placeholder="0.00"
                        prefix="$"
                        min={0}
                        thousandSeparator=","
                        decimalScale={2}
                        fixedDecimalScale
                        {...form.getInputProps(`total`)}
                        styles={{ input: { fontWeight: 700 } }}
                      />

                      <Group justify="space-between" align="center" h={24}>
                        <Group gap="sm">
                          <Checkbox
                            size="xs"
                            label="GST"
                            color="#4A00E0"
                            checked={viewGst}
                            onChange={(e) =>
                              setViewGst(e.currentTarget.checked)
                            }
                            styles={{
                              label: { fontWeight: 500, cursor: "pointer" },
                              input: { cursor: "pointer" },
                            }}
                          />
                          <Checkbox
                            size="xs"
                            label="PST"
                            color="#4A00E0"
                            checked={viewPst}
                            onChange={(e) =>
                              setViewPst(e.currentTarget.checked)
                            }
                            styles={{
                              label: { fontWeight: 500, cursor: "pointer" },
                              input: { cursor: "pointer" },
                            }}
                          />
                        </Group>
                        <Collapse
                          in={viewGst || viewPst}
                          transitionDuration={50}
                        >
                          <Text size="sm" fw={700} c="violet">
                            Incl: {getInclusiveTotal()}
                          </Text>
                        </Collapse>
                      </Group>
                    </Stack>

                    <NumberInput
                      label="Deposit"
                      placeholder="0.00"
                      prefix="$"
                      min={0}
                      thousandSeparator=","
                      decimalScale={2}
                      fixedDecimalScale
                      {...form.getInputProps(`deposit`)}
                    />

                    <TextInput
                      label="Balance"
                      readOnly
                      variant="filled"
                      value={
                        (form.values.total || 0) - (form.values.deposit || 0)
                          ? `$${(
                              (form.values.total || 0) -
                              (form.values.deposit || 0)
                            ).toLocaleString("en-CA", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : "$0.00"
                      }
                      styles={{
                        input: {
                          fontWeight: 700,
                          color:
                            form.values.total - form.values.deposit > 0
                              ? "#d6336c"
                              : "#0ca678",
                        },
                      }}
                    />
                  </SimpleGrid>
                </Fieldset>
              </Stack>
            </SimpleGrid>
          </Paper>

          {jobId && <RelatedServiceOrders jobId={jobId} readOnly />}

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
              >
                Update Sale
              </Button>
            </Group>
          </Paper>
        </Stack>
      </form>

      {}
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

      <Modal
        opened={doorStyleModalOpened}
        onClose={closeDoorStyleModal}
        title="Add New Door Style"
        centered
      >
        <Stack>
          <TextInput
            label="Door Style Name"
            value={newDoorStyle.name}
            onChange={(e) =>
              setNewDoorStyle((prev) => ({ ...prev, name: e.target.value }))
            }
            data-autofocus
          />

          <Group>
            <Checkbox
              label="Pre-Manufactured"
              checked={newDoorStyle.is_pre_manufactured}
              onChange={(e) => {
                const isChecked = e.currentTarget.checked;
                setNewDoorStyle((prev) => ({
                  ...prev,
                  is_pre_manufactured: isChecked,
                }));
              }}
            />
            <Checkbox
              label="Made In House"
              checked={newDoorStyle.is_made_in_house}
              onChange={(e) => {
                const isChecked = e.currentTarget.checked;
                setNewDoorStyle((prev) => ({
                  ...prev,
                  is_made_in_house: isChecked,
                }));
              }}
            />
          </Group>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDoorStyleModal}>
              Cancel
            </Button>
            <Button
              onClick={() => addDoorStyleMutation.mutate(newDoorStyle)}
              loading={addDoorStyleMutation.isPending}
            >
              Save Door Style
            </Button>
          </Group>
        </Stack>
      </Modal>

      <AddClient
        opened={isAddClientModalOpen}
        onClose={() => {
          setIsAddClientModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["client-search"] });
        }}
      />
    </Container>
  );
}
