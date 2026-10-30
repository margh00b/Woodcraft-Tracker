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
  rem,
} from "@mantine/core";
import {
  TbClipboardCheck,
  TbDownload,
  TbExternalLink,
  TbFileText,
  TbPhoto,
  TbPrinter,
} from "react-icons/tb";
import {
  InstallationReport,
  useInstallationReportPhotos,
} from "@/hooks/useInstallationReports";
import JSZip from "jszip";
import InstallationReportDetails from "./InstallationReportsDetails";
import { formatDate } from "@/utils/installationReportUtils";
import { useState } from "react";
import InstallationReportPdfModal from "./InstallationReportPdfModal";

type PhotosQuery = ReturnType<typeof useInstallationReportPhotos>;

type Props = {
  report: InstallationReport | null;
  photosQuery: PhotosQuery;
  onClose: () => void;
};

export default function InstallationReportsModal({
  report,
  photosQuery,
  onClose,
}: Props) {
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [zipDownloadError, setZipDownloadError] = useState<string | null>(null);
  const [pdfOpened, setPdfOpened] = useState(false);
  const downloadAllAttachments = async () => {
    const photos = photosQuery.data ?? [];

    if (!photos.length || isDownloadingZip) return;

    setIsDownloadingZip(true);
    setZipDownloadError(null);

    try {
      const zip = new JSZip();
      const usedNames = new Set<string>();

      await Promise.all(
        photos.map(async (photo) => {
          const response = await fetch(photo.signedUrl);

          if (!response.ok) {
            throw new Error(`Failed to download ${photo.file_name}`);
          }

          const blob = await response.blob();

          const originalName = (
            photo.file_name || `attachment-${photo.id}`
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
      link.download = `installation-report-${report?.job_number ?? report?.job_id}-attachments.zip`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setZipDownloadError(
        error instanceof Error
          ? error.message
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
              <TbClipboardCheck size={21} />
            </ThemeIcon>

            <Stack gap={2}>
              <Text fw={700}>
                Installation Report for Job #
                {String(report?.job_number).replace(/[^0-9]+$/, "")}
              </Text>
              <Text>{report?.address}</Text>
              <Text size="xs" c="dimmed"></Text>
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
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
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
                <Button
                  size="sm"
                  radius="md"
                  variant="gradient"
                  gradient={{ from: "violet.6", to: "indigo.7", deg: 135 }}
                  leftSection={<TbPrinter size={16} />}
                  onClick={() => setPdfOpened(true)}
                  disabled={photosQuery.isLoading}
                >
                  Print report
                </Button>
              </SimpleGrid>

              <Group justify="space-between" align="center"></Group>
            </Paper>

            <Box>
              <Group gap="xs" mb="sm">
                <ThemeIcon size={30} radius="md" variant="light" color="violet">
                  <TbFileText size={17} />
                </ThemeIcon>
                <Title order={4}>Report details</Title>
              </Group>

              <InstallationReportDetails details={report.details ?? {}} />
            </Box>

            <Divider />

            <Box>
              <Group justify="space-between" align="center" mb="sm">
                <Group gap="xs">
                  <ThemeIcon
                    size={30}
                    radius="md"
                    variant="light"
                    color="indigo"
                  >
                    <TbPhoto size={17} />
                  </ThemeIcon>
                  <Title order={4}>Attachments</Title>
                </Group>
                <Button
                  size="sm"
                  variant="default"
                  leftSection={<TbDownload size={16} />}
                  onClick={downloadAllAttachments}
                  loading={isDownloadingZip}
                  disabled={
                    photosQuery.isLoading ||
                    photosQuery.isError ||
                    !photosQuery.data?.length
                  }
                >
                  Download all
                </Button>
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
                <Badge variant="light" color="gray" radius="sm">
                  {photosQuery.data?.length ?? 0} files
                </Badge>
              </Group>

              {photosQuery.isLoading && (
                <Center py="xl">
                  <Stack align="center" gap="xs">
                    <Loader color="violet" />
                    <Text size="sm" c="dimmed">
                      Loading attachments...
                    </Text>
                  </Stack>
                </Center>
              )}

              {photosQuery.isError && (
                <Alert color="red" title="Unable to load attachments">
                  {photosQuery.error instanceof Error
                    ? photosQuery.error.message
                    : "Could not create signed links for report attachments."}
                </Alert>
              )}

              {!photosQuery.isLoading &&
                !photosQuery.isError &&
                (photosQuery.data?.length ?? 0) === 0 && (
                  <Paper
                    withBorder
                    radius="md"
                    p="xl"
                    style={{ borderStyle: "dashed" }}
                  >
                    <Center>
                      <Stack align="center" gap="xs">
                        <ThemeIcon
                          size={42}
                          radius="xl"
                          variant="light"
                          color="gray"
                        >
                          <TbPhoto size={21} />
                        </ThemeIcon>
                        <Text size="sm" fw={600}>
                          No attachments
                        </Text>
                        <Text size="xs" c="dimmed">
                          No files are linked to this report.
                        </Text>
                      </Stack>
                    </Center>
                  </Paper>
                )}

              {!!photosQuery.data?.length && (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  {photosQuery.data.map((photo) => (
                    <Paper key={photo.id} withBorder p="xs" radius="md">
                      {photo.file_type?.startsWith("image/") ? (
                        <Anchor
                          href={photo.signedUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Image
                            src={photo.signedUrl}
                            alt={photo.file_name}
                            h={190}
                            fit="contain"
                            radius="sm"
                            bg="gray.0"
                          />
                        </Anchor>
                      ) : (
                        <Center
                          h={190}
                          bg="var(--mantine-color-gray-0)"
                          style={{ borderRadius: rem(6) }}
                        >
                          <Button
                            component="a"
                            href={photo.signedUrl}
                            target="_blank"
                            rel="noreferrer"
                            variant="light"
                            color="violet"
                            rightSection={<TbExternalLink size={16} />}
                          >
                            Open attachment
                          </Button>
                        </Center>
                      )}

                      <Text size="sm" fw={600} mt="sm" lineClamp={2}>
                        {photo.file_tag}
                      </Text>

                      <Group justify="space-between" mt={4} gap="xs">
                        <Anchor
                          href={photo.signedUrl}
                          target="_blank"
                          rel="noreferrer"
                          size="xs"
                        >
                          Open
                        </Anchor>
                      </Group>
                    </Paper>
                  ))}
                </SimpleGrid>
              )}
            </Box>
          </Stack>
        )}
      </Modal>

      <InstallationReportPdfModal
        opened={pdfOpened}
        onClose={() => setPdfOpened(false)}
        report={report}
        photos={photosQuery.data ?? []}
      />
    </>
  );
}
