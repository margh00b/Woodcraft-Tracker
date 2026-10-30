"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PaginationState } from "@tanstack/react-table";
import { Box, Center, Loader, rem } from "@mantine/core";
import {
  InstallationReport,
  InstallationReportFilters,
  emptyInstallationReportFilters,
  useInstallationReportPhotos,
  useInstallationReports,
} from "@/hooks/useInstallationReports";
import InstallationReportsHeader from "@/components/InstallationReports/InstallationReportsHeader";
import InstallationReportsTable from "@/components/InstallationReports/InstallationReportsTable";
import InstallationReportsModal from "@/components/InstallationReports/InstallationReportsModal";

function InstallationReportsContent() {
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get("jobId");
  const reportId = searchParams.get("reportId");

  const jobId =
    jobIdParam && /^\d+$/.test(jobIdParam) ? Number(jobIdParam) : null;

  const [filters, setFilters] = useState<InstallationReportFilters>({
    ...emptyInstallationReportFilters,
  });

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const [selectedReport, setSelectedReport] =
    useState<InstallationReport | null>(null);

  useEffect(() => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
    );
  }, [jobId]);

  const reportsQuery = useInstallationReports({
    jobId,
    pagination,
    filters,
  });

  const photosQuery = useInstallationReportPhotos(selectedReport?.id ?? null);

  const reports = reportsQuery.data?.reports ?? [];
  const total = reportsQuery.data?.count ?? 0;
  const hasAutoOpened = useRef(false);

  useEffect(() => {
    if (reportId && reports.length > 0 && !hasAutoOpened.current) {
      const reportFromUrl = reports.find(
        (r) => String(r.id) === String(reportId),
      );

      if (reportFromUrl) {
        setSelectedReport(reportFromUrl);
        hasAutoOpened.current = true;
      }
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
      <InstallationReportsHeader jobId={jobId} />

      <InstallationReportsTable
        jobId={jobId}
        jobNumber={reports[0]?.job_number ?? null}
        reports={reports}
        total={total}
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
