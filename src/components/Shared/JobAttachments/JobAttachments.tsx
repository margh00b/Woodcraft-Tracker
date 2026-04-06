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
  SimpleGrid,
  Image,
  Tooltip,
  Button,
  Divider,
  Modal,
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
  FaImage,
  FaEye,
  FaTrash,
  FaFileAlt,
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
  "Installation (Pictures)": "green",
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

  const renderThumbnailGrid = (files: typeof attachments) => {
    if (!files) return null;
    return (
      <SimpleGrid cols={full ? 8 : 6} spacing="xs" mt="xs">
        {files.map((file) => {
          const isImg = isImageFile(file.file_name);
          const url = getPublicUrl(file.file_path);
          const isPdf = file.file_name.toLowerCase().endsWith(".pdf");

          return (
            <Paper
              key={file.id}
              withBorder
              radius="sm"
              bg="gray.1"
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                overflow: "hidden",
                transition: "box-shadow 0.2s ease",
              }}
            >
              <Box
                onClick={() => window.open(url, "_blank")}
                style={{
                  width: "100%",
                  height: "100%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isImg
                    ? "black"
                    : "var(--mantine-color-gray-0)",
                }}
              >
                {isImg ? (
                  <Image
                    src={url}
                    alt={file.file_name}
                    fit="cover"
                    w="100%"
                    h="100%"
                  />
                ) : (
                  <Stack align="center" gap={2}>
                    {isPdf ? (
                      <FaFilePdf size={24} color="#fa5252" />
                    ) : (
                      <FaFileAlt size={24} color="#7950f2" />
                    )}
                  </Stack>
                )}
              </Box>

              <Group
                gap={4}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  zIndex: 10,
                }}
              >
                <Tooltip label="View" position="top" withArrow fz="xs">
                  <ActionIcon
                    size="sm"
                    variant="default"
                    radius="xl"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(url, "_blank");
                    }}
                    style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
                  >
                    <FaEye size={10} color="var(--mantine-color-blue-6)" />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Download" position="top" withArrow fz="xs">
                  <ActionIcon
                    size="sm"
                    variant="default"
                    radius="xl"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(url, file.file_name);
                    }}
                    style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
                  >
                    <FaDownload
                      size={10}
                      color="var(--mantine-color-green-6)"
                    />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete" position="top" withArrow fz="xs">
                  <ActionIcon
                    size="sm"
                    variant="default"
                    radius="xl"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(file);
                    }}
                    style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
                  >
                    <FaTrash size={10} color="var(--mantine-color-red-6)" />
                  </ActionIcon>
                </Tooltip>
              </Group>

              <Box
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "4px 6px",
                  background: "rgba(255, 255, 255, 0.95)",
                  borderTop: "1px solid #eee",
                  zIndex: 5,
                }}
              >
                <Text
                  size="10px"
                  truncate
                  fw={600}
                  c="dark"
                  lh={1.1}
                  ta="center"
                >
                  {file.file_name}
                </Text>
                <Text size="9px" c="dimmed" truncate ta="center">
                  {dayjs(file.created_at).format("MMM D")}
                </Text>
              </Box>
            </Paper>
          );
        })}
      </SimpleGrid>
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
                      {renderThumbnailGrid(files)}
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
                      {renderThumbnailGrid(files)}
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
              root: { flex: 1, maxWidth: full ? "200px" : "140px" },
              input: {
                fontWeight: 600,
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
            maxSize={50 * 1024 ** 2}
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
