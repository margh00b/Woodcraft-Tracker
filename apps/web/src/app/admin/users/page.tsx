"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Anchor,
  Autocomplete,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  NavLink,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  rem,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCalendarAlt,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaLock,
  FaPlus,
  FaShieldAlt,
  FaTools,
  FaUser,
  FaUserCog,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";

const ROLES = [
  "admin",
  "designer",
  "plant",
  "manager",
  "inspection",
  "installation",
  "scheduler",
  "reception",
  "service",
];

const SUB_ROLES = ["assembly", "paint", "manager", "shipments", "wood"];

type ManagedUser = {
  id: string;
  email: string | undefined;
  username: string;
  role: string;
  sub_role: string | null;
  created_at?: string;
  last_sign_in_at?: string | null;
  banned_until?: string | null;
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error ?? "Request failed.");
  }

  return result as T;
}

const inputStyles = {
  label: {
    color: "#39265D",
    fontWeight: 700,
    marginBottom: 8,
  },
  input: {
    borderColor: "#E5DDF5",
    background: "#FCFBFF",
    fontSize: rem(14),
    transition: "border-color 150ms ease, box-shadow 150ms ease",
  },
  description: {
    color: "#8A7DA3",
    marginTop: 5,
    marginBottom: 8,
    lineHeight: 1.6,
  },
};

const primaryButtonStyle = {
  background: "linear-gradient(110deg, #8B5CF6 0%, #6D28D9 55%, #4C1D95 100%)",
  boxShadow: "0 8px 20px rgba(109,40,217,0.18)",
  border: 0,
  fontWeight: 750,
  transition: "transform 150ms ease, box-shadow 150ms ease",
};

