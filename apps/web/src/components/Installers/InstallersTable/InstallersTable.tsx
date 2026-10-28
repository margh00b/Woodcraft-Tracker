"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Flex,
  Group,
  Loader,
  Pagination,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
  rem,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  FaCheckCircle,
  FaEye,
  FaFilter,
  FaFirstAid,
  FaPlus,
  FaSearch,
  FaShieldAlt,
  FaSortDown,
  FaSortUp,
  FaTools,
  FaUndo,
  FaUserCheck,
  FaUserSlash,
} from "react-icons/fa";
import { GoTools } from "react-icons/go";
import { useSupabase } from "@/hooks/useSupabase";
import { useInstallerAuthUsers } from "@/hooks/useInstallerAuthUsers";
import { Tables } from "@/types/db";
import AddInstaller from "../AddInstaller/AddInstaller";
import EditInstaller from "../EditInstaller/EditInstaller";

type Installer = Tables<"installers">;

type InstallerFilters = {
  name: string;
  company: string;
  status: string;
  account: string;
  role: string;
};

const EMPTY_FILTERS: InstallerFilters = {
  name: "",
  company: "",
  status: "active",
  account: "all",
  role: "all",
};

function matchesText(value: string | null | undefined, search: string) {
  return (value ?? "").toLowerCase().includes(search.trim().toLowerCase());
}

function matchesBoolean(value: boolean, filter: string) {
  if (filter === "yes") return value;
  if (filter === "no") return !value;
  return true;
}

