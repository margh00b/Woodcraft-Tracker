"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PaginationState } from "@tanstack/react-table";
import { Box, Center, Loader, rem } from "@mantine/core";
import { TbAlertTriangle } from "react-icons/tb";
import {
  emptyInsiteReportFilters,
  type InsiteReport,
  type InsiteReportFilters,
  useInsiteReports,
} from "@/hooks/useInsiteReports";
import InsiteReportsHeader from "@/components/InsiteReports/InsiteReportsHeader";
import InsiteReportsTable from "@/components/InsiteReports/InsiteReportsTable";
import InsiteReportModal from "@/components/InsiteReports/InsiteReportModal";
import { FlhaReportPdf } from "@/documents/FlhaReportPdf";

function FlhaReportsContent() {
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get("jobId");
  const reportId = searchParams.get("reportId");
  const jobId =
    jobIdParam && /^\d+$/.test(jobIdParam) ? Number(jobIdParam) : null;

  const [filters, setFilters] = useState<InsiteReportFilters>({
    ...emptyInsiteReportFilters,
  });
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [selectedReport, setSelectedReport] = useState<InsiteReport | null>(null);
  const hasAutoOpened = useRef(false);

  const reportsQuery = useInsiteReports({
    type: "flha",
    jobId,
    pagination,
    filters,
  });
  const reports = reportsQuery.data?.reports ?? [];

  useEffect(() => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
    );
  }, [jobId]);

  useEffect(() => {
    if (!reportId || !reports.length || hasAutoOpened.current) return;
    const reportFromUrl = reports.find(
      (report) => String(report.id) === reportId,
    );
    if (reportFromUrl) {
      setSelectedReport(reportFromUrl);
      hasAutoOpened.current = true;
    }
  }, [reportId, reports]);

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        gap: rem(18),
        padding: rem(24),
        height: "calc(100vh - 45px)",
        minHeight: 0,
      }}
    >
      <InsiteReportsHeader
        title="FLHA Reports"
        description="Review field level hazard assessments submitted through Insite."
        icon={<TbAlertTriangle size={27} />}
        jobId={jobId}
        allReportsHref="/dashboard/flha-reports"
      />

      <InsiteReportsTable
        reportLabel="FLHA Report"
        jobId={jobId}
        reports={reports}
        total={reportsQuery.data?.count ?? 0}
        isLoading={reportsQuery.isLoading}
        isError={reportsQuery.isError}
        error={reportsQuery.error}
        isFetching={reportsQuery.isFetching}
        filters={filters}
        onFiltersChange={setFilters}
        pagination={pagination}
        onPaginationChange={setPagination}
        onSelectReport={setSelectedReport}
        showAttachments={false}
      />

      <InsiteReportModal
        report={selectedReport}
        reportLabel="FLHA Report"
        icon={<TbAlertTriangle size={21} />}
        attachments={[]}
        isLoading={false}
        isError={false}
        error={null}
        onClose={() => setSelectedReport(null)}
        detailsVariant="flha"
        showAttachments={false}
        pdfDocument={
          selectedReport ? <FlhaReportPdf report={selectedReport} /> : null
        }
      />
    </Box>
  );
}

export default function FlhaReportsPage() {
  return (
    <Suspense
      fallback={
        <Center h={300}>
          <Loader color="violet" />
        </Center>
      }
    >
      <FlhaReportsContent />
    </Suspense>
  );
}
