"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PaginationState } from "@tanstack/react-table";
import { Box, Center, Loader } from "@mantine/core";
import { TbMapPin } from "react-icons/tb";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import { useInsiteReports, emptyInsiteReportFilters, type InsiteReport, type InsiteReportFilters } from "@/hooks/useInsiteReports";
import InsiteReportsTable from "@/components/InsiteReports/InsiteReportsTable";
import InsiteReportsHeader from "@/components/InsiteReports/InsiteReportsHeader";
import InsiteReportModal from "@/components/InsiteReports/InsiteReportModal";
import { MarkoutReportPdf } from "@/documents/MarkoutReportPdf";

function MarkoutReportsContent() {
  const params = useSearchParams();
  const rawJobId = params.get("jobId");
  const jobId = rawJobId && /^\\d+$/.test(rawJobId) ? Number(rawJobId) : null;
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

  return (
    <Box style={{ display: "flex", flexDirection: "column", gap: 18, padding: 24, height: "calc(100vh - 45px)", minHeight: 0 }}>
      <InsiteReportsHeader
        title="Markout Reports"
        description="Review markouts submitted through Insite."
        icon={<TbMapPin size={27} />}
        jobId={jobId}
        allReportsHref="/dashboard/markout-reports"
      />
      <InsiteReportsTable
        reportLabel="Markout"
        jobId={jobId}
        reports={query.data?.reports ?? []}
        total={query.data?.count ?? 0}
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        isFetching={query.isFetching}
        filters={filters}
        onFiltersChange={setFilters}
        pagination={pagination}
        onPaginationChange={setPagination}
        onSelectReport={setSelected}
      />
      <InsiteReportModal
        report={selected}
        reportLabel="Markout"
        icon={<TbMapPin size={21} />}
        attachments={photosQuery.data ?? []}
        isLoading={photosQuery.isLoading}
        isError={photosQuery.isError}
        error={photosQuery.error}
        onClose={() => setSelected(null)}
        pdfDocument={selected ? <MarkoutReportPdf report={selected} photos={photosQuery.data ?? []} /> : null}
      />
    </Box>
  );
}

export default function MarkoutReportsPage() {
  return <Suspense fallback={<Center h={300}><Loader color="violet" /></Center>}><MarkoutReportsContent /></Suspense>;
}
