"use client";

import {
  Paper,
  Group,
  Text,
  Stack,
  ThemeIcon,
  ActionIcon,
  Loader,
  Center,
  Box,
  ScrollArea,
  Collapse,
  UnstyledButton,
  Select,
  Badge,
  rem,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Dropzone, PDF_MIME_TYPE } from "@mantine/dropzone";
import {
  FaPaperclip,
  FaFilePdf,
  FaDownload,
  FaCloudUploadAlt,
  FaTimesCircle,
  FaChevronRight,
  FaExclamationCircle,
} from "react-icons/fa";
import { useJobAttachments } from "@/hooks/useJobAttachments";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

const CATEGORIES = [
  "General",
  "Service",
  "Inspection",
  "Procurement",
  "Installation",
  "Sales",
];

const CATEGORY_COLORS: Record<string, string> = {
  General: "gray",
  Service: "orange",
  Inspection: "blue",
  Procurement: "violet",
  Installation: "green",
  Sales: "cyan",
};

export default function JobAttachments({ jobId }: { jobId: number }) {
  const { attachments, isLoading, uploadFile, isUploading, getPublicUrl } =
    useJobAttachments(jobId);

  const [opened, { toggle, open }] = useDisclosure(false);

  // 1. Initialize as null to force selection
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    if (isUploading) open();
  }, [isUploading, open]);

  const handleDrop = (files: File[]) => {
    if (!category) return; // Guard clause
    files.forEach((file) => {
      uploadFile({ file, category });
    });
  };

  return (
    <Paper p="sm" radius="md" withBorder shadow="sm" bg="white">
      {/* Header Trigger */}
      <UnstyledButton
        onClick={toggle}
        style={{ width: "100%", display: "block" }}
      >
        <Group justify="space-between" align="center" mb={opened ? "xs" : 0}>
          <Group gap="xs">
            <FaChevronRight
              size={10}
              style={{
                transform: opened ? "rotate(90deg)" : "none",
                transition: "transform 200ms ease",
                color: "var(--mantine-color-dimmed)",
              }}
            />
            <FaPaperclip
              size={12}
              style={{ color: "var(--mantine-color-dimmed)" }}
            />
            <Text fw={600} size="sm" c="dark">
              Attachments
            </Text>
            <Text size="xs" c="dimmed" fw={500} style={{ opacity: 0.8 }}>
              ({attachments?.length || 0})
            </Text>
          </Group>
          {isUploading && <Loader size={14} color="blue" type="dots" />}
        </Group>
      </UnstyledButton>

      <Collapse in={opened}>
        <Stack gap="sm">
          {/* File List Area */}
          <ScrollArea.Autosize mah={220} type="hover" offsetScrollbars>
            <Stack gap={4}>
              {isLoading ? (
                <Center p="sm">
                  <Loader size="xs" color="gray" />
                </Center>
              ) : attachments && attachments.length > 0 ? (
                attachments.map((file) => (
                  <Group
                    key={file.id}
                    wrap="nowrap"
                    justify="space-between"
                    p={6}
                    style={{
                      borderRadius: "6px",
                      border: "1px solid transparent",
                      transition: "all 0.2s",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "var(--mantine-color-gray-0)";
                      e.currentTarget.style.borderColor =
                        "var(--mantine-color-gray-2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.borderColor = "transparent";
                    }}
                  >
                    <Group
                      gap="xs"
                      style={{ overflow: "hidden", flex: 1 }}
                      align="center"
                    >
                      <ThemeIcon
                        color="red"
                        variant="light"
                        size="sm"
                        radius="sm"
                        style={{ minWidth: "20px", height: "20px" }}
                      >
                        <FaFilePdf size={10} />
                      </ThemeIcon>

                      <Box style={{ overflow: "hidden" }}>
                        <Group gap={6} wrap="nowrap">
                          <Text size="xs" fw={600} truncate c="dark" lh={1.2}>
                            {file.file_name}
                          </Text>
                          {/* Category Badge */}
                          <Badge
                            size="xs"
                            variant="outline"
                            color={CATEGORY_COLORS[file.category] || "gray"}
                            radius="sm"
                            style={{
                              textTransform: "none",
                              fontSize: "9px",
                              height: "16px",
                              padding: "0 4px",
                            }}
                          >
                            {file.category}
                          </Badge>
                        </Group>
                        <Text size="10px" c="dimmed" truncate lh={1.1}>
                          {dayjs(file.created_at).format("MMM D, h:mm A")} •{" "}
                          {((file.file_size ?? 0) / 1024).toFixed(0)}KB •{" "}
                          {file.uploaded_by || "System"}
                        </Text>
                      </Box>
                    </Group>

                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      component="a"
                      href={getPublicUrl(file.file_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Download"
                    >
                      <FaDownload size={10} />
                    </ActionIcon>
                  </Group>
                ))
              ) : (
                <Text c="dimmed" size="xs" fs="italic" ta="center" py="xs">
                  No files attached.
                </Text>
              )}
            </Stack>
          </ScrollArea.Autosize>

          <Stack gap={4}>
            {/* Category Selector - Mandatory */}
            <Select
              data={CATEGORIES}
              value={category}
              onChange={setCategory}
              placeholder="Select Category (Required)"
              size="xs"
              variant="filled"
              allowDeselect={false}
              withAsterisk
              comboboxProps={{ withinPortal: false }}
              styles={{
                input: {
                  fontWeight: 600,
                  color: category ? "#4A00E0" : undefined,
                  borderColor: !category
                    ? "var(--mantine-color-red-3)"
                    : undefined,
                },
              }}
            />

            {/* Dropzone - Disabled until category selected */}
            <Dropzone
              onDrop={handleDrop}
              onReject={() => console.log("File rejected")}
              maxSize={5 * 1024 ** 2}
              accept={PDF_MIME_TYPE}
              loading={isUploading}
              multiple
              disabled={!category} // Disable interaction
              h={36}
              p={0}
              radius="sm"
              style={{
                border: "1px dashed",
                borderColor: !category
                  ? "var(--mantine-color-gray-3)"
                  : "var(--mantine-color-gray-4)",
                backgroundColor: !category
                  ? "var(--mantine-color-gray-0)"
                  : "var(--mantine-color-white)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: !category ? "not-allowed" : "pointer",
                opacity: !category ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              <Group justify="center" gap={6} style={{ pointerEvents: "none" }}>
                {!category ? (
                  <FaExclamationCircle
                    size={12}
                    color="var(--mantine-color-dimmed)"
                  />
                ) : (
                  <Dropzone.Idle>
                    <FaCloudUploadAlt
                      size={12}
                      color="var(--mantine-color-dimmed)"
                    />
                  </Dropzone.Idle>
                )}

                <Dropzone.Accept>
                  <FaCloudUploadAlt
                    size={12}
                    color="var(--mantine-color-blue-6)"
                  />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <FaTimesCircle size={12} color="var(--mantine-color-red-6)" />
                </Dropzone.Reject>

                <Text size="xs" c="dimmed" fw={600}>
                  {!category
                    ? "Select category to upload"
                    : `Drop ${category} PDF`}
                </Text>
              </Group>
            </Dropzone>
          </Stack>
        </Stack>
      </Collapse>
    </Paper>
  );
}
