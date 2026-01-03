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
  ActionIcon,
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
} from "react-icons/fa";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import { usePlantShippingTable } from "@/hooks/usePlantShippingTable";
import { Views } from "@/types/db";
import { useDisclosure } from "@mantine/hooks";
import ShippingPdfPreviewModal from "./ShippingPdfPreviewModal";
import JobDetailsDrawer from "@/components/Shared/JobDetailsDrawer/JobDetailsDrawer";
import { usePermissions } from "@/hooks/usePermissions";
import BackorderManagerCell from "./BackorderManagerCell";
import AddBackorderModal from "@/components/Installation/AddBOModal/AddBOModal";

type PlantTableView = Views<"plant_table_view">;

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
  const [drawerJobId, setDrawerJobId] = useState<number | null>(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);

  const handleJobClick = (id: number) => {
    setDrawerJobId(id);
    openDrawer();
  };
  const [pdfOpened, { open: openPdf, close: closePdf }] = useDisclosure(false);
  const [openItem, setOpenItem] = useState<string | null>(null);

  const [backorderModalState, setBackorderModalState] = useState<{
    opened: boolean;
    jobId: string;
    jobNumber: string;
  }>({
    opened: false,
    jobId: "",
    jobNumber: "",
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plant_shipping_table"] });
      notifications.show({
        title: "Updated",
        message: "Installation status updated",
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

  const updateShippingMutation = useMutation({
    mutationFn: async ({
      jobId,
      installId,
      prodId,
      type,
    }: {
      jobId: number;
      installId: number;
      prodId: number | null;
      type: "full" | "partial" | "none";
    }) => {
      const timestamp = new Date().toISOString();
      const updates: any = {};
      let prodUpdates: any = {};

      if (type === "full") {
        updates.has_shipped = true;
        updates.partially_shipped = false;
        updates.wrap_completed = timestamp;


        if (prodId) {
          const autoCompleteFields = [
            "doors_completed_actual",
            "cut_finish_completed_actual",
            "custom_finish_completed_actual",
            "drawer_completed_actual",
            "cut_melamine_completed_actual",
            "paint_completed_actual",
            "assembly_completed_actual",
          ];
          autoCompleteFields.forEach(f => prodUpdates[f] = timestamp);
        }

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

      if (type === "full" && prodId && Object.keys(prodUpdates).length > 0) {
        const { error: prodError } = await supabase
          .from("production_schedule")
          .update(prodUpdates)
          .eq("prod_id", prodId);
        if (prodError) throw prodError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["plant_shipping_table"] });
      notifications.show({
        title: "Updated",
        message: "Shipping status updated",
        color: "green",
      });

      if (variables.type === 'partial') {

        const job = (data?.data as PlantTableData[])?.find(j => j.job_id === variables.jobId);
        if (job) {
          setBackorderModalState({
            opened: true,
            jobId: String(variables.jobId),
            jobNumber: job.job_number || ""
          });
        }
      }
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
      filters = filters.filter((f) => f.id !== "ship_date_range");
      filters.push({ id: "ship_date_range", value: dateRange });
    }
    setActiveFilters(filters);
  };

  const handleClearFilters = () => {
    setInputFilters([]);
    setActiveFilters([]);
    setDateRange([null, null]);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handlePrintPreview = () => {
    const hasActiveDateFilter = activeFilters.some(
      (f) => f.id === "ship_date_range"
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
    columnHelper.accessor("placement_date", {
      header: "Placement",
      size: 90,
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
    columnHelper.accessor(
      (row) => (row as PlantTableData).ship_status,
      {
        id: "ship_status",
        header: "Date Status",
        size: 90,
        cell: (info) => {
          const status = info.getValue() || "unprocessed";
          const colors: Record<string, string> = {
            unprocessed: "gray",
            tentative: "orange",
            confirmed: "green",
          };

          const shortText: Record<string, string> = {
            unprocessed: "Unproc.",
            tentative: "Tent.",
            confirmed: "Conf."
          };

          return (
            <Badge
              color={colors[status]}
              variant={status === "unprocessed" ? "light" : "filled"}
              size="xs"
              w="100%"
            >
              {shortText[status] || status}
            </Badge>
          );
        },
      }
    ),
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
        const city = info.row.original.shipping_city;
        const prov = info.row.original.shipping_province;
        return (
          <Tooltip label={info.row.original.shipping_street}>
            <Text size="sm" truncate>
              {[city, prov].filter(Boolean).join(", ")}
            </Text>
          </Tooltip>
        );
      },
    }),
    columnHelper.accessor("cabinet_box", { header: "Box", size: 60 }),
    columnHelper.accessor("wrap_completed", {
      header: "Wrapped",
      size: 130,
      cell: (info) => {
        const completed = info.getValue();
        if (completed) {
          return (
            <Center>
              <Badge
                variant="light"
                color="green"
                size="sm"
                leftSection={<FaCheck size={10} />}
                pl={8}
                pr={8}
              >
                {dayjs(completed).format("MMM D, YYYY")}
              </Badge>
            </Center>
          )
        }
        return (
          <Center>
            <FaTimes size={14} color="red" />
          </Center>
        )
      }
    }),
    columnHelper.accessor("has_shipped", {
      header: "Shipped",
      size: 110,
      cell: (info) => {
        const isShipped = !!info.getValue();
        const partially = info.row.original.partially_shipped;
        const job = info.row.original;


        let trigger = (
          <Button size="xs" variant="light" color="blue" fullWidth rightSection={<FaTruck size={12} />}>
            Mark Shipped
          </Button>
        );

        if (isShipped) {
          trigger = (
            <Badge color="green" variant="light" fullWidth leftSection={<FaCheck size={10} />} style={{ cursor: 'pointer' }}>
              Shipped
            </Badge>
          );
        } else if (partially) {
          trigger = (
            <Badge color="orange" variant="light" fullWidth leftSection={<FaTruck size={10} />} style={{ cursor: 'pointer' }}>
              Partial
            </Badge>
          );
        }

        return (
          <Center onClick={(e) => e.stopPropagation()}>
            <Menu shadow="md" width={150} position="bottom-end">
              <Menu.Target>
                {trigger}
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Update Status</Menu.Label>
                <Menu.Item
                  leftSection={<FaCheck size={14} />}
                  onClick={() => job.job_id && job.installation_id && updateShippingMutation.mutate({
                    jobId: job.job_id,
                    installId: job.installation_id,
                    prodId: job.prod_id,
                    type: 'full'
                  })}
                >
                  Full Shipment
                </Menu.Item>
                <Menu.Item
                  leftSection={<FaTruck size={14} />}
                  onClick={() => job.job_id && job.installation_id && updateShippingMutation.mutate({
                    jobId: job.job_id,
                    installId: job.installation_id,
                    prodId: job.prod_id,
                    type: 'partial'
                  })}
                >
                  Partial Shipment
                </Menu.Item>
                {(isShipped || partially) && (
                  <>
                    <Menu.Divider />
                    <Menu.Item
                      leftSection={<FaTimes size={14} />}
                      color="red"
                      onClick={() => job.job_id && job.installation_id && updateShippingMutation.mutate({
                        jobId: job.job_id,
                        installId: job.installation_id,
                        prodId: job.prod_id,
                        type: 'none'
                      })}
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
    columnHelper.accessor(
      (row) => (row as PlantTableData).in_warehouse,
      {
        id: "in_warehouse",
        header: "Warehouse",
        size: 90,
        cell: (info) => {
          const value = info.getValue();
          return (
            <Tooltip label={value ? dayjs(value).format("MMM D, YYYY h:mm A") : "Not in warehouse"}>
              <Center onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={!!value}
                  color="violet"
                  size="xs"
                  onChange={(e) =>
                    info.row.original.installation_id &&
                    updateInstallationMutation.mutate({
                      installationId: info.row.original.installation_id,
                      field: "in_warehouse",
                      value: e.currentTarget.checked ? new Date().toISOString() : null,
                    })
                  }
                />
              </Center>
            </Tooltip>
          );
        },
      }
    ),
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
    return table.getRowModel().rows.reduce((acc, row) => {
      const job = row.original;
      const shipDate = job.ship_schedule
        ? dayjs(job.ship_schedule).format("YYYY-MM-DD")
        : "Unscheduled";
      if (!acc[shipDate]) acc[shipDate] = [];
      acc[shipDate].push(row);
      return acc;
    }, {} as Record<string, Row<PlantTableData>[]>);
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
      p={20}
      h="calc(100vh - 45px)"
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
          <Stack gap={0}>
            <Title order={2} style={{ color: "#343a40" }}>
              Plant Shipping Schedule
            </Title>
            <Text size="sm" c="dimmed">
              Manage outgoing shipments
            </Text>
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
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
              <TextInput
                label="Job Number"
                placeholder="Search..."
                value={getInputFilterValue("job_number")}
                onChange={(e) =>
                  setInputFilterValue("job_number", e.target.value)
                }
              />
              <TextInput
                label="Client Name"
                placeholder="Search..."
                value={getInputFilterValue("client")}
                onChange={(e) => setInputFilterValue("client", e.target.value)}
              />
              <TextInput
                label="Address"
                placeholder="Street, City..."
                value={getInputFilterValue("address")}
                onChange={(e) => setInputFilterValue("address", e.target.value)}
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
              value={openItem}
              onChange={setOpenItem}
              style={{ minWidth: "1600px" }}
              styles={{
                item: { marginBottom: 10, border: "1px solid #e0e0e0" },
                control: { backgroundColor: "#f8f9fa" },
                content: { padding: 0 },
              }}
            >
              {sortedGroupKeys.map((shipDate) => {
                const jobsInGroup = groupedRows[shipDate];
                const isOpen = openItem === shipDate;
                const isPastDue =
                  shipDate !== "Unscheduled" &&
                  dayjs(shipDate).isBefore(dayjs(), "day");

                const uniqueJobCount = new Set(
                  jobsInGroup.map((r) => {
                    const val = r.original.job_number || "";
                    return val.split("-")[0].trim();
                  })
                ).size;

                const totalBoxes = jobsInGroup.reduce((sum, row) => {
                  const parsed = parseInt(row.original.cabinet_box || "0", 10);
                  return isNaN(parsed) ? sum : sum + parsed;
                }, 0);

                return (
                  <Accordion.Item key={shipDate} value={shipDate}>
                    <Accordion.Control>
                      <Group gap="md">
                        <FaTruckLoading size={16} />
                        <Text fw={700} size="md">
                          Ship Date:{" "}
                          <span style={{ color: isPastDue ? "red" : "#4A00E0" }}>
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
                                      header.getContext()
                                    )}
                                  </Table.Th>
                                ))}
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {jobsInGroup.map((row) => {
                              const isShipped = !!row.original.has_shipped;
                              return (
                                <Table.Tr
                                  key={row.id}
                                  style={{
                                    opacity: isShipped ? 0.3 : 1,
                                    backgroundColor: isShipped
                                      ? "#f8f9fa"
                                      : undefined,
                                  }}
                                >
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
                                          cell.getContext()
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
        onClose={() => setBackorderModalState((prev) => ({ ...prev, opened: false }))}
        jobId={backorderModalState.jobId}
        jobNumber={backorderModalState.jobNumber}
        onSuccess={() => {

        }}
      />
      <JobDetailsDrawer
        jobId={drawerJobId}
        opened={drawerOpened}
        onClose={closeDrawer}
      />
    </Box >
  );
}
