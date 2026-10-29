"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";

export type InstallationReport = {
  id: number;
  job_id: number;
  details: Record<string, unknown>;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
  job_number: number | string | null;
  attachment_count: number;
};

export type InstallationReportPhoto = {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number | null;
  file_path: string;
  created_at: string;
  signedUrl: string;
};

export function useInstallationReports(jobId?: number | null) {
  const { supabase, isAuthenticated, isLoading: isAuthLoading } = useSupabase();

  return useQuery<InstallationReport[]>({
    queryKey: ["installation-reports", jobId ?? "all"],
    queryFn: async () => {
      const insite = supabase.schema("insite") as any;
      let reportQuery = insite
        .from("install_reports")
        .select("id, job_id, details, submitted_by, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (jobId) reportQuery = reportQuery.eq("job_id", jobId);

      const { data: reportRows, error: reportError } = await reportQuery;
      if (reportError) throw reportError;
      if (!reportRows?.length) return [];

      const jobIds = [...new Set(reportRows.map((report: any) => report.job_id))];
      const reportIds = reportRows.map((report: any) => report.id);

      const [{ data: jobs, error: jobsError }, { data: attachments, error: attachmentsError }] =
        await Promise.all([
          supabase.from("jobs").select("id, job_number").in("id", jobIds),
          supabase
            .from("job_attachments")
            .select("id, install_report_id")
            .in("install_report_id", reportIds),
        ]);

      if (jobsError) throw jobsError;
      if (attachmentsError) throw attachmentsError;

      const jobNumberById = new Map(
        (jobs ?? []).map((job) => [job.id, job.job_number]),
      );
      const attachmentCountByReportId = new Map<number, number>();

      for (const attachment of attachments ?? []) {
        if (attachment.install_report_id == null) continue;
        attachmentCountByReportId.set(
          attachment.install_report_id,
          (attachmentCountByReportId.get(attachment.install_report_id) ?? 0) + 1,
        );
      }

      return reportRows.map((report: any) => ({
        ...report,
        job_number: jobNumberById.get(report.job_id) ?? null,
        attachment_count: attachmentCountByReportId.get(report.id) ?? 0,
      })) as InstallationReport[];
    },
    enabled: !isAuthLoading && isAuthenticated,
  });
}

export function useInstallationReportPhotos(reportId: number | null) {
  const { supabase, isAuthenticated, isLoading: isAuthLoading } = useSupabase();

  return useQuery<InstallationReportPhoto[]>({
    queryKey: ["installation-report-photos", reportId],
    queryFn: async () => {
      if (!reportId) return [];

      const { data: attachments, error } = await supabase
        .from("job_attachments")
        .select("id, file_name, file_type, file_size, file_path, created_at")
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
