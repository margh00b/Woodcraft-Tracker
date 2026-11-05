"use client";

import { useQuery } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useSupabase } from "@/hooks/useSupabase";

export type InsiteReportType = "install_reports" | "markouts" | "flha";

export type InsiteReport = {
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

export type InsiteReportFilters = {
  jobNumber: string;
  address: string;
  installer: string;
  createdFrom: string;
  createdTo: string;
};

export const emptyInsiteReportFilters: InsiteReportFilters = {
  jobNumber: "",
  address: "",
  installer: "",
  createdFrom: "",
  createdTo: "",
};

const attachmentColumns: Record<InsiteReportType, string | null> = {
  install_reports: "install_report_id",
  markouts: "markout_id",
  flha: null,
};

type UseInsiteReportsParams = {
  type: InsiteReportType;
  jobId: number | null;
  pagination: PaginationState;
  filters: InsiteReportFilters;
};

export function useInsiteReports({
  type,
  jobId,
  pagination,
  filters,
}: UseInsiteReportsParams) {
  const { supabase, isAuthenticated, isLoading: isAuthLoading } = useSupabase();

  return useQuery({
    queryKey: ["insite-reports", type, jobId, pagination, filters],
    queryFn: async () => {
      const attachmentColumn = attachmentColumns[type];
      let matchingJobIds: number[] | null = null;

      if (filters.address.trim()) {
        const { data, error } = await supabase
          .from("installation_table_view")
          .select("job_number")
          .ilike("site_address", `%${filters.address.trim()}%`)
          .limit(5000);

        if (error) throw error;

        const numbers = [
          ...new Set(
            (data ?? [])
              .map((row) => row.job_number)
              .filter((value) => value != null)
              .map(String),
          ),
        ];

        if (!numbers.length) {
          return { reports: [] as InsiteReport[], count: 0 };
        }

        const { data: jobs, error: jobsError } = await supabase
          .from("jobs")
          .select("id")
          .in("job_number", numbers);

        if (jobsError) throw jobsError;

        matchingJobIds = (jobs ?? []).map((job) => job.id);

        if (!matchingJobIds.length) {
          return { reports: [] as InsiteReport[], count: 0 };
        }
      }

      if (filters.jobNumber.trim()) {
        const { data, error } = await supabase
          .from("jobs")
          .select("id")
          .ilike("job_number", `%${filters.jobNumber.trim()}%`)
          .limit(5000);

        if (error) throw error;

        const ids = (data ?? []).map((job) => job.id);

        matchingJobIds =
          matchingJobIds === null
            ? ids
            : matchingJobIds.filter((id) => ids.includes(id));

        if (!matchingJobIds.length) {
          return { reports: [] as InsiteReport[], count: 0 };
        }
      }

      let query = (supabase.schema("insite") as any)
        .from(type)
        .select(
          type === "flha"
            ? "id, job_id, hazards, acknowledgement, submitted_by, created_at, updated_at"
            : "id, job_id, details, submitted_by, created_at, updated_at",
          { count: "exact" },
        )
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

      if (!rows?.length) {
        return {
          reports: [] as InsiteReport[],
          count: count ?? 0,
        };
      }

      const jobIds = [
        ...new Set(rows.map((report: { job_id: number }) => report.job_id)),
      ];
      const reportIds = rows.map((report: { id: number }) => report.id);

      const [{ data: jobs, error: jobsError }, attachmentResult] =
        await Promise.all([
          supabase.from("jobs").select("id, job_number").in("id", jobIds),
          attachmentColumn
            ? supabase
                .from("job_attachments")
                .select(attachmentColumn)
                .in(attachmentColumn, reportIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (jobsError) throw jobsError;
      if (attachmentResult.error) throw attachmentResult.error;

      const jobNumberById = new Map(
        (jobs ?? []).map((job) => [job.id, job.job_number]),
      );

      const jobNumbers = [
        ...new Set(
          (jobs ?? [])
            .map((job) => job.job_number)
            .filter((value) => value != null),
        ),
      ];

      const { data: addresses, error: addressError } = jobNumbers.length
        ? await supabase
            .from("installation_table_view")
            .select("job_number, site_address")
            .in("job_number", jobNumbers)
        : { data: [], error: null };

      if (addressError) throw addressError;

      const addressByJob = new Map<string, string>();

      for (const row of addresses ?? []) {
        if (
          row.job_number != null &&
          row.site_address &&
          !addressByJob.has(String(row.job_number))
        ) {
          addressByJob.set(String(row.job_number), row.site_address);
        }
      }

      const attachmentCounts = new Map<number, number>();

      if (attachmentColumn) {
        for (const row of attachmentResult.data ?? []) {
          const id = (row as Record<string, number>)[attachmentColumn];

          if (id != null) {
            attachmentCounts.set(id, (attachmentCounts.get(id) ?? 0) + 1);
          }
        }
      }

      return {
        reports: rows.map((report: any) => {
          const jobNumber = jobNumberById.get(report.job_id) ?? null;

          const reportDetails =
            type === "flha"
              ? {
                  ...(report.hazards && typeof report.hazards === "object"
                    ? report.hazards
                    : {}),
                  acknowledgement: report.acknowledgement,
                }
              : report.details;

          return {
            ...report,
            details: reportDetails ?? {},
            job_number: jobNumber == null ? null : String(jobNumber),
            address:
              jobNumber == null
                ? null
                : (addressByJob.get(String(jobNumber)) ?? null),
            attachment_count: attachmentCounts.get(report.id) ?? 0,
          } as InsiteReport;
        }),
        count: count ?? 0,
      };
    },
    enabled: !isAuthLoading && isAuthenticated,
    placeholderData: (previousData) => previousData,
    staleTime: 5000,
  });
}
