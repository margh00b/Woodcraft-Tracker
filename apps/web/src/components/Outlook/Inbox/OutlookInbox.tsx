import {
  Box,
  Button,
  Center,
  Group,
  Paper,
  Text,
  Stack,
  ThemeIcon,
} from "@mantine/core";
import { useState } from "react";
import { InboxSidebar } from "./InboxSidebar";
import { InboxDetail } from "./InboxDetail";
import { useOutlook, OutlookEmail } from "./useOutlook";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { FaMicrosoft } from "react-icons/fa";
import { gradients } from "@/theme";

export function OutlookInbox({ defaultJobId }: { defaultJobId?: number }) {
  const { emails, loading, page, loadPage, hasMore, setSearchQuery } =
    useOutlook();

  const [selectedEmail, setSelectedEmail] = useState<OutlookEmail | null>(null);
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const activeAccount = instance.getActiveAccount();
  const handleLogin = () => {
    instance
      .loginPopup({
        scopes: ["Mail.Read", "User.Read"],
        prompt: "select_account",
      })
      .catch(console.error);
  };
  const handleLogout = () => {
    instance.logoutPopup().catch(console.error);
  };

  if (!isAuthenticated) {
    return (
      <Center h="100vh" bg="gray.1">
        <Paper
          p={40}
          radius="lg"
          shadow="md"
          withBorder
          style={{ maxWidth: 400, width: "100%" }}
        >
          <Stack gap="lg" align="center">
            <ThemeIcon
              size={60}
              radius={60}
              variant="gradient"
              gradient={gradients.primary}
            >
              <FaMicrosoft size={28} />
            </ThemeIcon>

            <Box ta="center">
              <Text size="xl" fw={700} mb={6} style={{ color: "#343a40" }}>
                Outlook Integration
              </Text>
              <Text c="dimmed" size="sm" maw={300} mx="auto" lh={1.5}>
                Please sign in to access your inbox and manage emails directly
                within the dashboard.
              </Text>
            </Box>

            <Button
              fullWidth
              size="md"
              radius="md"
              variant="gradient"
              gradient={gradients.primary}
              leftSection={<FaMicrosoft size={18} />}
              onClick={handleLogin}
              style={{
                transition: "transform 0.2s",
              }}
            >
              Sign in with Outlook
            </Button>
          </Stack>
        </Paper>
      </Center>
    );
  }

  return (
    <Stack h="100vh" gap={0} bg="gray.1" p="md">
      <Paper p="md" radius="md" shadow="xs" mb="md" withBorder>
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <ThemeIcon
              size="lg"
              radius="md"
              variant="gradient"
              gradient={gradients.primary}
            >
              <FaMicrosoft size={20} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text fw={700} size="lg" style={{ color: "#343a40" }}>
                Outlook Integration
              </Text>
              <Text size="xs" c="dimmed">
                Connected as {activeAccount?.username}
              </Text>
            </Stack>
          </Group>

          <Group>
            <Group gap="xs" mr="sm">
              <Text size="sm" fw={500}>
                {activeAccount?.name}
              </Text>
            </Group>
            <Button
              variant="light"
              color="red"
              size="xs"
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </Group>
        </Group>
      </Paper>

      <Paper
        withBorder
        shadow="sm"
        radius="md"
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <InboxSidebar
          emails={emails}
          loading={loading}
          selectedEmailId={selectedEmail?.id || null}
          onSelect={setSelectedEmail}
          page={page}
          onPageChange={loadPage}
          onSearch={setSearchQuery}
          hasMore={hasMore}
        />
        <Box style={{ flex: 1, backgroundColor: "var(--mantine-color-white)" }}>
          {selectedEmail ? (
            <InboxDetail
              key={selectedEmail.id}
              email={selectedEmail}
              defaultJobId={defaultJobId}
            />
          ) : (
            <Center h="100%">
              <Box ta="center">
                <Text c="dimmed" size="lg">
                  Select an email to view details
                </Text>
              </Box>
            </Center>
          )}
        </Box>
      </Paper>
    </Stack>
  );
}
