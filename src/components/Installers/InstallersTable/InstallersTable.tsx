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
  Badge,
  Stack,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  FaEye,
  FaPencilAlt,
  FaPlus,
  FaSearch,
  FaShoppingBag,
  FaSort,
  FaSortDown,
  FaSortUp,
} from "react-icons/fa";
import { useDisclosure } from "@mantine/hooks";
import { useSupabase } from "@/hooks/useSupabase";
import { Tables } from "@/types/db";
import AddInstaller from "../AddInstaller/AddInstaller";
import EditInstaller from "../EditInstaller/EditInstaller";
import { GoTools } from "react-icons/go";

export default function InstallersTable() {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });

  const { supabase, isAuthenticated } = useSupabase();
  const [editModalOpened, { open: editModalOpen, close: editModalClose }] =
    useDisclosure(false);
  const [addModalOpened, { open: openAddModal, close: closeAddModal }] =
    useDisclosure(false);
  const [selectedInstaller, setSelectedInstaller] =
    useState<Tables<"installers"> | null>(null);

  const {
    data: installers,
    isLoading: loading,
    isError,
    error,
  } = useQuery<Tables<"installers">[]>({
    queryKey: ["installers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installers")
        .select("*")
        .order("first_name", { ascending: true });

      if (error) throw new Error(error.message || "Failed to fetch installers");
      return data as Tables<"installers">[];
    },
    enabled: isAuthenticated,
  });

  const columnHelper = createColumnHelper<Tables<"installers">>();
  const columns = [
    columnHelper.accessor("installer_id", {
      header: "ID",
      size: 60,
      minSize: 60,
    }),
    columnHelper.accessor("is_active", {
      header: "Status",
      size: 100,
      minSize: 90,
      cell: (info) => (
        <Badge color={info.getValue() ? "green" : "gray"} variant="light">
          {info.getValue() ? "Active" : "Inactive"}
        </Badge>
      ),
    }),
    columnHelper.accessor((row) => `${row.first_name} ${row.last_name}`, {
      id: "fullName",
      header: "Name",
      size: 200,
      minSize: 150,
    }),
    columnHelper.accessor("company_name", {
      header: "Company",
      size: 200,
      minSize: 150,
      cell: (info) => info.getValue() || "—",
    }),
    columnHelper.accessor("phone_number", {
      header: "Phone",
      size: 140,
      minSize: 120,
      cell: (info) => info.getValue() || "—",
    }),
    columnHelper.accessor("email", {
      header: "Email",
      size: 220,
      minSize: 150,
      cell: (info) => info.getValue() || "—",
    }),
    columnHelper.accessor("city", {
      header: "City",
      size: 140,
      minSize: 100,
      cell: (info) => info.getValue() || "—",
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      size: 80,
      minSize: 80,
      cell: (info) => (
        <Group justify="center">
          <Tooltip label="Edit Installer">
            <ActionIcon
              variant="subtle"
              color="blue"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedInstaller(info.row.original);
                editModalOpen();
              }}
            >
              <FaEye size={20} color="purple" />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    }),
  ];

  const table = useReactTable({
    data: installers ?? [],
    columns,
    state: { columnFilters, pagination },
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

  if (!isAuthenticated || loading)
    return (
      <Center className="py-10">
        <Loader />
      </Center>
    );
  if (isError)
    return (
      <Center className="py-10">
        <Text c="red">Error: {error.message}</Text>
      </Center>
    );

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
          <GoTools size={26} />
        </ThemeIcon>
        <Stack gap={0}>
          <Title order={2} style={{ color: "#343a40" }}>
            Installers
          </Title>
          <Text size="sm" c="dimmed">
            Manage your installers
          </Text>
        </Stack>
      </Group>
      <Flex align="center" justify="space-between" mb="md">
        <Box style={{ flex: 1, marginRight: 12 }}>
          <Accordion variant="contained" radius="md">
            <Accordion.Item value="filters">
              <Accordion.Control icon={<FaSearch size={16} />}>
                Search Filters
              </Accordion.Control>
              <Accordion.Panel>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
                  <TextInput
                    placeholder="Search Name..."
                    onChange={(e) =>
                      table
                        .getColumn("fullName")
                        ?.setFilterValue(e.target.value)
                    }
                  />
                  <TextInput
                    placeholder="Company..."
                    onChange={(e) =>
                      table
                        .getColumn("company_name")
                        ?.setFilterValue(e.target.value)
                    }
                  />
                  <TextInput
                    placeholder="City..."
                    onChange={(e) =>
                      table.getColumn("city")?.setFilterValue(e.target.value)
                    }
                  />
                </SimpleGrid>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Box>
        <Button
          size="md"
          onClick={openAddModal}
          leftSection={<FaPlus size={14} />}
          style={{
            background: "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
            color: "white",
            border: "none",
          }}
        >
          New Installer
        </Button>
      </Flex>

      <ScrollArea
        style={{ flex: 1, minHeight: 0, padding: rem(10) }}
        type="hover"
      >
        <Table striped highlightOnHover withColumnBorders layout="fixed">
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Th
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{ width: header.getSize(), cursor: "pointer" }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <Group gap={4}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "asc" ? (
                        <FaSortUp />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <FaSortDown />
                      ) : null}
                    </Group>
                  </Table.Th>
                ))}
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
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
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
        }}
      >
        <Pagination
          total={table.getPageCount()}
          value={table.getState().pagination.pageIndex + 1}
          onChange={(page) => table.setPageIndex(page - 1)}
          color="#4A00E0"
        />
      </Box>

      {selectedInstaller && (
        <EditInstaller
          opened={editModalOpened}
          onClose={() => {
            editModalClose();
            setSelectedInstaller(null);
          }}
          installer={selectedInstaller}
        />
      )}
      <AddInstaller opened={addModalOpened} onClose={closeAddModal} />
    </Box>
  );
}
