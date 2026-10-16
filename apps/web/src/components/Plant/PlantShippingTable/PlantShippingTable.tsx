"use client";

import { useState, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  flexRender,
  PaginationState,
  ColumnFiltersState,
  SortingState,
  Row,
} from "@tanstack/react-table";
import {
  Table,
  TextInput,
  Group,
  Loader,
  Pagination,
  ScrollArea,
  Center,
  Text,
  Box,
  Badge,
  rem,
  Accordion,
  SimpleGrid,
  Tooltip,
  Checkbox,
  Stack,
  Title,
  ThemeIcon,
  Button,
  Anchor,
  Menu,
  ActionIcon,
  Switch,
  Modal,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  FaSearch,
  FaTruckLoading,
  FaBoxOpen,
  FaCheck,
  FaCalendarCheck,
  FaPrint,
  FaDoorOpen,
  FaPaintBrush,
  FaCogs,
  FaTimes,
  FaTruck,
  FaWarehouse,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import { usePlantShippingTable } from "@/hooks/usePlantShippingTable";
import { Views, Tables } from "@/types/db";
import { useDisclosure } from "@mantine/hooks";
import ShippingPdfPreviewModal from "./ShippingPdfPreviewModal";
import JobDetailsDrawer from "@/components/Shared/JobDetailsDrawer/JobDetailsDrawer";
import { usePermissions } from "@/hooks/usePermissions";
import BackorderManagerCell from "./BackorderManagerCell";
import AddBackorderModal from "@/components/Installation/AddBOModal/AddBOModal";
import WarehouseTrackingModal from "@/components/Shared/WarehouseTrackingModal/WarehouseTrackingModal";

type PlantTableView = Views<"plant_shipping_view">;

type PlantTableData = PlantTableView;

export default function PlantShippingTable() {
  const permissions = usePermissions();
  const { supabase, isAuthenticated } = useSupabase();
  const queryClient = useQueryClient();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "ship_schedule", desc: false },
  ]);

  const [inputFilters, setInputFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([
    {
      id: "ship_date_range",
      value: [
        dayjs().subtract(1, "day").toDate(),
        dayjs().add(7, "day").toDate(),
      ],
    },
  ]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    dayjs().subtract(1, "day").toDate(),
    dayjs().add(7, "day").toDate(),
  ]);
  const [showPrior, setShowPrior] = useState(false);
  const [drawerJobId, setDrawerJobId] = useState<number | null>(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);

  const handleJobClick = (id: number) => {
    setDrawerJobId(id);
    openDrawer();
  };
  const [pdfOpened, { open: openPdf, close: closePdf }] = useDisclosure(false);
  const [openItems, setOpenItems] = useState<string[]>([]);

  const [backorderModalState, setBackorderModalState] = useState<{
    opened: boolean;
    jobId: string;
    jobNumber: string;
  }>({
    opened: false,
    jobId: "",
    jobNumber: "",
  });

  const [warehouseModalState, setWarehouseModalState] = useState<{
    opened: boolean;
    jobId: number | null;
    installationId: number | null;
  }>({
    opened: false,
    jobId: null,
    installationId: null,
  });

  const [warehouseUncheckModalOpen, setWarehouseUncheckModalOpen] =
    useState(false);

  const { data: activeWarehouseData } = useQuery({
    queryKey: ["warehouse_tracking_active", warehouseModalState.jobId],
    queryFn: async () => {
      if (!warehouseModalState.jobId) return null;
      const { data, error } = await supabase
        .from("warehouse_tracking")
        .select("*")
        .eq("job_id", warehouseModalState.jobId)
        .maybeSingle();

      if (error) throw error;
      return data as Tables<"warehouse_tracking"> | null;
    },
    enabled: !!warehouseModalState.jobId,
  });

  const { data, isLoading, isError, error } = usePlantShippingTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });
  const tableData = (data?.data as PlantTableData[]) || [];
  const totalCount = data?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  const updateInstallationMutation = useMutation({
    mutationFn: async ({
      installationId,
      field,
      value,
    }: {
      installationId: number;
      field: string;
      value: any;
    }) => {
      const { error } = await supabase
        .from("installation")
        .update({ [field]: value })
        .eq("installation_id", installationId);
      if (error) throw error;
    },
    onMutate: async ({ installationId, field, value }) => {
      const queryKey = [
        "plant_shipping_table",
        pagination,
        activeFilters,
        sorting,
      ];
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(
        queryKey,
        (old: { data: PlantTableData[]; count: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((row) =>
              row.installation_id === installationId
                ? { ...row, [field]: value }
                : row,
            ),
          };
        },
      );
      return { previousData, queryKey };
    },
    onError: (err: any, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["plant_shipping_table"] });
    },
    onSuccess: () => {
      notifications.show({
        title: "Updated",
        message: "Installation status updated",
        color: "green",
      });
    },
  });

  const updateShippingMutation = useMutation({
    mutationFn: async ({
      installId,
      type,
    }: {
      jobId: number;
      installId: number;
      prodId: number | null;
      type: "full" | "partial" | "none";
    }) => {
      const timestamp = new Date().toISOString();
      const updates: any = {};
      if (type === "full") {
        updates.has_shipped = true;
        updates.partially_shipped = false;
        updates.wrap_completed = timestamp;
      } else if (type === "partial") {
        updates.has_shipped = false;
        updates.partially_shipped = true;
      } else {
        updates.has_shipped = false;
        updates.partially_shipped = false;
      }

      const { error: installError } = await supabase
        .from("installation")
        .update(updates)
        .eq("installation_id", installId);

      if (installError) throw installError;
    },
    onMutate: async ({ installId, type }) => {
      const queryKey = [
        "plant_shipping_table",
        pagination,
        activeFilters,
        sorting,
      ];
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      const timestamp = new Date().toISOString();

      queryClient.setQueryData(
        queryKey,
        (old: { data: PlantTableData[]; count: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((row) => {
              if (row.installation_id === installId) {
                const updates: any = {};
                if (type === "full") {
                  updates.has_shipped = true;
                  updates.partially_shipped = false;
                  updates.wrap_completed = timestamp;
                } else if (type === "partial") {
                  updates.has_shipped = false;
                  updates.partially_shipped = true;
                } else {
                  updates.has_shipped = false;
                  updates.partially_shipped = false;
                }
                return { ...row, ...updates };
              }
              return row;
            }),
          };
        },
      );
      return { previousData, queryKey };
    },
    onError: (err: any, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["plant_shipping_table"] });
    },
    onSuccess: (_, variables) => {
      notifications.show({
        title: "Updated",
        message: "Shipping status updated",
        color: "green",
      });
      queryClient.invalidateQueries({
        queryKey: ["backorder-status"],
      });
      if (variables.type === "partial") {
        const job = (data?.data as PlantTableData[])?.find(
          (j) => j.job_id === variables.jobId,
        );
        if (job) {
          setBackorderModalState({
            opened: true,
            jobId: String(variables.jobId),
            jobNumber: job.job_number || "",
          });
        }
      }
    },
  });

  const setInputFilterValue = (id: string, value: any) => {
    setInputFilters((prev) => {
      const existing = prev.filter((f) => f.id !== id);
      if (!value) return existing;
      return [...existing, { id, value }];
    });
  };

  const getInputFilterValue = (id: string) => {
    return (inputFilters.find((f) => f.id === id)?.value as string) || "";
  };

  const handleApplyFilters = () => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));

    let filters = [...inputFilters];
    if (dateRange[0] && dateRange[1]) {
      filters = filters.filter((f) => f.id !== "ship_date_range");
      filters.push({ id: "ship_date_range", value: dateRange });
    }

    filters = filters.filter((f) => f.id !== "show_prior");
    filters.push({ id: "show_prior", value: showPrior });

    setActiveFilters(filters);
  };

  const handleClearFilters = () => {
    setInputFilters([]);
    setActiveFilters([]);
    setShowPrior(false);
    setDateRange([null, null]);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handlePrintPreview = () => {
    const hasActiveDateFilter = activeFilters.some(
      (f) => f.id === "ship_date_range",
    );

    if (!hasActiveDateFilter || !dateRange[0] || !dateRange[1]) {
      notifications.show({
        title: "Date Filter Required",
        message:
          "Please select and apply a Date Range before generating the PDF report.",
        color: "orange",
        icon: <FaCalendarCheck />,
      });
      return;
    }

    openPdf();
  };

  const columnHelper = createColumnHelper<PlantTableData>();

  const columns = [
    columnHelper.accessor("ship_schedule", {
      header: "Ship Date",
      size: 0,
    }),
    columnHelper.accessor("job_number", {
      header: "Job #",
      size: 90,
      cell: (info) => (
        <Anchor
          component="button"
          size="sm"
          fw={600}
          w="100%"
          style={{ textAlign: "left" }}
          c="#6f00ffff"
          onClick={(e) => {
            e.stopPropagation();
            const jobId = info.row.original.job_id;
            if (jobId) handleJobClick(jobId);
          }}
        >
          <Text fw={600}>{info.getValue()}</Text>
        </Anchor>
      ),
    }),

    columnHelper.accessor((row) => (row as PlantTableData).ship_status, {
      id: "ship_status",
      header: "Date Status",
      size: 90,
      cell: (info) => {
        const status = info.getValue() || "unprocessed";
        let gradient = "";
        let label = "";

        switch (status) {
          case "confirmed":
            gradient = "linear-gradient(135deg, #4A00E0, #8E2DE2)";
            label = "CONFIRMED";
            break;
          case "tentative":
            gradient = "linear-gradient(135deg, #FF6A00, #FFB347)";
            label = "TENTATIVE";
            break;
          default:
            gradient = "linear-gradient(135deg, #B0BEC5, #78909C)";
            label = "UNPROCESSED";
        }

        return (
          <Badge
            variant="filled"
            size="xs"
            w="100%"
            style={{
              background: gradient,
              border: "none",
            }}
          >
            {label}
          </Badge>
        );
      },
    }),
    columnHelper.accessor("client_name", {
      header: "Client",
      size: 160,
      cell: (info) => (
        <Text size="sm" fw={500} truncate>
          {info.getValue() || "—"}
        </Text>
      ),
    }),
    columnHelper.accessor("shipping_city", {
      id: "address",
      header: "Location",
      size: 180,
      cell: (info) => {
        const street = info.row.original.shipping_street;
        const city = info.row.original.shipping_city;
        const prov = info.row.original.shipping_province;
        const zip = info.row.original.shipping_zip;
        return (
          <Tooltip label={info.row.original.shipping_street}>
            <Text size="sm" truncate>
              {[street, zip, city, prov].filter(Boolean).join(", ")}
            </Text>
          </Tooltip>
        );
      },
    }),
    columnHelper.accessor("cabinet_box", { header: "Box", size: 60 }),
    columnHelper.accessor("wrap_completed", {
      header: "Wrapped",
      size: 80,
      cell: (info) => {
        const val = info.getValue();
        const isComplete = !!val;
        const installId = info.row.original.installation_id;

        return (
          <Tooltip
            label={
              isComplete
                ? `Completed: ${dayjs(val).format("MMM D, HH:mm")}`
                : "Mark as Wrapped"
            }
            withArrow
            openDelay={500}
          >
            <Center
              style={{ cursor: "pointer", height: "100%", width: "100%" }}
              onClick={(e) => {
                e.stopPropagation();
                if (installId && !updateInstallationMutation.isPending) {
                  updateInstallationMutation.mutate({
                    installationId: installId,
                    field: "wrap_completed",
                    value: isComplete ? null : new Date().toISOString(),
                  });
                }
              }}
            >
              <ThemeIcon
                variant={isComplete ? "filled" : "outline"}
                color={isComplete ? "#7400e0ff" : "gray"}
                size="sm"
                radius="xl"
              >
                {isComplete && <FaCheck size={10} />}
              </ThemeIcon>
            </Center>
          </Tooltip>
        );
      },
    }),
    columnHelper.accessor("has_shipped", {
      header: "Shipped",
      size: 110,
      cell: (info) => {
        const isShipped = !!info.getValue();
        const partially = info.row.original.partially_shipped;
        const job = info.row.original;

        let trigger;

        if (isShipped) {
          trigger = (
            <Tooltip label="Shipped - Click to Update" withArrow>
              <ThemeIcon
                variant="filled"
                color="#7400e0ff"
                size="sm"
                radius="xl"
                style={{ cursor: "pointer" }}
              >
                <FaCheck size={10} />
              </ThemeIcon>
            </Tooltip>
          );
        } else if (partially) {
          trigger = (
            <Tooltip label="Partially Shipped - Click to Update" withArrow>
              <ThemeIcon
                variant="light"
                color="orange"
                size="sm"
                radius="xl"
                style={{ cursor: "pointer" }}
              >
                <FaTruck size={10} />
              </ThemeIcon>
            </Tooltip>
          );
        } else {
          trigger = (
            <Tooltip label="Mark Shipped" withArrow>
              <ThemeIcon
                variant="outline"
                color="gray"
                size="sm"
                radius="xl"
                style={{ cursor: "pointer" }}
              >
                <FaTruck size={10} />
              </ThemeIcon>
            </Tooltip>
          );
        }

        return (
          <Center onClick={(e) => e.stopPropagation()}>
            <Menu shadow="md" width={150} position="bottom-end">
              <Menu.Target>{trigger}</Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Update Status</Menu.Label>
                <Menu.Item
                  leftSection={<FaCheck size={14} />}
                  onClick={() =>
                    job.job_id &&
                    job.installation_id &&
                    updateShippingMutation.mutate({
                      jobId: job.job_id,
                      installId: job.installation_id,
                      prodId: job.prod_id,
                      type: "full",
                    })
                  }
                >
                  Full Shipment
                </Menu.Item>
                <Menu.Item
                  leftSection={<FaTruck size={14} />}
                  onClick={() =>
                    job.job_id &&
                    job.installation_id &&
                    updateShippingMutation.mutate({
                      jobId: job.job_id,
                      installId: job.installation_id,
                      prodId: job.prod_id,
                      type: "partial",
                    })
                  }
                >
                  Partial Shipment
                </Menu.Item>
                {(isShipped || partially) && (
                  <>
                    <Menu.Divider />
                    <Menu.Item
                      leftSection={<FaTimes size={14} />}
                      color="red"
                      onClick={() =>
                        job.job_id &&
                        job.installation_id &&
                        updateShippingMutation.mutate({
                          jobId: job.job_id,
                          installId: job.installation_id,
                          prodId: job.prod_id,
                          type: "none",
                        })
                      }
                    >
                      Clear Status
                    </Menu.Item>
                  </>
                )}
              </Menu.Dropdown>
            </Menu>
          </Center>
        );
      },
    }),
    columnHelper.accessor("in_warehouse", {
      header: "Warehouse",
      size: 150,
      cell: (info) => {
        const val = info.getValue();
        const isInWarehouse = !!val;
        const job = info.row.original;

        return (
          <Tooltip
            label={
              isInWarehouse
                ? !job.pickup_date
                  ? `In Warehouse Since: ${job?.dropoff_date}`
                  : `Picked Up`
                : `Add to Warehouse`
            }
            withArrow
            openDelay={500}
          >
            <Center
              style={{ cursor: "pointer", height: "100%", width: "100%" }}
              onClick={(e) => {
                e.stopPropagation();
                if (job.job_id && job.installation_id) {
                  queryClient.invalidateQueries({
                    queryKey: ["warehouse_tracking_active", job.job_id],
                  });
                  setWarehouseModalState({
                    opened: !isInWarehouse,
                    jobId: job.job_id,
                    installationId: job.installation_id,
                  });
                  if (isInWarehouse) {
                    setWarehouseUncheckModalOpen(true);
                  }
                }
              }}
            >
              {isInWarehouse ? (
                <Badge
                  color={(job as any).pickup_date ? "green" : "violet"}
                  variant="filled"
                  size="sm"
                  style={{ cursor: "pointer" }}
                  leftSection={
                    (job as any).pickup_date ? (
                      <FaCheck size={10} />
                    ) : (
                      <FaWarehouse size={10} />
                    )
                  }
                >
                  {(job as any).pickup_date
                    ? `Picked Up ${dayjs((job as any).pickup_date).format(
                        "DD/MM",
                      )}`
                    : `In Warehouse`}
                </Badge>
              ) : (
                <ThemeIcon variant="outline" color="gray" size="sm" radius="xl">
                  <FaWarehouse size={10} />
                </ThemeIcon>
              )}
            </Center>
          </Tooltip>
        );
      },
    }),
    columnHelper.display({
      id: "backorders",
      header: "Backorders",
      size: 100,
      cell: (info) => (
        <Center>
          <BackorderManagerCell
            jobId={info.row.original.job_id || 0}
            jobNumber={info.row.original.job_number || ""}
          />
        </Center>
      ),
    }),

    columnHelper.accessor("installation_notes", {
      header: "Notes",
      size: 150,
      cell: (info) => (
        <Tooltip label={info.getValue() || ""} multiline w={250}>
          <Text size="xs" c={info.getValue() ? "dark" : "dimmed"} truncate>
            {info.getValue() || "—"}
          </Text>
        </Tooltip>
      ),
    }),
  ];

  const table = useReactTable({
    data: tableData,
    columns,
    pageCount: pageCount,
    state: { pagination, sorting, columnFilters: activeFilters },
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
  });

  const groupedRows = useMemo(() => {
    if (!table.getRowModel().rows) return {};
    return table.getRowModel().rows.reduce(
      (acc, row) => {
        const job = row.original;
        const shipDate = job.ship_schedule
          ? dayjs(job.ship_schedule).format("YYYY-MM-DD")
          : "Unscheduled";
        if (!acc[shipDate]) acc[shipDate] = [];
        acc[shipDate].push(row);
        return acc;
      },
      {} as Record<string, Row<PlantTableData>[]>,
    );
  }, [table.getRowModel().rows]);

  const sortedGroupKeys = useMemo(() => {
    return Object.keys(groupedRows).sort((a, b) => {
      if (a === "Unscheduled") return 1;
      if (b === "Unscheduled") return -1;
      return dayjs(a).isAfter(dayjs(b)) ? 1 : -1;
    });
  }, [groupedRows]);

  if (!isAuthenticated || isLoading)
    return (
      <Center h={400}>
        <Loader />
      </Center>
    );
  if (isError)
    return (
      <Center h={400}>
        <Text c="red">Error: {error?.message}</Text>
      </Center>
    );

  return (
    <Box
      px={20}
      pt={20}
      h="100vh"
      display="flex"
      style={{ flexDirection: "column" }}
    >
      <Group
        mb="md"
        style={{ display: "flex", justifyContent: "space-between" }}
      >
        <Group>
          <ThemeIcon
            size={50}
            radius="md"
            variant="gradient"
            gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
          >
            <FaTruckLoading size={26} />
          </ThemeIcon>
          <Stack gap={4}>
            <Title order={2} style={{ color: "#343a40" }}>
              Plant Shipping Schedule
            </Title>
            {dateRange[0] && dateRange[1] && (
              <Badge
                variant="light"
                color="violet"
                size="lg"
                leftSection={<FaCalendarCheck size={12} />}
              >
                {dayjs(dateRange[0]).format("MMM D")} -{" "}
                {dayjs(dateRange[1]).format("MMM D, YYYY")}
              </Badge>
            )}
          </Stack>
        </Group>
        <Button
          variant="outline"
          color="violet"
          onClick={handlePrintPreview}
          leftSection={<FaPrint size={14} />}
        >
          Print Preview
        </Button>
      </Group>

      <Accordion variant="contained" radius="md" mb="md">
        <Accordion.Item value="filters">
          <Accordion.Control icon={<FaSearch size={16} />}>
            Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={5} spacing="md">
              <TextInput
                label="Job Number"
                placeholder="Search..."
                value={getInputFilterValue("job_number")}
                onChange={(e) =>
                  setInputFilterValue("job_number", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Client Name"
                placeholder="Search..."
                value={getInputFilterValue("client")}
                onChange={(e) => setInputFilterValue("client", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <TextInput
                label="Address"
                placeholder="Street, City..."
                value={getInputFilterValue("address")}
                onChange={(e) => setInputFilterValue("address", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />

              <DatePickerInput
                type="range"
                allowSingleDateInRange
                label="Ship Date Range"
                placeholder="Pick dates range"
                value={dateRange}
                onChange={(val) =>
                  setDateRange(val as [Date | null, Date | null])
                }
                clearable
                leftSection={<FaCalendarCheck size={14} />}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                style={{ flex: 1 }}
              />
              <Switch
                label="Show Prior"
                checked={showPrior}
                onChange={(e) => setShowPrior(e.currentTarget.checked)}
                color="violet"
                size="md"
                mb={8}
                style={{ display: "flex", alignItems: "flex-end" }}
              />
            </SimpleGrid>
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleClearFilters}>
                Clear Filters
              </Button>

              <Button
                variant="filled"
                color="blue"
                onClick={handleApplyFilters}
                leftSection={<FaSearch size={14} />}
                style={{
                  background:
                    "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
                }}
              >
                Apply Filters
              </Button>
            </Group>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <ScrollArea
        style={{ flex: 1 }}
        type="always"
        styles={{ scrollbar: { zIndex: 99 } }}
      >
        {table.getRowModel().rows.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed">No jobs found.</Text>
          </Center>
        ) : (
          <Box style={{ width: "max-content", minWidth: "100%" }}>
            <Accordion
              variant="contained"
              multiple
              value={openItems}
              onChange={setOpenItems}
              style={{ minWidth: "1600px" }}
              styles={{
                item: { marginBottom: 10, border: "1px solid #e0e0e0" },
                control: { backgroundColor: "#f8f9fa" },
                content: { padding: 0 },
              }}
            >
              {sortedGroupKeys.map((shipDate) => {
                const jobsInGroup = [...groupedRows[shipDate]].sort((a, b) => {
                  const jobA = a.original.job_number || "";
                  const jobB = b.original.job_number || "";
                  return jobA.localeCompare(jobB, undefined, {
                    numeric: true,
                    sensitivity: "base",
                  });
                });
                const isOpen = openItems.includes(shipDate);
                const isPastDue =
                  shipDate !== "Unscheduled" &&
                  dayjs(shipDate).isBefore(dayjs(), "day");

                const uniqueJobCount = new Set(
                  jobsInGroup.map((r) => {
                    const val = r.original.job_number || "";
                    return val.split("-")[0].trim();
                  }),
                ).size;

                const totalBoxes = jobsInGroup.reduce((sum, row) => {
                  const currentBoxCount = row.original.cabinet_box ?? 0;
                  return sum + currentBoxCount;
                }, 0);

                return (
                  <Accordion.Item key={shipDate} value={shipDate}>
                    <Accordion.Control>
                      <Group gap="md">
                        <FaTruckLoading size={16} />
                        <Text fw={700} size="md">
                          Ship Date:{" "}
                          <span
                            style={{ color: isPastDue ? "red" : "#4A00E0" }}
                          >
                            {shipDate}
                          </span>
                        </Text>
                        <Badge variant="light" color="black">
                          {uniqueJobCount} Jobs
                        </Badge>
                        {totalBoxes > 0 && (
                          <Badge
                            variant="light"
                            color="violet"
                            leftSection={<FaBoxOpen size={10} />}
                          >
                            {totalBoxes} Boxes
                          </Badge>
                        )}
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      {isOpen ? (
                        <Table
                          striped
                          highlightOnHover
                          withColumnBorders
                          style={{ minWidth: "1600px" }}
                        >
                          <Table.Thead>
                            <Table.Tr>
                              {table
                                .getFlatHeaders()
                                .slice(1)
                                .map((header) => (
                                  <Table.Th
                                    key={header.id}
                                    style={{ width: header.getSize() }}
                                  >
                                    {flexRender(
                                      header.column.columnDef.header,
                                      header.getContext(),
                                    )}
                                  </Table.Th>
                                ))}
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {jobsInGroup.map((row) => {
                              const isShipped = !!row.original.has_shipped;
                              return (
                                <Table.Tr key={row.id}>
                                  {row
                                    .getVisibleCells()
                                    .slice(1)
                                    .map((cell) => (
                                      <Table.Td
                                        key={cell.id}
                                        style={{
                                          width: cell.column.getSize(),
                                          whiteSpace: "nowrap",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                        }}
                                      >
                                        {flexRender(
                                          cell.column.columnDef.cell,
                                          cell.getContext(),
                                        )}
                                      </Table.Td>
                                    ))}
                                </Table.Tr>
                              );
                            })}
                          </Table.Tbody>
                        </Table>
                      ) : (
                        <div style={{ minHeight: "50px" }} />
                      )}
                    </Accordion.Panel>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          </Box>
        )}
      </ScrollArea>

      <Box
        style={{
          borderTop: "1px solid #eee",
          padding: "1rem",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Pagination
          total={table.getPageCount()}
          value={pagination.pageIndex + 1}
          onChange={(p) => table.setPageIndex(p - 1)}
          color="#4A00E0"
        />
      </Box>

      <ShippingPdfPreviewModal
        opened={pdfOpened}
        onClose={closePdf}
        data={tableData}
        dateRange={dateRange}
      />
      <AddBackorderModal
        opened={backorderModalState.opened}
        onClose={() =>
          setBackorderModalState((prev) => ({ ...prev, opened: false }))
        }
        jobId={backorderModalState.jobId}
        jobNumber={backorderModalState.jobNumber}
        onSuccess={() => {}}
      />
      {warehouseModalState.jobId && (
        <WarehouseTrackingModal
          key={warehouseModalState.jobId}
          opened={warehouseModalState.opened}
          onClose={() =>
            setWarehouseModalState({
              opened: false,
              jobId: null,
              installationId: null,
            })
          }
          jobId={warehouseModalState.jobId}
          installationId={warehouseModalState.installationId || undefined}
          initialData={activeWarehouseData}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["plant_shipping_table"],
            });
            queryClient.invalidateQueries({
              queryKey: [
                "warehouse_tracking_active",
                warehouseModalState.jobId,
              ],
            });
          }}
        />
      )}
      <Modal
        opened={warehouseUncheckModalOpen}
        onClose={() => setWarehouseUncheckModalOpen(false)}
        title="Update Warehouse Status"
        centered
        radius="lg"
      >
        <Stack>
          <Text size="sm">
            You are disabling the &quot;In Warehouse&quot; status. What would
            you like to do with the existing tracking record?
          </Text>
          <Group grow>
            <Button
              variant="gradient"
              gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
              onClick={() => {
                setWarehouseUncheckModalOpen(false);
                setWarehouseModalState((prev) => ({ ...prev, opened: true }));
              }}
            >
              Mark as Picked Up
            </Button>
            <Button
              variant="outline"
              color="red"
              onClick={async () => {
                if (
                  confirm(
                    "This will PERMANENTLY delete the warehouse tracking data (dates, pallets, notes). Are you sure?",
                  )
                ) {
                  try {
                    const { error: deleteError } = await supabase
                      .from("warehouse_tracking")
                      .delete()
                      .eq("job_id", warehouseModalState.jobId);

                    if (deleteError) throw deleteError;

                    if (warehouseModalState.installationId) {
                      const { error: updateError } = await supabase
                        .from("installation")
                        .update({ in_warehouse: null } as any)
                        .eq(
                          "installation_id",
                          warehouseModalState.installationId,
                        );

                      if (updateError) throw updateError;
                    }

                    notifications.show({
                      title: "Success",
                      message: "Warehouse tracking record deleted",
                      color: "green",
                    });
                    queryClient.invalidateQueries({
                      queryKey: ["plant_shipping_table"],
                    });
                    setWarehouseUncheckModalOpen(false);
                  } catch (error: any) {
                    notifications.show({
                      title: "Error",
                      message: error.message,
                      color: "red",
                    });
                  }
                }
              }}
            >
              Delete Record
            </Button>
          </Group>
        </Stack>
      </Modal>

      <JobDetailsDrawer
        jobId={drawerJobId}
        opened={drawerOpened}
        onClose={closeDrawer}
      />
    </Box>
  );
}
