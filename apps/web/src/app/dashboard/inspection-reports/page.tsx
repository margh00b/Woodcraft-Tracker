"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PaginationState } from "@tanstack/react-table";
import { Alert, Box, Center, Loader } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { TbClipboardCheck } from "react-icons/tb";
import { useSupabase } from "@/hooks/useSupabase";
import {
  emptyInsiteReportFilters,
  type InsiteReport,
  type InsiteReportFilters,
  useInsiteReports,
} from "@/hooks/useInsiteReports";
import InsiteReportsHeader from "@/components/InsiteReports/InsiteReportsHeader";
import InsiteReportsTable from "@/components/InsiteReports/InsiteReportsTable";
import InsiteReportModal from "@/components/InsiteReports/InsiteReportModal";
import { InspectionReportPdf } from "@/documents/InspectionReportPdf";

function InspectionReportsContent() {
  const params = useSearchParams();
  const rawJobId = params.get("jobId");
  const jobId = rawJobId && /^\d+$/.test(rawJobId) ? Number(rawJobId) : null;
  const [filters, setFilters] = useState<InsiteReportFilters>({
    ...emptyInsiteReportFilters,
  });
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [selected, setSelected] = useState<InsiteReport | null>(null);
  const { supabase, isAuthenticated, isLoading: authLoading } = useSupabase();

  useEffect(() => {
    setPagination((current) =>
      current.pageIndex ? { ...current, pageIndex: 0 } : current,
    );
  }, [jobId]);

  const query = useInsiteReports({
    type: "inspection_reports",
    jobId,
    pagination,
    filters,
  });

  const attachmentsQuery = useQuery({
    queryKey: ["insite-report-attachments", "inspection_reports", selected?.id],
    queryFn: async () => {
      if (!selected) return [];
      const { data, error } = await supabase
        .from("job_attachments")
        .select("id, file_name, file_type, file_tag, file_path, created_at")
        .eq("inspection_report_id", selected.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return Promise.all(
        (data ?? []).map(async (file) => {
          const { data: signed, error: signedError } = await supabase.storage
            .from("job_files")
            .createSignedUrl(file.file_path, 1800);
          if (signedError) throw signedError;
          return { ...file, signedUrl: signed.signedUrl };
        }),
      );
    },
    enabled: !authLoading && isAuthenticated && selected !== null,
    staleTime: 20 * 60 * 1000,
  });

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        padding: 24,
        height: "calc(100vh - 45px)",
        minHeight: 0,
      }}
    >
      <InsiteReportsHeader
        title="Inspection Reports"
        description="Review inspection reports submitted through Insite."
        icon={<TbClipboardCheck size={27} />}
        jobId={jobId}
        allReportsHref="/dashboard/inspection-reports"
      />
      <InsiteReportsTable
        reportLabel="Inspection Report"
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
        reportLabel="Inspection Report"
        icon={<TbClipboardCheck size={21} />}
        attachments={attachmentsQuery.data ?? []}
        isLoading={attachmentsQuery.isLoading}
        isError={attachmentsQuery.isError}
        error={attachmentsQuery.error}
        onClose={() => setSelected(null)}
        pdfDocument={
          selected ? (
            <InspectionReportPdf
              report={selected}
              attachments={attachmentsQuery.data ?? []}
            />
          ) : null
        }
      />
    </Box>
  );
}

export default function InspectionReportsPage() {
  return (
    <Suspense
      fallback={
        <Center h={300}>
          <Loader color="violet" />
        </Center>
      }
    >
      <InspectionReportsContent />
    </Suspense>
  );
}
