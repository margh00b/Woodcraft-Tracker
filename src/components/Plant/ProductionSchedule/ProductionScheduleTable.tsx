"use client";

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Switch,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  FaSearch,
  FaCalendarAlt,
  FaBoxOpen,
  FaCheck,
  FaPrint,
  FaDoorOpen,
  FaCut,
  FaPaintBrush,
  FaCogs,
  FaBan,
  FaPlus,
  FaMinus,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import { useProductionScheduleTable } from "@/hooks/useProductionScheduleTable";
import { Views } from "@/types/db";
import { useDisclosure } from "@mantine/hooks";
import { useUser } from "@clerk/nextjs";
import ProductionPdfPreviewModal from "./ProductionPdfPreviewModal";
import JobDetailsDrawer from "@/components/Shared/JobDetailsDrawer/JobDetailsDrawer";
export type PlantTableData = Views<"plant_production_view">;

export default function ProductionScheduleTable() {
  const [userRole, setUserRole] = useState<any>("admin");
  const [subRole, setSubRole] = useState<any>("assembly");
  const { supabase, isAuthenticated } = useSupabase();
  const queryClient = useQueryClient();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "wrap_date", desc: false },
  ]);

  const [inputFilters, setInputFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([
    {
      id: "wrap_date_range",
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
  const [pdfOpened, { open: openPdf, close: closePdf }] = useDisclosure(false);
  const [drawerJobId, setDrawerJobId] = useState<number | null>(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [openItems, setOpenItems] = useState<string[]>([]);

  const handleJobClick = (id: number) => {
    setDrawerJobId(id);
    openDrawer();
  };
  const handlePrintPreview = () => {
    if (!dateRange[0] || !dateRange[1]) {
      notifications.show({
        title: "Date Range Required",
        message: "Please select a date range filter to generate the report.",
        color: "orange",
      });
      return;
    }
    openPdf();
  };
  const { data, isLoading, isError, error } = useProductionScheduleTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });
  const tableData = (data?.data as PlantTableData[]) || [];
  const totalCount = data?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  const toggleWrapMutation = useMutation({
    mutationFn: async ({
      installId,
      currentStatus,
    }: {
      installId: number;
      currentStatus: boolean;
      jobNumber?: string;
    }) => {
      const { error } = await supabase
        .from("installation")
        .update({
          wrap_completed: currentStatus ? null : new Date().toISOString(),
        })
        .eq("installation_id", installId);
      if (error) throw error;
    },
    onMutate: async ({ installId, currentStatus }) => {
      const queryKey = [
        "plant_production_table",
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
              row.installation_id === installId
                ? {
                    ...row,
                    wrap_completed: currentStatus
                      ? null
                      : new Date().toISOString(),
                  }
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
      queryClient.invalidateQueries({ queryKey: ["plant_production_table"] });
      queryClient.invalidateQueries({ queryKey: ["plant_shipping_table"] });
    },
    onSuccess: (_, variables) => {
      notifications.show({
        title: "Updated",
        message: `Wrap status updated for ${variables.jobNumber || "job"}`,
        color: "green",
      });
    },
  });

  const updateProductionMutation = useMutation({
    mutationFn: async ({
      jobId,
      prodId,
      field,
      currentValue,
      jobNumber,
    }: {
      jobId: number;
      prodId: number | null;
      field: string;
      currentValue: string | null;
      jobNumber?: string;
      flags: {
        isCanopy: boolean;
        isWoodtop: boolean;
        isCustom: boolean;
      };
    }) => {
      const timestamp = currentValue ? null : new Date().toISOString();
      const updates: Record<string, any> = { [field]: timestamp };

      if (!prodId) throw new Error("No production schedule ID found");

      const { error } = await supabase
        .from("production_schedule")
        .update(updates)
        .eq("prod_id", prodId);
      if (error) throw error;
    },
    onMutate: async ({ prodId, field, currentValue }) => {
      const queryKey = [
        "plant_production_table",
        pagination,
        activeFilters,
        sorting,
      ];
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      const timestamp = currentValue ? null : new Date().toISOString();
      queryClient.setQueryData(
        queryKey,
        (old: { data: PlantTableData[]; count: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((row) =>
              row.prod_id === prodId ? { ...row, [field]: timestamp } : row,
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
      queryClient.invalidateQueries({ queryKey: ["plant_production_table"] });
      queryClient.invalidateQueries({ queryKey: ["plant_shipping_table"] });
    },
    onSuccess: (_, variables) => {
      notifications.show({
        title: "Updated",
        message: `Production status updated for ${
          variables.jobNumber || "job"
        }`,
        color: "green",
      });
    },
  });

  const toggleRequirementMutation = useMutation({
    mutationFn: async ({
      jobId,
      field,
      enable,
    }: {
      jobId: number;
      field: string;
      enable: boolean;
    }) => {
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select("sales_order_id")
        .eq("id", jobId)
        .single();
      if (jobError) throw jobError;
      if (!jobData?.sales_order_id)
        throw new Error("Sales Order ID not found on Job");

      const { error } = await supabase
        .from("sales_orders")
        .update({ [field]: enable })
        .eq("id", jobData.sales_order_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plant_production_table"] });
      notifications.show({
        title: "Updated",
        message: "Requirement updated successfully",
        color: "green",
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
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
      filters = filters.filter((f) => f.id !== "wrap_date_range");
      filters.push({ id: "wrap_date_range", value: dateRange });
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

  const columnHelper = createColumnHelper<PlantTableData>();

  const columns = useMemo(() => {
    const makeCheckboxCol = (
      id: string,
      header: string | React.ReactNode,
      accessor: (row: PlantTableData) => any,
      dbField: string,
      requiredFlag?: "isCanopy" | "isWoodtop" | "isCustom",
      customSize?: number,
      bgColor?: string,
    ) =>
      columnHelper.accessor(accessor, {
        id,
        meta: {
          style: {
            backgroundColor: bgColor,
          },
        } as any,
        header: () => (
          <Center>
            {typeof header === "string" ? (
              <Text size="sm" fw={700} style={{ textAlign: "center" }}>
                {header}
              </Text>
            ) : (
              header
            )}
          </Center>
        ),
        size: customSize || 110,
        cell: (info) => {
          const val = info.getValue();
          const isChecked = !!val;
          const flags = {
            isCanopy: !!info.row.original.is_canopy_required,
            isWoodtop: !!info.row.original.is_woodtop_required,
            isCustom: !!info.row.original.is_custom_cab_required,
          };

          if (requiredFlag && !flags[requiredFlag]) {
            const canEnable =
              userRole === "admin" ||
              (subRole === "manager" && userRole === "plant");

            if (canEnable) {
              return (
                <Menu shadow="md" width={200}>
                  <Menu.Target>
                    <Center
                      style={{
                        cursor: "pointer",
                        height: "100%",
                        width: "100%",
                        opacity: 0.3,
                      }}
                    >
                      <FaBan size={14} color="gray" />
                    </Center>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Requirement</Menu.Label>
                    <Menu.Item
                      leftSection={<FaCheck size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        const fieldMap: Record<string, string> = {
                          isCanopy: "is_canopy_required",
                          isWoodtop: "is_woodtop_required",
                          isCustom: "is_custom_cab_required",
                        };
                        if (info.row.original.job_id) {
                          toggleRequirementMutation.mutate({
                            jobId: info.row.original.job_id,
                            field: fieldMap[requiredFlag],
                            enable: true,
                          });
                        }
                      }}
                    >
                      Enable {requiredFlag.replace("is", "")}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              );
            }

            return (
              <Tooltip label="Not Required" withArrow openDelay={500}>
                <Center style={{ height: "100%", width: "100%", opacity: 0.3 }}>
                  <FaBan size={14} color="gray" />
                </Center>
              </Tooltip>
            );
          }

          return (
            <Tooltip
              label={
                isChecked
                  ? `Completed: ${dayjs(val).format("MMM D, HH:mm")}`
                  : "Mark as Complete"
              }
              withArrow
              openDelay={500}
            >
              <Center
                style={{
                  cursor: "pointer",
                  height: "100%",
                  width: "100%",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  info.row.original.job_id &&
                    updateProductionMutation.mutate({
                      jobId: info.row.original.job_id,
                      prodId: info.row.original.prod_id,
                      field: dbField,
                      currentValue: val,
                      jobNumber: info.row.original.job_number || "",
                      flags: {
                        isCanopy: !!info.row.original.is_canopy_required,
                        isWoodtop: !!info.row.original.is_woodtop_required,
                        isCustom: !!info.row.original.is_custom_cab_required,
                      },
                    });
                }}
              >
                <ThemeIcon
                  variant={isChecked ? "filled" : "outline"}
                  color={isChecked ? "green" : "gray"}
                  size="sm"
                  radius="xl"
                >
                  {isChecked && <FaCheck size={10} />}
                </ThemeIcon>
              </Center>
            </Tooltip>
          );
        },
      });

    const commonStart = [
      columnHelper.accessor("wrap_date", {
        header: "Wrap Date",
        size: 0,
      }),
      columnHelper.accessor("placement_date", {
        header: "Files",
        size: 50,
        cell: (info) => {
          const date = info.getValue();
          if (!date)
            return (
              <Text size="xs" c="dimmed">
                -
              </Text>
            );
          return (
            <Tooltip label={dayjs(date).format("MMM D, YYYY")}>
              <Center>
                <FaCheck size={12} color="green" />
              </Center>
            </Tooltip>
          );
        },
      }),
      columnHelper.accessor("job_number", {
        header: "Job #",
        size: 90,
        cell: (info) => (
          <Anchor
            component="button"
            size="xs"
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
            <Text fw={600} size="xs">
              {info.getValue()}
            </Text>
          </Anchor>
        ),
      }),
      columnHelper.accessor("client_name", {
        header: "Client",
        size: 130,
        cell: (info) => (
          <Text size="xs" fw={500}>
            {info.getValue() || "—"}
          </Text>
        ),
      }),

      columnHelper.accessor("cabinet_box", { header: "Box", size: 40 }),
      columnHelper.accessor("cabinet_door_style", {
        header: "Door Style",
        size: 130,
        cell: (info) => (
          <Text size="xs" truncate>
            {info.getValue() || "-"}
          </Text>
        ),
      }),
      columnHelper.accessor("cabinet_species", {
        header: "Species",
        size: 100,
        cell: (info) => (
          <Text size="xs" truncate>
            {info.getValue() || "-"}
          </Text>
        ),
      }),
      columnHelper.accessor("cabinet_color", {
        header: "Color",
        size: 100,
        cell: (info) => (
          <Text size="xs" truncate>
            {info.getValue() || "-"}
          </Text>
        ),
      }),
    ];

    let actualsCols: any[] = [];

    if (subRole === "wood" && userRole === "plant") {
      actualsCols = [
        makeCheckboxCol(
          "doors",
          "Doors",
          (r) => r.doors_completed_actual,
          "doors_completed_actual",
        ),
        makeCheckboxCol(
          "panels",
          "Panels",
          (r) => r.panel_completed_actual,
          "panel_completed_actual",
        ),
        makeCheckboxCol(
          "custom_finish",
          "Custom Finish",
          (r) => r.custom_finish_completed_actual,
          "custom_finish_completed_actual",
        ),
        makeCheckboxCol(
          "drawers",
          "Drawers",
          (r) => r.drawer_completed_actual,
          "drawer_completed_actual",
        ),
        makeCheckboxCol(
          "woodtop",
          "Woodtop",
          (r) => r.woodtop_completed_actual,
          "woodtop_completed_actual",
          "isWoodtop",
        ),
        makeCheckboxCol(
          "canopy",
          "Canopy",
          (r) => r.canopy_completed_actual,
          "canopy_completed_actual",
          "isCanopy",
        ),
      ];
    } else if (subRole === "assembly" && userRole === "plant") {
      actualsCols = [
        makeCheckboxCol(
          "cut_mel",
          "Cut Melamine",
          (r) => r.cut_melamine_completed_actual,
          "cut_melamine_completed_actual",
        ),
        makeCheckboxCol(
          "assembly",
          "Assembly",
          (r) => r.assembly_completed_actual,
          "assembly_completed_actual",
        ),
      ];
    } else if (subRole === "paint" && userRole === "plant") {
      actualsCols = [
        makeCheckboxCol(
          "paint_doors",
          <Stack gap={0} align="center">
            <Text size="sm" fw={700}>
              Paint
            </Text>
            <Text size="xs">Doors/Panels</Text>
          </Stack>,
          (r) => r.paint_doors_completed_actual,
          "paint_doors_completed_actual",
          undefined,
          150,
        ),
        makeCheckboxCol(
          "paint_canopy",
          <Stack gap={0} align="center">
            <Text size="sm" fw={700}>
              Paint
            </Text>
            <Text size="xs">Canopy</Text>
          </Stack>,
          (r) => r.paint_canopy_completed_actual,
          "paint_canopy_completed_actual",
          "isCanopy",
        ),
        makeCheckboxCol(
          "paint_custom",
          <Stack gap={0} align="center">
            <Text size="sm" fw={700}>
              Paint
            </Text>
            <Text size="xs">Custom</Text>
          </Stack>,
          (r) => r.paint_cust_cab_completed_actual,
          "paint_cust_cab_completed_actual",
          "isCustom",
        ),
      ];
    } else if (
      (subRole === "manager" && userRole === "plant") ||
      userRole === "admin"
    ) {
      actualsCols = [
        makeCheckboxCol(
          "cut_mel",
          "Cut Melamine",
          (r) => r.cut_melamine_completed_actual,
          "cut_melamine_completed_actual",
          undefined,
          undefined,
          "#f6f6f6",
        ),
        makeCheckboxCol(
          "doors",
          "Doors",
          (r) => r.doors_completed_actual,
          "doors_completed_actual",
        ),
        makeCheckboxCol(
          "panels",
          "Panels",
          (r) => r.panel_completed_actual,
          "panel_completed_actual",
          undefined,
          undefined,
          "#f6f6f6",
        ),
        makeCheckboxCol(
          "drawers",
          "Drawers",
          (r) => r.drawer_completed_actual,
          "drawer_completed_actual",
        ),
        makeCheckboxCol(
          "custom_finish",
          "Custom Finish",
          (r) => r.custom_finish_completed_actual,
          "custom_finish_completed_actual",
          undefined,
          undefined,
          "#f6f6f6",
        ),
        makeCheckboxCol(
          "woodtop",
          "Woodtop",
          (r) => r.woodtop_completed_actual,
          "woodtop_completed_actual",
          "isWoodtop",
        ),
        makeCheckboxCol(
          "canopy",
          "Canopy",
          (r) => r.canopy_completed_actual,
          "canopy_completed_actual",
          "isCanopy",
          undefined,
          "#f6f6f6",
        ),
        makeCheckboxCol(
          "paint_doors",
          <Stack gap={0} align="center">
            <Text size="sm" fw={700}>
              Paint
            </Text>
            <Text size="xs">Doors/Panels</Text>
          </Stack>,
          (r) => r.paint_doors_completed_actual,
          "paint_doors_completed_actual",
          undefined,
          150,
        ),
        makeCheckboxCol(
          "paint_canopy",
          <Stack gap={0} align="center">
            <Text size="sm" fw={700}>
              Paint
            </Text>
            <Text size="xs">Canopy</Text>
          </Stack>,
          (r) => r.paint_canopy_completed_actual,
          "paint_canopy_completed_actual",
          "isCanopy",
        ),
        makeCheckboxCol(
          "paint_custom",
          <Stack gap={0} align="center">
            <Text size="sm" fw={700}>
              Paint
            </Text>
            <Text size="xs">Custom</Text>
          </Stack>,
          (r) => r.paint_cust_cab_completed_actual,
          "paint_cust_cab_completed_actual",
          "isCustom",
        ),
        makeCheckboxCol(
          "assembly",
          "Assembly",
          (r) => r.assembly_completed_actual,
          "assembly_completed_actual",
          undefined,
          undefined,
          "#f6f6f6",
        ),
      ];
    } else {
      actualsCols = [];
    }

    const commonEnd = [];

    if (
      subRole === "manager" ||
      subRole === "shipping" ||
      userRole === "admin"
    ) {
      commonEnd.push(
        columnHelper.accessor("wrap_completed", {
          header: () => (
            <Center w="100%">
              <Text size="sm" fw={700}>
                Wrapped
              </Text>
            </Center>
          ),
          size: 110,
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
                    if (installId && !toggleWrapMutation.isPending) {
                      toggleWrapMutation.mutate({
                        installId,
                        currentStatus: isComplete,
                        jobNumber: info.row.original.job_number || "",
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
      );
    }

    commonEnd.push(
      columnHelper.accessor("installation_notes", {
        header: "Notes",
        size: 180,
        cell: (info) =>
          !!info.row.original.installation_notes ? (
            <Tooltip label={info.getValue() || ""} multiline w={250}>
              <Text size="xs" c={info.getValue() ? "dark" : "dimmed"} truncate>
                {info.getValue() || "—"}
              </Text>
            </Tooltip>
          ) : (
            <Text size="xs" c={info.getValue() ? "dark" : "dimmed"} truncate>
              {info.getValue() || "—"}
            </Text>
          ),
      }),
    );

    commonEnd.push(
      columnHelper.display({
        id: "requirements",
        header: "Requirements",
        size: 140,
        cell: (info) => {
          const {
            is_canopy_required,
            is_woodtop_required,
            is_custom_cab_required,
          } = info.row.original;

          if (
            !is_canopy_required &&
            !is_woodtop_required &&
            !is_custom_cab_required
          ) {
            return (
              <Text size="xs" c="dimmed">
                -
              </Text>
            );
          }

          return (
            <Group gap={4}>
              {is_canopy_required && (
                <Tooltip label="Canopy Required" openDelay={300}>
                  <Badge size="xs" color="cyan" variant="light">
                    CNPY
                  </Badge>
                </Tooltip>
              )}
              {is_woodtop_required && (
                <Tooltip label="WoodTop Required" openDelay={300}>
                  <Badge size="xs" color="orange" variant="light">
                    WT
                  </Badge>
                </Tooltip>
              )}
              {is_custom_cab_required && (
                <Tooltip label="Custom/Finish Required" openDelay={300}>
                  <Badge size="xs" color="grape" variant="light">
                    Cust
                  </Badge>
                </Tooltip>
              )}
            </Group>
          );
        },
      }),
    );

    return [...commonStart, ...actualsCols, ...commonEnd];
  }, [subRole, toggleWrapMutation, updateProductionMutation]);

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
        const wrapDate = job.wrap_date
          ? dayjs(job.wrap_date).format("YYYY-MM-DD")
          : "No Date";
        if (!acc[wrapDate]) acc[wrapDate] = [];
        acc[wrapDate].push(row);
        return acc;
      },
      {} as Record<string, Row<PlantTableData>[]>,
    );
  }, [table.getRowModel().rows]);

  const sortedGroupKeys = useMemo(() => {
    return Object.keys(groupedRows).sort((a, b) => {
      if (a === "No Date") return 1;
      if (b === "No Date") return -1;
      return a.localeCompare(b);
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
      <Group mb="md" justify="space-between">
        <Group>
          <ThemeIcon
            size={50}
            radius="md"
            variant="gradient"
            gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
          >
            <FaCalendarAlt size={26} />
          </ThemeIcon>
          <Stack gap={4}>
            <Title order={2} style={{ color: "#343a40" }}>
              Production Schedule
            </Title>
            {dateRange[0] && dateRange[1] && (
              <Badge
                variant="light"
                color="violet"
                size="lg"
                leftSection={<FaCalendarAlt size={12} />}
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
          leftSection={<FaPrint size={14} />}
          onClick={handlePrintPreview}
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
                label="Wrap Date Range"
                placeholder="Pick dates range"
                value={dateRange}
                onChange={(val) =>
                  setDateRange(val as [Date | null, Date | null])
                }
                clearable
                leftSection={<FaCalendarAlt size={14} />}
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
        styles={{
          thumb: {
            zIndex: "200",
          },
        }}
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
              {sortedGroupKeys.map((wrapDate) => {
                const jobsInGroup = [...groupedRows[wrapDate]].sort((a, b) => {
                  const jobA = a.original.job_number || "";
                  const jobB = b.original.job_number || "";
                  return jobA.localeCompare(jobB, undefined, {
                    numeric: true,
                    sensitivity: "base",
                  });
                });
                const isOpen = openItems.includes(wrapDate);
                const isPastDue = dayjs(wrapDate).isBefore(dayjs(), "day");
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
                  <Accordion.Item key={wrapDate} value={wrapDate}>
                    <Accordion.Control>
                      <Group gap="md">
                        <FaCalendarAlt size={16} />
                        <Text fw={700} size="md">
                          Wrap Date:{" "}
                          <span
                            style={{ color: isPastDue ? "red" : "#4A00E0" }}
                          >
                            {wrapDate}
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
                                .map((header) => {
                                  const isStickyJob =
                                    header.column.id === "job_number";
                                  let stickyStyle: React.CSSProperties = {};
                                  if (isStickyJob) {
                                    stickyStyle = {
                                      position: "sticky",
                                      left: -1,
                                      zIndex: 2,
                                    };
                                  }

                                  return (
                                    <Table.Th
                                      style={{
                                        backgroundColor:
                                          (header.column.columnDef.meta as any)
                                            ?.style?.backgroundColor ||
                                          "#ffffffff",
                                        width: header.getSize(),
                                        ...stickyStyle,
                                      }}
                                      key={header.id}
                                    >
                                      {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext(),
                                      )}
                                    </Table.Th>
                                  );
                                })}
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {jobsInGroup.map((row) => {
                              const isCompleted = !!row.original.wrap_completed;
                              return (
                                <Table.Tr key={row.id}>
                                  {row
                                    .getVisibleCells()
                                    .slice(1)
                                    .map((cell) => {
                                      const isStickyJob =
                                        cell.column.id === "job_number";
                                      let stickyStyle: React.CSSProperties = {};

                                      if (isStickyJob) {
                                        stickyStyle = {
                                          position: "sticky",
                                          left: -1,
                                          zIndex: 1,
                                          backgroundColor: "#f0f0f0ff",
                                        };
                                      }

                                      return (
                                        <Table.Td
                                          key={cell.id}
                                          style={{
                                            width: cell.column.getSize(),
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            backgroundColor:
                                              (
                                                cell.column.columnDef
                                                  .meta as any
                                              )?.style?.backgroundColor ||
                                              undefined,
                                            ...stickyStyle,
                                          }}
                                        >
                                          {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext(),
                                          )}
                                        </Table.Td>
                                      );
                                    })}
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
      <ProductionPdfPreviewModal
        opened={pdfOpened}
        onClose={closePdf}
        data={tableData}
        dateRange={dateRange}
      />
      <JobDetailsDrawer
        jobId={drawerJobId}
        opened={drawerOpened}
        onClose={closeDrawer}
      />
    </Box>
  );
}
