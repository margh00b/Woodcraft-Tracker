"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Center,
  Container,
  Group,
  Image,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { TbClipboardCheck, TbExternalLink, TbPrinter, TbSearch } from "react-icons/tb";
import {
  InstallationReport,
  useInstallationReportPhotos,
  useInstallationReports,
} from "@/hooks/useInstallationReports";

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.map(String).join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function ReportDetails({ details }: { details: Record<string, unknown> }) {
  const preferredOrder = [
    "notes",
    "measurements",
    "notApplicableOpenings",
  ];
  const entries = Object.entries(details ?? {}).sort(([a], [b]) => {
    const aIndex = preferredOrder.indexOf(a);
    const bIndex = preferredOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  if (!entries.length) {
    return <Text c="dimmed" size="sm">No report details were saved.</Text>;
  }

  return (
    <Stack gap="sm">
      {entries.map(([key, value]) => {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          const nestedEntries = Object.entries(value as Record<string, unknown>);
          return (
            <Paper key={key} withBorder p="sm" radius="md">
              <Text fw={700} mb="xs">{key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</Text>
              {nestedEntries.length ? (
                <Table withTableBorder={false} verticalSpacing="xs">
                  <Table.Tbody>
                    {nestedEntries.map(([nestedKey, nestedValue]) => (
                      <Table.Tr key={nestedKey}>
                        <Table.Td w="45%">
                          <Text size="sm" c="dimmed">{nestedKey}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                            {displayValue(nestedValue)}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              ) : <Text size="sm" c="dimmed">—</Text>}
            </Paper>
          );
        }

        return (
          <Paper key={key} withBorder p="sm" radius="md">
            <Text fw={700} size="sm" mb={4}>
              {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
            </Text>
            <Text size="sm" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {displayValue(value)}
            </Text>
          </Paper>
        );
      })}
    </Stack>
  );
}

function InstallationReportsContent() {
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get("jobId");
  const jobId = jobIdParam && /^\d+$/.test(jobIdParam) ? Number(jobIdParam) : null;
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search.trim().toLowerCase(), 200);
  const [selectedReport, setSelectedReport] = useState<InstallationReport | null>(null);

  const reportsQuery = useInstallationReports(jobId);
  const photosQuery = useInstallationReportPhotos(selectedReport?.id ?? null);

  const reports = useMemo(() => {
    const allReports = reportsQuery.data ?? [];
    if (!debouncedSearch) return allReports;
    return allReports.filter((report) =>
      [
        report.job_number == null ? "" : String(report.job_number),
        String(report.job_id),
        String(report.id),
        report.submitted_by ?? "",
      ].some((value) => value.toLowerCase().includes(debouncedSearch)),
    );
  }, [reportsQuery.data, debouncedSearch]);

  const printReport = () => {
    if (!selectedReport) return;
    const photoMarkup = (photosQuery.data ?? [])
      .filter((photo) => photo.file_type?.startsWith("image/"))
      .map((photo) => `<figure><img src="${photo.signedUrl}" alt="${photo.file_name}" /><figcaption>${photo.file_name}</figcaption></figure>`)
      .join("");
    const detailsMarkup = Object.entries(selectedReport.details ?? {})
      .map(([key, value]) => {
        const text = typeof value === "object" && value !== null
          ? JSON.stringify(value, null, 2)
          : displayValue(value);
        return `<section><h3>${key.replace(/([A-Z])/g, " $1")}</h3><pre>${text}</pre></section>`;
      })
      .join("");
    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html><html><head><title>Installation Report #${selectedReport.id}</title><style>body{font:14px Arial,sans-serif;color:#222;margin:32px}h1{margin-bottom:4px}h2{margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:8px}section{border:1px solid #ddd;border-radius:8px;padding:12px;margin:12px 0;break-inside:avoid}pre{font:13px Arial,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0} .photos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}figure{margin:0;break-inside:avoid}img{width:100%;max-height:420px;object-fit:contain}figcaption{font-size:11px;color:#555;margin-top:4px}@media print{body{margin:12mm}}</style></head><body><h1>Installation Report #${selectedReport.id}</h1><p>Job #${selectedReport.job_number ?? selectedReport.job_id} · Submitted ${new Date(selectedReport.created_at).toLocaleString()}</p><p>Submitted by: ${selectedReport.submitted_by ?? "—"}</p><h2>Report details</h2>${detailsMarkup}<h2>Attachments</h2><div class="photos">${photoMarkup}</div><script>window.onload=()=>{window.print()}</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <Container fluid p="lg">
      <Group justify="space-between" align="flex-start" mb="lg">
        <Group gap="sm">
          <TbClipboardCheck size={30} />
          <Stack gap={2}>
            <Title order={2}>Installation Reports</Title>
            <Text c="dimmed" size="sm">
              Reports submitted by installers through Insite.
              {jobId ? ` Showing reports for job #${jobId}.` : " Showing all recent reports."}
            </Text>
          </Stack>
        </Group>
        {jobId && (
          <Button variant="default" component="a" href="/dashboard/installation-reports">
            View all reports
          </Button>
        )}
      </Group>

      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" mb="md">
          <TextInput
            placeholder="Search job, report, or installer..."
            leftSection={<TbSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            style={{ flex: 1, maxWidth: 440 }}
          />
          <Badge variant="light" size="lg">{reports.length} reports</Badge>
        </Group>

        {reportsQuery.isLoading ? (
          <Center py="xl"><Loader /></Center>
        ) : reportsQuery.isError ? (
          <Alert color="red" title="Unable to load installation reports">
            {reportsQuery.error instanceof Error ? reportsQuery.error.message : "An unexpected error occurred."}
          </Alert>
        ) : reports.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap={4}>
              <Text fw={600}>No installation reports found</Text>
              <Text c="dimmed" size="sm">
                {jobId ? "No reports have been submitted for this job yet." : "Submitted Insite reports will appear here."}
              </Text>
            </Stack>
          </Center>
        ) : (
          <ScrollArea>
            <Table striped highlightOnHover miw={780} verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Report</Table.Th>
                  <Table.Th>Job</Table.Th>
                  <Table.Th>Submitted</Table.Th>
                  <Table.Th>Submitted by</Table.Th>
                  <Table.Th>Attachments</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {reports.map((report) => (
                  <Table.Tr key={report.id}>
                    <Table.Td><Text fw={600}>#{report.id}</Text></Table.Td>
                    <Table.Td>#{report.job_number ?? report.job_id}</Table.Td>
                    <Table.Td>{new Date(report.created_at).toLocaleString()}</Table.Td>
                    <Table.Td>{report.submitted_by || "—"}</Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={report.attachment_count ? "blue" : "gray"}>
                        {report.attachment_count}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Button size="xs" variant="light" onClick={() => setSelectedReport(report)}>
                        View report
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Paper>

      <Modal
        opened={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={selectedReport ? `Installation Report #${selectedReport.id} · Job #${selectedReport.job_number ?? selectedReport.job_id}` : "Installation Report"}
        size="min(1100px, 96vw)"
        centered
        scrollAreaComponent={ScrollArea.Autosize}
      >
        {selectedReport && (
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start">
              <Stack gap={2}>
                <Text size="sm" c="dimmed">Submitted {new Date(selectedReport.created_at).toLocaleString()}</Text>
                <Text size="sm">Submitted by: {selectedReport.submitted_by || "—"}</Text>
              </Stack>
              <Button leftSection={<TbPrinter size={16} />} onClick={printReport} disabled={photosQuery.isLoading}>
                Print report
              </Button>
            </Group>

            <Title order={4}>Report details</Title>
            <ReportDetails details={selectedReport.details ?? {}} />

            <Group justify="space-between">
              <Title order={4}>Attachments ({photosQuery.data?.length ?? 0})</Title>
              {photosQuery.isLoading && <Loader size="sm" />}
            </Group>
            {photosQuery.isError && (
              <Alert color="red" title="Unable to load attachments">
                {photosQuery.error instanceof Error ? photosQuery.error.message : "Could not create signed links for report attachments."}
              </Alert>
            )}
            {!photosQuery.isLoading && !photosQuery.isError && (photosQuery.data?.length ?? 0) === 0 && (
              <Text c="dimmed" size="sm">No photos or attachments are linked to this report.</Text>
            )}
            {!!photosQuery.data?.length && (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {photosQuery.data.map((photo) => (
                  <Paper key={photo.id} withBorder p="xs" radius="md">
                    {photo.file_type?.startsWith("image/") ? (
                      <Anchor href={photo.signedUrl} target="_blank" rel="noreferrer">
                        <Image src={photo.signedUrl} alt={photo.file_name} h={210} fit="contain" />
                      </Anchor>
                    ) : (
                      <Center h={210}>
                        <Button
                          component="a"
                          href={photo.signedUrl}
                          target="_blank"
                          rel="noreferrer"
                          variant="light"
                          rightSection={<TbExternalLink size={16} />}
                        >
                          Open attachment
                        </Button>
                      </Center>
                    )}
                    <Text size="sm" fw={600} mt="xs" lineClamp={2}>{photo.file_name}</Text>
                    <Text size="xs" c="dimmed">
                      {photo.file_size ? `${(photo.file_size / 1024 / 1024).toFixed(2)} MB` : "Size unavailable"}
                    </Text>
                  </Paper>
                ))}
              </SimpleGrid>
            )}
          </Stack>
        )}
      </Modal>
    </Container>
  );
}

export default function InstallationReportsPage() {
  return (
    <Suspense fallback={<Center py="xl"><Loader /></Center>}>
      <InstallationReportsContent />
    </Suspense>
  );
}