export default function InstallersTable() {
  const { supabase, isAuthenticated } = useSupabase();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });

  const [sorting, setSorting] = useState<SortingState>([
    { id: "fullName", desc: false },
  ]);

  const [draftFilters, setDraftFilters] =
    useState<InstallerFilters>(EMPTY_FILTERS);

  const [activeFilters, setActiveFilters] =
    useState<InstallerFilters>(EMPTY_FILTERS);

  const [selectedInstaller, setSelectedInstaller] = useState<Installer | null>(
    null,
  );

  const [editModalOpened, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);

  const [addModalOpened, { open: openAddModal, close: closeAddModal }] =
    useDisclosure(false);

  const {
    data: installers = [],
    isLoading: loadingInstallers,
    isError: installersError,
    error: installersErrorDetails,
  } = useQuery<Installer[]>({
    queryKey: ["installers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installers")
        .select("*")
        .order("first_name", { ascending: true });

      if (error) throw new Error(error.message);

      return data as Installer[];
    },
    enabled: isAuthenticated,
  });

  const {
    data: authUsers = [],
    isLoading: loadingAuthUsers,
    isError: authUsersError,
  } = useInstallerAuthUsers();

  const authUsersById = useMemo(
    () => new Map(authUsers.map((user) => [user.id, user])),
    [authUsers],
  );

  const updateDraftFilter = (
    key: keyof InstallerFilters,
    value: string | null,
  ) => {
    setDraftFilters((current) => ({
      ...current,
      [key]: value ?? "",
    }));
  };

  const applyFilters = () => {
    setActiveFilters({ ...draftFilters });
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  };

  const clearFilters = () => {
    setDraftFilters({ ...EMPTY_FILTERS });
    setActiveFilters({ ...EMPTY_FILTERS });
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  };

  const filteredInstallers = useMemo(() => {
    return installers.filter((installer) => {
      const fullName = `${installer.first_name} ${installer.last_name}`.trim();

      if (activeFilters.name && !matchesText(fullName, activeFilters.name)) {
        return false;
      }

      if (
        activeFilters.company &&
        !matchesText(installer.company_name, activeFilters.company)
      ) {
        return false;
      }

      if (activeFilters.status === "active" && !installer.is_active) {
        return false;
      }

      if (activeFilters.status === "inactive" && installer.is_active) {
        return false;
      }

      if (activeFilters.account === "linked" && !installer.auth_user_id) {
        return false;
      }

      if (activeFilters.account === "unlinked" && installer.auth_user_id) {
        return false;
      }

      if (activeFilters.role === "service" && !installer.is_servicetech) {
        return false;
      }

      if (activeFilters.role === "regular" && installer.is_servicetech) {
        return false;
      }

      return true;
    });
  }, [installers, activeFilters]);

  const stats = useMemo(
    () => ({
      total: installers.length,
      active: installers.filter((installer) => installer.is_active).length,
      serviceTechs: installers.filter((installer) => installer.is_servicetech)
        .length,
      unlinked: installers.filter((installer) => !installer.auth_user_id)
        .length,
    }),
    [installers],
  );

  const columnHelper = createColumnHelper<Installer>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("is_active", {
        header: "Status",
        size: 105,
        minSize: 95,
        cell: (info) => (
          <Badge
            color={info.getValue() ? "green" : "gray"}
            variant="light"
            radius="sm"
            leftSection={
              info.getValue() ? <FaCheckCircle size={10} /> : undefined
            }
          >
            {info.getValue() ? "Active" : "Inactive"}
          </Badge>
        ),
      }),
      columnHelper.accessor(
        (installer) => `${installer.first_name} ${installer.last_name}`.trim(),
        {
          id: "fullName",
          header: "Installer",
          size: 250,
          minSize: 200,
          cell: (info) => (
            <Stack gap={2}>
              <Text size="sm" fw={600} truncate>
                {info.getValue()}
              </Text>
            </Stack>
          ),
        },
      ),

      columnHelper.accessor("company_name", {
        header: "Company",
        size: 170,
        minSize: 130,
        cell: (info) => (
          <Text size="sm" truncate>
            {info.getValue() || "—"}
          </Text>
        ),
      }),

      columnHelper.accessor("phone_number", {
        header: "Phone",
        size: 140,
        minSize: 120,
        cell: (info) => (
          <Text size="sm" truncate>
            {info.getValue() || "—"}
          </Text>
        ),
      }),

      columnHelper.accessor("email", {
        header: "Email",
        size: 210,
        minSize: 160,
        cell: (info) => (
          <Text size="sm" truncate>
            {info.getValue() || "—"}
          </Text>
        ),
      }),

      columnHelper.accessor("city", {
        header: "City",
        size: 100,
        minSize: 100,
        cell: (info) => (
          <Text size="sm" truncate>
            {info.getValue() || "—"}
          </Text>
        ),
      }),
      columnHelper.accessor("auth_user_id", {
        header: "App Account",
        size: 200,
        minSize: 160,
        enableSorting: false,
        cell: (info) => {
          const userId = info.getValue();

          if (!userId) {
            return (
              <Badge
                variant="light"
                color="orange"
                radius="sm"
                leftSection={<FaUserSlash size={10} />}
              >
                Not linked
              </Badge>
            );
          }

          const user = authUsersById.get(userId);

          if (!user) {
            return (
              <Text size="sm" c="dimmed" truncate>
                {loadingAuthUsers ? "Loading account..." : "Linked account"}
              </Text>
            );
          }

          return (
            <Group justify="center" gap={6}>
              <Text size="sm" fw={500} truncate>
                {user.username || "No username"}
              </Text>
              <Badge
                color="green"
                variant="light"
                size="sm"
                radius="xl"
                p={5}
                styles={{
                  root: {
                    minWidth: 22,
                    height: 22,
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                }}
              >
                <FaCheckCircle size={12} />
              </Badge>
            </Group>
          );
        },
      }),

      columnHelper.accessor("is_servicetech", {
        header: "Service Tech",
        size: 120,
        minSize: 110,
        cell: (info) => (
          <Badge
            color={info.getValue() ? "violet" : "gray"}
            variant="light"
            radius="sm"
            styles={{
              root: {
                justifyContent: "center",
              },
            }}
          >
            {info.getValue() ? "Yes" : "No"}
          </Badge>
        ),
      }),

      columnHelper.display({
        id: "actions",
        header: "",
        size: 65,
        minSize: 65,
        enableSorting: false,
        cell: (info) => (
          <Group justify="center">
            <Tooltip label="Edit installer">
              <ActionIcon
                variant="light"
                color="violet"
                radius="md"
                size="lg"
                aria-label="Edit installer"
                onClick={() => {
                  setSelectedInstaller(info.row.original);
                  openEditModal();
                }}
              >
                <FaEye size={15} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      }),
    ],
    [authUsersById, loadingAuthUsers, openEditModal],
  );

  const table = useReactTable({
    data: filteredInstallers,
    columns,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!isAuthenticated || loadingInstallers) {
    return (
      <Center h={300}>
        <Loader color="violet" />
      </Center>
    );
  }

  if (installersError) {
    return (
      <Center h={300}>
        <Text c="red">
          Failed to load installers: {installersErrorDetails.message}
        </Text>
      </Center>
    );
  }

  const hasActiveFilters = Object.entries(activeFilters).some(([key, value]) =>
    key === "status" ||
    key === "account" ||
    key === "role" ||
    key === "firstAid" ||
    key === "insurance"
      ? value !== "all"
      : Boolean(value),
  );

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        gap: rem(18),
        padding: rem(24),
        height: "calc(100vh - 45px)",
        minHeight: 0,
      }}
    >
      <Group justify="space-between" align="center">
        <Group gap="md">
          <ThemeIcon
            size={52}
            radius="lg"
            variant="gradient"
            gradient={{ from: "violet.6", to: "indigo.7", deg: 135 }}
          >
            <GoTools size={25} />
          </ThemeIcon>
          <Stack gap={3}>
            <Title order={2}>Installers</Title>
            <Text size="sm" c="dimmed">
              Manage installer details, access, and qualifications.
            </Text>
          </Stack>
        </Group>

        <Button
          size="md"
          radius="md"
          leftSection={<FaPlus size={13} />}
          variant="gradient"
          gradient={{ from: "violet.6", to: "indigo.7", deg: 135 }}
          onClick={openAddModal}
        >
          New Installer
        </Button>
      </Group>

      <Paper withBorder radius="lg" p={0} style={{ flexShrink: 0 }}>
        <Accordion variant="filled" radius="lg">
          <Accordion.Item value="filters">
            <Accordion.Control
              icon={<FaFilter size={15} />}
              styles={{
                label: { fontWeight: 600 },
              }}
            >
              <Group justify="space-between" pr="sm">
                <Text fw={600}>Search and filters</Text>
                <Badge variant="light" color="violet">
                  {filteredInstallers.length} of {installers.length}
                </Badge>
              </Group>
            </Accordion.Control>

            <Accordion.Panel>
              <Stack gap="md">
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
                  <TextInput
                    label="Installer name"
                    placeholder="Search first or last name"
                    leftSection={<FaSearch size={13} />}
                    value={draftFilters.name}
                    onChange={(event) =>
                      updateDraftFilter("name", event.currentTarget.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") applyFilters();
                    }}
                  />

                  <TextInput
                    label="Company"
                    placeholder="Search company"
                    value={draftFilters.company}
                    onChange={(event) =>
                      updateDraftFilter("company", event.currentTarget.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") applyFilters();
                    }}
                  />

                  <Select
                    label="Status"
                    data={[
                      { label: "All", value: "all" },
                      { label: "Active only", value: "active" },
                      { label: "Inactive only", value: "inactive" },
                    ]}
                    value={draftFilters.status}
                    onChange={(value) =>
                      updateDraftFilter("status", value ?? "all")
                    }
                    allowDeselect={false}
                  />

                  <Select
                    label="App Accounts"
                    data={[
                      { label: "All", value: "all" },
                      { label: "Linked", value: "linked" },
                      { label: "Not linked", value: "unlinked" },
                    ]}
                    value={draftFilters.account}
                    onChange={(value) =>
                      updateDraftFilter("account", value ?? "all")
                    }
                    allowDeselect={false}
                  />

                  <Select
                    label="Installer role"
                    data={[
                      { label: "All roles", value: "all" },
                      { label: "Service technicians", value: "service" },
                      { label: "Regular Installers", value: "regular" },
                    ]}
                    value={draftFilters.role}
                    onChange={(value) =>
                      updateDraftFilter("role", value ?? "all")
                    }
                    allowDeselect={false}
                  />
                </SimpleGrid>

                <Divider />

                <Group justify="flex-end">
                  <Button
                    variant="default"
                    leftSection={<FaUndo size={12} />}
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                  <Button
                    leftSection={<FaSearch size={12} />}
                    variant="gradient"
                    gradient={{
                      from: "violet.6",
                      to: "indigo.7",
                      deg: 135,
                    }}
                    onClick={applyFilters}
                  >
                    Apply filters
                  </Button>
                </Group>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Paper>

      {authUsersError && (
        <Text size="sm" c="orange">
          Unable to load App account details. Installer records remain
          available, but linked usernames may not be shown.
        </Text>
      )}

      <Paper
        withBorder
        radius="lg"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ScrollArea style={{ flex: 1 }} type="auto">
          <Table
            striped
            highlightOnHover
            stickyHeader
            withColumnBorders={false}
            layout="fixed"
            styles={{
              thead: {
                background: "var(--mantine-color-gray-0)",
              },
              th: {
                padding: `${rem(12)} ${rem(12)}`,
                borderBottom: "1px solid var(--mantine-color-gray-3)",
                textAlign: "center",
                fontWeight: 700,
              },
              td: {
                padding: `${rem(12)} ${rem(12)}`,
                borderBottom: "1px solid var(--mantine-color-gray-2)",
                textAlign: "center",
              },
            }}
          >
            <Table.Thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <Table.Tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();

                    return (
                      <Table.Th
                        key={header.id}
                        colSpan={header.colSpan}
                        onClick={
                          canSort
                            ? header.column.getToggleSortingHandler()
                            : undefined
                        }
                        style={{
                          width: header.getSize(),
                          cursor: canSort ? "pointer" : "default",
                        }}
                      >
                        <Group gap={6} wrap="nowrap" justify="center">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}

                          {header.column.getIsSorted() === "asc" ? (
                            <FaSortUp />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <FaSortDown />
                          ) : null}
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
                    <Center py={60}>
                      <Stack align="center" gap="xs">
                        <ThemeIcon
                          size={48}
                          radius="xl"
                          color="gray"
                          variant="light"
                        >
                          <FaSearch size={18} />
                        </ThemeIcon>
                        <Text fw={600}>No installers found</Text>
                        <Text size="sm" c="dimmed">
                          Try changing your search criteria or clear the
                          filters.
                        </Text>
                        {hasActiveFilters && (
                          <Button
                            variant="light"
                            color="violet"
                            onClick={clearFilters}
                          >
                            Clear filters
                          </Button>
                        )}
                      </Stack>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                table.getRowModel().rows.map((row) => (
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

        <Divider />

        <Flex
          justify="space-between"
          align="center"
          wrap="wrap"
          gap="sm"
          p="md"
        >
          <Text size="sm" c="dimmed">
            Showing{" "}
            {filteredInstallers.length === 0
              ? 0
              : pagination.pageIndex * pagination.pageSize + 1}
            {"–"}
            {Math.min(
              (pagination.pageIndex + 1) * pagination.pageSize,
              filteredInstallers.length,
            )}{" "}
            of {filteredInstallers.length} installers
          </Text>

          <Pagination
            size="sm"
            radius="md"
            color="violet"
            withEdges
            total={Math.max(1, table.getPageCount())}
            value={pagination.pageIndex + 1}
            onChange={(page) => table.setPageIndex(page - 1)}
            disabled={filteredInstallers.length === 0}
          />
        </Flex>
      </Paper>

      {selectedInstaller && (
        <EditInstaller
          opened={editModalOpened}
          onClose={() => {
            closeEditModal();
            setSelectedInstaller(null);
          }}
          installer={selectedInstaller}
        />
      )}

      <AddInstaller opened={addModalOpened} onClose={closeAddModal} />
    </Box>
  );
}
