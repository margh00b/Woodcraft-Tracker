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
  Tooltip,
  ActionIcon,
  Button,
  Badge,
  rem,
  Stack,
  ThemeIcon,
  Title,
  SimpleGrid,
  Anchor,
  Switch,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  FaPlus,
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaEye,
  FaHome,
  FaCheckCircle,
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

dayjs.extend(utc);
type SalesTableView = Views<"sales_table_view">;

export default function SalesTable() {
  const permission = usePermissions();
  const router = useRouter();
  const { supabase, isAuthenticated } = useSupabase();
  const { user } = useUser();

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

  const setInputFilterValue = (
    id: string,
    value: string | undefined | null | [Date | null, Date | null]
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

  const { data: stats } = useQuery({
    queryKey: ["sales_stats_global"],
    queryFn: async () => {
      const [allRes, quoteRes, soldRes] = await Promise.all([
        supabase
          .from("sales_orders")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("sales_orders")
          .select("*", { count: "exact", head: true })
          .eq("stage", "QUOTE"),
        supabase
          .from("sales_orders")
          .select("*", { count: "exact", head: true })
          .eq("stage", "SOLD"),
      ]);

      return {
        ALL: allRes.count || 0,
        QUOTE: quoteRes.count || 0,
        SOLD: soldRes.count || 0,
      };
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  const { data, isLoading, isError, error } = useSalesTable({
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
        size: 70,
        cell: (info) => {
          if (info.getValue()) {
            return (
              <Anchor
                component="button"
                size="sm"
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
                <Text fw={600}>{info.getValue()}</Text>
              </Anchor>
            );
          } else {
            return null;
          }
        },
      }),
      columnHelper.accessor("stage", {
        header: "Status",
        size: 80,
        cell: (info) => (
          <Badge
            style={{ cursor: "inherit" }}
            color={info.getValue() === "SOLD" ? "green" : "blue"}
            variant="light"
          >
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor("designer", {
        header: "Designer",
        size: 100,
      }),
      columnHelper.accessor("shipping_client_name", {
        id: "clientlastName",
        header: "Client Name",
        size: 150,
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
          size: 200,
          cell: (info) => (
            <Tooltip label={info.getValue()}>
              <Text size="sm" truncate>
                {info.getValue()}
              </Text>
            </Tooltip>
          ),
        }
      ),
      columnHelper.accessor("invoice_balance", {
        header: "Balance",
        size: 100,
        cell: (info) => `$${(info.getValue() as number)?.toFixed(2) || "0.00"}`,
      }),
      columnHelper.accessor("ship_schedule", {
        header: "Ship Date",
        size: 100,
        cell: (info) => {
          const date = info.getValue<string>();
          return date ? dayjs.utc(date).format("YYYY-MM-DD") : "(TBD)";
        },
      }),
      columnHelper.accessor("created_at", {
        header: "Created",
        size: 100,
        cell: (info) => {
          const date = info.getValue<string>();
          return date ? dayjs.utc(date).format("YYYY-MM-DD") : "—";
        },
      }),
    ],
    [router]
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
      style={{
        display: "flex",
        flexDirection: "column",
        padding: rem(20),
        height: "calc(100vh - 45px)",
      }}
    >
      <Group mb="md" justify="space-between">
        <Group>
          <ThemeIcon
            size={50}
            radius="md"
            variant="gradient"
            gradient={gradients.primary}
          >
            <FaHome size={26} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={2} style={{ color: colors.gray.title }}>
              Sales
            </Title>
            <Text size="sm" c="dimmed">
              Track sales
            </Text>
          </Stack>
        </Group>
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

      <Accordion variant="contained" radius="md" mb="md" w={"100%"}>
        <Accordion.Item value="search-filters">
          <Accordion.Control icon={<FaSearch size={16} />}>
            Search Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={4} mt="sm" spacing="xs">
              <TextInput
                label="Job Number"
                placeholder="e.g. 202401"
                value={(getInputFilterValue("job_number") as string) || ""}
                onChange={(e) =>
                  setInputFilterValue("job_number", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <TextInput
                label="Client Name"
                placeholder="Search Client..."
                value={(getInputFilterValue("clientlastName") as string) || ""}
                onChange={(e) =>
                  setInputFilterValue("clientlastName", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <TextInput
                label="Designer Name"
                placeholder="Search Designer..."
                value={(getInputFilterValue("designerName") as string) || ""}
                onChange={(e) =>
                  setInputFilterValue("designerName", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <TextInput
                label="Site Address"
                placeholder="Search Site Address..."
                value={(getInputFilterValue("site_address") as string) || ""}
                onChange={(e) =>
                  setInputFilterValue("site_address", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <DatePickerInput
                type="range"
                allowSingleDateInRange
                label="Ship Date"
                placeholder="Filter by Date Range"
                clearable
                value={
                  (getInputFilterValue("ship_schedule") as [
                    Date | null,
                    Date | null
                  ]) || [null, null]
                }
                onChange={(value) => {
                  setInputFilterValue("ship_schedule", value as any);
                }}
              />
              <DatePickerInput
                type="range"
                allowSingleDateInRange
                label="Created Date"
                placeholder="Filter by Date Range"
                clearable
                value={
                  (getInputFilterValue("created_at") as [
                    Date | null,
                    Date | null
                  ]) || [null, null]
                }
                onChange={(value) => {
                  setInputFilterValue("created_at", value as any);
                }}
              />
              <Switch
                label="My Jobs"
                size="md"
                thumbIcon={<FaCheckCircle size={8} />}
                checked={!!getInputFilterValue("my_jobs")}
                onChange={(e) => {
                  const val = e.currentTarget.checked
                    ? user?.username
                    : undefined;
                  setInputFilterValue("my_jobs", val);
                  const otherFilters = inputFilters.filter(
                    (f) => f.id !== "my_jobs"
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
                    alignItems: "flex-end",
                    paddingBottom: "6px",
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
            </SimpleGrid>

            <Group justify="flex-end">
              <Button variant="default" color="gray" onClick={clearFilters}>
                Clear Filters
              </Button>
              <Button
                variant="filled"
                color="blue"
                leftSection={<FaSearch size={14} />}
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

      <Group mb="md" align="center" style={{ width: "100%" }}>
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
                size="sm"
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
                  <Text fw={600} size="sm">
                    {item.label}
                  </Text>

                  <Badge
                    autoContrast
                    variant="filled"
                    radius="xl"
                    size="sm"
                    style={{
                      cursor: "inherit",
                      background: "white",
                      color: "black",
                    }}
                  >
                    {item.count}
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
          padding: rem(10),
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
                        width: header.getSize(),
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        userSelect: "none",
                      }}
                    >
                      <Group gap="xs" wrap="nowrap">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
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
                    router.push(`/dashboard/sales/editsale/${row.original.id}`)
                  }
                >
                  {row.getVisibleCells().map((cell) => (
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
                        cell.getContext()
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
          padding: "1rem 0",
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
