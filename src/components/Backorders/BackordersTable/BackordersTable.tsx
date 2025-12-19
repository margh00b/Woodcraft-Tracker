"use client";

import { useState, KeyboardEvent } from "react";
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
  Badge,
  Title,
  Stack,
  ThemeIcon,
  Select,
} from "@mantine/core";
import {
  FaSearch,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaClipboardList,
} from "react-icons/fa";
import dayjs from "dayjs";
import { useDisclosure } from "@mantine/hooks";
import EditBOModal from "@/components/Installation/EditBOModal/EditBOModal";
import { useBackordersTable } from "@/hooks/useBackOrdersTable";
import { usePermissions } from "@/hooks/usePermissions";

export default function BackordersTable() {
  const permissions = usePermissions();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const [jobInput, setJobInput] = useState("");
  const [clientInput, setClientInput] = useState("");
  const [commentInput, setCommentInput] = useState("");

  const [selectedBO, setSelectedBO] = useState<any>(null);
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);

  const { data, isLoading } = useBackordersTable({
    pagination,
    columnFilters,
    sorting,
  });

  const tableData = data?.data || [];
  const totalCount = data?.count || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  const columnHelper = createColumnHelper<any>();

  const columns = [
    columnHelper.accessor("job_number", {
      header: "Job #",
      size: 100,
      cell: (info) => (
        <Text fw={600} size="sm">
          {info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor("shipping_client_name", {
      header: "Client",
      size: 180,
      cell: (info) => <Text size="sm">{info.getValue()}</Text>,
    }),
    columnHelper.accessor("comments", {
      header: "Description / Comments",
      size: 300,
      cell: (info) => (
        <Text size="sm" lineClamp={1} title={info.getValue()}>
          {info.getValue() || "—"}
        </Text>
      ),
    }),
    columnHelper.accessor("date_entered", {
      header: "Date Entered",
      size: 130,
      cell: (info) =>
        info.getValue() ? dayjs(info.getValue()).format("YYYY-MM-DD") : "—",
    }),
    columnHelper.accessor("due_date", {
      header: "Due Date",
      size: 130,
      cell: (info) => {
        const date = info.getValue();
        const isLate =
          date &&
          dayjs(date).isBefore(dayjs(), "day") &&
          !info.row.original.complete;
        return (
          <Text size="sm" c={isLate ? "red" : "dimmed"} fw={isLate ? 700 : 400}>
            {date ? dayjs(date).format("YYYY-MM-DD") : "—"}
          </Text>
        );
      },
    }),
    columnHelper.accessor("complete", {
      header: "Status",
      size: 120,
      cell: (info) => (
        <Badge color={info.getValue() ? "green" : "red"} variant="light">
          {info.getValue() ? "Complete" : "Pending"}
        </Badge>
      ),
    }),
  ];

  const table = useReactTable({
    data: tableData,
    columns,
    pageCount,
    state: { pagination, sorting, columnFilters },
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleSearch = () => {
    table.getColumn("job_number")?.setFilterValue(jobInput);
    table.getColumn("shipping_client_name")?.setFilterValue(clientInput);
    table.getColumn("comments")?.setFilterValue(commentInput);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleRowClick = (row: any) => {
    setSelectedBO(row);
    openEditModal();
  };

  return (
    <Box
      p="md"
      h="calc(100vh - 60px)"
      display="flex"
      style={{ flexDirection: "column" }}
    >
      <Group mb="lg" justify="space-between">
        <Group>
          <ThemeIcon
            size={44}
            radius="md"
            variant="gradient"
            gradient={{ from: "orange", to: "red" }}
          >
            <FaClipboardList size={24} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={3}>Backorders</Title>
            <Text c="dimmed" size="sm">
              Manage all active and past backorders
            </Text>
          </Stack>
        </Group>
      </Group>

      <Group mb="md">
        <TextInput
          placeholder="Filter Job #..."
          value={jobInput}
          onChange={(e) => setJobInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          w={150}
        />
        <TextInput
          placeholder="Filter Client..."
          value={clientInput}
          onChange={(e) => setClientInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          w={180}
        />
        <TextInput
          placeholder="Filter comments..."
          leftSection={<FaSearch size={14} />}
          value={commentInput}
          onChange={(e) => setCommentInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: 1 }}
        />
        <Select
          placeholder="Status"
          data={[
            { label: "All", value: "all" },
            { label: "Pending", value: "false" },
            { label: "Complete", value: "true" },
          ]}
          value={
            (table.getColumn("complete")?.getFilterValue() as string) ?? "all"
          }
          onChange={(val) => {
            table.getColumn("complete")?.setFilterValue(val);
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
          allowDeselect={false}
          w={150}
        />
      </Group>

      <ScrollArea style={{ flex: 1 }} type="hover">
        <Table striped highlightOnHover stickyHeader>
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Th
                    key={header.id}
                    style={{ width: header.getSize(), cursor: "pointer" }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <Group gap="xs">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {{
                        asc: <FaSortUp />,
                        desc: <FaSortDown />,
                      }[header.column.getIsSorted() as string] ?? (
                        <FaSort opacity={0.2} />
                      )}
                    </Group>
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Center h={200}>
                    <Loader />
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : tableData.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Center h={100}>
                    <Text c="dimmed">No backorders found.</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Table.Tr
                  key={row.id}
                  onClick={() => handleRowClick(row.original)}
                  style={{ cursor: "pointer" }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <Table.Td key={cell.id}>
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

      <Group justify="center" pt="md">
        <Pagination
          total={table.getPageCount()}
          value={table.getState().pagination.pageIndex + 1}
          onChange={(p) => table.setPageIndex(p - 1)}
        />
      </Group>

      {selectedBO && (
        <EditBOModal
          opened={editModalOpened}
          onClose={() => {
            closeEditModal();
            setSelectedBO(null);
          }}
          backorder={selectedBO}
          readOnly={!permissions.canEditInstallation}
        />
      )}
    </Box>
  );
}