const surfaceStyle = {
  background: "rgba(255,255,255,0.86)",
  borderColor: "#E8DEFF",
  boxShadow: "0 12px 35px rgba(76,29,149,0.055)",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [subRole, setSubRole] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editSubRole, setEditSubRole] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const loadUsers = useCallback(async (requestedPage: number) => {
    setLoading(true);
    setError(null);

    try {
      const result = await request<{
        users: ManagedUser[];
        hasMore: boolean;
      }>(`/api/admin/users?page=${requestedPage}`);

      setUsers(result.users);
      setHasMore(result.hasMore);
      setPage(requestedPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers(1);
  }, [loadUsers]);

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      await request("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
          role,
          sub_role: subRole || null,
        }),
      });

      notifications.show({
        title: "User created",
        message: `Account created for ${username.trim()}.`,
        color: "green",
      });

      setUsername("");
      setPassword("");
      setRole("");
      setSubRole("");

      await loadUsers(1);
    } catch (err) {
      notifications.show({
        title: "Unable to create user",
        message: err instanceof Error ? err.message : "Request failed.",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  }

  function startEditing(user: ManagedUser) {
    setEditingId(user.id);
    setEditRole(user.role);
    setEditSubRole(user.sub_role ?? "");
    setNewPassword("");
  }

  async function saveChanges(user: ManagedUser) {
    if (!editRole.trim()) {
      notifications.show({
        title: "Role required",
        message: "Enter a role before saving.",
        color: "red",
      });
      return;
    }

    setSaving(true);

    try {
      const body: Record<string, string | null> = {
        id: user.id,
        role: editRole,
        sub_role: editSubRole || null,
      };

      if (newPassword) body.password = newPassword;

      await request("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      notifications.show({
        title: "Changes saved",
        message: "The user's settings have been updated.",
        color: "green",
      });

      setEditingId(null);
      setNewPassword("");
      await loadUsers(page);
    } catch (err) {
      notifications.show({
        title: "Unable to save changes",
        message: err instanceof Error ? err.message : "Request failed.",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  }

  const adminCount = users.filter((user) => user.role === "admin").length;
  const subRoleCount = users.filter((user) => Boolean(user.sub_role)).length;

  return (
    <Box
      mih="100vh"
      py={{ base: "xl", md: 40 }}
      px={{ base: "sm", md: "xl" }}
      style={{
        background:
          "radial-gradient(ellipse at 8% 0%, rgba(167,139,250,0.16), transparent 36%), radial-gradient(ellipse at 100% 75%, rgba(124,58,237,0.10), transparent 38%), linear-gradient(135deg, #FAF9FF 0%, #F5F1FF 52%, #F0EDFF 100%)",
      }}
    >
      <Container size={1180} px={0}>
        <Stack gap="xl">
          <Group justify="space-between" align="center" gap="md">
            <Group gap="md" wrap="nowrap">
              <ThemeIcon
                size={56}
                radius={18}
                variant="gradient"
                gradient={{ from: "#A78BFA", to: "#4C1D95", deg: 135 }}
                style={{
                  boxShadow: "0 10px 26px rgba(109,40,217,0.22)",
                  flexShrink: 0,
                }}
              >
                <FaUserCog size={24} />
              </ThemeIcon>

              <Box>
                <Anchor
                  href="/"
                  size="xs"
                  fw={800}
                  c="#7C3AED"
                  tt="uppercase"
                  style={{ letterSpacing: "0.16em" }}
                >
                  Woodcraft CORE
                </Anchor>

                <Title
                  order={1}
                  c="#21134B"
                  style={{
                    fontSize: "clamp(1.65rem, 3vw, 2.35rem)",
                    lineHeight: 1.2,
                    letterSpacing: "-0.045em",
                    fontWeight: 850,
                  }}
                >
                  User management
                </Title>
                <Text c="#817496" size="sm" mt={4}>
                  Manage employee accounts, access, and credentials.
                </Text>
              </Box>
            </Group>

            <Badge
              size="lg"
              radius="xl"
              variant="light"
              color="violet"
              leftSection={<FaShieldAlt size={11} />}
              style={{ paddingInline: 14, textTransform: "none" }}
            >
              Administrator
            </Badge>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Card withBorder radius="xl" p="lg" style={surfaceStyle}>
              <Group gap="md" wrap="nowrap">
                <ThemeIcon size={46} radius="lg" variant="light" color="violet">
                  <FaUsers size={19} />
                </ThemeIcon>
                <Box>
                  <Text size="xs" fw={700} c="#817496">
                    USERS ON THIS PAGE
                  </Text>
                  <Title order={2} c="#21134B" mt={3}>
                    {loading ? "—" : users.length}
                  </Title>
                </Box>
              </Group>
            </Card>

            <Card withBorder radius="xl" p="lg" style={surfaceStyle}>
              <Group gap="md" wrap="nowrap">
                <ThemeIcon size={46} radius="lg" variant="light" color="violet">
                  <FaShieldAlt size={19} />
                </ThemeIcon>
                <Box>
                  <Text size="xs" fw={700} c="#817496">
                    ADMIN ACCOUNTS
                  </Text>
                  <Title order={2} c="#21134B" mt={3}>
                    {loading ? "—" : adminCount}
                  </Title>
                </Box>
              </Group>
            </Card>

            <Card withBorder radius="xl" p="lg" style={surfaceStyle}>
              <Group gap="md" wrap="nowrap">
                <ThemeIcon size={46} radius="lg" variant="light" color="violet">
                  <FaUser size={19} />
                </ThemeIcon>
                <Box>
                  <Text size="xs" fw={700} c="#817496">
                    WITH SUB-ROLES
                  </Text>
                  <Title order={2} c="#21134B" mt={3}>
                    {loading ? "—" : subRoleCount}
                  </Title>
                </Box>
              </Group>
            </Card>
          </SimpleGrid>

          <Card
            withBorder
            radius="xl"
            p={{ base: "lg", md: 30 }}
            style={{
              ...surfaceStyle,
              overflow: "visible",
            }}
          >
            <form onSubmit={createUser}>
              <Stack gap="xl">
                <Group gap="md" align="center" wrap="nowrap">
                  <ThemeIcon
                    size={46}
                    radius="lg"
                    variant="light"
                    color="violet"
                  >
                    <FaUserPlus size={19} />
                  </ThemeIcon>
                  <Box>
                    <Title order={3} c="#21134B" size="h3">
                      Create Employee Account
                    </Title>
                    <Text c="#817496" size="sm" mt={4}>
                      Set up a login and assign the appropriate access.
                    </Text>
                  </Box>
                </Group>

                <Divider color="#EEE7FA" />

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <TextInput
                    label="Username"
                    description="Employees use this username to sign in."
                    placeholder="e.g. zahoor"
                    leftSection={<FaUser size={14} />}
                    value={username}
                    onChange={(event) => setUsername(event.currentTarget.value)}
                    autoComplete="off"
                    maxLength={40}
                    required
                    size="md"
                    radius="md"
                    styles={inputStyles}
                  />

                  <PasswordInput
                    label="Initial password"
                    description="At least 6 characters. Share it securely."
                    placeholder="Create a secure password"
                    leftSection={<FaLock size={14} />}
                    value={password}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                    minLength={6}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                    size="md"
                    radius="md"
                    styles={inputStyles}
                  />

                  <Autocomplete
                    label="Role"
                    placeholder="Select or enter a role"
                    data={ROLES}
                    value={role}
                    onChange={setRole}
                    required
                    limit={10}
                    maxDropdownHeight={200}
                    size="md"
                    radius="md"
                    styles={inputStyles}
                  />

                  <Autocomplete
                    label="Sub-role"
                    placeholder="Select or enter a sub-role"
                    data={SUB_ROLES}
                    value={subRole}
                    onChange={setSubRole}
                    limit={10}
                    maxDropdownHeight={200}
                    size="md"
                    radius="md"
                    styles={inputStyles}
                  />
                </SimpleGrid>

                <Group justify="flex-end">
                  <Button
                    type="submit"
                    size="md"
                    radius="md"
                    loading={saving}
                    leftSection={!saving && <FaPlus size={13} />}
                    rightSection={!saving && <FaArrowRight size={13} />}
                    style={primaryButtonStyle}
                  >
                    Create account
                  </Button>
                </Group>
              </Stack>
            </form>
          </Card>

          <Card
            withBorder
            radius="xl"
            p={{ base: "md", md: 24 }}
            style={surfaceStyle}
          >
            <Stack gap="lg">
              <Group
                justify="space-between"
                align="center"
                gap="md"
                wrap="wrap"
              >
                <Group gap="md" wrap="nowrap">
                  <ThemeIcon
                    size={46}
                    radius="lg"
                    variant="light"
                    color="violet"
                  >
                    <FaUsers size={19} />
                  </ThemeIcon>
                  <Box>
                    <Title order={3} c="#21134B" size="h3">
                      Employee accounts
                    </Title>
                    <Text c="#817496" size="sm" mt={4}>
                      Review roles and update account credentials.
                    </Text>
                  </Box>
                </Group>

                <Group gap="xs">
                  <Button
                    variant="subtle"
                    color="violet"
                    radius="md"
                    leftSection={<FaArrowLeft size={12} />}
                    disabled={page <= 1 || loading}
                    onClick={() => void loadUsers(page - 1)}
                  >
                    Previous
                  </Button>
                  <Badge size="lg" radius="md" variant="light" color="violet">
                    Page {page}
                  </Badge>
                  <Button
                    variant="subtle"
                    color="violet"
                    radius="md"
                    rightSection={<FaArrowRight size={12} />}
                    disabled={!hasMore || loading}
                    onClick={() => void loadUsers(page + 1)}
                  >
                    Next
                  </Button>
                </Group>
              </Group>

              {error && (
                <Alert
                  color="red"
                  radius="lg"
                  title="Unable to load employee accounts"
                >
                  {error}
                </Alert>
              )}

              {loading ? (
                <Box
                  py={50}
                  style={{
                    textAlign: "center",
                    border: "1px dashed #DDD0F8",
                    borderRadius: rem(14),
                    background: "#FCFBFF",
                  }}
                >
                  <ThemeIcon
                    size={48}
                    radius="xl"
                    variant="light"
                    color="violet"
                    mx="auto"
                    mb="sm"
                  >
                    <FaUsers size={20} />
                  </ThemeIcon>
                  <Text fw={700} c="#39265D">
                    Loading employee accounts
                  </Text>
                  <Text size="sm" c="#8A7DA3" mt={4}>
                    Retrieving account information...
                  </Text>
                </Box>
              ) : users.length === 0 ? (
                <Box
                  py={45}
                  style={{
                    textAlign: "center",
                    border: "1px dashed #DDD0F8",
                    borderRadius: rem(14),
                    background: "#FCFBFF",
                  }}
                >
                  <ThemeIcon
                    size={48}
                    radius="xl"
                    variant="light"
                    color="violet"
                    mx="auto"
                    mb="sm"
                  >
                    <FaUsers size={20} />
                  </ThemeIcon>
                  <Text fw={700} c="#39265D">
                    No accounts found
                  </Text>
                  <Text size="sm" c="#8A7DA3" mt={4}>
                    There are no users on this page.
                  </Text>
                </Box>
              ) : (
                <Stack gap="md">
                  {users.map((user) => {
                    const editing = editingId === user.id;

                    return (
                      <Box
                        key={user.id}
                        p={{ base: "md", md: "lg" }}
                        style={{
                          border: editing
                            ? "1px solid #C4B5FD"
                            : "1px solid #EDE6FA",
                          borderRadius: rem(16),
                          background: editing
                            ? "linear-gradient(135deg, #FAF8FF, #FFFFFF)"
                            : "rgba(255,255,255,0.78)",
                          boxShadow: editing
                            ? "0 8px 24px rgba(109,40,217,0.08)"
                            : "0 3px 12px rgba(76,29,149,0.025)",
                          transition:
                            "border-color 150ms ease, box-shadow 150ms ease",
                        }}
                      >
                        <Stack gap="md">
                          <Group
                            justify="space-between"
                            align="flex-start"
                            gap="md"
                          >
                            <Group
                              gap="md"
                              align="flex-start"
                              wrap="nowrap"
                              style={{ minWidth: 0, flex: 1 }}
                            >
                              <ThemeIcon
                                size={46}
                                radius="xl"
                                variant="light"
                                color="violet"
                                style={{ flexShrink: 0 }}
                              >
                                <FaUser size={18} />
                              </ThemeIcon>

                              <Box style={{ minWidth: 0, flex: 1 }}>
                                <Text
                                  fw={750}
                                  c="#302052"
                                  style={{ overflowWrap: "anywhere" }}
                                >
                                  {user.username || user.email || user.id}
                                </Text>

                                <Group gap="xs" mt="sm" wrap="wrap">
                                  <Badge
                                    color={user.banned_until ? "red" : "green"}
                                    variant="light"
                                    radius="sm"
                                  >
                                    {user.banned_until ? "Banned" : "Active"}
                                  </Badge>
                                  <Badge
                                    color="violet"
                                    variant="light"
                                    radius="sm"
                                  >
                                    {user.role || "No role"}
                                  </Badge>
                                  {user.sub_role && (
                                    <Badge
                                      color="grape"
                                      variant="outline"
                                      radius="sm"
                                    >
                                      {user.sub_role}
                                    </Badge>
                                  )}
                                </Group>
                              </Box>
                            </Group>

                            {!editing && (
                              <Button
                                variant="light"
                                color="violet"
                                radius="md"
                                size="sm"
                                leftSection={<FaUserCog size={13} />}
                                onClick={() => startEditing(user)}
                              >
                                Edit
                              </Button>
                            )}
                          </Group>

                          {!editing ? (
                            <>
                              <Divider color="#F0EAF9" />
                              <Group
                                justify="space-between"
                                align="center"
                                gap="xs"
                              >
                                <Group gap="xs" wrap="nowrap">
                                  <FaCalendarAlt size={12} color="#9B8CB4" />
                                  <Text size="xs" c="#8A7DA3">
                                    Created{" "}
                                    {user.created_at
                                      ? new Date(
                                          user.created_at,
                                        ).toLocaleDateString()
                                      : "date unavailable"}
                                  </Text>
                                </Group>
                                <Text
                                  size="xs"
                                  c="#9B8CB4"
                                  style={{ overflowWrap: "anywhere" }}
                                >
                                  ID: {user.id.slice(0, 8)}…
                                </Text>
                              </Group>
                            </>
                          ) : (
                            <>
                              <Divider color="#E8DEFF" />

                              <SimpleGrid
                                cols={{ base: 1, sm: 2 }}
                                spacing="md"
                              >
                                <Autocomplete
                                  label="Role"
                                  description="Select a preset or enter a custom role."
                                  placeholder="Select or enter a role"
                                  data={ROLES}
                                  leftSection={<FaShieldAlt size={13} />}
                                  value={editRole}
                                  onChange={setEditRole}
                                  required
                                  limit={10}
                                  maxDropdownHeight={200}
                                  size="md"
                                  radius="md"
                                  styles={inputStyles}
                                />

                                <Autocomplete
                                  label="Sub-role"
                                  description="Leave blank to remove the sub-role."
                                  placeholder="Select or enter a sub-role"
                                  data={SUB_ROLES}
                                  value={editSubRole}
                                  onChange={setEditSubRole}
                                  limit={10}
                                  maxDropdownHeight={200}
                                  size="md"
                                  radius="md"
                                  styles={inputStyles}
                                />

                                <PasswordInput
                                  label="New password"
                                  description="Leave blank to keep the current password."
                                  placeholder="At least 12 characters"
                                  leftSection={<FaLock size={13} />}
                                  value={newPassword}
                                  onChange={(event) =>
                                    setNewPassword(event.currentTarget.value)
                                  }
                                  minLength={6}
                                  maxLength={128}
                                  autoComplete="new-password"
                                  size="md"
                                  radius="md"
                                  styles={inputStyles}
                                />
                              </SimpleGrid>

                              <Group justify="flex-end" gap="sm">
                                <Button
                                  variant="subtle"
                                  color="gray"
                                  radius="md"
                                  leftSection={<FaArrowLeft size={12} />}
                                  onClick={() => {
                                    setEditingId(null);
                                    setNewPassword("");
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  radius="md"
                                  loading={saving}
                                  leftSection={!saving && <FaCheck size={13} />}
                                  style={primaryButtonStyle}
                                  onClick={() => void saveChanges(user)}
                                >
                                  Save changes
                                </Button>
                              </Group>
                            </>
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              )}

              <Divider color="#EEE7FA" />

              <Group justify="space-between" align="center" gap="sm">
                <Text size="xs" c="#9B8CB4">
                  Showing {users.length} account{users.length === 1 ? "" : "s"}
                </Text>
                <Group gap="xs">
                  <Button
                    variant="default"
                    color="violet"
                    radius="md"
                    size="sm"
                    leftSection={<FaChevronLeft size={11} />}
                    disabled={page <= 1 || loading}
                    onClick={() => void loadUsers(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="default"
                    color="violet"
                    radius="md"
                    size="sm"
                    rightSection={<FaChevronRight size={11} />}
                    disabled={!hasMore || loading}
                    onClick={() => void loadUsers(page + 1)}
                  >
                    Next
                  </Button>
                </Group>
              </Group>
            </Stack>
          </Card>

          <Group justify="center" gap="xs" py="xs">
            <FaShieldAlt size={12} color="#9B8CB4" />
            <Text
              size="xs"
              c="#897DA2"
              ta="center"
              style={{ letterSpacing: "0.035em" }}
            >
              WOODCRAFT KITCHEN CABINETS · SECURE ADMINISTRATION
            </Text>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}
