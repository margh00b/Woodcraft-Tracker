"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useForm } from "@mantine/form";
import { zodResolver } from "@/utils/zodResolver/zodResolver";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import utc from "dayjs/plugin/utc";
import {
  Container,
  Button,
  Group,
  Stack,
  TextInput,
  NumberInput,
  Select,
  SimpleGrid,
  Fieldset,
  Paper,
  Switch,
  Loader,
  Center,
  Badge,
  Title,
  Autocomplete,
  Modal,
  Collapse,
  Checkbox,
  Radio,
  Textarea,
  Text,
  Divider,
  Grid,
  GridCol,
  Popover,
  List,
  ThemeIcon,
} from "@mantine/core";
import {
  FaCopy,
  FaPlus,
  FaCheckCircle,
  FaCircle,
  FaInfoCircle,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import {
  MasterOrderInput,
  MasterOrderSchema,
} from "@/zod/salesOrder_Cabinets_Jobs.schema";
import { Tables } from "@/types/db";
import AddClient from "@/components/Clients/AddClient/AddClient";
import {
  DeliveryTypeOptions,
  DrawerBoxOptions,
  HARDWARE_MAPPING,
  flooringClearanceOptions,
  flooringTypeOptions,
  InteriorOptions,
  OrderTypeOptions,
  TopDrawerFrontOptions,
} from "@/dropdowns/dropdownOptions";
import { useNavigationGuard } from "@/providers/NavigationGuardProvider";

import { useClientSearch } from "@/hooks/useClientSearch";
import { useSpeciesSearch } from "@/hooks/useSpeciesSearch";
import { useColorSearch } from "@/hooks/useColorSearch";
import { useDoorStyleSearch } from "@/hooks/useDoorStyleSearch";
import { useClientProjects } from "@/hooks/useClientProjects";
import { useProjectDetails } from "@/hooks/useProjectDetails";
import dayjs from "dayjs";
import { handleTabSelect } from "@/utils/handleTabSelect";
dayjs.extend(utc);

function getNextVariant(existingSuffixes: (string | null)[]): string | null {
  if (existingSuffixes.length === 1 && existingSuffixes[0] === null) {
    return null;
  }
  const clean = existingSuffixes
    .filter((s): s is string => !!s && s.trim() !== "")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length === 1 && /^[A-Z]$/.test(s))
    .sort((a, b) => a.localeCompare(b));

  if (clean.length === 0) return "A";

  const last = clean[clean.length - 1];

  if (last === "Z") return "AA";

  return String.fromCharCode(last.charCodeAt(0) + 1);
}

interface ExtendedMasterOrderInput extends MasterOrderInput {
  manual_job_base: string;
  manual_job_suffix?: string;
}
interface NewDoorStyleState {
  name: string;
  is_pre_manufactured: boolean;
  is_made_in_house: boolean;
}

