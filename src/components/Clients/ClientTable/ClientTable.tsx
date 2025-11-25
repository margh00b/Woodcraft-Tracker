"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
  PaginationState,
  getPaginationRowModel,
  ColumnFiltersState,
  getFacetedRowModel,
  getFacetedUniqueValues,
  FilterFn,
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
  SimpleGrid,
  Accordion,
  Tooltip,
  ActionIcon,
  Button,
  rem,
  Flex,
  ThemeIcon,
  Stack,
  Title,
} from "@mantine/core";
import {
  FaPencilAlt,
  FaPlus,
  FaSearch,
  FaShoppingBag,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaUsers,
} from "react-icons/fa";
import { Tables } from "@/types/db";
import { useDisclosure } from "@mantine/hooks";
import EditClient from "../EditClient/EditClient";
import AddClient from "../AddClient/AddClient";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";

export default function ClientsTable() {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 17,
  });
  const { supabase, isAuthenticated } = useSupabase();
  const [editModalOpened, { open: editModalOpen, close: editModalClose }] =
    useDisclosure(false);
  const [addModalOpened, { open: openAddModal, close: closeAddModal }] =
    useDisclosure(false);
  const [selectedClient, setSelectedClient] = useState<Tables<"client"> | null>(
    null
  );
  const multiColumnFilter: FilterFn<Tables<"client">> = (
    row,
    columnId,
    filterValue
  ) => {
    const filterText = String(filterValue).toLowerCase();
    const phone1 = String(row.original.phone1 ?? "").toLowerCase();
    const phone2 = String(row.original.phone2 ?? "").toLowerCase();
    const email1 = String(row.original.email1 ?? "").toLowerCase();
    const email2 = String(row.original.email2 ?? "").toLowerCase();

    if (columnId === "phone1") {
      return phone1.includes(filterText) || phone2.includes(filterText);
    }

    if (columnId === "email1") {
      return email1.includes(filterText) || email2.includes(filterText);
    }
    const val = String(row.getValue(columnId) ?? "").toLowerCase();
    return val.includes(filterText);
  };

  const {
    data: clients,
    isLoading: loading,
    isError,
    error,
  } = useQuery<Tables<"client">[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data: clients, error: dbError } = await supabase
        .from("client")
        .select("*")
        .order("createdAt", { ascending: false });

      if (dbError) {
        console.error("Supabase query error:", dbError);
        throw new Error(dbError.message || "Failed to fetch clients");
      }
      return clients;
    },
    enabled: isAuthenticated,
    placeholderData: (previousData) => previousData,
  });

  const columnHelper = createColumnHelper<Tables<"client">>();
  const columns = [
    columnHelper.accessor("id", {
      header: "Client #",
      size: 100,
      minSize: 30,
    }),
    columnHelper.accessor("lastName", {
      header: "Client Name",
      size: 220,
      minSize: 100,
    }),
    columnHelper.accessor("street", {
      header: "Street",
      size: 150,
      minSize: 100,
    }),
    columnHelper.accessor("city", { header: "City", size: 150, minSize: 80 }),
    columnHelper.accessor("province", {
      header: "Province",
      size: 80,
      minSize: 70,
    }),
    columnHelper.accessor("zip", {
      header: "Zip Code",
      size: 150,
      minSize: 80,
    }),
    columnHelper.accessor("phone1", {
      header: "Phone 1",
      size: 100,
      minSize: 90,
      filterFn: multiColumnFilter,
    }),
    columnHelper.accessor("phone2", {
      header: "Phone 2",
      size: 100,
      minSize: 90,
    }),
    columnHelper.accessor("email1", {
      header: "Email 1",
      size: 250,
      minSize: 120,
      filterFn: multiColumnFilter,
    }),
    columnHelper.accessor("email2", {
      header: "Email 2",
      size: 250,
      minSize: 120,
    }),
    columnHelper.accessor("designer", {
      header: "Created By",
      size: 120,
      minSize: 90,
    }),
    columnHelper.accessor("createdAt", {
      header: "Created",
      size: 130,
      minSize: 100,
      cell: (info) => {
        const date = info.getValue<string>();
        return date ? dayjs(date).format("YYYY-MM-DD") : "—";
      },
    }),

    columnHelper.display({
      id: "actions",
      header: "Actions",
      size: 80,
      minSize: 80,
      cell: (info) => (
        <Group justify="center">
          <Tooltip label="Edit Client">
            <ActionIcon
              variant="subtle"
              color="blue"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedClient(info.row.original);
                editModalOpen();
              }}
            >
              <FaPencilAlt size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    }),
  ];

  const table = useReactTable({
    data: clients ?? [],
    columns,
    state: {
      columnFilters,
      pagination,
    },
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const shouldShowLoader = useMemo(
    () => !isAuthenticated || loading,
    [isAuthenticated, loading]
  );

  if (shouldShowLoader) {
    return (
      <Center className="py-10">
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center className="py-10">
        <Text c="red">Error fetching clients: {error.message}</Text>
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
      <Group mb="md">
        <ThemeIcon
          size={50}
          radius="md"
          variant="gradient"
          gradient={{ from: "#8E2DE2", to: "#4A00E0", deg: 135 }}
        >
          <FaUsers size={26} />
        </ThemeIcon>
        <Stack gap={0}>
          <Title order={2} style={{ color: "#343a40" }}>
            Clients
          </Title>
          <Text size="sm" c="dimmed">
            Track clients
          </Text>
        </Stack>
      </Group>
      <Flex align="center" justify="space-between" mb="md">
        {/* Accordion takes all remaining width */}
        <Box
          style={{
            flex: 1,
            marginRight: 12,
            borderRadius: rem(8),
          }}
        >
          <Accordion variant="contained" radius="md" transitionDuration={300}>
            <Accordion.Item value="search-filters">
              <Accordion.Control
                icon={<FaSearch size={16} />}
                styles={{
                  label: {
                    padding: 7,
                  },
                }}
              >
                Search Filters
              </Accordion.Control>
              <Accordion.Panel>
                <SimpleGrid
                  cols={{ base: 1, sm: 3, md: 5 }}
                  mt="sm"
                  spacing="sm"
                >
                  <TextInput
                    placeholder="Client Name..."
                    onChange={(e) =>
                      table
                        .getColumn("lastName")
                        ?.setFilterValue(e.target.value)
                    }
                  />
                  <TextInput
                    placeholder="Designer..."
                    onChange={(e) =>
                      table
                        .getColumn("designer")
                        ?.setFilterValue(e.target.value)
                    }
                  />
                  <TextInput
                    placeholder="City..."
                    onChange={(e) =>
                      table.getColumn("city")?.setFilterValue(e.target.value)
                    }
                  />
                  <TextInput
                    placeholder="Phone..."
                    onChange={(e) =>
                      table.getColumn("phone1")?.setFilterValue(e.target.value)
                    }
                  />
                  <TextInput
                    placeholder="Email..."
                    onChange={(e) =>
                      table.getColumn("email1")?.setFilterValue(e.target.value)
                    }
                  />
                </SimpleGrid>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Box>

        {/* Button stays on the right */}
        <Button
          size="md"
          onClick={openAddModal}
          leftSection={<FaPlus size={14} />}
          style={{
            background: "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
            color: "white",
            border: "none",
            whiteSpace: "nowrap",
          }}
        >
          New Client
        </Button>
      </Flex>

      <ScrollArea
        style={{
          flex: 1,
          minHeight: 0,
          padding: rem(10),
        }}
        styles={{
          thumb: {
            background: "linear-gradient(135deg, #8E2DE2, #4A00E0)",
          },
        }}
        type="hover"
      >
        <Table striped highlightOnHover withColumnBorders layout="fixed">
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const resizeHandler = header.getResizeHandler();
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
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}

                      <span className="inline-block ml-1">
                        {header.column.getIsSorted() === "asc" && <FaSortUp />}
                        {header.column.getIsSorted() === "desc" && (
                          <FaSortDown />
                        )}
                        {!header.column.getIsSorted() && (
                          <FaSort opacity={0.1} />
                        )}
                      </span>
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            resizeHandler(e);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            resizeHandler(e);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`resizer ${
                            header.column.getIsResizing() ? "isResizing" : ""
                          }`}
                          style={{
                            position: "absolute",
                            right: 0,
                            top: 0,
                            height: "100%",
                            width: "5px",
                            background: header.column.getIsResizing()
                              ? "blue"
                              : "transparent",
                            cursor: "col-resize",
                            userSelect: "none",
                            touchAction: "none",
                          }}
                        />
                      )}
                    </Table.Th>
                  );
                })}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {table.getRowModel().rows.map((row) => (
              <Table.Tr key={row.id}>
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
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
          hideWithOnePage
          withEdges
          color="#4A00E0"
          total={table.getPageCount()}
          value={table.getState().pagination.pageIndex + 1}
          onChange={(page) => table.setPageIndex(page - 1)}
        />
      </Box>

      {selectedClient && (
        <EditClient
          opened={editModalOpened}
          onClose={editModalClose}
          client={selectedClient}
        />
      )}
      <AddClient opened={addModalOpened} onClose={closeAddModal} />
    </Box>
  );
}
