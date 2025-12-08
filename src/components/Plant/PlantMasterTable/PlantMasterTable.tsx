"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
  Button,
  rem,
  Badge,
  Stack,
  ThemeIcon,
  Title,
  SimpleGrid,
  Anchor,
} from "@mantine/core";
import {
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaIndustry,
  FaTools,
  FaBoxOpen,
} from "react-icons/fa";
import dayjs from "dayjs";
import { DateInput } from "@mantine/dates";
import { usePlantMasterTable } from "@/hooks/usePlantMasterTable";
import { useSupabase } from "@/hooks/useSupabase";
import { useDisclosure } from "@mantine/hooks";
import JobDetailsDrawer from "@/components/Shared/JobDetailsDrawer/JobDetailsDrawer";

// Define the shape based on our View
type PlantMasterRow = {
  record_type: "JOB" | "SERVICE";
  id: number;
  display_id: string;
  client_name: string;
  due_date: string | null;
  description: string;
  created_at: string;
};

export default function PlantMasterTable() {
  const router = useRouter();
  const { supabase, isAuthenticated } = useSupabase();

  // --- Table State ---
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [inputFilters, setInputFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([]);

  // Track current pill selection for UI styling
  const [currentType, setCurrentType] = useState<"ALL" | "JOB" | "SERVICE">(
    "ALL"
  );
  const [drawerJobId, setDrawerJobId] = useState<number | null>(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);

  const handleJobClick = (id: number) => {
    setDrawerJobId(id);
    openDrawer();
  };
  // --- 1. Stats Query (Counts for Pills) ---
  const { data: stats } = useQuery({
    queryKey: ["plant_master_stats"],
    queryFn: async () => {
      // Run counts in parallel
      const [allRes, jobRes, svcRes] = await Promise.all([
        supabase
          .from("plant_master_view" as any)
          .select("*", { count: "exact", head: true }),
        supabase
          .from("plant_master_view" as any)
          .select("*", { count: "exact", head: true })
          .eq("record_type", "JOB"),
        supabase
          .from("plant_master_view" as any)
          .select("*", { count: "exact", head: true })
          .eq("record_type", "SERVICE"),
      ]);

      return {
        ALL: allRes.count || 0,
        JOB: jobRes.count || 0,
        SERVICE: svcRes.count || 0,
      };
    },
    enabled: isAuthenticated,
    // Keep stats fresh but don't refetch constantly
    staleTime: 1000 * 60 * 2,
  });

  // --- Helpers ---
  const setInputFilterValue = (id: string, value: string | null) => {
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
    setActiveFilters(inputFilters);
  };

  const handleClearFilters = () => {
    setInputFilters([]);
    setActiveFilters([]);
    // Reset pill to ALL as well? Optional. Usually separate.
    // setCurrentType("ALL");
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // --- Pill Handler ---
  const handleTypeChange = (type: "ALL" | "JOB" | "SERVICE") => {
    setCurrentType(type);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));

    // Update the active filters passed to the hook
    setActiveFilters((prev) => {
      const others = prev.filter((f) => f.id !== "record_type");
      if (type === "ALL") return others;
      return [...others, { id: "record_type", value: type }];
    });
  };

  // --- Data Fetching ---
  const { data, isLoading, isError, error } = usePlantMasterTable({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });

  const tableData = (data?.data as PlantMasterRow[]) || [];
  const totalCount = data?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  // --- Columns ---
  const columnHelper = createColumnHelper<PlantMasterRow>();

  const columns = [
    columnHelper.accessor("record_type", {
      header: "Type",
      size: 100,
      cell: (info) => {
        const type = info.getValue();
        return (
          <Badge
            variant="light"
            color={type === "JOB" ? "blue" : "orange"}
            leftSection={
              type === "JOB" ? <FaBoxOpen size={10} /> : <FaTools size={10} />
            }
          >
            {type === "JOB" ? "JOB" : "SVC"}
          </Badge>
        );
      },
    }),
    columnHelper.accessor("display_id", {
      header: "Ref #",
      size: 120,
      cell: (info) => {
        return info.row.original.record_type === "JOB" ? (
          <Anchor
            component="button"
            size="sm"
            fw={600}
            w="100%"
            style={{ textAlign: "left" }}
            c="#6f00ffff"
            onClick={(e) => {
              e.stopPropagation();
              const jobId = info.row.original.id;
              if (jobId) handleJobClick(jobId);
            }}
          >
            <Text fw={600}>{info.getValue()}</Text>
          </Anchor>
        ) : (
          <Text fw={700} size="sm">
            {info.getValue()}
          </Text>
        );
      },
    }),
    columnHelper.accessor("client_name", {
      header: "Client",
      size: 150,
      cell: (info) => (
        <Text size="sm" lineClamp={1}>
          {info.getValue() || "—"}
        </Text>
      ),
    }),
    columnHelper.accessor("description", {
      header: "Description / Specs",
      size: 300,
      cell: (info) => {
        const rawValue = info.getValue();
        // Strip HTML tags if any (reuse the fix from earlier)
        const cleanText = rawValue
          ? String(rawValue).replace(/<[^>]+>/g, " ")
          : "—";

        return (
          <Tooltip label={cleanText} multiline w={250}>
            <Text size="sm" c="dimmed" lineClamp={1}>
              {cleanText}
            </Text>
          </Tooltip>
        );
      },
    }),
    columnHelper.accessor("due_date", {
      header: "Due Date",
      size: 130,
      cell: (info) => {
        const date = info.getValue();
        if (!date)
          return (
            <Text c="dimmed" size="sm">
              TBD
            </Text>
          );
        const isPast = dayjs(date).isBefore(dayjs(), "day");
        return (
          <Text size="sm" fw={isPast ? 700 : 400} c={isPast ? "red" : "dark"}>
            {dayjs(date).format("MMM D, YYYY")}
          </Text>
        );
      },
    }),
  ];

  // --- Table Instance ---
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

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center h={400}>
        <Text c="red">Error: {(error as Error).message}</Text>
      </Center>
    );
  }

  return (
    <Box
      p={rem(20)}
      h="calc(100vh - 45px)"
      display="flex"
      style={{ flexDirection: "column" }}
    >
      {/* HEADER */}
      <Group mb="md">
        <ThemeIcon
          size={50}
          radius="md"
          variant="gradient"
          gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
        >
          <FaIndustry size={26} />
        </ThemeIcon>
        <Stack gap={0}>
          <Title order={2} style={{ color: "#343a40" }}>
            Plant Master Schedule
          </Title>
          <Text size="sm" c="dimmed">
            Unified view of Production Jobs and Service Orders
          </Text>
        </Stack>
      </Group>

      {/* FILTERS ACCORDION */}
      <Accordion variant="contained" radius="md" mb="md">
        <Accordion.Item value="filters">
          <Accordion.Control icon={<FaSearch size={16} />}>
            Search Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <TextInput
                label="Reference #"
                placeholder="Job or SO #"
                value={getInputFilterValue("display_id")}
                onChange={(e) =>
                  setInputFilterValue("display_id", e.target.value)
                }
              />
              <TextInput
                label="Client"
                placeholder="Search Client..."
                value={getInputFilterValue("client_name")}
                onChange={(e) =>
                  setInputFilterValue("client_name", e.target.value)
                }
              />
              <DateInput
                label="Due Date"
                placeholder="Exact Date Match"
                clearable
                value={
                  getInputFilterValue("due_date")
                    ? dayjs(getInputFilterValue("due_date")).toDate()
                    : null
                }
                onChange={(date) => {
                  const val = date ? dayjs(date).format("YYYY-MM-DD") : null;
                  setInputFilterValue("due_date", val);
                }}
              />
            </SimpleGrid>
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleClearFilters}>
                Clear Filters
              </Button>
              <Button
                variant="filled"
                color="blue"
                leftSection={<FaSearch size={14} />}
                onClick={handleApplyFilters}
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

      {/* STATUS PILLS */}
      <Group mb="md" align="center">
        {[
          { key: "ALL", label: "All Records", count: stats?.ALL || 0 },
          { key: "JOB", label: "Jobs", count: stats?.JOB || 0 },
          {
            key: "SERVICE",
            label: "Service Orders",
            count: stats?.SERVICE || 0,
          },
        ].map((item) => {
          const isActive = currentType === item.key;

          // Custom Gradients for Active State
          const gradients: Record<string, string> = {
            ALL: "linear-gradient(135deg, #6c63ff 0%, #4a00e0 100%)",
            JOB: "linear-gradient(135deg, #4da0ff 0%, #0066cc 100%)",
            SERVICE: "linear-gradient(135deg, #FF9966 0%, #FF5E62 100%)",
          };

          const gradientsLight: Record<string, string> = {
            ALL: "linear-gradient(135deg, #e4d9ff 0%, #d7caff 100%)",
            JOB: "linear-gradient(135deg, #d7e9ff 0%, #c2ddff 100%)",
            SERVICE: "linear-gradient(135deg, #ffe0d1 0%, #ffcbd1 100%)",
          };

          return (
            <Button
              key={item.key}
              radius="xl"
              size="sm"
              onClick={() =>
                handleTypeChange(item.key as "ALL" | "JOB" | "SERVICE")
              }
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

      {/* TABLE */}
      <ScrollArea style={{ flex: 1 }} type="hover">
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
                {headerGroup.headers.map((header) => (
                  <Table.Th
                    key={header.id}
                    style={{ width: header.getSize(), cursor: "pointer" }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <Group gap={4}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "asc" && <FaSortUp />}
                      {header.column.getIsSorted() === "desc" && <FaSortDown />}
                      {!header.column.getIsSorted() && (
                        <FaSort style={{ opacity: 0.2 }} />
                      )}
                    </Group>
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {table.getRowModel().rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Center py="xl">
                    <Text c="dimmed">No records found matching filters.</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Table.Tr
                  key={`${row.original.record_type}-${row.original.id}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    // Smart Routing
                    if (row.original.record_type === "JOB") {
                      // Jobs route to production schedule
                      router.push(`/dashboard/installation/${row.original.id}`);
                    } else {
                      // Service orders route to their detail page
                      router.push(
                        `/dashboard/serviceorders/${row.original.id}`
                      );
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <Table.Td
                      key={cell.id}
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
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

      {/* PAGINATION */}
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
      <JobDetailsDrawer
        jobId={drawerJobId}
        opened={drawerOpened}
        onClose={closeDrawer}
      />
    </Box>
  );
}
