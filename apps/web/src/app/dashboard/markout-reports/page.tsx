"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PaginationState } from "@tanstack/react-table";
import { Alert, Box, Center, Loader, Modal, Stack, Text, Title, Image, SimpleGrid, Paper, Badge, Group, Anchor } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import { useInsiteReports, emptyInsiteReportFilters, type InsiteReport, type InsiteReportFilters } from "@/hooks/useInsiteReports";
import InsiteReportsTable from "@/components/InsiteReports/InsiteReportsTable";
import { formatDate } from "@/utils/installationReportUtils";

function MarkoutReportsContent() {
  const params = useSearchParams();
  const rawJobId = params.get("jobId");
  const jobId = rawJobId && /^\d+$/.test(rawJobId) ? Number(rawJobId) : null;
  const [filters, setFilters] = useState<InsiteReportFilters>({ ...emptyInsiteReportFilters });
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [selected, setSelected] = useState<InsiteReport | null>(null);
  const { supabase, isAuthenticated, isLoading: authLoading } = useSupabase();
  useEffect(() => setPagination((current) => current.pageIndex ? { ...current, pageIndex: 0 } : current), [jobId]);
  const query = useInsiteReports({ type: "markouts", jobId, pagination, filters });
  const photosQuery = useQuery({
    queryKey: ["insite-report-attachments", "markouts", selected?.id],
    queryFn: async () => {
      if (!selected) return [];
      const { data, error } = await supabase.from("job_attachments").select("id,file_name,file_type,file_tag,file_path,created_at").eq("markout_id", selected.id).order("created_at", { ascending: true });
      if (error) throw error;
      return Promise.all((data ?? []).map(async (file) => {
        const { data: signed, error: signedError } = await supabase.storage.from("job_files").createSignedUrl(file.file_path, 1800);
        if (signedError) throw signedError;
        return { ...file, signedUrl: signed.signedUrl };
      }));
    },
    enabled: !authLoading && isAuthenticated && selected !== null,
    staleTime: 20 * 60 * 1000,
  });
  const report = selected;
  return (
    <Box style={{ display: "flex", flexDirection: "column", gap: 18, padding: 24, height: "calc(100vh - 45px)", minHeight: 0 }}>
      <Group justify="space-between" align="center">
        <Group gap="md"><Title order={2}>Markout Reports</Title><Text size="sm" c="dimmed">Review markouts submitted through Insite.</Text></Group>
        {jobId !== null && <Anchor href="/dashboard/markout-reports">View all reports</Anchor>}
      </Group>
      <InsiteReportsTable reportLabel="Markout" jobId={jobId} reports={query.data?.reports ?? []} total={query.data?.count ?? 0} isLoading={query.isLoading} isError={query.isError} error={query.error} isFetching={query.isFetching} filters={filters} onFiltersChange={setFilters} pagination={pagination} onPaginationChange={setPagination} onSelectReport={setSelected} />
      <Modal opened={!!report} onClose={() => setSelected(null)} title={<Stack gap={2}><Title order={4}>Markout #{report?.id}</Title><Text size="sm" c="dimmed">Job #{report?.job_number ?? report?.job_id} · {report?.address ?? "Address unavailable"}</Text></Stack>} size="xl" centered>
        {report && <Stack gap="md">
          <Group justify="space-between"><Text size="sm">Submitted {formatDate(report.created_at)}</Text><Badge>{report.submitted_by || "Unknown submitter"}</Badge></Group>
          <Paper withBorder radius="md" p="md"><Title order={5} mb="xs">Notes</Title><Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{String(report.details?.notes ?? report.details?.note ?? "No notes recorded.")}</Text></Paper>
          <Group justify="space-between"><Title order={5}>Attachments</Title><Badge>{photosQuery.data?.length ?? 0} files</Badge></Group>
          {photosQuery.isLoading && <Center py="lg"><Loader color="violet" /></Center>}
          {photosQuery.isError && <Alert color="red" title="Unable to load attachments">{photosQuery.error instanceof Error ? photosQuery.error.message : "Could not load attachments."}</Alert>}
          {!!photosQuery.data?.length && <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>{photosQuery.data.map((photo) => <Paper key={photo.id} withBorder p="xs"><Anchor href={photo.signedUrl} target="_blank"><Image src={photo.signedUrl} alt={photo.file_name} h={180} fit="contain" /></Anchor><Text size="sm" fw={600} mt="xs">{photo.file_tag || photo.file_name}</Text></Paper>)}</SimpleGrid>}
          {!photosQuery.isLoading && !photosQuery.isError && !photosQuery.data?.length && <Text size="sm" c="dimmed">No attachments found.</Text>}
        </Stack>}
      </Modal>
    </Box>
  );
}

export default function MarkoutReportsPage() {
  return <Suspense fallback={<Center h={300}><Loader color="violet" /></Center>}><MarkoutReportsContent /></Suspense>;
}
