"use client";

import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Image,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  TbClipboardList,
  TbDownload,
  TbFileText,
  TbPhoto,
  TbPrinter,
} from "react-icons/tb";
import JSZip from "jszip";
import { useState } from "react";
import type { ReactElement, ReactNode } from "react";
import type { InsiteReport } from "@/hooks/useInsiteReports";
import { formatDate } from "@/utils/installationReportUtils";
import InsiteReportDetails from "./InsiteReportDetails";
import InsiteReportPdfModal from "./InsiteReportPdfModal";

export type InsiteReportAttachment = {
  id: number;
  file_name: string;
  file_type: string | null;
  file_tag: string | null;
  signedUrl: string;
};

type InsiteReportModalProps = {
  report: InsiteReport | null;
  reportLabel: string;
  icon?: ReactNode;
  attachments: InsiteReportAttachment[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onClose: () => void;
  children?: ReactNode;
  pdfDocument?: ReactElement | null;
  detailsVariant?: "default" | "installation";
};

export default function InsiteReportModal({
  report,
  reportLabel,
  icon,
  attachments,
  isLoading,
  isError,
  error,
  onClose,
  children,
  pdfDocument,
  detailsVariant = "default",
}: InsiteReportModalProps) {
  const [pdfOpened, setPdfOpened] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [zipDownloadError, setZipDownloadError] = useState<string | null>(null);

  const downloadAllAttachments = async () => {
    if (!attachments.length || isDownloadingZip) return;

    setIsDownloadingZip(true);
    setZipDownloadError(null);

    try {
      const zip = new JSZip();
      const usedNames = new Set<string>();

      await Promise.all(
        attachments.map(async (attachment) => {
          const response = await fetch(attachment.signedUrl);

          if (!response.ok) {
            throw new Error(`Failed to download ${attachment.file_name}`);
          }

          const blob = await response.blob();
          const originalName = (
            attachment.file_name || `attachment-${attachment.id}`
          ).replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_");

          const dotIndex = originalName.lastIndexOf(".");
          const baseName =
            dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
          const extension = dotIndex > 0 ? originalName.slice(dotIndex) : "";

          let fileName = originalName;
          let suffix = 2;

          while (usedNames.has(fileName.toLowerCase())) {
            fileName = `${baseName} (${suffix++})${extension}`;
          }

          usedNames.add(fileName.toLowerCase());
          zip.file(fileName, blob);
        }),
      );

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${reportLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${report?.job_number ?? report?.job_id}-attachments.zip`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setZipDownloadError(
        downloadError instanceof Error
          ? downloadError.message
          : "Failed to create the ZIP file.",
      );
    } finally {
      setIsDownloadingZip(false);
    }
  };

  return (
    <>
      <Modal
        opened={!!report}
        onClose={onClose}
        title={
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon
              size={38}
              radius="md"
              variant="gradient"
              gradient={{ from: "violet.6", to: "indigo.7", deg: 135 }}
            >
              {icon ?? <TbClipboardList size={21} />}
            </ThemeIcon>

            <Stack gap={2}>
              <Text fw={700}>
                {reportLabel} for Job #
                {report?.job_number?.replace(/[^0-9]+$/, "") ?? report?.job_id}
              </Text>
              <Text size="sm" c="dimmed">
                {report?.address ?? "Address unavailable"}
              </Text>
            </Stack>
          </Group>
        }
        size="xl"
        centered
        scrollAreaComponent={ScrollArea.Autosize}
        radius="lg"
        overlayProps={{ backgroundOpacity: 0.45, blur: 2 }}
      >
        {report && (
          <Stack gap="lg">
            <Paper withBorder radius="md" p="md">
              <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md">
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={600}>
                    SUBMISSION DATE
                  </Text>
                  <Text size="sm" fw={600}>
                    {formatDate(report.created_at)}
                  </Text>
                </Stack>

                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={600}>
                    SUBMITTED BY
                  </Text>
                  <Text size="sm" fw={600}>
                    {report.submitted_by || "—"}
                  </Text>
                </Stack>

                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={600}>
                    REPORT ID
                  </Text>
                  <Text size="sm" fw={600}>
                    #{report.id}
                  </Text>
                </Stack>

                <Button
                  size="sm"
                  radius="md"
                  variant="gradient"
                  gradient={{ from: "violet.6", to: "indigo.7", deg: 135 }}
                  leftSection={<TbPrinter size={16} />}
                  onClick={() => setPdfOpened(true)}
                  disabled={!pdfDocument || isLoading}
                >
                  Print report
                </Button>
              </SimpleGrid>
            </Paper>

            {children}

            <Box>
              <Group gap="xs" mb="sm">
                <ThemeIcon size={30} radius="md" variant="light" color="violet">
                  <TbFileText size={17} />
                </ThemeIcon>
                <Title order={4}>Report details</Title>
              </Group>

              <InsiteReportDetails
                details={report.details ?? {}}
                variant={detailsVariant}
              />
            </Box>

            <Divider />

            <Box>
              <Group justify="space-between" align="center" mb="sm" wrap="wrap">
                <Group gap="xs">
                  <ThemeIcon size={30} radius="md" variant="light" color="indigo">
                    <TbPhoto size={17} />
                  </ThemeIcon>
                  <Title order={4}>Attachments</Title>
                  <Badge variant="light" color="gray">
                    {attachments.length} files
                  </Badge>
                </Group>

                <Button
                  size="sm"
                  variant="default"
                  leftSection={<TbDownload size={16} />}
                  onClick={downloadAllAttachments}
                  loading={isDownloadingZip}
                  disabled={isLoading || isError || attachments.length === 0}
                >
                  Download all
                </Button>
              </Group>

              {zipDownloadError && (
                <Alert
                  color="red"
                  title="Download failed"
                  withCloseButton
                  onClose={() => setZipDownloadError(null)}
                  mb="sm"
                >
                  {zipDownloadError}
                </Alert>
              )}

              {isLoading && (
                <Center py="xl">
                  <Stack align="center" gap="xs">
                    <Loader color="violet" />
                    <Text size="sm" c="dimmed">
                      Loading attachments...
                    </Text>
                  </Stack>
                </Center>
              )}

              {isError && (
                <Alert color="red" title="Unable to load attachments">
                  {error instanceof Error
                    ? error.message
                    : "Could not load report attachments."}
                </Alert>
              )}

              {!isLoading && !isError && attachments.length === 0 && (
                <Paper
                  withBorder
                  radius="md"
                  p="xl"
                  style={{ borderStyle: "dashed" }}
                >
                  <Center>
                    <Text size="sm" c="dimmed">
                      No attachments found.
                    </Text>
                  </Center>
                </Paper>
              )}

              {!isLoading && !isError && attachments.length > 0 && (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  {attachments.map((attachment) => (
                    <Paper
                      key={attachment.id}
                      withBorder
                      p="xs"
                      radius="md"
                    >
                      <Anchor
                        href={attachment.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {attachment.file_type?.startsWith("image/") ? (
                          <Image
                            src={attachment.signedUrl}
                            alt={attachment.file_name}
                            h={190}
                            fit="contain"
                            radius="sm"
                            bg="gray.0"
                          />
                        ) : (
                          <Center h={190}>
                            <Text size="sm" c="violet">
                              Open attachment ↗
                            </Text>
                          </Center>
                        )}
                      </Anchor>

                      <Text size="sm" fw={600} mt="sm" lineClamp={2}>
                        {attachment.file_tag || attachment.file_name}
                      </Text>
                    </Paper>
                  ))}
                </SimpleGrid>
              )}
            </Box>
          </Stack>
        )}
      </Modal>

      {pdfDocument && (
        <InsiteReportPdfModal
          opened={pdfOpened}
          onClose={() => setPdfOpened(false)}
          title={`${reportLabel} PDF`}
        >
          {pdfDocument}
        </InsiteReportPdfModal>
      )}
    </>
  );
}
