"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PaginationState } from "@tanstack/react-table";
import { Box, Center, Loader, rem } from "@mantine/core";
import { TbClipboardCheck } from "react-icons/tb";
import {
  emptyInsiteReportFilters,
  type InsiteReport,
  type InsiteReportFilters,
  useInsiteReports,
} from "@/hooks/useInsiteReports";
import { useInstallationReportPhotos } from "@/hooks/useInstallationReports";
import InsiteReportsHeader from "@/components/InsiteReports/InsiteReportsHeader";
import InsiteReportsTable from "@/components/InsiteReports/InsiteReportsTable";
import InsiteReportModal from "@/components/InsiteReports/InsiteReportModal";
import { InstallationReportPdf } from "@/documents/InstallationReportPdf";

function InstallationReportsContent() {
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
  const [selectedReport, setSelectedReport] = useState<InsiteReport | null>(
    null,
  );
  const hasAutoOpened = useRef(false);

  const reportsQuery = useInsiteReports({
    type: "install_reports",
    jobId,
    pagination,
    filters,
  });
  const photosQuery = useInstallationReportPhotos(selectedReport?.id ?? null);
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
        title="Installation Reports"
        description="Review installation reports submitted through Insite."
        icon={<TbClipboardCheck size={27} />}
        jobId={jobId}
        allReportsHref="/dashboard/installation-reports"
      />

      <InsiteReportsTable
        reportLabel="Installation Report"
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
      />

      <InsiteReportModal
        report={selectedReport}
        reportLabel="Installation Report"
        icon={<TbClipboardCheck size={21} />}
        attachments={photosQuery.data ?? []}
        isLoading={photosQuery.isLoading}
        isError={photosQuery.isError}
        error={photosQuery.error}
        onClose={() => setSelectedReport(null)}
        detailsVariant="installation"
        pdfDocument={
          selectedReport ? (
            <InstallationReportPdf
              report={selectedReport}
              photos={photosQuery.data ?? []}
            />
          ) : null
        }
      />
    </Box>
  );
}

export default function InstallationReportsPage() {
  return (
    <Suspense
      fallback={
        <Center h={300}>
          <Loader color="violet" />
        </Center>
      }
    >
      <InstallationReportsContent />
    </Suspense>
  );
}
