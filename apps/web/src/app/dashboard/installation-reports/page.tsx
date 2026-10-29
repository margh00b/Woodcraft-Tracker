"use client";

import { Suspense, useEffect, useState } from "react";
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
import {
  displayValue,
  escapeHtml,
  formatDate,
  formatSectionTitle,
} from "@/utils/installationReportUtils";

function InstallationReportsContent() {
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get("jobId");

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

  const printReport = () => {
    if (!selectedReport) return;

    const photoMarkup = (photosQuery.data ?? [])
      .filter((photo) => photo.file_type?.startsWith("image/"))
      .map(
        (photo) =>
          `<figure><img src="${escapeHtml(photo.signedUrl)}" alt="${escapeHtml(photo.file_name)}" /><figcaption>${escapeHtml(photo.file_name)}</figcaption></figure>`,
      )
      .join("");

    const detailsMarkup = Object.entries(selectedReport.details ?? {})
      .map(([key, value]) => {
        const text =
          typeof value === "object" && value !== null
            ? JSON.stringify(value, null, 2)
            : displayValue(value);

        return `<section><h3>${escapeHtml(formatSectionTitle(key))}</h3><pre>${escapeHtml(text)}</pre></section>`;
      })
      .join("");

    const printWindow = window.open("", "_blank", "width=1000,height=800");

    if (!printWindow) return;

    printWindow.document.write(
      `<!doctype html>
      <html>
        <head>
          <title>Installation Report #${selectedReport.id}</title>
          <style>
            body{font:14px Arial,sans-serif;color:#222;margin:32px}
            h1{margin-bottom:4px}
            h2{margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:8px}
            section{border:1px solid #ddd;border-radius:8px;padding:12px;margin:12px 0;break-inside:avoid}
            pre{font:13px Arial,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0}
            .photos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
            figure{margin:0;break-inside:avoid}
            img{width:100%;max-height:420px;object-fit:contain}
            figcaption{font-size:11px;color:#555;margin-top:4px}
            @media print{body{margin:12mm}}
          </style>
        </head>
        <body>
          <h1>Installation Report #${selectedReport.id}</h1>
          <p>Job #${escapeHtml(String(selectedReport.job_number ?? selectedReport.job_id))} · Submitted ${escapeHtml(formatDate(selectedReport.created_at))}</p>
          <p>Submitted by: ${escapeHtml(selectedReport.submitted_by ?? "—")}</p>
          <h2>Report details</h2>
          ${detailsMarkup}
          <h2>Attachments</h2>
          <div class="photos">${photoMarkup}</div>
          <script>window.onload=()=>{window.print()}</script>
        </body>
      </html>`,
    );

    printWindow.document.close();
  };

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
        onPrint={printReport}
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
