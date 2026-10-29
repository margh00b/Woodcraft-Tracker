"use client";

import { useQuery } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useSupabase } from "@/hooks/useSupabase";

export type InstallationReport = {
  id: number;
  job_id: number;
  details: Record<string, unknown>;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
  job_number: string | null;
  address: string | null;
  attachment_count: number;
};

export type InstallationReportPhoto = {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number | null;
  file_path: string;
  file_tag;
  created_at: string;
  signedUrl: string;
};

export type InstallationReportFilters = {
  jobNumber: string;
  address: string;
  installer: string;
  createdFrom: string;
  createdTo: string;
};

export const emptyInstallationReportFilters: InstallationReportFilters = {
  jobNumber: "",
  address: "",
  installer: "",
  createdFrom: "",
  createdTo: "",
};

type UseInstallationReportsParams = {
  jobId: number | null;
  pagination: PaginationState;
  filters: InstallationReportFilters;
};

export function useInstallationReports({
  jobId,
  pagination,
  filters,
}: UseInstallationReportsParams) {
  const { supabase, isAuthenticated, isLoading: isAuthLoading } = useSupabase();

  return useQuery({
    queryKey: ["installation-reports", jobId, pagination, filters],
    queryFn: async () => {
      const insite = supabase.schema("insite") as any;
      let matchingJobIds: number[] | null = null;

      if (filters.address.trim()) {
        const { data: matchingRows, error: addressError } = await supabase
          .from("installation_table_view")
          .select("job_number")
          .ilike("site_address", `%${filters.address.trim()}%`)
          .limit(5000);

        if (addressError) throw addressError;

        const jobNumbers = [
          ...new Set(
            (matchingRows ?? [])
              .map((row: { job_number: number | string | null }) =>
                row.job_number == null ? null : String(row.job_number),
              )
              .filter(
                (value: string | null): value is string => value !== null,
              ),
          ),
        ];

        if (!jobNumbers.length) {
          return { reports: [], count: 0 };
        }

        const { data: matchingJobs, error: jobsError } = await supabase
          .from("jobs")
          .select("id, job_number")
          .in("job_number", jobNumbers);

        if (jobsError) throw jobsError;

        matchingJobIds = (matchingJobs ?? []).map(
          (job: { id: number }) => job.id,
        );

        if (!matchingJobIds.length) {
          return { reports: [], count: 0 };
        }
      }

      if (filters.jobNumber.trim()) {
        const { data: matchingJobs, error: jobsError } = await supabase
          .from("jobs")
          .select("id")
          .ilike("job_number", `%${filters.jobNumber.trim()}%`)
          .limit(5000);

        if (jobsError) throw jobsError;

        const jobIds = (matchingJobs ?? []).map(
          (job: { id: number }) => job.id,
        );

        matchingJobIds =
          matchingJobIds === null
            ? jobIds
            : matchingJobIds.filter((id) => jobIds.includes(id));

        if (!matchingJobIds.length) {
          return { reports: [], count: 0 };
        }
      }

      let query = insite
        .from("install_reports")
        .select("id, job_id, details, submitted_by, created_at, updated_at", {
          count: "exact",
        })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });

      if (jobId !== null) {
        query = query.eq("job_id", jobId);
      }

      if (matchingJobIds !== null) {
        query = query.in("job_id", matchingJobIds);
      }

      if (filters.installer.trim()) {
        query = query.ilike("submitted_by", `%${filters.installer.trim()}%`);
      }

      if (filters.createdFrom) {
        query = query.gte(
          "created_at",
          dayjs(filters.createdFrom).startOf("day").toISOString(),
        );
      }

      if (filters.createdTo) {
        query = query.lt(
          "created_at",
          dayjs(filters.createdTo).add(1, "day").startOf("day").toISOString(),
        );
      }

      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize - 1;

      const { data: rows, error, count } = await query.range(from, to);

      if (error) throw error;

      const reportRows = rows ?? [];

      if (!reportRows.length) {
        return { reports: [], count: count ?? 0 };
      }

      const jobIds = [
        ...new Set(
          reportRows.map((report: { job_id: number }) => report.job_id),
        ),
      ];
      const reportIds = reportRows.map((report: { id: number }) => report.id);

      const [
        { data: jobs, error: jobsError },
        { data: attachments, error: attachmentsError },
      ] = await Promise.all([
        supabase.from("jobs").select("id, job_number").in("id", jobIds),
        supabase
          .from("job_attachments")
          .select("install_report_id")
          .in("install_report_id", reportIds),
      ]);

      if (jobsError) throw jobsError;
      if (attachmentsError) throw attachmentsError;

      const jobNumberById = new Map<number, number | string | null>(
        (jobs ?? []).map(
          (job: { id: number; job_number: number | string | null }) => [
            job.id,
            job.job_number,
          ],
        ),
      );

      const jobNumbers = [
        ...new Set(
          (jobs ?? [])
            .map((job) => job.job_number)
            .filter((value): value is number | string => value != null),
        ),
      ];

      const { data: addressRows, error: addressError } = jobNumbers.length
        ? await supabase
            .from("installation_table_view")
            .select("job_number, site_address")
            .in("job_number", jobNumbers)
        : { data: [], error: null };

      if (addressError) throw addressError;

      const addressByJobNumber = new Map<string, string>();

      for (const row of addressRows ?? []) {
        if (row.job_number == null || !row.site_address) continue;

        const key = String(row.job_number);

        if (!addressByJobNumber.has(key)) {
          addressByJobNumber.set(key, row.site_address);
        }
      }

      const attachmentCounts = new Map<number, number>();

      for (const attachment of attachments ?? []) {
        if (attachment.install_report_id == null) continue;

        attachmentCounts.set(
          attachment.install_report_id,
          (attachmentCounts.get(attachment.install_report_id) ?? 0) + 1,
        );
      }

      const reports: InstallationReport[] = reportRows.map((report) => {
        const jobNumber = jobNumberById.get(report.job_id) ?? null;

        return {
          ...report,
          job_number: jobNumber,
          address:
            jobNumber == null
              ? null
              : (addressByJobNumber.get(String(jobNumber)) ?? null),
          attachment_count: attachmentCounts.get(report.id) ?? 0,
        };
      });

      return {
        reports,
        count: count ?? 0,
      };
    },
    enabled: !isAuthLoading && isAuthenticated,
    placeholderData: (previousData) => previousData,
    staleTime: 5000,
  });
}

export function useInstallationReportPhotos(reportId: number | null) {
  const { supabase, isAuthenticated, isLoading: isAuthLoading } = useSupabase();

  return useQuery<InstallationReportPhoto[]>({
    queryKey: ["installation-report-photos", reportId],
    queryFn: async () => {
      if (reportId === null) return [];

      const { data: attachments, error } = await supabase
        .from("job_attachments")
        .select(
          "id, file_name, file_type, file_size, file_path, created_at, file_tag",
        )
        .eq("install_report_id", reportId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!attachments?.length) return [];

      return Promise.all(
        attachments.map(async (attachment) => {
          const { data, error: signedUrlError } = await supabase.storage
            .from("job_files")
            .createSignedUrl(attachment.file_path, 1800);

          if (signedUrlError) throw signedUrlError;

          return { ...attachment, signedUrl: data.signedUrl };
        }),
      );
    },
    enabled: !isAuthLoading && isAuthenticated && reportId !== null,
    staleTime: 20 * 60 * 1000,
  });
}
