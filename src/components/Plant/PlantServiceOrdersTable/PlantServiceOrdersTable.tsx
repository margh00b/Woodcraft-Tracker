"use client";

import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
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
  Accordion,
  SimpleGrid,
  Tooltip,
  Stack,
  Title,
  ThemeIcon,
  Button,
  Grid,
  Paper,
  Select,
  Divider,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  FaSearch,
  FaTools,
  FaCalendarCheck,
  FaCheck,
  FaClipboardList,
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import { usePlantServiceOrders } from "@/hooks/usePlantServiceOrders";
import { Database } from "@/types/supabase";
import { serviceorderLocationOptions } from "@/dropdowns/dropdownOptions";
import { linearGradients, gradients } from "@/theme";
import ServiceOrderPdfPreviewModal from "./ServiceOrderPdfPreviewModal";

type PlantServiceOrderView =
  Database["public"]["Views"]["plant_service_orders_view"]["Row"];

export default function PlantServiceOrdersTable() {
  const { supabase, isAuthenticated } = useSupabase();
  const queryClient = useQueryClient();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "due_date", desc: false },
  ]);
  const [inputFilters, setInputFilters] = useState<ColumnFiltersState>([]);
  const [activeFilters, setActiveFilters] = useState<ColumnFiltersState>([]);
  const [partDateRange, setPartDateRange] = useState<
    [Date | null, Date | null]
  >([null, null]);

  const [openDates, setOpenDates] = useState<string[]>([]);

  const [openOrders, setOpenOrders] = useState<string[]>([]);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const { data, isLoading, isError, error } = usePlantServiceOrders({
    pagination,
    columnFilters: activeFilters,
    sorting,
  });

  const tableData = (data?.data as unknown as PlantServiceOrderView[]) || [];
  const totalCount = data?.count || 0;

  useEffect(() => {
    if (tableData.length > 0) {
      const allOrderIds = tableData
        .map((row) => row.service_order_id?.toString())
        .filter(Boolean) as string[];
      setOpenOrders(allOrderIds);
    }
  }, [tableData]);

  const updatePartStatusMutation = useMutation({
    mutationFn: async ({
      partId,
      status,
    }: {
      partId: number;
      status: "completed" | "pending";
    }) => {
      const { error } = await supabase
        .from("service_order_parts")
        .update({ status })
        .eq("id", partId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plant_service_orders"] });
      notifications.show({
        title: "Success",
        message: "Part marked as completed",
        color: "green",
        icon: <FaCheck />,
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

  const updatePartLocationMutation = useMutation({
    mutationFn: async ({
      partId,
      location,
    }: {
      partId: number;
      location: string;
    }) => {
      const { error } = await supabase
        .from("service_order_parts")
        .update({ location })
        .eq("id", partId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plant_service_orders"] });
      notifications.show({
        title: "Location Updated",
        message: "Part location saved",
        color: "violet",
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

    filters = filters.filter((f) => f.id !== "part_due_date_range");

    if (partDateRange[0] && partDateRange[1]) {
      filters.push({ id: "part_due_date_range", value: partDateRange });
    }
    setActiveFilters(filters);
  };

  const handleClearFilters = () => {
    setInputFilters([]);
    setActiveFilters([]);
    setPartDateRange([null, null]);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const table = useReactTable({
    data: tableData,
    columns: [],
    pageCount: Math.ceil(totalCount / pagination.pageSize),
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
    const groups: Record<string, Row<PlantServiceOrderView>[]> = {};

    table.getRowModel().rows.forEach((row) => {
      const so = row.original;
      const parts = (so.pending_parts as any[]) || [];
      const distinctDates = new Set<string>();

      if (parts.length > 0) {
        parts.forEach((part) => {
          if (!part.part_due_date) return;
          const d = dayjs(part.part_due_date).format("YYYY-MM-DD");

          if (partDateRange[0] && partDateRange[1]) {
            const pDate = dayjs(part.part_due_date);
            const start = dayjs(partDateRange[0]).startOf("day");
            const end = dayjs(partDateRange[1]).endOf("day");
            if (pDate.isBefore(start) || pDate.isAfter(end)) {
              return;
            }
          }

          distinctDates.add(d);
        });
      }

      distinctDates.forEach((dateKey) => {
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(row);
      });
    });

    return groups;
  }, [table.getRowModel().rows, partDateRange]);

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
        <Loader color="violet" />
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
      {}
      <Group mb="md" justify="space-between">
        <Group>
          <ThemeIcon
            size={50}
            radius="md"
            variant="gradient"
            gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
          >
            <FaTools size={26} />
          </ThemeIcon>
          <Stack gap={4}>
            <Title order={2} style={{ color: "#343a40" }}>
              Plant Service Orders
            </Title>
            {partDateRange[0] && partDateRange[1] && (
              <Badge
                variant="light"
                color="blue"
                size="lg"
                leftSection={<FaCalendarCheck size={12} />}
              >
                Part Due: {dayjs(partDateRange[0]).format("MMM D")} -{" "}
                {dayjs(partDateRange[1]).format("MMM D, YYYY")}
              </Badge>
            )}
          </Stack>
        </Group>
        <Button
          leftSection={<FaClipboardList size={20} />}
          variant="gradient"
          gradient={gradients.primary}
          onClick={() => setPdfModalOpen(true)}
        >
          Print Preview
        </Button>
      </Group>

      {}
      <Accordion variant="contained" radius="md" mb="md">
        <Accordion.Item value="filters">
          <Accordion.Control icon={<FaSearch size={16} />}>
            Filters
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
              <TextInput
                label="Service Order Number"
                placeholder="Search..."
                value={getInputFilterValue("service_order_number")}
                onChange={(e) =>
                  setInputFilterValue("service_order_number", e.target.value)
                }
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
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
                label="Address"
                placeholder="Search..."
                value={getInputFilterValue("address")}
                onChange={(e) => setInputFilterValue("address", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              <DatePickerInput
                type="range"
                allowSingleDateInRange
                label="Part Due Date Range"
                placeholder="Pick dates range"
                value={partDateRange}
                onChange={(val) =>
                  setPartDateRange(val as [Date | null, Date | null])
                }
                clearable
                leftSection={<FaCalendarCheck size={14} />}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
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

      {}
      <ScrollArea
        style={{ flex: 1 }}
        type="auto"
        styles={{ scrollbar: { zIndex: 99 } }}
      >
        {table.getRowModel().rows.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed">No pending service orders found.</Text>
          </Center>
        ) : (
          <Box style={{ width: "max-content", minWidth: "100%" }}>
            <Accordion
              multiple
              variant="contained"
              value={openDates}
              onChange={setOpenDates}
              styles={{
                item: {
                  marginBottom: 30,
                  border: "1px solid #d3d3d3ff",
                  borderRadius: "2px",
                },
                control: { backgroundColor: "#f8f9fa" },
                content: { padding: 0 },
              }}
            >
              {sortedGroupKeys.map((dateKey) => {
                const ordersInGroup = groupedRows[dateKey];
                const isPastDue =
                  dateKey !== "No Date" &&
                  dayjs(dateKey).isBefore(dayjs(), "day");

                const uniqueOrderCount = ordersInGroup.length;

                return (
                  <Accordion.Item
                    key={dateKey}
                    value={dateKey}
                    style={{ boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}
                  >
                    <Accordion.Control>
                      <Group gap="md">
                        <FaCalendarCheck size={16} />
                        <Text fw={700} size="md">
                          Part Due Date:{" "}
                          <span
                            style={{ color: isPastDue ? "red" : "#4A00E0" }}
                          >
                            {dateKey === "No Date"
                              ? "Unscheduled"
                              : dayjs(dateKey).format("MMM D, YYYY")}
                          </span>
                        </Text>
                        <Badge variant="light" color="black">
                          {uniqueOrderCount > 1
                            ? `${uniqueOrderCount} Service Orders`
                            : `${uniqueOrderCount} Service Order`}
                        </Badge>
                        {isPastDue && (
                          <Badge color="red" variant="filled">
                            Past Due
                          </Badge>
                        )}
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="md" p="md" bg="gray.0">
                        {ordersInGroup.map((row) => {
                          const so = row.original;
                          const displayParts = (
                            so.pending_parts as any[]
                          )?.filter((part) => {
                            if (!part.part_due_date) return false;
                            const pDate = dayjs(part.part_due_date).format(
                              "YYYY-MM-DD",
                            );
                            return pDate === dateKey;
                          });

                          if (!displayParts || displayParts.length === 0)
                            return null;

                          return (
                            <Paper
                              key={`${so.service_order_id}-${dateKey}`}
                              radius="md"
                            >
                              <Box bg={linearGradients.serviceparts} p="sm">
                                <Grid align="center" gutter="sm">
                                  <Grid.Col span={1}>
                                    <Text size="xs" tt="uppercase" fw={700}>
                                      S.O. #
                                    </Text>
                                    <Text size="sm" fw={600}>
                                      {so.service_order_number}
                                    </Text>
                                  </Grid.Col>
                                  <Grid.Col span={2}>
                                    <Text size="xs" tt="uppercase" fw={700}>
                                      Job #
                                    </Text>
                                    <Text size="sm" fw={600}>
                                      {so.job_number}
                                    </Text>
                                  </Grid.Col>
                                  <Grid.Col span={3}>
                                    <Text size="xs" tt="uppercase" fw={700}>
                                      Client
                                    </Text>
                                    <Text size="sm" fw={500} truncate>
                                      {so.client_name}
                                    </Text>
                                  </Grid.Col>
                                  <Grid.Col span={4}>
                                    <Text size="xs" tt="uppercase" fw={700}>
                                      Location
                                    </Text>
                                    <Text size="sm" truncate>
                                      {[
                                        row.original.shipping_street,
                                        row.original.shipping_city,
                                        row.original.shipping_province,
                                        row.original.shipping_zip,
                                      ]
                                        .filter(Boolean)
                                        .join(", ")}
                                    </Text>
                                  </Grid.Col>
                                  <Grid.Col span={2}>
                                    <Group justify="flex-end">
                                      <Badge
                                        color="violet"
                                        variant="filled"
                                        size="sm"
                                      >
                                        {displayParts.length} Pending
                                      </Badge>
                                    </Group>
                                  </Grid.Col>
                                </Grid>
                              </Box>
                              <Box>
                                <Table withTableBorder highlightOnHover>
                                  <Table.Thead bg="gray.0">
                                    <Table.Tr>
                                      <Table.Th
                                        w={70}
                                        fz="xs"
                                        tt="uppercase"
                                        fw={600}
                                      >
                                        Qty
                                      </Table.Th>
                                      <Table.Th
                                        w={370}
                                        fz="xs"
                                        tt="uppercase"
                                        fw={600}
                                      >
                                        Part Name
                                      </Table.Th>
                                      <Table.Th fz="xs" tt="uppercase" fw={600}>
                                        Description
                                      </Table.Th>
                                      <Table.Th
                                        w={180}
                                        fz="xs"
                                        tt="uppercase"
                                        fw={600}
                                      >
                                        Location
                                      </Table.Th>
                                      <Table.Th
                                        w={140}
                                        fz="xs"
                                        tt="uppercase"
                                        fw={600}
                                        style={{ textAlign: "right" }}
                                      >
                                        Action
                                      </Table.Th>
                                    </Table.Tr>
                                  </Table.Thead>
                                  <Table.Tbody>
                                    {displayParts.map((part: any) => (
                                      <Table.Tr key={part.id}>
                                        <Table.Td fw={600}>{part.qty}</Table.Td>
                                        <Table.Td>{part.part}</Table.Td>
                                        <Table.Td>{part.description}</Table.Td>
                                        <Table.Td>
                                          <Select
                                            size="xs"
                                            data={serviceorderLocationOptions}
                                            defaultValue={part.location}
                                            placeholder="Select..."
                                            onChange={(val) => {
                                              if (
                                                val &&
                                                val !== part.location
                                              ) {
                                                updatePartLocationMutation.mutate(
                                                  {
                                                    partId: part.id,
                                                    location: val,
                                                  },
                                                );
                                              }
                                            }}
                                          />
                                        </Table.Td>
                                        <Table.Td
                                          style={{ textAlign: "right" }}
                                        >
                                          <Button
                                            size="xs"
                                            variant="gradient"
                                            gradient={gradients.success}
                                            leftSection={<FaCheck size={12} />}
                                            loading={
                                              updatePartStatusMutation.isPending &&
                                              updatePartStatusMutation.variables
                                                ?.partId === part.id
                                            }
                                            onClick={() =>
                                              updatePartStatusMutation.mutate({
                                                partId: part.id,
                                                status: "completed",
                                              })
                                            }
                                          >
                                            Complete
                                          </Button>
                                        </Table.Td>
                                      </Table.Tr>
                                    ))}
                                  </Table.Tbody>
                                </Table>
                              </Box>
                            </Paper>
                          );
                        })}
                      </Stack>
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
      <ServiceOrderPdfPreviewModal
        opened={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        columnFilters={activeFilters}
        sorting={sorting}
        dateRange={partDateRange}
      />
    </Box>
  );
}