export default function NewSale() {
  const { supabase, isAuthenticated } = useSupabase();
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedClientData, setSelectedClientData] =
    useState<Tables<"client"> | null>(null);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [unitNumber, setUnitNumber] = useState("");

  const [jobNum, setJobNum] = useState("");
  const [debouncedJobNum] = useDebouncedValue(jobNum, 300);
  const [isVariantAutofilled, setIsVariantAutofilled] = useState(false);

  const [targetProjectName, setTargetProjectName] = useState<string | null>(
    null,
  );

  const [autofilledSourceJob, setAutofilledSourceJob] = useState<string | null>(
    null,
  );
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [successBannerData, setSuccessBannerData] = useState<{
    jobNum: string;
    type: string;
  } | null>(null);

  const [newItemValue, setNewItemValue] = useState("");
  const [highlightedFields, setHighlightedFields] = useState<string[]>([]);
  const skipClientAutofillRef = useRef(false);
  const focusValues = useRef<Record<string, any>>({});

  const [newDoorStyle, setNewDoorStyle] = useState<NewDoorStyleState>({
    name: "",
    is_pre_manufactured: false,
    is_made_in_house: false,
  });
  const [viewGst, setViewGst] = useState(true);
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
      client_id: 0,
      stage: "QUOTE",
      total: 0,
      deposit: 0,
      install: undefined as unknown as boolean,
      comments: "",
      order_type: undefined as unknown as string,
      delivery_type: "Delivery",
      manual_job_base: "",
      manual_job_suffix: "",
      is_memo: false,
      is_canopy_required: false,
      is_woodtop_required: false,
      is_custom_cab_required: false,
      is_cod: undefined as unknown as boolean,
      payment_received: undefined as unknown as boolean,
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
        project_name: "",
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

  const getAutofillStyles = (fieldName: string) => {
    const isHighlighted = highlightedFields.includes(fieldName);
    return {
      input: {
        transition: "background-color 0.8s ease",
        backgroundColor: isHighlighted ? "#e9ffebff" : undefined,
      },
    };
  };

  const {
    options: clientOptions,
    isLoading: clientsLoading,
    setSearch: setClientSearch,
    search: clientSearch,
  } = useClientSearch(form.values.client_id || null);

  const selectData = useMemo(() => {
    const items: any[] = [...clientOptions];

    if (items.length === 0) {
      if (clientsLoading) {
        items.push({
          value: "STATUS_SEARCHING",
          label: "Searching...",
          disabled: true,
        });
      } else {
        items.push({
          value: "STATUS_NOTHING_FOUND",
          label: "No matching clients found.",
          disabled: true,
        });
      }
    }

    items.push({
      value: "ADD_NEW_CLIENT_OPTION",
      label: "Add New Client",
    });
    return items;
  }, [clientOptions, clientsLoading]);

  const { data: projectOptions, isLoading: projectsLoading } =
    useClientProjects(form.values.client_id || null);

  const { data: projectDetails, isLoading: isLoadingProjectDetails } =
    useProjectDetails(form.values.client_id || null, targetProjectName);

  useEffect(() => {
    if (projectDetails) {
      const job = Array.isArray(projectDetails.jobs)
        ? projectDetails.jobs[0]
        : projectDetails.jobs;
      setAutofilledSourceJob(`Job: ${job.job_number}`);

      const rawStreet = projectDetails.shipping_street || "";
      const match = rawStreet.match(/^\d+\s*-\s*(.*)/);
      const streetWithoutUnit = match ? match[1] : rawStreet;

      form.setFieldValue("shipping", {
        ...form.values.shipping,
        shipping_client_name:
          projectDetails.shipping_client_name ||
          form.values.shipping.shipping_client_name,
        shipping_street: streetWithoutUnit,
        shipping_city: projectDetails.shipping_city || "",
        shipping_province: projectDetails.shipping_province || "",
        shipping_zip: projectDetails.shipping_zip || "",
        shipping_phone_1: projectDetails.shipping_phone_1 || "",
        shipping_phone_2: projectDetails.shipping_phone_2 || "",
        shipping_email_1: projectDetails.shipping_email_1 || "",
        shipping_email_2: projectDetails.shipping_email_2 || "",
      });

      setHighlightedFields([
        "shipping.shipping_client_name",
        "shipping.shipping_street",
        "shipping.shipping_city",
        "shipping.shipping_province",
        "shipping.shipping_zip",
        "shipping.shipping_phone_1",
        "shipping.shipping_phone_2",
        "shipping.shipping_email_1",
        "shipping.shipping_email_2",
      ]);
    } else if ((form.values.shipping?.project_name || "").trim() === "") {
      setAutofilledSourceJob(null);
      setHighlightedFields([]);

      if (selectedClientData) {
        if (skipClientAutofillRef.current) {
          skipClientAutofillRef.current = false;
        } else {
          form.setFieldValue("shipping", {
            project_name: "",
            shipping_client_name: selectedClientData.lastName || "",
            shipping_street: "",
            shipping_city: "",
            shipping_province: "",
            shipping_zip: "",
            shipping_phone_1: "",
            shipping_phone_2: "",
            shipping_email_1: "",
            shipping_email_2: "",
          });
        }
      } else {
        form.setFieldValue("shipping", {
          project_name: "",
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
      }
    }
  }, [
    projectDetails,
    targetProjectName,
    selectedClientData,
    form.values.shipping?.project_name,
  ]);

  const {
    options: speciesOptions,
    setSearch: setSpeciesSearch,
    search: speciesSearchValue,
  } = useSpeciesSearch(null);

  const {
    options: colorOptions,
    setSearch: setColorSearch,
    search: colorSearchValue,
  } = useColorSearch(null);

  const {
    options: doorStyleOptions,
    setSearch: setDoorStyleSearch,
    search: doorStyleSearchValue,
  } = useDoorStyleSearch(null);

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
        flooring_type,
        flooring_clearance,
        delivery_type,
        shipping,
        manual_job_base,
        manual_job_suffix,
        is_canopy_required,
        is_woodtop_required,
        is_custom_cab_required,
        is_cod,
        payment_received,
      } = values;
      if (stage === "SOLD" && !manual_job_base) {
        throw new Error("Job Base Number is required for Sold jobs.");
      }

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
        handles_supplied: values.cabinet.handles_supplied,
        handles_selected: values.cabinet.handles_selected,
        glass: values.cabinet.glass,
        doors_parts_only: values.cabinet.doors_parts_only,
        glass_type: values.cabinet.glass ? values.cabinet.glass_type : "",
        piece_count: values.cabinet.doors_parts_only
          ? values.cabinet.piece_count
          : "",
      };

      const effectiveIsMemo = values.is_memo === true;

      const transactionPayload = {
        date_sold: stage === "SOLD" ? dayjs.utc().format() : null,
        client_id: client_id,
        stage: stage,
        total: total,
        deposit: deposit,
        comments: comments,
        install: install,
        order_type: order_type,
        delivery_type: delivery_type,
        cabinet: cabinetPayload,
        designer: user?.username || "Staff",
        flooring_type: flooring_type,
        flooring_clearance: flooring_clearance,
        shipping: shipping,
        manual_job_base: manual_job_base,
        manual_job_suffix: manual_job_suffix
          ? manual_job_suffix.trim().toUpperCase()
          : null,
        is_memo: effectiveIsMemo,
        is_canopy_required: is_canopy_required,
        is_woodtop_required: is_woodtop_required,
        is_custom_cab_required: is_custom_cab_required,
        is_cod: is_cod,
        payment_received: payment_received,
      };

      const { data: transactionResult, error: rpcError } = await supabase.rpc(
        "create_master_order_transaction",
        {
          p_payload: transactionPayload,
        },
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
        message: `${err.message}. Please try again.`,
        color: "red",
      });
    },
  });

  useEffect(() => {
    let timer: any;
    if (successBannerData) {
      timer = setTimeout(() => {
        form.reset();
        setSelectedClientData(null);
        queryClient.invalidateQueries({ queryKey: ["sales_orders"] });
        queryClient.invalidateQueries({ queryKey: ["existing-Job"] });
        queryClient.invalidateQueries({
          queryKey: ["sales_table"],
        });
        router.push("/dashboard/sales");
        setSuccessBannerData(null);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [successBannerData, router, form, queryClient]);

  const { setIsDirty } = useNavigationGuard();
  const isDirty = form.isDirty();
  useEffect(() => {
    setIsDirty(isDirty);
    return () => setIsDirty(false);
  }, [isDirty, setIsDirty]);

  useEffect(() => {
    if (form.values.stage !== "SOLD") {
      form.setFieldValue("manual_job_base", "");
      form.setFieldValue("manual_job_suffix", "");
    }
  }, [form.values.stage]);

  const { data: existingJobs, isLoading: isCheckingJobs } = useQuery({
    queryKey: ["existing-Job", debouncedJobNum],
    queryFn: async () => {
      if (!debouncedJobNum) return [];

      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, job_base_number, job_suffix, created_at, sales_orders!fk_jobs_sales_order_id( *, client:client_id(*) )",
        )
        .eq("job_base_number", debouncedJobNum)
        .order("job_suffix", { ascending: false });

      if (error) {
        console.error("Error checking jobs:", error);
        return [];
      }
      return data;
    },

    enabled: !!debouncedJobNum && debouncedJobNum.length > 2,
  });

  useEffect(() => {
    form.setFieldValue("manual_job_suffix", "");
    setIsVariantAutofilled(false);
    setAutofilledSourceJob(null);
  }, [jobNum]);
  useEffect(() => {
    if (existingJobs && existingJobs.length > 0) {
      const suffixes = existingJobs.map((j) => j.job_suffix);
      const next = getNextVariant(suffixes);

      if (!form.values.manual_job_suffix && next) {
        form.setFieldValue("manual_job_suffix", next);
        setIsVariantAutofilled(true);
      }

      const latestJob = existingJobs[0];
      if (latestJob?.sales_orders) {
        const rawSo = latestJob.sales_orders;
        const so: any = Array.isArray(rawSo) ? rawSo[0] : rawSo;
        const client = so?.client;

        if (client) {
          skipClientAutofillRef.current = true;
          setSelectedClientData(client);
          form.setFieldValue("client_id", Number(client.id));

          form.setFieldValue("shipping", {
            ...form.values.shipping,
            shipping_client_name: client.lastName || "",
            shipping_street: so.shipping_street || "",
            shipping_city: so.shipping_city || "",
            shipping_province: so.shipping_province || "",
            shipping_zip: so.shipping_zip || "",
            shipping_phone_1: so.shipping_phone_1 || "",
            shipping_phone_2: so.shipping_phone_2 || "",
            shipping_email_1: so.shipping_email_1 || "",
            shipping_email_2: so.shipping_email_2 || "",
          });

          setHighlightedFields([
            "shipping.shipping_client_name",
            "shipping.shipping_street",
            "shipping.shipping_city",
            "shipping.shipping_province",
            "shipping.shipping_zip",
            "shipping.shipping_phone_1",
            "shipping.shipping_phone_2",
            "shipping.shipping_email_1",
            "shipping.shipping_email_2",
          ]);
          queryClient.invalidateQueries({
            queryKey: ["client-lookup", client.id],
          });
        }
      }
    } else {
      setIsVariantAutofilled(false);
    }
  }, [existingJobs, form.values.order_type]);

  const copyClientToShipping = () => {
    if (!selectedClientData) {
      notifications.show({
        message: "Please select a client first",
        color: "orange",
      });
      return;
    }

    form.setFieldValue(`shipping`, {
      shipping_client_name: `${selectedClientData.lastName}`,
      project_name: form.values.shipping.project_name,
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

  if (!isAuthenticated) {
    return (
      <Center style={{ height: "100vh", width: "100%" }}>
        <Loader />
        <Text ml="md">Loading...</Text>
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

    const payload = { ...values };
    if (unitNumber.trim()) {
      payload.shipping = {
        ...payload.shipping,
        shipping_street: `${unitNumber.trim()} - ${
          payload.shipping.shipping_street
        }`,
      };
    }

    submitMutation.mutate(payload);
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
        <Stack gap={5}>
          <Paper withBorder p="md" radius="md" shadow="xl">
            <Grid gutter="xl" align="flex-end" justify="space-between">
              <Grid.Col span={6}>
                <Group align="flex-end" wrap="nowrap">
                  <Select
                    label="Order Type"
                    withAsterisk
                    placeholder="Type"
                    data={OrderTypeOptions}
                    {...form.getInputProps(`order_type`)}
                    style={{ width: 180 }}
                  />
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
                        e.currentTarget.checked ? "SOLD" : "QUOTE",
                      )
                    }
                  />

                  <Collapse in={form.values.stage === "SOLD"}>
                    <Group gap="xs" align="flex-end" style={{ flex: 1 }}>
                      <TextInput
                        label="Job Number"
                        placeholder="40000..."
                        onChange={(e) => {
                          const val = e.currentTarget.value;
                          setJobNum(val);
                          form.setFieldValue("manual_job_base", val);
                        }}
                        style={{ width: 120 }}
                        withAsterisk
                      />
                      <TextInput
                        label="Variant"
                        placeholder="A, B..."
                        {...form.getInputProps("manual_job_suffix")}
                        style={{ width: 80 }}
                        maxLength={5}
                        rightSection={
                          existingJobs && existingJobs.length > 0 ? (
                            <Popover
                              width={200}
                              position="bottom"
                              withArrow
                              shadow="md"
                              opened={popoverOpened}
                              onChange={setPopoverOpened}
                            >
                              <Popover.Target>
                                <div
                                  onMouseEnter={() => setPopoverOpened(true)}
                                  onMouseLeave={() => setPopoverOpened(false)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    cursor: "help",
                                  }}
                                >
                                  <ThemeIcon
                                    size="xs"
                                    color={
                                      isVariantAutofilled ? "orange" : "blue"
                                    }
                                    variant="light"
                                  >
                                    <FaInfoCircle size={10} />
                                  </ThemeIcon>
                                </div>
                              </Popover.Target>
                              <Popover.Dropdown
                                style={{ pointerEvents: "none" }}
                              >
                                <Text size="xs" fw={700} mb={5}>
                                  Existing Variants
                                </Text>
                                <List size="xs" spacing={2}>
                                  {existingJobs.map((j) => (
                                    <List.Item key={j.id}>
                                      {j.job_base_number && j.job_suffix
                                        ? `${j.job_base_number}-${j.job_suffix}`
                                        : `${j.job_base_number}`}
                                    </List.Item>
                                  ))}
                                </List>
                              </Popover.Dropdown>
                            </Popover>
                          ) : null
                        }
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          form.setFieldValue("manual_job_suffix", value);
                          setIsVariantAutofilled(false);
                        }}
                      />
                    </Group>
                  </Collapse>
                </Group>
              </Grid.Col>

              <Grid.Col span={5}>
                <Group align="flex-end" w="100%">
                  <Select
                    label="Client"
                    placeholder="Search clients..."
                    clearable
                    comboboxProps={{
                      position: "bottom",
                      middlewares: { flip: false, shift: false },
                      offset: 0,
                    }}
                    data={selectData}
                    filter={({ options }) => options}
                    searchable
                    searchValue={clientSearch}
                    onSearchChange={setClientSearch}
                    nothingFoundMessage={null}
                    rightSection={clientsLoading ? <Loader size={16} /> : null}
                    style={{ flex: 1 }}
                    renderOption={({ option }) => {
                      if (option.value === "ADD_NEW_CLIENT_OPTION") {
                        return (
                          <div
                            style={{
                              width: "100%",
                              padding: "4px 0",
                              cursor: "pointer",
                            }}
                          >
                            <Center>
                              <Button
                                variant="filled"
                                size="xs"
                                component="div"
                                leftSection={<FaPlus size={12} />}
                                style={{
                                  background:
                                    "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
                                  color: "white",
                                  border: "none",
                                  pointerEvents: "none",
                                }}
                              >
                                Add New Client
                              </Button>
                            </Center>
                          </div>
                        );
                      }
                      if (option.value === "STATUS_SEARCHING") {
                        return (
                          <Text size="sm" c="dimmed" ta="center" py="xs">
                            Searching...
                          </Text>
                        );
                      }
                      if (option.value === "STATUS_NOTHING_FOUND") {
                        return (
                          <Text size="sm" c="dimmed" ta="center" py="xs">
                            No matching clients found.
                          </Text>
                        );
                      }
                      return option.label;
                    }}
                    {...form.getInputProps("client_id")}
                    value={String(form.values.client_id)}
                    onChange={(val) => {
                      if (val === "ADD_NEW_CLIENT_OPTION") {
                        setIsAddClientModalOpen(true);
                        return;
                      }

                      form.setFieldValue("client_id", Number(val));
                      const fullObj = clientOptions.find(
                        (c: any) => c.value === val,
                      )?.original;
                      setSelectedClientData(fullObj as Tables<"client">);

                      form.setFieldValue(`shipping`, {
                        shipping_client_name: fullObj?.lastName,
                        project_name: "",
                        shipping_street: "",
                        shipping_city: "",
                        shipping_province: "",
                        shipping_zip: "",
                        shipping_phone_1: "",
                        shipping_phone_2: "",
                        shipping_email_1: "",
                        shipping_email_2: "",
                      });
                      setTargetProjectName(null);
                      setAutofilledSourceJob(null);
                    }}
                  />

                  <Switch
                    onLabel="Memo"
                    offLabel="Memo"
                    size="xl"
                    thumbIcon={
                      form.values.is_memo ? <FaCheckCircle /> : <FaCircle />
                    }
                    checked={form.values.is_memo}
                    onChange={(e) =>
                      form.setFieldValue("is_memo", e.currentTarget.checked)
                    }
                    styles={{
                      track: {
                        cursor: "pointer",
                        background: form.values.is_memo
                          ? "linear-gradient(135deg, #28a745 0%, #218838 100%)"
                          : "linear-gradient(135deg, #ddddddff 0%, #dadadaff 100%)",
                        color: form.values.is_memo ? "white" : "black",
                        border: "none",
                        padding: "0 0.2rem",
                        width: "6rem",
                      },
                      thumb: {
                        background: form.values.is_memo
                          ? "#218838"
                          : "#ffffffff",
                      },
                      root: {
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "flex-end",
                      },
                    }}
                  />
                </Group>
              </Grid.Col>
            </Grid>
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
                    {autofilledSourceJob && (
                      <Text size="xs" c="dimmed" fs="italic">
                        * Autofilled from {autofilledSourceJob}
                      </Text>
                    )}
                  </Group>
                  <SimpleGrid cols={2} spacing="sm">
                    <TextInput
                      label="Client Name"
                      placeholder="Builder/Client Name...."
                      {...form.getInputProps(`shipping.shipping_client_name`)}
                      styles={getAutofillStyles(
                        "shipping.shipping_client_name",
                      )}
                    />
                    <Autocomplete
                      label="Project Name"
                      placeholder="Project Name for Multi-fams..."
                      data={projectOptions || []}
                      clearable={true}
                      leftSection={
                        projectsLoading || isLoadingProjectDetails ? (
                          <Loader size={12} />
                        ) : null
                      }
                      value={form.values.shipping.project_name}
                      onChange={(val) => {
                        form.setFieldValue("shipping.project_name", val);
                        if (val === "") {
                          setTargetProjectName(null);
                        }
                      }}
                      onOptionSubmit={(val) => {
                        setTargetProjectName(val);
                      }}
                    />
                  </SimpleGrid>
                  <Grid>
                    <GridCol span={1.5}>
                      <TextInput
                        label="Unit #"
                        placeholder="123.."
                        value={unitNumber}
                        onChange={(e) => setUnitNumber(e.currentTarget.value)}
                      />
                    </GridCol>
                    <GridCol span={4.5}>
                      <TextInput
                        label="Street Address"
                        placeholder="123 Main St..."
                        {...form.getInputProps(`shipping.shipping_street`)}
                        styles={getAutofillStyles("shipping.shipping_street")}
                      />
                    </GridCol>
                    <GridCol span={2}>
                      <TextInput
                        label="City"
                        placeholder="Calgary..."
                        {...form.getInputProps(`shipping.shipping_city`)}
                        styles={getAutofillStyles("shipping.shipping_city")}
                      />
                    </GridCol>
                    <GridCol span={2}>
                      <TextInput
                        label="Province"
                        placeholder="AB..."
                        {...form.getInputProps(`shipping.shipping_province`)}
                        styles={getAutofillStyles("shipping.shipping_province")}
                      />
                    </GridCol>
                    <GridCol span={2}>
                      <TextInput
                        label="Zip"
                        placeholder="A1B 2C3..."
                        {...form.getInputProps(`shipping.shipping_zip`)}
                        styles={getAutofillStyles("shipping.shipping_zip")}
                      />
                    </GridCol>
                  </Grid>
                  <SimpleGrid cols={2} spacing="sm">
                    <TextInput
                      label="Phone 1"
                      {...form.getInputProps(`shipping.shipping_phone_1`)}
                      styles={getAutofillStyles("shipping.shipping_phone_1")}
                    />
                    <TextInput
                      label="Phone 2"
                      {...form.getInputProps(`shipping.shipping_phone_2`)}
                      styles={getAutofillStyles("shipping.shipping_phone_2")}
                    />
                  </SimpleGrid>
                  <SimpleGrid cols={2} spacing="sm">
                    <TextInput
                      label="Email 1"
                      {...form.getInputProps(`shipping.shipping_email_1`)}
                      styles={getAutofillStyles("shipping.shipping_email_1")}
                    />
                    <TextInput
                      label="Email 2"
                      {...form.getInputProps(`shipping.shipping_email_2`)}
                      styles={getAutofillStyles("shipping.shipping_email_2")}
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

          <Paper withBorder p="md" bg={"gray.1"}>
            <SimpleGrid cols={{ base: 1, xl: 2 }} spacing={30}>
              <Stack>
                <Fieldset
                  legend="Basic Information"
                  variant="filled"
                  bg={"white"}
                >
                  <SimpleGrid cols={2} mt="sm">
                    <Select
                      label="Delivery Type"
                      withAsterisk
                      rightSection
                      placeholder="Pickup, Delivery..."
                      data={DeliveryTypeOptions}
                      searchable
                      nothingFoundMessage="No delivery type found"
                      {...form.getInputProps(`delivery_type`)}
                    />
                    <Radio.Group
                      label="Installation Required"
                      withAsterisk
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
                      allowDeselect
                      clearable
                      rightSection
                      searchValue={speciesSearchValue}
                      onSearchChange={setSpeciesSearch}
                      onKeyDown={(e) => {
                        handleTabSelect(
                          e,
                          speciesOptions,
                          "cabinet.species",
                          setSpeciesSearch,
                          form,
                        );
                      }}
                      nothingFoundMessage={
                        speciesSearchValue.trim().length > 0 && (
                          <Button
                            fullWidth
                            variant="light"
                            size="xs"
                            onClick={() => {
                              setNewItemValue(speciesSearchValue);
                              openSpeciesModal();
                            }}
                          >
                            + Add "{speciesSearchValue}"
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
                      clearable
                      rightSection
                      searchValue={colorSearchValue}
                      onSearchChange={setColorSearch}
                      onKeyDown={(e) =>
                        handleTabSelect(
                          e,
                          colorOptions,
                          "cabinet.color",
                          setColorSearch,
                          form,
                        )
                      }
                      nothingFoundMessage={
                        colorSearchValue.trim().length > 0 && (
                          <Button
                            fullWidth
                            variant="light"
                            size="xs"
                            onClick={() => {
                              setNewItemValue(colorSearchValue);
                              openColorModal();
                            }}
                          >
                            + Add "{colorSearchValue}"
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
                      clearable
                      rightSection
                      searchValue={doorStyleSearchValue}
                      onSearchChange={setDoorStyleSearch}
                      onKeyDown={(e) =>
                        handleTabSelect(
                          e,
                          doorStyleOptions,
                          "cabinet.door_style",
                          setDoorStyleSearch,
                          form,
                        )
                      }
                      nothingFoundMessage={
                        doorStyleSearchValue.trim().length > 0 && (
                          <Button
                            fullWidth
                            variant="light"
                            size="xs"
                            onClick={() => {
                              setNewDoorStyle((prev) => ({
                                ...prev,
                                name: doorStyleSearchValue,
                              }));
                              openDoorStyleModal();
                            }}
                          >
                            + Add "{doorStyleSearchValue}"
                          </Button>
                        )
                      }
                      {...form.getInputProps(`cabinet.door_style`)}
                    />

                    <Autocomplete
                      label="Top Drawer Front"
                      placeholder="Matching"
                      clearable
                      data={TopDrawerFrontOptions}
                      {...form.getInputProps("cabinet.top_drawer_front")}
                      onFocus={(e) => {
                        form
                          .getInputProps("cabinet.top_drawer_front")
                          .onFocus?.(e);
                        focusValues.current["cabinet.top_drawer_front"] =
                          form.values.cabinet.top_drawer_front;
                      }}
                      onBlur={(e) => {
                        form
                          .getInputProps("cabinet.top_drawer_front")
                          .onBlur(e);
                        const wasEmpty =
                          !focusValues.current["cabinet.top_drawer_front"];
                        const isEmpty = !form.values.cabinet.top_drawer_front;
                        if (wasEmpty && isEmpty) {
                          form.setFieldValue(
                            "cabinet.top_drawer_front",
                            "Matching",
                          );
                        }
                      }}
                    />
                    <Select
                      label="Interior Material"
                      placeholder="White Mel"
                      clearable
                      rightSection
                      data={InteriorOptions}
                      {...form.getInputProps("cabinet.interior")}
                      onFocus={(e) => {
                        form.getInputProps("cabinet.interior").onFocus?.(e);
                        focusValues.current["cabinet.interior"] =
                          form.values.cabinet.interior;
                      }}
                      onBlur={(e) => {
                        form.getInputProps("cabinet.interior").onBlur(e);
                        const wasEmpty =
                          !focusValues.current["cabinet.interior"];
                        const isEmpty = !form.values.cabinet.interior;
                        if (wasEmpty && isEmpty) {
                          form.setFieldValue("cabinet.interior", "WHITE MEL");
                        }
                      }}
                    />

                    <Autocomplete
                      label="Box"
                      data={[]}
                      {...form.getInputProps(`cabinet.box`)}
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={4} mt="md">
                    <Select
                      label="Drawer Box"
                      data={DrawerBoxOptions}
                      rightSection
                      {...form.getInputProps("cabinet.drawer_box")}
                      onChange={(val) => {
                        form.setFieldValue("cabinet.drawer_box", val || "");
                        form.setFieldValue("cabinet.drawer_hardware", null);
                      }}
                    />
                    <Select
                      label="Drawer Hardware"
                      rightSection
                      placeholder={
                        form.values.cabinet.drawer_box
                          ? "Select Hardware"
                          : "Select Box First"
                      }
                      data={
                        form.values.cabinet.drawer_box
                          ? HARDWARE_MAPPING[form.values.cabinet.drawer_box]
                          : []
                      }
                      {...form.getInputProps("cabinet.drawer_hardware")}
                      disabled={!form.values.cabinet.drawer_box}
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
              <Stack>
                <Fieldset legend="Details" variant="filled" bg={"white"}>
                  <Textarea
                    label="Comments"
                    minRows={10}
                    styles={{ input: { minHeight: "200px" } }}
                    {...form.getInputProps(`comments`)}
                  />
                </Fieldset>
                <Fieldset legend="Requirements" variant="filled" bg={"white"}>
                  <Group>
                    <Checkbox
                      label="Column/Floating Shelf/Woodtop"
                      color="#4A00E0"
                      styles={{
                        label: { fontWeight: 500, cursor: "pointer" },
                        input: { cursor: "pointer" },
                      }}
                      {...form.getInputProps("is_woodtop_required", {
                        type: "checkbox",
                      })}
                    />
                    <Checkbox
                      label="Canopy"
                      color="#4A00E0"
                      styles={{
                        label: { fontWeight: 500, cursor: "pointer" },
                        input: { cursor: "pointer" },
                      }}
                      {...form.getInputProps("is_canopy_required", {
                        type: "checkbox",
                      })}
                    />

                    <Checkbox
                      label="Finish Cabinet"
                      color="#4A00E0"
                      styles={{
                        label: { fontWeight: 500, cursor: "pointer" },
                        input: { cursor: "pointer" },
                      }}
                      {...form.getInputProps("is_custom_cab_required", {
                        type: "checkbox",
                      })}
                    />
                  </Group>
                </Fieldset>
                <Fieldset legend="Financials" variant="filled" bg={"white"}>
                  {form.values.order_type != "Multi Fam" && (
                    <Group gap={50}>
                      <Radio.Group
                        label="Payment Required Before Delivery (COD)"
                        withAsterisk
                        value={String(form.values.is_cod ?? "")}
                        onChange={(val) =>
                          form.setFieldValue("is_cod", val === "true")
                        }
                        error={form.errors.is_cod}
                      >
                        <Group mt="xs" style={{ marginBottom: 10 }}>
                          <Radio value="true" label="Yes" color="#4a00e0" />
                          <Radio value="false" label="No" color="#4a00e0" />
                        </Group>
                      </Radio.Group>
                      <Collapse in={!!form.values.is_cod}>
                        <Switch
                          label="Payment Received"
                          color="#4a00e0"
                          {...form.getInputProps(`payment_received`, {
                            type: "checkbox",
                          })}
                        />
                      </Collapse>
                    </Group>
                  )}
                  <Grid align="flex-end">
                    <Grid.Col span={3}>
                      <NumberInput
                        label="Price"
                        placeholder="0.00"
                        prefix="$"
                        min={0}
                        thousandSeparator=","
                        decimalScale={2}
                        fixedDecimalScale
                        {...form.getInputProps(`total`)}
                        styles={{ input: { fontWeight: 700 } }}
                      />
                    </Grid.Col>
                    <Grid.Col span={3}>
                      <NumberInput
                        label="Deposit"
                        placeholder="0.00"
                        prefix="$"
                        min={0}
                        thousandSeparator=","
                        decimalScale={2}
                        fixedDecimalScale
                        {...form.getInputProps(`deposit`)}
                      />{" "}
                    </Grid.Col>
                    <Grid.Col span={6} mb={"8px"}>
                      <Group>
                        <Group gap="sm">
                          <Checkbox
                            size="xs"
                            label="+ GST"
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
                            label="+ PST (7%)"
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
                            After Taxes: {getInclusiveTotal()}
                          </Text>
                        </Collapse>
                      </Group>
                    </Grid.Col>
                  </Grid>
                </Fieldset>
              </Stack>
            </SimpleGrid>
          </Paper>
        </Stack>
      </form>

      <AddClient
        opened={isAddClientModalOpen}
        onClose={() => {
          setIsAddClientModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["client-search"] });
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
    </Container>
  );
}
