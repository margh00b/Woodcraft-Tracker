import {
  ActionIcon,
  Box,
  Button,
  Center,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { OutlookEmail } from "./useOutlook";
import { FaChevronLeft, FaChevronRight, FaSearch } from "react-icons/fa";
import dayjs from "dayjs";
import { useDebouncedCallback } from "@mantine/hooks";

interface InboxSidebarProps {
  emails: OutlookEmail[];
  loading: boolean;
  selectedEmailId: string | null;
  onSelect: (email: OutlookEmail) => void;
  page: number;
  onPageChange: (page: number) => void;
  onSearch: (query: string) => void;
  hasMore: boolean;
}

export function InboxSidebar({
  emails,
  loading,
  selectedEmailId,
  onSelect,
  page,
  onPageChange,
  onSearch,
  hasMore,
}: InboxSidebarProps) {
  const handleSearch = useDebouncedCallback((query: string) => {
    onSearch(query);
  }, 500);

  return (
    <Box
      w={350}
      h="100%"
      style={{
        borderRight: "1px solid var(--mantine-color-gray-3)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {}
      <Box
        p="sm"
        style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
      >
        <TextInput
          placeholder="Search Inbox..."
          leftSection={<FaSearch size={14} color="gray" />}
          onChange={(e) => handleSearch(e.target.value)}
          mb="xs"
        />
        <Text size="xs" c="violet" fw={700}>
          INBOX
        </Text>
      </Box>

      <ScrollArea style={{ flex: 1 }}>
        {loading && emails.length === 0 ? (
          <Center h={200}>
            <Loader size="sm" />
          </Center>
        ) : (
          <Stack gap={0}>
            {emails
              .filter(
                (email, index, self) =>
                  index ===
                  self.findIndex(
                    (t) => t.conversationId === email.conversationId
                  )
              )
              .map((email) => {
                const isSelected = selectedEmailId === email.id;
                return (
                  <Box
                    key={email.id}
                    onClick={() => onSelect(email)}
                    p="sm"
                    style={{
                      cursor: "pointer",
                      borderBottom: "1px solid var(--mantine-color-gray-1)",
                      backgroundColor: isSelected
                        ? "var(--mantine-color-violet-0)"
                        : "transparent",
                      borderLeft: isSelected
                        ? "4px solid var(--mantine-color-violet-6)"
                        : "4px solid transparent",
                      transition: "background-color 0.2s",
                    }}
                  >
                    <Group
                      justify="space-between"
                      align="flex-start"
                      wrap="nowrap"
                      mb={4}
                    >
                      <Text
                        size="sm"
                        fw={isSelected ? 700 : 600}
                        truncate
                        c="dark"
                        style={{ flex: 1 }}
                      >
                        {email.from?.emailAddress?.name ||
                          email.from?.emailAddress?.address}
                      </Text>
                      <Text
                        size="xs"
                        c="dimmed"
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {dayjs(email.receivedDateTime).format("MMM D")}
                      </Text>
                    </Group>
                    <Text size="sm" fw={500} truncate mb={2} c="dark">
                      {email.subject || "(No Subject)"}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={2}>
                      {email.bodyPreview}
                    </Text>
                  </Box>
                );
              })}
            {!loading && emails.length === 0 && (
              <Text p="xl" ta="center" c="dimmed" size="sm">
                No emails found
              </Text>
            )}
          </Stack>
        )}
      </ScrollArea>

      {}
      <Box
        p="xs"
        style={{
          borderTop: "1px solid var(--mantine-color-gray-2)",
          backgroundColor: "var(--mantine-color-gray-0)",
        }}
      >
        <Group justify="center" gap="md">
          <ActionIcon
            size="sm"
            variant="default"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            <FaChevronLeft size={10} />
          </ActionIcon>
          <Text size="xs" fw={500}>
            Page {page + 1}
          </Text>
          <ActionIcon
            size="sm"
            variant="default"
            disabled={!hasMore}
            onClick={() => onPageChange(page + 1)}
          >
            <FaChevronRight size={10} />
          </ActionIcon>
        </Group>
      </Box>
    </Box>
  );
}
