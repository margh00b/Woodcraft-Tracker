"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  flexRender,
  PaginationState,
  ColumnFiltersState,
  SortingState,
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
  Accordion,
  Button,
  Badge,
  rem,
  Stack,
  ThemeIcon,
  Title,
  Grid,
  Anchor,
  Switch,
  Tooltip,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  FaPlus,
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaHome,
  FaCheckCircle,
  FaFileExcel,
} from "react-icons/fa";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import { useSalesTable } from "@/hooks/useSalesTable";
import { Views } from "@/types/db";
import { useDisclosure } from "@mantine/hooks";
import JobDetailsDrawer from "@/components/Shared/JobDetailsDrawer/JobDetailsDrawer";
import {
  colors,
  gradients,
  linearGradients,
  serviceStatusGradients,
  serviceStatusGradientsLight,
} from "@/theme";
import { useUser } from "@clerk/nextjs";
import { usePermissions } from "@/hooks/usePermissions";
import { exportToExcel } from "@/utils/exportToExcel";
import { TbCurrencyDollar } from "react-icons/tb";

dayjs.extend(utc);
type SalesTableView = Views<"sales_table_view">;

export default function SalesTable() {
  const permission = usePermissions();
  const router = useRouter();
  const { supabase, isAuthenticated } = useSupabase();
  const { user } = useUser();
  const [exportLoading, setExportLoading] = useState(false);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 30,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [inputFilters, setInputFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([]);
  const [drawerJobId, setDrawerJobId] = useState<number | null>(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);

  const handleJobClick = (id: number) => {
    setDrawerJobId(id);
    openDrawer();
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const jobs = await fetchAllSales();

      if (!jobs || jobs.length === 0) {
        setExportLoading(false);
        return;
      }

      const jobIds = jobs
        .map((j) => j.job_id)
        .filter((id) => id !== null) as number[];

      let invoicesMap: Record<number, string[]> = {};
      if (jobIds.length > 0) {
        const { data: invoices, error: invError } = await supabase
          .from("invoices")
          .select("job_id, invoice_number")
          .in("job_id", jobIds);

        if (invError) throw invError;

        invoices?.forEach((inv) => {
          if (inv.job_id && inv.invoice_number) {
            if (!invoicesMap[inv.job_id]) invoicesMap[inv.job_id] = [];
            invoicesMap[inv.job_id].push(inv.invoice_number);
          }
        });
      }

      const excelData = jobs.map((job) => {
        const invoiceNumbers = invoicesMap[job.job_id!]?.join(", ") || "";
        const address = [
          job.shipping_street,
          job.shipping_city,
          job.shipping_province,
          job.shipping_zip,
        ]
          .filter(Boolean)
          .join(", ");

        return {
          "Ship Date": job.ship_schedule
            ? dayjs(job.ship_schedule).format("YYYY-MM-DD")
            : "",
          "Job #": job.job_number,
          "Invoice #": invoiceNumbers,
          Client: job.shipping_client_name,
          Address: address,
          "Price (pre-GST)": job.total || 0,
          Percentage: "",
          Commission: 0,
        };
      });

      const shipScheduleFilter = activeFilters.find(
        (f) => f.id === "ship_schedule",
      )?.value as [Date | null, Date | null] | undefined;
      const designerFilter = activeFilters.find((f) => f.id === "designerName")
        ?.value as string | undefined;
      const myJobsFilter = activeFilters.find((f) => f.id === "my_jobs")
        ?.value as string | undefined;

      let dateRangeStr = "All Dates";
      if (
        shipScheduleFilter &&
        Array.isArray(shipScheduleFilter) &&
        (shipScheduleFilter[0] || shipScheduleFilter[1])
      ) {
        const start = shipScheduleFilter[0]
          ? dayjs(shipScheduleFilter[0]).format("YYYY-MM-DD")
          : "Start";
        const end = shipScheduleFilter[1]
          ? dayjs(shipScheduleFilter[1]).format("YYYY-MM-DD")
          : "End";
        dateRangeStr = `${start} to ${end}`;
      }

      let designerStr = "";
      if (myJobsFilter) {
        designerStr = myJobsFilter;
      } else if (designerFilter) {
        designerStr = designerFilter;
      }

      const customHeaders = [
        [
          "Ship Date Range:",
          dateRangeStr,
          "",
          "",
          `Designer: ${designerStr}`,
          "",
          "",
        ],
      ];

      const merges = [
        { s: { r: 0, c: 1 }, e: { r: 0, c: 3 } },
        { s: { r: 0, c: 4 }, e: { r: 0, c: 6 } },
      ];

      exportToExcel(excelData, "Sales_Export", {
        customHeaders,
        merges,
        onSheetCreated: (worksheet, range, utils, firstDataRow) => {
          for (let R = firstDataRow; R <= range.e.r; ++R) {
            const cellRef = utils.encode_cell({ c: 7, r: R });
            const rowNum = R + 1;
            worksheet[cellRef] = {
              ...worksheet[cellRef],
              t: "n",
              f: `IF(G${rowNum}<>"", F${rowNum}*G${rowNum}%, "")`,
            };
          }
        },
      });
    } catch (e) {
      console.error(e);
    } finally {
      setExportLoading(false);
    }
  };

  const setInputFilterValue = (
    id: string,
    value: string | undefined | null | [Date | null, Date | null],
  ) => {
    setInputFilters((prev) => {
      const existing = prev.filter((f) => f.id !== id);
      if (!value) return existing;
      return [...existing, { id, value }];
    });
  };

  const getInputFilterValue = (id: string) => {
    return inputFilters.find((f) => f.id === id)?.value;
  };

  const filtersForStats = useMemo(() => {
    return activeFilters.filter((f) => f.id !== "stage");
  }, [activeFilters]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["sales_stats_aggregated", filtersForStats],
    queryFn: async () => {
      let query = supabase.from("sales_table_view").select("stage");

      filtersForStats.forEach((filter) => {
        const { id, value } = filter;
        if (!value) return;

        switch (id) {
          case "job_number":
            query = query.ilike("job_number", `%${value}%`);
            break;
          case "clientlastName":
            query = query.ilike("shipping_client_name", `%${value}%`);
            break;
          case "projectName":
            query = query.ilike("project_name", `%${value}%`);
            break;
          case "designerName":
            query = query.ilike("designer", `%${value}%`);
            break;
          case "my_jobs":
            query = query.eq("designer", value);
            break;
          case "site_address":
            query = query.or(
              `shipping_street.ilike.%${value}%,shipping_city.ilike.%${value}%,shipping_province.ilike.%${value}%,shipping_zip.ilike.%${value}%`,
            );
            break;
          case "ship_schedule":
            const [startShip, endShip] = value as [Date | null, Date | null];
            if (startShip)
              query = query.gte(
                "ship_schedule",
                dayjs(startShip).startOf("day").toISOString(),
              );
            if (endShip)
              query = query.lte(
                "ship_schedule",
                dayjs(endShip).endOf("day").toISOString(),
              );
            break;
          case "created_at":
            const [startCreate, endCreate] = value as [
              Date | null,
              Date | null,
            ];
            if (startCreate)
              query = query.gte(
                "created_at",
                dayjs(startCreate).startOf("day").toISOString(),
              );
            if (endCreate)
              query = query.lte(
                "created_at",
                dayjs(endCreate).endOf("day").toISOString(),
              );
            break;
        }
      });

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching stats:", error);
        return { ALL: 0, QUOTE: 0, SOLD: 0 };
      }

      const counts = { ALL: 0, QUOTE: 0, SOLD: 0 };

      if (data) {
        counts.ALL = data.length;
        for (const row of data) {
          if (row.stage === "QUOTE") counts.QUOTE++;
          else if (row.stage === "SOLD") counts.SOLD++;
        }
      }

      return counts;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data,
    isLoading,
    isError,
    error,
    fetchAll: fetchAllSales,
  } = useSalesTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });

  const tableData = data?.data || [];
  const totalCount = data?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setActiveFilters(inputFilters);
  };

  const clearFilters = () => {
    setInputFilters([]);
    setActiveFilters([]);
  };

  const setStageFilter = (stage: string) => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setActiveFilters((prev) => {
      const existing = prev.filter((f) => f.id !== "stage");
      if (stage === "ALL") return existing;
      return [...existing, { id: "stage", value: stage }];
    });
  };

  const currentStage =
    (activeFilters.find((f) => f.id === "stage")?.value as string) || "ALL";

  const columnHelper = createColumnHelper<SalesTableView>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("job_number", {
        header: "Job Number",
        size: 80,
        cell: (info) => {
          if (info.getValue()) {
            return (
              <Anchor
                component="button"
                size="xs"
                fw={600}
                w="100%"
                style={{ textAlign: "left" }}
                c={colors.violet.light}
                onClick={(e) => {
                  e.stopPropagation();
                  const jobId = info.row.original.job_id;
                  if (jobId) handleJobClick(jobId);
                }}
              >
                <Text size="xs" fw={600}>
                  {info.getValue()}
                </Text>
              </Anchor>
            );
          } else {
            return null;
          }
        },
      }),
      columnHelper.accessor("stage", {
        header: "Status",
        size: 70,
        cell: (info) => (
          <Badge
            style={{ cursor: "inherit" }}
            color={info.getValue() === "SOLD" ? "green" : "blue"}
            variant="light"
            size="xs"
          >
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor("designer", {
        header: "Designer",
        size: 60,
        cell: (info) => (
          <Text size="xs" truncate>
            {info.getValue() || "—"}
          </Text>
        ),
      }),
      columnHelper.accessor("shipping_client_name", {
        id: "clientlastName",
        header: "Client Name",
        size: 250,
        cell: (info) => {
          const projectName = info.row.original.project_name;
          const clientName = info.getValue();

          return (
            <Tooltip
              label={
                <Text size="xs" fw={500}>
                  {projectName && (
                    <>
                      <Text span fs="italic" fw={600} size="xs">
                        {projectName}
                      </Text>
                      {" - "}
                    </>
                  )}
                  {clientName || "—"}
                </Text>
              }
            >
              <Text size="xs" fw={500} truncate="end">
                {projectName && (
                  <>
                    <Text span fs="italic" fw={600} size="xs">
                      {projectName}
                    </Text>
                    {" - "}
                  </>
                )}
                {clientName || "—"}
              </Text>
            </Tooltip>
          );
        },
      }),
      columnHelper.accessor(
        (row) =>
          [
            row.shipping_street,
            row.shipping_city,
            row.shipping_province,
            row.shipping_zip,
          ]
            .filter(Boolean)
            .join(", ") || "—",
        {
          id: "shippingAddress",
          header: "Site Address",
          size: 250,
          cell: (info) => (
            <Tooltip label={info.getValue()} openDelay={300}>
              <Text size="xs" truncate>
                {info.getValue()}
              </Text>
            </Tooltip>
          ),
        },
      ),
      columnHelper.accessor("cabinet_box", {
        header: "Box",
        size: 40,
        cell: (info) => (
          <Text size="xs" truncate>
            {info.getValue() || "—"}
          </Text>
        ),
      }),
      columnHelper.accessor("cabinet_color", {
        header: "Color",
        size: 120,
        cell: (info) => (
          <Tooltip label={info.getValue()} openDelay={300}>
            <Text size="xs" truncate>
              {info.getValue() || "—"}
            </Text>
          </Tooltip>
        ),
      }),
      columnHelper.accessor("total", {
        header: "Price",
        size: 70,
        cell: (info) => (
          <Text size="xs">
            {`$${(info.getValue() as number)?.toFixed(2) || "0.00"}`}
          </Text>
        ),
      }),
      columnHelper.accessor("ship_schedule", {
        header: "Ship Date",
        size: 70,
        cell: (info) => {
          const date = info.getValue<string>();
          return (
            <Text size="xs">
              {date ? dayjs.utc(date).format("YYYY-MM-DD") : "(TBD)"}
            </Text>
          );
        },
      }),
      columnHelper.accessor("created_at", {
        header: "Created",
        size: 70,
        cell: (info) => {
          const date = info.getValue<string>();
          return (
            <Text size="xs">
              {date ? dayjs(date).format("YYYY-MM-DD") : "—"}
            </Text>
          );
        },
      }),
    ],
    [router],
  );

  const table = useReactTable({
    data: tableData,
    columns,
    pageCount: pageCount,
    state: {
      pagination,
      sorting,
      columnFilters: activeFilters,
    },
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <Center style={{ height: "300px" }}>
        <Loader />
      </Center>
    );
  }
  if (isError) {
    return (
      <Center style={{ height: "300px" }}>
        <Text c="red">Error: {(error as Error).message}</Text>
      </Center>
    );
  }

  return (
    <Box
      fz="xs"
      style={{
        display: "flex",
        flexDirection: "column",

        paddingLeft: rem(20),
        paddingRight: rem(20),
        paddingBottom: rem(5),
        paddingTop: rem(20),
        height: "calc(100vh - 45px)",
      }}
    >
      <Group mb="md" justify="space-between">
        <Group>
          <ThemeIcon
            size={30}
            radius="md"
            variant="gradient"
            gradient={gradients.primary}
          >
            <TbCurrencyDollar size={18} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title size="xl" style={{ color: colors.gray.title }}>
              Sales
            </Title>
            <Text size="xs" c="dimmed">
              Manage quotes, active jobs, and project details
            </Text>
          </Stack>
        </Group>
        <Group>
          <Tooltip
            label="Add ship date range to enable export"
            disabled={
              !!activeFilters.find(
                (f) =>
                  f.id === "ship_schedule" &&
                  Array.isArray(f.value) &&
                  (f.value[0] || f.value[1]),
              )
            }
          >
            <span>
              <Button
                onClick={handleExportExcel}
                loading={exportLoading}
                disabled={
                  !activeFilters.find(
                    (f) =>
                      f.id === "ship_schedule" &&
                      Array.isArray(f.value) &&
                      (f.value[0] || f.value[1]),
                  )
                }
                leftSection={<FaFileExcel size={14} />}
                variant="outline"
                color="green"
              >
                Export Excel
              </Button>
            </span>
          </Tooltip>
          {permission.canEditSales && (
            <Button
              onClick={() => router.push("/dashboard/sales/newsale")}
              leftSection={<FaPlus size={14} />}
              style={{
                background: linearGradients.primary,
                color: "white",
                border: "none",
              }}
            >
              New Order
            </Button>
          )}
        </Group>
      </Group>

      <Accordion variant="contained" radius="md" mb="xs">
        <Accordion.Item value="search-filters">
          <Accordion.Control
            icon={<FaSearch size={13} />}
            style={{ fontSize: 13 }}
            styles={{
              label: {
                padding: 6,
              },
            }}
          >
            Search Filters
          </Accordion.Control>
          <Accordion.Panel styles={{ content: { padding: 8 } }}>
            <Grid columns={24} gutter="xs">
              <Grid.Col span={{ base: 24, sm: 8, md: 2 }}>
                <TextInput
                  size="xs"
                  label="Job Number"
                  placeholder="e.g. 202401"
                  value={(getInputFilterValue("job_number") as string) || ""}
                  onChange={(e) =>
                    setInputFilterValue("job_number", e.target.value)
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 24, sm: 8, md: 4 }}>
                <TextInput
                  size="xs"
                  label="Client Name"
                  placeholder="Search Client..."
                  value={
                    (getInputFilterValue("clientlastName") as string) || ""
                  }
                  onChange={(e) =>
                    setInputFilterValue("clientlastName", e.target.value)
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 24, sm: 8, md: 3 }}>
                <TextInput
                  size="xs"
                  label="Project Name"
                  placeholder="Search Project..."
                  value={(getInputFilterValue("projectName") as string) || ""}
                  onChange={(e) =>
                    setInputFilterValue("projectName", e.target.value)
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 24, sm: 8, md: 3 }}>
                <TextInput
                  size="xs"
                  label="Designer Name"
                  placeholder="Search Designer..."
                  value={(getInputFilterValue("designerName") as string) || ""}
                  onChange={(e) =>
                    setInputFilterValue("designerName", e.target.value)
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 24, sm: 8, md: 4 }}>
                <TextInput
                  size="xs"
                  label="Site Address"
                  placeholder="Search Site Address..."
                  value={(getInputFilterValue("site_address") as string) || ""}
                  onChange={(e) =>
                    setInputFilterValue("site_address", e.target.value)
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 24, sm: 8, md: 3 }}>
                <DatePickerInput
                  size="xs"
                  type="range"
                  allowSingleDateInRange
                  label="Ship Date"
                  placeholder="Filter by Date Range"
                  clearable
                  value={
                    (getInputFilterValue("ship_schedule") as [
                      Date | null,
                      Date | null,
                    ]) || [null, null]
                  }
                  onChange={(value) => {
                    setInputFilterValue("ship_schedule", value as any);
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 24, sm: 8, md: 3 }}>
                <DatePickerInput
                  size="xs"
                  type="range"
                  allowSingleDateInRange
                  label="Created Date"
                  placeholder="Filter by Date Range"
                  clearable
                  value={
                    (getInputFilterValue("created_at") as [
                      Date | null,
                      Date | null,
                    ]) || [null, null]
                  }
                  onChange={(value) => {
                    setInputFilterValue("created_at", value as any);
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 24, sm: 8, md: 2 }}>
                <Switch
                  label="My Jobs"
                  size="sm"
                  thumbIcon={<FaCheckCircle size={8} />}
                  checked={!!getInputFilterValue("my_jobs")}
                  onChange={(e) => {
                    const val = e.currentTarget.checked
                      ? user?.username
                      : undefined;
                    setInputFilterValue("my_jobs", val);
                    const otherFilters = inputFilters.filter(
                      (f) => f.id !== "my_jobs",
                    );
                    const newActiveFilters = val
                      ? [...otherFilters, { id: "my_jobs", value: val }]
                      : otherFilters;

                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                    setActiveFilters(newActiveFilters);
                  }}
                  styles={{
                    root: {
                      display: "flex",
                      alignItems: "center",
                      paddingTop: "28px",
                    },
                    label: {
                      fontSize: 12,
                    },
                    track: {
                      cursor: "pointer",
                      background: getInputFilterValue("my_jobs")
                        ? linearGradients.primary
                        : undefined,
                    },
                    thumb: {
                      background: getInputFilterValue("my_jobs")
                        ? linearGradients.primary
                        : undefined,
                    },
                  }}
                />
              </Grid.Col>
            </Grid>

            <Group justify="flex-end" mt="sm">
              <Button
                variant="default"
                color="gray"
                size="xs"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
              <Button
                variant="filled"
                color="blue"
                size="xs"
                leftSection={<FaSearch size={12} />}
                onClick={handleSearch}
                style={{
                  background: linearGradients.primary,
                }}
              >
                Apply Filters
              </Button>
            </Group>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Group mb="2" align="center" style={{ width: "100%" }}>
        <Group wrap="wrap">
          {[
            {
              key: "ALL",
              label: "All Orders",
              color: "gray",
              count: stats?.ALL || 0,
            },
            {
              key: "QUOTE",
              label: "Quotes",
              color: "blue",
              count: stats?.QUOTE || 0,
            },
            {
              key: "SOLD",
              label: "Jobs",
              color: "green",
              count: stats?.SOLD || 0,
            },
          ].map((item) => {
            const isActive = currentStage === item.key;
            const gradients: Record<string, string> = {
              ALL: serviceStatusGradients.ALL,
              QUOTE: serviceStatusGradients.OPEN,
              SOLD: serviceStatusGradients.COMPLETED,
            };

            const gradientsLight: Record<string, string> = {
              ALL: serviceStatusGradientsLight.ALL,
              QUOTE: serviceStatusGradientsLight.OPEN,
              SOLD: serviceStatusGradientsLight.COMPLETED,
            };

            return (
              <Button
                key={item.key}
                variant={isActive ? "filled" : "light"}
                radius="xl"
                size="xs"
                onClick={() => setStageFilter(item.key)}
                style={{
                  cursor: "pointer",
                  minWidth: 120,
                  background: isActive
                    ? gradients[item.key]
                    : gradientsLight[item.key],
                  color: isActive ? "white" : "black",
                  border: "none",
                }}
                px={12}
              >
                <Group gap={6}>
                  <Text fw={600} size="xs">
                    {item.label}
                  </Text>

                  <Badge
                    autoContrast
                    variant="filled"
                    radius="xl"
                    size="xs"
                    style={{
                      cursor: "inherit",
                      background: "white",
                      color: "black",
                    }}
                  >
                    <Box
                      style={{
                        display: "inline-block",
                        minWidth: "3ch",
                        textAlign: "center",
                        opacity: statsLoading ? 0 : 1,
                        transform: statsLoading ? "scale(0.9)" : "scale(1)",
                        transition: "opacity 0.3s ease, transform 0.3s ease",
                      }}
                    >
                      {statsLoading ? "-" : item.count}
                    </Box>
                  </Badge>
                </Group>
              </Button>
            );
          })}
        </Group>

        <div style={{ flex: 1 }} />
      </Group>

      <ScrollArea
        style={{
          flex: 1,
          minHeight: 0,
          paddingLeft: rem(10),
          paddingRight: rem(10),
          paddingBottom: rem(2),
          paddingTop: rem(5),
        }}
        styles={{
          thumb: {
            background: linearGradients.primary,
          },
        }}
        type="hover"
      >
        <Table
          striped
          stickyHeader
          highlightOnHover
          withColumnBorders
          layout="fixed"
        >
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSorted = header.column.getIsSorted();
                  return (
                    <Table.Th
                      key={header.id}
                      colSpan={header.colSpan}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{
                        position: "relative",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        userSelect: "none",
                        width: header.getSize(),
                      }}
                    >
                      <Group gap="xs" wrap="nowrap">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {isSorted === "asc" && <FaSortUp size={12} />}
                        {isSorted === "desc" && <FaSortDown size={12} />}
                        {!isSorted && (
                          <FaSort size={12} style={{ opacity: 0.2 }} />
                        )}
                      </Group>
                    </Table.Th>
                  );
                })}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {table.getRowModel().rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Center py="xl">
                    <Text c="dimmed">
                      No orders found matching the filters.
                    </Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Table.Tr
                  key={row.id}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    window.open(
                      `/dashboard/sales/editsale/${row.original.id}`,
                      "_blank",
                    )
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <Table.Td
                      key={cell.id}
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      p="4"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      <Box
        style={{
          position: "fixed",
          bottom: 0,
          left: rem(250),
          right: 0,
          padding: "0.3rem 0",
          background: "white",
          borderTop: "1px solid #eee",
          zIndex: 100,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Pagination
          color={colors.violet.primary}
          withEdges
          total={table.getPageCount()}
          value={table.getState().pagination.pageIndex + 1}
          onChange={(page) => table.setPageIndex(page - 1)}
        />
      </Box>
      <JobDetailsDrawer
        jobId={drawerJobId}
        opened={drawerOpened}
        onClose={closeDrawer}
      />
    </Box>
  );
}
