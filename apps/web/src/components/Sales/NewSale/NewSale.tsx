"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
  Box,
  Chip,
} from "@mantine/core";
import {
  User,
  Truck,
  Layers,
  DollarSign,
  FileText,
  CheckSquare,
} from "lucide-react";
import { DatePickerInput } from "@mantine/dates";
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
import { colors, linearGradients, serviceStatusGradientsLight } from "@/theme";
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

function splitUnitAndStreet(rawStreet?: string | null): {
  unit: string;
  street: string;
} {
  const trimmed = (rawStreet || "").trim();
  if (!trimmed) return { unit: "", street: "" };
  const match = trimmed.match(
    /^([A-Za-z0-9#]+(?:\s+[A-Za-z0-9#]+)?)\s+-\s+(.+)$/,
  );
  if (match) {
    return { unit: match[1].trim(), street: match[2].trim() };
  }
  return { unit: "", street: trimmed };
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
  const {
    supabase,
    isAuthenticated,
    isLoading: isAuthLoading,
    user,
  } = useSupabase();
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
      site_prep: undefined as unknown as boolean,
      sitesuper_email: "",
      in_prod: null,
      flooring_type: "",
      flooring_clearance: "",
      markout_date: null,
      second_markout_date: null,
      cabinet: {
        species: "",
        color: "",
        door_style: "",
        top_drawer_front: "",
        interior: "",
        drawer_box: "",
        drawer_hardware: "",
        box: 0,
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

      const { unit, street } = splitUnitAndStreet(
        projectDetails.shipping_street,
      );
      setUnitNumber((prev) => (prev.trim() ? prev : unit));

      form.setFieldValue("shipping", {
        ...form.values.shipping,
        shipping_client_name:
          projectDetails.shipping_client_name ||
          form.values.shipping.shipping_client_name,
        shipping_street: street,
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
          setUnitNumber("");
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
        site_prep,
        sitesuper_email,
        in_prod,
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
        designer:
          user?.user_metadata?.username ??
          user?.email?.split("@")[0] ??
          "Staff",
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
        site_prep: site_prep,
        sitesuper_email: sitesuper_email,
        in_prod: in_prod,
        markout_date: stage === "SOLD" ? values.markout_date || null : null,
        second_markout_date:
          stage === "SOLD" ? values.second_markout_date || null : null,
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

      if (
        stage === "SOLD" &&
        (values.markout_date || values.second_markout_date)
      ) {
        const { error: markoutError } = await supabase
          .from("sales_orders")
          .update({
            markout_date: values.markout_date || null,
            second_markout_date: values.second_markout_date || null,
          })
          .eq("sales_order_number", out_sales_order_number);

        if (markoutError) throw markoutError;
      }

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
      }, 200);
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
      form.setFieldValue("markout_date", null);
      form.setFieldValue("second_markout_date", null);
      form.setFieldValue("in_prod", null);
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

          const { unit, street } = splitUnitAndStreet(so.shipping_street);
          setUnitNumber(unit);

          form.setFieldValue("shipping", {
            ...form.values.shipping,
            shipping_client_name: client.lastName || "",
            project_name: so.project_name || "",
            shipping_street: street,
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

  if (isAuthLoading) {
    return (
      <Center style={{ height: "100vh", width: "100%" }}>
        <Loader />
        <Text ml="md">Loading...</Text>
      </Center>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Center style={{ height: "100vh", width: "100%" }}>
        <Text>You must be signed in to create a sale.</Text>
      </Center>
    );
  }

  const handleSubmit = (values: ExtendedMasterOrderInput) => {
    const validation = form.validate();

    if (validation.hasErrors) {
      console.log(validation.errors);
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
    <Box
      className="new-sale-glass"
      style={{
        minHeight: "100vh",
        background: linearGradients.richPageBackground,
      }}
    >
      <style>{`
  .new-sale-glass {
    position: relative;
    isolation: isolate;
    min-height: 100vh;
    overflow: clip;
    background:
      radial-gradient(ellipse at 12% 8%, rgba(196, 181, 253, .34), transparent 38%),
      radial-gradient(ellipse at 88% 22%, rgba(165, 180, 252, .30), transparent 36%),
      radial-gradient(ellipse at 55% 82%, rgba(216, 180, 254, .32), transparent 42%),
      linear-gradient(145deg, #ffffff 0%, #f8f7ff 48%, #f4f7ff 100%) !important;
    background-size: 220% 220%;
    animation: new-sale-bg-drift 12s ease-in-out infinite alternate;
  }

  /* Larger, brighter moving background lights */
  .new-sale-glass::before,
  .new-sale-glass::after {
    content: "";
    position: absolute;
    z-index: -1;
    width: clamp(440px, 55vw, 850px);
    height: clamp(440px, 55vw, 850px);
    border-radius: 50%;
    filter: blur(75px);
    opacity: .68;
    pointer-events: none;
    will-change: transform;
  }

  .new-sale-glass::before {
    top: 80px;
    left: -300px;
    background: radial-gradient(
      circle,
      rgba(196, 181, 253, .95) 0%,
      rgba(167, 139, 250, .58) 35%,
      rgba(167, 139, 250, 0) 72%
    );
    animation: new-sale-orb-one 3s ease-in-out infinite alternate;
  }

  .new-sale-glass::after {
    top: 420px;
    right: -340px;
    background: radial-gradient(
      circle,
      rgba(165, 180, 252, .95) 0%,
      rgba(129, 140, 248, .55) 38%,
      rgba(129, 140, 248, 0) 72%
    );
    animation: new-sale-orb-two 17s ease-in-out infinite alternate;
  }

  @keyframes new-sale-bg-drift {
    0% {
      background-position: 0% 0%;
    }
    50% {
      background-position: 65% 55%;
    }
    100% {
      background-position: 100% 100%;
    }
  }

  @keyframes new-sale-orb-one {
    0% {
      transform: translate3d(0, 0, 0) scale(.9);
    }
    50% {
      transform: translate3d(28vw, 18vh, 0) scale(1.18);
    }
    100% {
      transform: translate3d(12vw, 42vh, 0) scale(1.05);
    }
  }

  @keyframes new-sale-orb-two {
    0% {
      transform: translate3d(0, 0, 0) scale(1);
    }
    50% {
      transform: translate3d(-27vw, -20vh, 0) scale(1.2);
    }
    100% {
      transform: translate3d(-12vw, -42vh, 0) scale(.95);
    }
  }

  /* Main glass cards */
  .new-sale-glass .mantine-Paper-root {
    background: rgba(255, 255, 255, .84) !important;
    border: 1px solid rgba(255, 255, 255, .98) !important;
    border-radius: 20px !important;
    box-shadow:
      0 10px 30px rgba(58, 42, 105, .045),
      0 2px 8px rgba(58, 42, 105, .025),
      inset 0 1px 0 rgba(255, 255, 255, 1) !important;
    -webkit-backdrop-filter: blur(26px) saturate(165%);
    backdrop-filter: blur(26px) saturate(165%);
    transition:
      box-shadow .2s ease,
      border-color .2s ease,
      transform .2s ease;
  }

  /* Header / hero card */
  .new-sale-glass .new-sale-hero {
    position: relative;
    overflow: hidden;
    background:
      linear-gradient(
        112deg,
        rgba(255, 255, 255, .97),
        rgba(250, 248, 255, .91) 58%,
        rgba(244, 242, 255, .90)
      ) !important;
    border: 1px solid rgba(255, 255, 255, 1) !important;
    border-top: 1px solid rgba(255, 255, 255, 1) !important;
    box-shadow:
      0 14px 38px rgba(88, 56, 150, .065),
      inset 0 1px 0 #fff !important;
  }

  .new-sale-glass .new-sale-hero::after {
    content: "";
    position: absolute;
    width: 340px;
    height: 340px;
    top: -220px;
    right: 8%;
    border-radius: 50%;
    background: rgba(196, 181, 253, .25);
    filter: blur(18px);
    pointer-events: none;
  }

  /* Labels */
  .new-sale-glass .mantine-Input-label,
  .new-sale-glass .mantine-RadioGroup-label,
  .new-sale-glass .mantine-Checkbox-label {
    color: #39334f;
    font-size: 12px;
    font-weight: 650;
    letter-spacing: .015em;
    margin-bottom: 6px;
  }

  /* Inputs */
  .new-sale-glass .mantine-Input-input,
  .new-sale-glass .mantine-Textarea-input {
    min-height: 44px;
    color: #29243b;
    background: rgba(255, 255, 255, .94) !important;
    border: 1px solid rgba(116, 93, 164, .13) !important;
    border-radius: 12px !important;
    box-shadow: inset 0 1px 2px rgba(39, 25, 72, .018);
    transition:
      border-color .18s ease,
      box-shadow .18s ease,
      background .18s ease;
  }

  .new-sale-glass .mantine-Textarea-input {
    min-height: 96px;
    padding-top: 12px;
  }

  .new-sale-glass .mantine-Input-input:hover,
  .new-sale-glass .mantine-Textarea-input:hover {
    border-color: rgba(139, 92, 246, .35) !important;
    background: #fff !important;
  }

  .new-sale-glass .mantine-Input-input:focus,
  .new-sale-glass .mantine-Textarea-input:focus {
    border-color: rgba(124, 58, 237, .65) !important;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, .10) !important;
    background: #fff !important;
  }

  .new-sale-glass .mantine-Input-input::placeholder,
  .new-sale-glass .mantine-Textarea-input::placeholder {
    color: #a09aae;
  }

  .new-sale-glass .mantine-Input-section {
    color: #8b7aa9;
  }

  /* Dropdowns */
  .new-sale-glass .mantine-Select-dropdown,
  .new-sale-glass .mantine-Autocomplete-dropdown,
  .new-sale-glass .mantine-Popover-dropdown {
    background: rgba(255, 255, 255, .97);
    border: 1px solid rgba(139, 92, 246, .14);
    border-radius: 14px;
    box-shadow: 0 18px 44px rgba(44, 26, 85, .10);
    -webkit-backdrop-filter: blur(18px);
    backdrop-filter: blur(18px);
  }

  /* Buttons */
  .new-sale-glass .mantine-Button-root {
    border-radius: 12px;
    font-weight: 650;
    letter-spacing: .005em;
    transition:
      transform .18s ease,
      box-shadow .18s ease,
      filter .18s ease;
  }

  .new-sale-glass .mantine-Button-root:hover {
    transform: translateY(-1px);
    filter: brightness(1.025);
  }

  .new-sale-glass .mantine-Switch-track,
  .new-sale-glass .mantine-Chip-label {
    border-radius: 999px;
  }

  .new-sale-glass .mantine-Divider-root {
    border-color: rgba(115, 91, 158, .11);
  }

  .new-sale-glass .mantine-ThemeIcon-root {
    box-shadow: 0 5px 12px rgba(112, 73, 190, .14);
  }

  /* Billing summary */
  .new-sale-glass .new-sale-billing-summary {
    background:
      linear-gradient(
        135deg,
        rgba(250, 248, 255, .96),
        rgba(245, 247, 255, .94)
      ) !important;
    border: 1px solid rgba(139, 92, 246, .12) !important;
    border-radius: 16px !important;
  }

  /* Save Quote / action bar */
  .new-sale-glass .new-sale-action-bar {
    position: sticky;
    isolation: isolate;
    overflow: hidden;
    background:
      linear-gradient(
        115deg,
        rgba(255, 255, 255, .94),
        rgba(250, 247, 255, .91) 52%,
        rgba(244, 246, 255, .93)
      ) !important;
    border: 1px solid rgba(255, 255, 255, 1) !important;
    box-shadow:
      0 14px 38px rgba(53, 37, 93, .09),
      0 3px 10px rgba(99, 72, 150, .045),
      inset 0 1px 0 rgba(255, 255, 255, 1) !important;
    -webkit-backdrop-filter: blur(32px) saturate(180%);
    backdrop-filter: blur(32px) saturate(180%);
  }

  .new-sale-glass .new-sale-action-bar::before {
    content: "";
    position: absolute;
    z-index: -1;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(
        ellipse at 12% 0%,
        rgba(196, 181, 253, .24),
        transparent 48%
      ),
      linear-gradient(
        105deg,
        transparent 20%,
        rgba(255, 255, 255, .55) 48%,
        transparent 72%
      );
    background-size: 100% 100%, 220% 100%;
    background-position: center, 180% 0;
    animation: new-sale-bar-sheen 8s ease-in-out infinite;
  }

  @keyframes new-sale-bar-sheen {
    0%, 35% {
      background-position: center, 180% 0;
    }
    75%, 100% {
      background-position: center, -80% 0;
    }
  }

  @media (max-width: 767px) {
    .new-sale-glass .mantine-Paper-root {
      border-radius: 16px !important;
    }

    .new-sale-glass .new-sale-hero {
      padding: 18px !important;
    }

    .new-sale-glass::before,
    .new-sale-glass::after {
      opacity: .48;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .new-sale-glass,
    .new-sale-glass *,
    .new-sale-glass *::before,
    .new-sale-glass *::after {
      transition-duration: .01ms !important;
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
    }
  }
`}</style>
      <Container size="100%" py="md" px={{ base: "sm", md: "lg" }}>
        <form
          noValidate
          onSubmit={form.onSubmit(handleSubmit)}
          id="single-order-form"
        >
          <Stack gap="lg">
            <Paper
              className="new-sale-hero"
              withBorder
              p="lg"
              radius="lg"
              style={{
                borderColor: colors.gray.border,
                borderTop: `4px solid ${colors.violet.lighter}`,
                boxShadow: "0 2px 12px rgba(0, 67, 192, 0.07)",
              }}
            >
              <Group
                justify="space-between"
                align="flex-end"
                wrap="wrap"
                gap="sm"
              >
                <Group
                  gap="sm"
                  align="center"
                  style={{
                    minWidth: "15%",
                    alignSelf: "center",
                  }}
                >
                  <Title order={2} fw={700} c={colors.violet.primary}>
                    {form.values.stage === "SOLD" ? "New Order" : "New Quote"}
                  </Title>
                  <Badge
                    radius="sm"
                    size="md"
                    style={{
                      background:
                        form.values.stage === "SOLD"
                          ? linearGradients.success
                          : linearGradients.primary,
                      color: "white",
                      border: "none",
                    }}
                  >
                    {form.values.stage === "SOLD" ? "Sold" : "Quote"}
                  </Badge>
                </Group>
                <Group
                  gap="xl"
                  align="flex-start"
                  wrap="wrap"
                  style={{
                    opacity: form.values.stage === "SOLD" ? 1 : 0.5,
                    pointerEvents:
                      form.values.stage === "SOLD" ? "auto" : "none",
                    transition: "opacity 150ms ease",
                    flex: 1,
                    justifyContent: "center",
                  }}
                >
                  <Box style={{ minWidth: 185 }}>
                    <Radio.Group
                      label="Send to Production"
                      withAsterisk={form.values.stage === "SOLD"}
                      value={
                        form.values.in_prod === true
                          ? "true"
                          : form.values.in_prod === false
                            ? "false"
                            : ""
                      }
                      error={form.errors.in_prod}
                      onChange={(value) => {
                        form.setFieldValue("in_prod", value === "true");
                      }}
                    >
                      <Group mt="xs">
                        <Radio value="true" label="Yes" />
                        <Radio value="false" label="No" />
                      </Group>
                    </Radio.Group>
                  </Box>

                  <DatePickerInput
                    label="1st Markout"
                    placeholder="Scheduled Date..."
                    clearable
                    radius="md"
                    style={{ width: 180 }}
                    valueFormat="YYYY-MM-DD"
                    disabled={form.values.stage !== "SOLD"}
                    {...form.getInputProps("markout_date")}
                  />

                  <DatePickerInput
                    label="2nd Markout"
                    placeholder="Scheduled Date..."
                    clearable
                    radius="md"
                    style={{ width: 180 }}
                    valueFormat="YYYY-MM-DD"
                    disabled={form.values.stage !== "SOLD"}
                    {...form.getInputProps("second_markout_date")}
                  />
                </Group>

                <Group gap="md" wrap="wrap" align="flex-end">
                  <Box h={36} style={{ display: "flex", alignItems: "center" }}>
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
                            ? linearGradients.success
                            : linearGradients.inactive,
                          color: form.values.is_memo
                            ? "white"
                            : colors.gray.title,
                          border: "none",
                          padding: "0 0.2rem",
                          width: "6rem",
                        },
                        thumb: {
                          background: form.values.is_memo
                            ? colors.green.primary
                            : "#ffffff",
                        },
                      }}
                    />
                  </Box>
                  <Box h={36} style={{ display: "flex", alignItems: "center" }}>
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
                              ? linearGradients.success
                              : linearGradients.primary,
                          color: "white",
                          border: "none",
                          padding: "0 0.2rem",
                          width: "6rem",
                        },
                        thumb: {
                          background:
                            form.values.stage === "SOLD"
                              ? colors.green.primary
                              : colors.violet.primary,
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
                  </Box>

                  <Group
                    gap="md"
                    wrap="nowrap"
                    style={{
                      opacity: form.values.stage === "SOLD" ? 1 : 0.55,
                      pointerEvents:
                        form.values.stage === "SOLD" ? "auto" : "none",
                      transition: "opacity 150ms ease",
                    }}
                  >
                    <TextInput
                      label="Job Number"
                      value={jobNum}
                      error={form.errors.manual_job_base}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setJobNum(value);
                        form.setFieldValue("manual_job_base", value);
                      }}
                    />
                    <TextInput
                      label="Variant"
                      placeholder="A, B..."
                      radius="md"
                      w={95}
                      disabled={form.values.stage !== "SOLD"}
                      {...form.getInputProps("manual_job_suffix")}
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
                            <Popover.Dropdown style={{ pointerEvents: "none" }}>
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
                </Group>
              </Group>
            </Paper>

            <Grid gutter="lg" align="flex-start">
              <Grid.Col span={{ base: 12, lg: 8 }}>
                <Stack gap="lg">
                  <Paper
                    withBorder
                    p="lg"
                    radius="lg"
                    style={{
                      borderColor: "rgba(142, 45, 226, 0.14)",
                      boxShadow:
                        "0 4px 16px rgba(44, 0, 102, 0.06), 0 1px 3px rgba(44, 0, 102, 0.04)",
                    }}
                  >
                    <Group gap="xs" mb="md">
                      <ThemeIcon
                        size="sm"
                        radius="md"
                        style={{
                          background: linearGradients.primaryVertical,
                          color: "white",
                        }}
                      >
                        <User size={14} />
                      </ThemeIcon>
                      <Text fw={600} size="sm" c={colors.gray.title}>
                        Order & Client
                      </Text>
                    </Group>

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                      <Select
                        label="Order Type"
                        withAsterisk
                        placeholder="Select type"
                        radius="md"
                        data={OrderTypeOptions}
                        {...form.getInputProps(`order_type`)}
                      />

                      <Select
                        label="Client"
                        placeholder="Search clients..."
                        radius="md"
                        clearable
                        comboboxProps={{
                          position: "bottom",
                          middlewares: { flip: false, shift: false },
                          offset: 4,
                        }}
                        data={selectData}
                        filter={({ options }) => options}
                        searchable
                        searchValue={clientSearch}
                        onSearchChange={setClientSearch}
                        nothingFoundMessage={null}
                        rightSection={
                          clientsLoading ? <Loader size={16} /> : null
                        }
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
                                      background: linearGradients.primary,
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
                    </SimpleGrid>
                  </Paper>

                  <Paper
                    withBorder
                    p="lg"
                    radius="lg"
                    style={{
                      borderColor: "rgba(142, 45, 226, 0.14)",
                      boxShadow:
                        "0 4px 16px rgba(44, 0, 102, 0.06), 0 1px 3px rgba(44, 0, 102, 0.04)",
                    }}
                  >
                    <Group justify="space-between" align="center" mb="md">
                      <Group gap="xs">
                        <ThemeIcon
                          size="sm"
                          radius="md"
                          style={{
                            background: linearGradients.primaryVertical,
                            color: "white",
                          }}
                        >
                          <Truck size={14} />
                        </ThemeIcon>
                        <Text fw={600} size="sm" c={colors.gray.title}>
                          Billing & Shipping
                        </Text>
                        {autofilledSourceJob && (
                          <Badge
                            variant="light"
                            size="sm"
                            style={{
                              background: linearGradients.lightViolet,
                              color: colors.violet.primary,
                            }}
                          >
                            Autofilled from {autofilledSourceJob}
                          </Badge>
                        )}
                      </Group>
                      {selectedClientData && (
                        <Button
                          size="xs"
                          radius="md"
                          leftSection={<FaCopy size={11} />}
                          onClick={copyClientToShipping}
                          style={{
                            background: linearGradients.primary,
                            color: "white",
                            border: "none",
                          }}
                        >
                          Copy from Billing
                        </Button>
                      )}
                    </Group>

                    {selectedClientData ? (
                      <Stack gap="md">
                        <Box
                          className="new-sale-billing-summary"
                          p="md"
                          style={{
                            background: linearGradients.lightViolet,
                            border: "1px solid rgba(142, 45, 226, 0.16)",
                            borderRadius: "var(--mantine-radius-md)",
                          }}
                        >
                          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                            <Stack gap={2}>
                              <Text size="xs" c="dimmed">
                                Billing Client
                              </Text>
                              <Text size="sm" fw={600}>
                                {selectedClientData.lastName}
                              </Text>
                              <Text size="xs" c="dimmed" mt={4}>
                                {`${selectedClientData.street || "—"}, ${
                                  selectedClientData.city || "—"
                                }, ${selectedClientData.province || "—"} ${
                                  selectedClientData.zip || "—"
                                }`}
                              </Text>
                            </Stack>
                            <Stack gap={2}>
                              <Text size="xs" c="dimmed">
                                Phones
                              </Text>
                              <Text size="sm">
                                {selectedClientData.phone1 || "N/A"}
                              </Text>
                              {selectedClientData.phone2 && (
                                <Text size="xs" c="dimmed">
                                  {selectedClientData.phone2}
                                </Text>
                              )}
                            </Stack>
                            <Stack gap={2}>
                              <Text size="xs" c="dimmed">
                                Emails
                              </Text>
                              <Text size="sm">
                                {selectedClientData.email1 || "N/A"}
                              </Text>
                              {selectedClientData.email2 && (
                                <Text size="xs" c="dimmed">
                                  {selectedClientData.email2}
                                </Text>
                              )}
                            </Stack>
                          </SimpleGrid>
                        </Box>

                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                          <TextInput
                            label="Shipping Client Name"
                            placeholder="Builder/Client Name..."
                            radius="md"
                            {...form.getInputProps(
                              `shipping.shipping_client_name`,
                            )}
                            styles={getAutofillStyles(
                              "shipping.shipping_client_name",
                            )}
                          />
                          <Autocomplete
                            label="Project Name"
                            placeholder="Project Name for Multi-fams..."
                            radius="md"
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

                        <Grid gutter="sm">
                          <GridCol span={{ base: 12, sm: 2 }}>
                            <TextInput
                              label="Unit #"
                              placeholder="123"
                              radius="md"
                              value={unitNumber}
                              onChange={(e) =>
                                setUnitNumber(e.currentTarget.value)
                              }
                            />
                          </GridCol>
                          <GridCol span={{ base: 12, sm: 4 }}>
                            <TextInput
                              label="Street Address"
                              placeholder="123 Main St..."
                              radius="md"
                              {...form.getInputProps(
                                `shipping.shipping_street`,
                              )}
                              styles={getAutofillStyles(
                                "shipping.shipping_street",
                              )}
                            />
                          </GridCol>
                          <GridCol span={{ base: 12, sm: 2 }}>
                            <TextInput
                              label="City"
                              placeholder="Calgary"
                              radius="md"
                              {...form.getInputProps(`shipping.shipping_city`)}
                              styles={getAutofillStyles(
                                "shipping.shipping_city",
                              )}
                            />
                          </GridCol>
                          <GridCol span={{ base: 12, sm: 2 }}>
                            <TextInput
                              label="Province"
                              placeholder="AB"
                              radius="md"
                              {...form.getInputProps(
                                `shipping.shipping_province`,
                              )}
                              styles={getAutofillStyles(
                                "shipping.shipping_province",
                              )}
                            />
                          </GridCol>
                          <GridCol span={{ base: 12, sm: 2 }}>
                            <TextInput
                              label="Zip"
                              placeholder="A1B 2C3"
                              radius="md"
                              {...form.getInputProps(`shipping.shipping_zip`)}
                              styles={getAutofillStyles(
                                "shipping.shipping_zip",
                              )}
                            />
                          </GridCol>
                        </Grid>

                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                          <TextInput
                            label="Phone 1"
                            radius="md"
                            {...form.getInputProps(`shipping.shipping_phone_1`)}
                            styles={getAutofillStyles(
                              "shipping.shipping_phone_1",
                            )}
                          />
                          <TextInput
                            label="Phone 2"
                            radius="md"
                            {...form.getInputProps(`shipping.shipping_phone_2`)}
                            styles={getAutofillStyles(
                              "shipping.shipping_phone_2",
                            )}
                          />
                          <TextInput
                            label="Email 1"
                            radius="md"
                            {...form.getInputProps(`shipping.shipping_email_1`)}
                            styles={getAutofillStyles(
                              "shipping.shipping_email_1",
                            )}
                          />
                          <TextInput
                            label="Email 2"
                            radius="md"
                            {...form.getInputProps(`shipping.shipping_email_2`)}
                            styles={getAutofillStyles(
                              "shipping.shipping_email_2",
                            )}
                          />
                        </SimpleGrid>
                      </Stack>
                    ) : (
                      <Text size="sm" c="dimmed" ta="center" py="lg">
                        Select a client above to view billing details and enter
                        shipping information.
                      </Text>
                    )}
                  </Paper>

                  <Paper
                    withBorder
                    p="lg"
                    radius="lg"
                    style={{
                      borderColor: "rgba(142, 45, 226, 0.14)",
                      boxShadow:
                        "0 4px 16px rgba(44, 0, 102, 0.06), 0 1px 3px rgba(44, 0, 102, 0.04)",
                    }}
                  >
                    <Group gap="xs" mb="md">
                      <ThemeIcon
                        size="sm"
                        radius="md"
                        style={{
                          background: linearGradients.primaryVertical,
                          color: "white",
                        }}
                      >
                        <Truck size={14} />
                      </ThemeIcon>
                      <Text fw={600} size="sm" c={colors.gray.title}>
                        Delivery & Site Setup
                      </Text>
                    </Group>

                    <Stack gap="md">
                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <Select
                          label="Delivery Type"
                          withAsterisk
                          radius="md"
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
                          <Group mt={8} gap="lg">
                            <Radio
                              value="true"
                              label="Yes"
                              color={colors.violet.primary}
                              styles={{
                                radio: { cursor: "pointer" },
                                label: { cursor: "pointer" },
                              }}
                            />
                            <Radio
                              value="false"
                              label="No"
                              color={colors.violet.primary}
                              styles={{
                                radio: { cursor: "pointer" },
                                label: { cursor: "pointer" },
                              }}
                            />
                          </Group>
                        </Radio.Group>
                      </SimpleGrid>

                      <Collapse in={form.values.order_type === "Reno"}>
                        <Radio.Group
                          label="Site Expectations Document is signed by the customer"
                          withAsterisk
                          value={
                            form.values.site_prep === true
                              ? "true"
                              : form.values.site_prep === false
                                ? "false"
                                : ""
                          }
                          onChange={(val) =>
                            form.setFieldValue("site_prep", val === "true")
                          }
                          error={form.errors.site_prep}
                        >
                          <Group mt={8} gap="lg">
                            <Radio
                              value="true"
                              label="Yes"
                              color={colors.violet.primary}
                              styles={{
                                radio: { cursor: "pointer" },
                                label: { cursor: "pointer" },
                              }}
                            />
                            <Radio
                              value="false"
                              label="No"
                              color={colors.violet.primary}
                              styles={{
                                radio: { cursor: "pointer" },
                                label: { cursor: "pointer" },
                              }}
                            />
                          </Group>
                        </Radio.Group>
                      </Collapse>
                    </Stack>
                  </Paper>

                  <Paper
                    withBorder
                    p="lg"
                    radius="lg"
                    style={{
                      borderColor: "rgba(142, 45, 226, 0.14)",
                      boxShadow:
                        "0 4px 16px rgba(44, 0, 102, 0.06), 0 1px 3px rgba(44, 0, 102, 0.04)",
                    }}
                  >
                    <Group gap="xs" mb="md">
                      <ThemeIcon
                        size="sm"
                        radius="md"
                        style={{
                          background: linearGradients.primaryVertical,
                          color: "white",
                        }}
                      >
                        <Layers size={14} />
                      </ThemeIcon>
                      <Text fw={600} size="sm" c={colors.gray.title}>
                        Cabinet Specifications
                      </Text>
                    </Group>

                    <Stack gap="md">
                      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                        <Select
                          label="Species"
                          placeholder="Select Species"
                          radius="md"
                          data={speciesOptions}
                          searchable
                          allowDeselect
                          clearable
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
                          radius="md"
                          data={colorOptions}
                          searchable
                          clearable
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
                          radius="md"
                          data={doorStyleOptions}
                          searchable
                          clearable
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
                          radius="md"
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
                            const isEmpty =
                              !form.values.cabinet.top_drawer_front;
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
                          radius="md"
                          clearable
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
                              form.setFieldValue(
                                "cabinet.interior",
                                "WHITE MEL",
                              );
                            }
                          }}
                        />

                        <NumberInput
                          label="Box"
                          radius="md"
                          min={0}
                          allowDecimal={false}
                          {...form.getInputProps("cabinet.box")}
                        />
                      </SimpleGrid>

                      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                        <Select
                          label="Drawer Box"
                          radius="md"
                          data={DrawerBoxOptions}
                          {...form.getInputProps("cabinet.drawer_box")}
                          onChange={(val) => {
                            form.setFieldValue("cabinet.drawer_box", val || "");
                            form.setFieldValue("cabinet.drawer_hardware", null);
                          }}
                        />
                        <Select
                          label="Drawer Hardware"
                          radius="md"
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
                          placeholder="Hardwood, Tile..."
                          radius="md"
                          data={flooringTypeOptions}
                          {...form.getInputProps(`flooring_type`)}
                        />
                        <Autocomplete
                          label="Flooring Clearance"
                          placeholder="3/8, 1/2..."
                          radius="md"
                          data={flooringClearanceOptions}
                          {...form.getInputProps(`flooring_clearance`)}
                        />
                      </SimpleGrid>

                      <Divider color={colors.gray.borderLight} />

                      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                        <Stack gap="xs">
                          <Switch
                            label="Glass Doors Required"
                            color={colors.violet.primary}
                            {...form.getInputProps(`cabinet.glass`, {
                              type: "checkbox",
                            })}
                          />
                          <TextInput
                            label="Glass Type"
                            placeholder="e.g., Frosted, Clear"
                            radius="md"
                            disabled={!form.values.cabinet.glass}
                            {...form.getInputProps(`cabinet.glass_type`)}
                          />
                        </Stack>

                        <Stack gap="xs">
                          <Switch
                            label="Doors/Parts Only Order"
                            color={colors.violet.primary}
                            {...form.getInputProps(`cabinet.doors_parts_only`, {
                              type: "checkbox",
                            })}
                          />
                          <TextInput
                            label="Total Piece Count"
                            placeholder="e.g., 42"
                            radius="md"
                            disabled={!form.values.cabinet.doors_parts_only}
                            {...form.getInputProps(`cabinet.piece_count`)}
                          />
                        </Stack>

                        <Stack gap="sm" justify="center">
                          <Switch
                            label="Handles Supplied"
                            color={colors.violet.primary}
                            {...form.getInputProps(`cabinet.handles_supplied`, {
                              type: "checkbox",
                            })}
                          />
                          <Switch
                            label="Handles Selected"
                            color={colors.violet.primary}
                            {...form.getInputProps(`cabinet.handles_selected`, {
                              type: "checkbox",
                            })}
                          />
                        </Stack>
                      </SimpleGrid>
                    </Stack>
                  </Paper>
                </Stack>
              </Grid.Col>

              <Grid.Col
                span={{ base: 12, lg: 4 }}
                style={{ position: "sticky", top: 16 }}
              >
                <Stack gap="lg">
                  <Paper
                    withBorder
                    p="lg"
                    radius="lg"
                    style={{
                      borderColor: "rgba(142, 45, 226, 0.14)",
                      boxShadow:
                        "0 4px 16px rgba(44, 0, 102, 0.06), 0 1px 3px rgba(44, 0, 102, 0.04)",
                    }}
                  >
                    <Group gap="xs" mb="md">
                      <ThemeIcon
                        size="sm"
                        radius="md"
                        style={{
                          background: linearGradients.primaryVertical,
                          color: "white",
                        }}
                      >
                        <DollarSign size={14} />
                      </ThemeIcon>
                      <Text fw={600} size="sm" c={colors.gray.title}>
                        Financials
                      </Text>
                    </Group>

                    <Stack gap="md">
                      {form.values.order_type != "Multi Fam" && (
                        <Stack gap="xs">
                          <Radio.Group
                            label="Payment Required Before Delivery (COD)"
                            withAsterisk
                            value={
                              form.values.is_cod === true
                                ? "true"
                                : form.values.is_cod === false
                                  ? "false"
                                  : ""
                            }
                            onChange={(val) =>
                              form.setFieldValue("is_cod", val === "true")
                            }
                            error={form.errors.is_cod}
                          >
                            <Group mt={8} gap="lg">
                              <Radio
                                value="true"
                                label="Yes"
                                color={colors.violet.primary}
                                styles={{
                                  radio: { cursor: "pointer" },
                                  label: { cursor: "pointer" },
                                }}
                              />
                              <Radio
                                value="false"
                                label="No"
                                color={colors.violet.primary}
                                styles={{
                                  radio: { cursor: "pointer" },
                                  label: { cursor: "pointer" },
                                }}
                              />
                            </Group>
                          </Radio.Group>
                          <Collapse in={!!form.values.is_cod}>
                            <Switch
                              label="Payment Received"
                              color={colors.green.primary}
                              {...form.getInputProps(`payment_received`, {
                                type: "checkbox",
                              })}
                            />
                          </Collapse>
                        </Stack>
                      )}

                      <SimpleGrid cols={2} spacing="md">
                        <NumberInput
                          label="Price"
                          placeholder="0.00"
                          prefix="$"
                          radius="md"
                          min={0}
                          thousandSeparator=","
                          decimalScale={2}
                          fixedDecimalScale
                          {...form.getInputProps(`total`)}
                          styles={{ input: { fontWeight: 700 } }}
                        />
                        <NumberInput
                          label="Deposit"
                          placeholder="0.00"
                          prefix="$"
                          radius="md"
                          min={0}
                          thousandSeparator=","
                          decimalScale={2}
                          fixedDecimalScale
                          {...form.getInputProps(`deposit`)}
                        />
                      </SimpleGrid>

                      <Group gap="xs">
                        <Chip
                          checked={viewGst}
                          onChange={setViewGst}
                          variant="light"
                          color={colors.violet.primary}
                          size="xs"
                          radius="md"
                        >
                          + GST (5%)
                        </Chip>
                        <Chip
                          checked={viewPst}
                          onChange={setViewPst}
                          variant="light"
                          color={colors.violet.primary}
                          size="xs"
                          radius="md"
                        >
                          + PST (7%)
                        </Chip>
                      </Group>

                      <Collapse in={viewGst || viewPst}>
                        <Box
                          p="sm"
                          style={{
                            background: linearGradients.lightViolet,
                            borderRadius: "var(--mantine-radius-md)",
                          }}
                        >
                          <Group justify="space-between" align="center">
                            <Text size="xs" fw={600} c={colors.violet.primary}>
                              Total After Taxes
                            </Text>
                            <Text size="md" fw={700} c={colors.violet.primary}>
                              {getInclusiveTotal()}
                            </Text>
                          </Group>
                        </Box>
                      </Collapse>
                    </Stack>
                  </Paper>

                  <Paper
                    withBorder
                    p="lg"
                    radius="lg"
                    style={{
                      borderColor: "rgba(142, 45, 226, 0.14)",
                      boxShadow:
                        "0 4px 16px rgba(44, 0, 102, 0.06), 0 1px 3px rgba(44, 0, 102, 0.04)",
                    }}
                  >
                    <Group gap="xs" mb="md">
                      <ThemeIcon
                        size="sm"
                        radius="md"
                        style={{
                          background: linearGradients.primaryVertical,
                          color: "white",
                        }}
                      >
                        <CheckSquare size={14} />
                      </ThemeIcon>
                      <Text fw={600} size="sm" c={colors.gray.title}>
                        Special Requirements
                      </Text>
                    </Group>

                    <Stack gap="sm">
                      <Checkbox
                        label="Column/Floating Shelf/Woodtop"
                        color={colors.violet.primary}
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
                        color={colors.violet.primary}
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
                        color={colors.violet.primary}
                        styles={{
                          label: { fontWeight: 500, cursor: "pointer" },
                          input: { cursor: "pointer" },
                        }}
                        {...form.getInputProps("is_custom_cab_required", {
                          type: "checkbox",
                        })}
                      />
                    </Stack>
                  </Paper>

                  <Paper
                    withBorder
                    p="lg"
                    radius="lg"
                    style={{
                      borderColor: "rgba(142, 45, 226, 0.14)",
                      boxShadow:
                        "0 4px 16px rgba(44, 0, 102, 0.06), 0 1px 3px rgba(44, 0, 102, 0.04)",
                    }}
                  >
                    <Group gap="xs" mb="md">
                      <ThemeIcon
                        size="sm"
                        radius="md"
                        style={{
                          background: linearGradients.primaryVertical,
                          color: "white",
                        }}
                      >
                        <FileText size={14} />
                      </ThemeIcon>
                      <Text fw={600} size="sm" c={colors.gray.title}>
                        Notes & Contact
                      </Text>
                    </Group>

                    <Stack gap="md">
                      <Textarea
                        label="Comments"
                        placeholder="Add order notes or special instructions..."
                        radius="md"
                        autosize
                        minRows={3}
                        maxRows={7}
                        {...form.getInputProps(`comments`)}
                      />
                      <TextInput
                        label="Site Super Email"
                        placeholder="sitesuper@builder.com..."
                        radius="md"
                        {...form.getInputProps(`sitesuper_email`)}
                        styles={getAutofillStyles("sitesuper_email")}
                      />
                    </Stack>
                  </Paper>
                </Stack>
              </Grid.Col>
            </Grid>
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
                  <FaCheckCircle
                    size={56}
                    color="var(--mantine-color-green-6)"
                  />
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
                  <FaCheckCircle
                    size={56}
                    color="var(--mantine-color-blue-6)"
                  />
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
          className="new-sale-action-bar"
          withBorder
          px="lg"
          py="sm"
          mt="lg"
          radius="lg"
          pos="sticky"
          bottom={12}
          style={{
            zIndex: 10,
            borderColor: "rgba(142, 45, 226, 0.18)",
            boxShadow: "0 6px 24px rgba(44, 0, 102, 0.12)",
          }}
        >
          <Group justify="flex-end">
            <Button
              size="md"
              radius="md"
              style={{
                background: linearGradients.danger,
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
              radius="md"
              loading={submitMutation.isPending}
              style={{
                background:
                  form.values.stage === "SOLD"
                    ? linearGradients.success
                    : linearGradients.primary,
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
    </Box>
  );
}
