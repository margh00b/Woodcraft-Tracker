"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PaginationState } from "@tanstack/react-table";
import { Box, Center, Loader, rem } from "@mantine/core";
import {
  InstallationReport,
  useInstallationReportPhotos,
} from "@/hooks/useInstallationReports";
import {
  emptyInsiteReportFilters,
  InsiteReport,
  InsiteReportFilters,
  useInsiteReports,
} from "@/hooks/useInsiteReports";
import InstallationReportsHeader from "@/components/InstallationReports/InstallationReportsHeader";
import InsiteReportsTable from "@/components/InsiteReports/InsiteReportsTable";
import InstallationReportsModal from "@/components/InstallationReports/InstallationReportsModal";

function InstallationReportsContent() {
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get("jobId");
  const reportId = searchParams.get("reportId");
  const jobId = jobIdParam && /^\\d+$/.test(jobIdParam) ? Number(jobIdParam) : null;

  const [filters, setFilters] = useState<InsiteReportFilters>({ ...emptyInsiteReportFilters });
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [selectedReport, setSelectedReport] = useState<InstallationReport | null>(null);

  useEffect(() => {
    setPagination((current) => current.pageIndex === 0 ? current : { ...current, pageIndex: 0 });
  }, [jobId]);

  const reportsQuery = useInsiteReports({ type: "install_reports", jobId, pagination, filters });
  const photosQuery = useInstallationReportPhotos(selectedReport?.id ?? null);
  const reports = reportsQuery.data?.reports ?? [];
  const hasAutoOpened = useRef(false);

  useEffect(() => {
    if (reportId && reports.length > 0 && !hasAutoOpened.current) {
      const reportFromUrl = reports.find((report) => String(report.id) === reportId);
      if (reportFromUrl) {
        setSelectedReport(reportFromUrl as InstallationReport);
        hasAutoOpened.current = true;
      }
    }
  }, [reportId, reports]);

  return (
    <Box style={{ display: "flex", flexDirection: "column", gap: rem(18), padding: rem(24), height: "calc(100vh - 45px)", minHeight: 0 }}>
      <InstallationReportsHeader jobId={jobId} />
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
        onSelectReport={(report: InsiteReport) => setSelectedReport(report as InstallationReport)}
      />
      <InstallationReportsModal
        report={selectedReport}
        photosQuery={photosQuery}
        onClose={() => setSelectedReport(null)}
      />
    </Box>
  );
}

export default function InstallationReportsPage() {
  return (
    <Suspense fallback={<Center h={300}><Loader color="violet" /></Center>}>
      <InstallationReportsContent />
    </Suspense>
  );
}
