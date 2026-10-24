"use client";

import {
  Paper,
  Group,
  Text,
  Stack,
  ActionIcon,
  Loader,
  Center,
  Box,
  ScrollArea,
  Collapse,
  UnstyledButton,
  Select,
  Badge,
  Image,
  Button,
  Modal,
  Menu,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Dropzone } from "@mantine/dropzone";
import { notifications } from "@mantine/notifications";
import {
  FaPaperclip,
  FaFilePdf,
  FaDownload,
  FaCloudUploadAlt,
  FaTimesCircle,
  FaChevronRight,
  FaExclamationCircle,
  FaEye,
  FaTrash,
  FaFileAlt,
  FaEllipsisV,
} from "react-icons/fa";
import { useJobAttachments } from "@/hooks/useJobAttachments";
import { linearGradients } from "@/theme";
import dayjs from "dayjs";
import { useEffect, useState, useMemo } from "react";
import { JobAttachmentCategoryOptions } from "@/dropdowns/dropdownOptions";

const CATEGORIES = JobAttachmentCategoryOptions;

const CATEGORY_COLORS: Record<string, string> = {
  General: "gray",
  Service: "orange",
  Inspection: "blue",
  Procurement: "violet",
  Installation: "green",
  Sales: "cyan",
};

const isImageFile = (fileName: string) => {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
};

export default function JobAttachments({
  jobId,
  full,
}: {
  jobId: number;
  full?: boolean;
}) {
  const {
    attachments,
    isLoading,
    uploadFileAsync,
    isUploading,
    getPublicUrl,
    deleteFile,
  } = useJobAttachments(jobId);

  const [mainOpened, { toggle: toggleMain, open: openMain }] =
    useDisclosure(false);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  const [categoryOpenStates, setCategoryOpenStates] = useState<
    Record<string, boolean>
  >({});
  const [category, setCategory] = useState<string | null>(null);

  const [pendingFiles, setPendingFiles] = useState<
    { file: File; category: string }[]
  >([]);

  useEffect(() => {
    if (isUploading) openMain();
  }, [isUploading, openMain]);

  const groupedAttachments = useMemo(() => {
    if (!attachments) return {};
    const groups: Record<string, typeof attachments> = {};
    attachments.forEach((file) => {
      if (!groups[file.category]) groups[file.category] = [];
      groups[file.category].push(file);
    });
    return groups;
  }, [attachments]);

  const toggleCategory = (cat: string) => {
    setCategoryOpenStates((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const handleDrop = (files: File[]) => {
    if (!category) return;
    const newPending = files.map((file) => ({ file, category }));
    setPendingFiles((prev) => [...prev, ...newPending]);
    openModal();
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    if (pendingFiles.length === 1) closeModal();
  };

  const handleUploadPending = async () => {
    if (pendingFiles.length === 0) return;

    try {
      await Promise.all(
        pendingFiles.map((item) =>
          uploadFileAsync({
            file: item.file,
            category: item.category,
            silent: true,
          }),
        ),
      );

      notifications.show({
        title: "Success",
        message: `${pendingFiles.length} files uploaded successfully`,
        color: "green",
      });

      setPendingFiles([]);
      closeModal();
    } catch (error) {
      console.error("Batch upload incomplete", error);
    }
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Download failed", e);
      window.open(url, "_blank");
    }
  };

  const handleDelete = (file: any) => {
    if (
      window.confirm(`Are you sure you want to delete "${file.file_name}"?`)
    ) {
      deleteFile(file);
    }
  };
  const renderAttachmentList = (files: typeof attachments) => {
    if (!files) return null;
    return (
      <Stack gap={6} mt="xs">
        {files.map((file) => {
          const isImg = isImageFile(file.file_name);
          const url = getPublicUrl(file.file_path);
          const isPdf = file.file_name.toLowerCase().endsWith(".pdf");

          return (
            <Group
              key={file.id}
              justify="space-between"
              bg="gray.0"
              p="xs"
              style={{
                borderRadius: 8,
                border: "1px solid #eaeaea",
              }}
            >
              <Group gap="sm" style={{ overflow: "hidden", flex: 1 }}>
                <Box
                  w={50}
                  h={50}
                  style={{
                    borderRadius: 6,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "black",
                    flexShrink: 0,
                    border: "1px solid #dee2e6",
                  }}
                >
                  {isImg ? (
                    <Image
                      src={url}
                      w="100%"
                      h="100%"
                      fit="cover"
                      alt={file.file_name}
                    />
                  ) : (
                    <Center w="100%" h="100%" bg="gray.1">
                      {isPdf ? (
                        <FaFilePdf size={16} color="#fa5252" />
                      ) : (
                        <FaFileAlt size={16} color="#7950f2" />
                      )}
                    </Center>
                  )}
                </Box>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size="xs" c="dimmed" mb={1}>
                    {dayjs(file.created_at).format("MMM D, YYYY")}
                  </Text>
                  <Text size="sm" truncate fw={600} c="dark">
                    {file.file_name}
                  </Text>
                  
                  {file.file_tag && file.file_tag !== "General" && (
                    <Badge size="xs" color="green" variant="light" mt={4}>
                      {file.file_tag}
                    </Badge>
                  )}
                </div>
              </Group>

              
              <Menu position="bottom-end" shadow="md" width={140}>
                <Menu.Target>
                  <ActionIcon size="sm" variant="subtle" color="gray">
                    <FaEllipsisV size={12} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={
                      <FaEye size={12} color="var(--mantine-color-blue-6)" />
                    }
                    onClick={() => window.open(url, "_blank")}
                  >
                    View
                  </Menu.Item>
                  <Menu.Item
                    leftSection={
                      <FaDownload
                        size={12}
                        color="var(--mantine-color-green-6)"
                      />
                    }
                    onClick={() => handleDownload(url, file.file_name)}
                  >
                    Download
                  </Menu.Item>
                  <Menu.Item
                    color="red"
                    leftSection={<FaTrash size={12} />}
                    onClick={() => handleDelete(file)}
                  >
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          );
        })}
      </Stack>
    );
  };

  const renderContent = () => (
    <Stack gap="sm" pt="xs">
      <ScrollArea.Autosize mah={full ? 500 : 350} type="hover" offsetScrollbars>
        <Stack gap={2}>
          {isLoading ? (
            <Center p="sm">
              <Loader size="xs" color="gray" />
            </Center>
          ) : (
            <>
              {CATEGORIES.map((cat) => {
                const files = groupedAttachments[cat];
                if (!files || files.length === 0) return null;

                const isOpen = categoryOpenStates[cat] ?? false;

                return (
                  <Box key={cat} mb="sm">
                    <UnstyledButton
                      onClick={() => toggleCategory(cat)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        padding: "4px 0",
                      }}
                    >
                      <Group gap={6}>
                        <FaChevronRight
                          size={10}
                          style={{
                            transform: isOpen ? "rotate(90deg)" : "none",
                            transition: "transform 200ms ease",
                            color: "var(--mantine-color-dimmed)",
                          }}
                        />
                        <Badge
                          size="sm"
                          variant="light"
                          color={CATEGORY_COLORS[cat] || "gray"}
                          radius="sm"
                          style={{ textTransform: "none", cursor: "pointer" }}
                        >
                          {cat}
                        </Badge>
                        <Text size="xs" c="dimmed" fw={500}>
                          ({files.length})
                        </Text>
                      </Group>
                    </UnstyledButton>

                    <Collapse in={isOpen}>
                      {renderAttachmentList(files)}
                    </Collapse>
                  </Box>
                );
              })}

              {Object.keys(groupedAttachments).map((cat) => {
                if (CATEGORIES.includes(cat)) return null;
                const files = groupedAttachments[cat];
                const isOpen = categoryOpenStates[cat] ?? false;

                return (
                  <Box key={cat} mb="sm">
                    <UnstyledButton
                      onClick={() => toggleCategory(cat)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        padding: "4px 0",
                      }}
                    >
                      <Group gap={6}>
                        <FaChevronRight
                          size={10}
                          style={{
                            transform: isOpen ? "rotate(90deg)" : "none",
                            transition: "transform 200ms ease",
                            color: "var(--mantine-color-dimmed)",
                          }}
                        />
                        <Badge
                          size="sm"
                          variant="light"
                          color="gray"
                          radius="sm"
                          style={{ textTransform: "none", cursor: "pointer" }}
                        >
                          {cat}
                        </Badge>
                        <Text size="xs" c="dimmed" fw={500}>
                          ({files.length})
                        </Text>
                      </Group>
                    </UnstyledButton>
                    <Collapse in={isOpen}>
                      {renderAttachmentList(files)}
                    </Collapse>
                  </Box>
                );
              })}

              {attachments?.length === 0 && (
                <Text c="dimmed" size="xs" fs="italic" ta="center" py="xs">
                  No files attached.
                </Text>
              )}
            </>
          )}
        </Stack>
      </ScrollArea.Autosize>

      {pendingFiles.length > 0 && !modalOpened && (
        <Button
          fullWidth
          variant="light"
          color="violet"
          onClick={openModal}
          leftSection={<FaCloudUploadAlt />}
          mt="xs"
        >
          Review Pending Uploads ({pendingFiles.length})
        </Button>
      )}

      <Stack gap={4} mt="xs">
        <Group align="stretch" gap={8} wrap="nowrap">
          <Select
            data={CATEGORIES}
            value={category}
            onChange={setCategory}
            placeholder="Category"
            size="sm"
            variant="filled"
            allowDeselect={false}
            comboboxProps={{ withinPortal: false }}
            styles={{
              wrapper: {
                height: "100%",
              },
              root: {
                flex: 1,
                maxWidth: full ? "200px" : "140px",
              },
              input: {
                fontWeight: 600,
                height: "100%",
                color: category ? "#4A00E0" : undefined,
                borderColor: !category
                  ? "var(--mantine-color-red-3)"
                  : undefined,
              },
            }}
          />

          <Dropzone
            onDrop={handleDrop}
            onReject={() => console.log("File rejected")}
            multiple
            disabled={!category}
            h={full ? undefined : 36}
            p={full ? undefined : 0}
            radius="sm"
            style={{
              flex: 1,
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
              minHeight: full ? "36px" : "36px",
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

              {!full && (
                <Text size="xs" c="dimmed" fw={600}>
                  {!category ? "Select Category" : `Queue`}
                </Text>
              )}
              {full && (
                <Text size="xs" c="dimmed" fw={600}>
                  {!category
                    ? "Select category first"
                    : `Queue ${category} files`}
                </Text>
              )}
            </Group>
          </Dropzone>
        </Group>
      </Stack>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={
          <Text fw={700} c="violet.9">
            Review Upload Queue
          </Text>
        }
        size="lg"
        centered
        overlayProps={{ opacity: 0.5, blur: 3 }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            The following files are ready to be uploaded. Please review them
            before confirming.
          </Text>

          <ScrollArea.Autosize mah={300} type="always" offsetScrollbars>
            <Stack gap="xs">
              {pendingFiles.map((item, idx) => {
                const isImg = isImageFile(item.file.name);
                const previewUrl = isImg
                  ? URL.createObjectURL(item.file)
                  : null;

                return (
                  <Group
                    key={idx}
                    justify="space-between"
                    bg="gray.0"
                    p="xs"
                    style={{ borderRadius: 8, border: "1px solid #eee" }}
                  >
                    <Group gap="sm" style={{ overflow: "hidden", flex: 1 }}>
                      <Box
                        w={40}
                        h={40}
                        style={{
                          borderRadius: 6,
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "white",
                          border: "1px solid #dee2e6",
                        }}
                      >
                        {isImg && previewUrl ? (
                          <Image
                            src={previewUrl}
                            w="100%"
                            h="100%"
                            fit="cover"
                            alt="prev"
                            onLoad={() => URL.revokeObjectURL(previewUrl)}
                          />
                        ) : (
                          <FaFilePdf size={20} color="gray" />
                        )}
                      </Box>

                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <Group gap="xs" mb={2}>
                          <Badge
                            size="sm"
                            color={CATEGORY_COLORS[item.category] || "gray"}
                            variant="filled"
                          >
                            {item.category}
                          </Badge>
                          <Text size="xs" c="dimmed">
                            {(item.file.size / 1024).toFixed(0)} KB
                          </Text>
                        </Group>
                        <Text size="sm" truncate fw={600} c="dark">
                          {item.file.name}
                        </Text>
                      </div>
                    </Group>
                    <ActionIcon
                      color="red"
                      variant="light"
                      onClick={() => removePendingFile(idx)}
                    >
                      <FaTrash size={14} />
                    </ActionIcon>
                  </Group>
                );
              })}
            </Stack>
          </ScrollArea.Autosize>

          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" color="gray" onClick={closeModal}>
              Keep Pending
            </Button>
            <Button
              onClick={handleUploadPending}
              loading={isUploading}
              style={{
                background: linearGradients.primary,
                border: 0,
              }}
              leftSection={<FaCloudUploadAlt />}
            >
              Upload All ({pendingFiles.length})
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );

  return (
    <Paper p="sm" radius="md" withBorder shadow="sm" bg="white">
      <UnstyledButton
        onClick={toggleMain}
        style={{ width: "100%", display: "block" }}
      >
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <FaChevronRight
              size={10}
              style={{
                transform: mainOpened ? "rotate(90deg)" : "none",
                transition: "transform 200ms ease",
                color: "var(--mantine-color-dimmed)",
              }}
            />
            <FaPaperclip
              size={full ? 14 : 12}
              style={{
                color: full
                  ? "var(--mantine-color-violet-6)"
                  : "var(--mantine-color-dimmed)",
              }}
            />
            <Text fw={full ? 700 : 600} size="sm" c="dark">
              Attachments
            </Text>
            <Badge size="xs" variant="light" color="gray">
              {attachments?.length || 0}
            </Badge>
          </Group>
          {isUploading && <Loader size={14} color="blue" type="dots" />}
        </Group>
      </UnstyledButton>
      <Collapse in={mainOpened}>{renderContent()}</Collapse>
    </Paper>
  );
}
