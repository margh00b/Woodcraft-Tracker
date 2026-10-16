import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "./useSupabase";
import dayjs from "dayjs";
import { Views } from "@/types/db";

export type BuilderSummaryParams = {
  builderName?: string;
  shipDateStart?: Date | null;
  shipDateEnd?: Date | null;
  creationDateStart?: Date | null;
  creationDateEnd?: Date | null;
  shipStatus?: "shipped" | "not_shipped" | "partially_shipped" | null;
  page: number;
  pageSize: number;
};
export type BuilderSummaryExcelParams = Omit<
  BuilderSummaryParams,
  "page" | "pageSize"
>;

export type BuilderSummaryItem = Views<"installation_table_view"> & {};

export type GroupedBuilderSummaryItem = {
  job_number: string;
  job_numbers: string[];
  site_address: string;
  created_at: string | null;
  placement_date: string | null;
  has_shipped: boolean;
  partially_shipped: boolean;
  ship_schedule: string | null;
  ship_status: string | null;
  box: number;
};

export const getBaseJobNumber = (jobNum?: string | null) => {
  if (!jobNum) return "";
  return jobNum.split("-")[0].trim();
};

export const shouldExcludeJob = (jobNum?: string | null) => {
  if (!jobNum) return false;
  const lower = jobNum.toLowerCase();
  if (lower.includes("memo")) return true;

  const parts = jobNum.split("-");
  const base = parts[0] || "";
  const suffix = parts.slice(1).join("-");

  if (base.toLowerCase().includes("m")) return true;
  if (suffix.toLowerCase().includes("x")) return true;

  return false;
};

export const groupBuilderSummaryData = (data: BuilderSummaryItem[]) => {
  const groupMap = new Map<string, GroupedBuilderSummaryItem>();

  for (const item of data) {
    if (shouldExcludeJob(item.job_number)) continue;
    const baseNum = getBaseJobNumber(item.job_number);
    const shipDateKey = item.ship_schedule
      ? dayjs(item.ship_schedule).format("YYYY-MM-DD")
      : "NO_SHIP_DATE";
    const key = `${baseNum}_${shipDateKey}`;

    const existing = groupMap.get(key);
    const itemBox = item.box || 0;

    if (existing) {
      if (item.job_number && !existing.job_numbers.includes(item.job_number)) {
        existing.job_numbers.push(item.job_number);
      }
      existing.box += itemBox;
      existing.has_shipped = existing.has_shipped || !!item.has_shipped;
      existing.partially_shipped =
        existing.partially_shipped || !!item.partially_shipped;
      if (!existing.site_address && item.site_address) {
        existing.site_address = item.site_address;
      }
      if (!existing.created_at && item.created_at) {
        existing.created_at = item.created_at;
      }
      if (!existing.placement_date && item.placement_date) {
        existing.placement_date = item.placement_date;
      }
    } else {
      groupMap.set(key, {
        job_number: baseNum || item.job_number || "",
        job_numbers: item.job_number ? [item.job_number] : [],
        site_address: item.site_address || "",
        created_at: item.created_at || null,
        placement_date: item.placement_date || null,
        has_shipped: !!item.has_shipped,
        partially_shipped: !!item.partially_shipped,
        ship_schedule: item.ship_schedule || null,
        ship_status: item.ship_status || null,
        box: itemBox,
      });
    }
  }

  const grouped = Array.from(groupMap.values());
  const totalBoxes = grouped.reduce((acc, item) => acc + item.box, 0);
  const totalJobs = grouped.length;

  return { grouped, totalBoxes, totalJobs };
};

export function useBuilderSummaryReport(params: BuilderSummaryParams) {
  const { supabase, isAuthenticated } = useSupabase();

  return useQuery({
    queryKey: ["builder_summary_report", params],
    queryFn: async () => {
      if (!params.builderName) {
        return { data: [], count: 0, totalJobs: 0, totalBoxes: 0 };
      }

      let query = supabase
        .from("installation_table_view")
        .select("*")
        .not("job_number", "ilike", "%memo%")
        .order("job_number", { ascending: false });

      if (params.builderName) {
        query = query.ilike("shipping_client_name", `%${params.builderName}%`);
      }

      if (params.shipDateStart) {
        query = query.gte(
          "ship_schedule",
          dayjs(params.shipDateStart).startOf("day").toISOString(),
        );
      }
      if (params.shipDateEnd) {
        query = query.lte(
          "ship_schedule",
          dayjs(params.shipDateEnd).endOf("day").toISOString(),
        );
      }

      if (params.creationDateStart) {
        query = query.gte(
          "created_at",
          dayjs(params.creationDateStart).startOf("day").toISOString(),
        );
      }
      if (params.creationDateEnd) {
        query = query.lte(
          "created_at",
          dayjs(params.creationDateEnd).endOf("day").toISOString(),
        );
      }

      if (params.shipStatus === "shipped") {
        query = query.eq("has_shipped", true);
      } else if (params.shipStatus === "partially_shipped") {
        query = query.eq("partially_shipped", true).eq("has_shipped", false);
      } else if (params.shipStatus === "not_shipped") {
        query = query.eq("has_shipped", false).eq("partially_shipped", false);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching builder summary report:", error);
        throw error;
      }

      const rawItems = (data || []) as BuilderSummaryItem[];
      const { grouped, totalBoxes, totalJobs } = groupBuilderSummaryData(rawItems);

      const from = params.page * params.pageSize;
      const to = from + params.pageSize;
      const paginatedData = grouped.slice(from, to);

      return {
        data: paginatedData,
        count: grouped.length,
        totalJobs,
        totalBoxes,
      };
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData) => previousData,
  });
}

export function useBuilderSummaryExport(params: BuilderSummaryExcelParams) {
  const { supabase, isAuthenticated } = useSupabase();

  return {
    fetchExportData: async () => {
      if (!params.builderName) {
        return [];
      }

      let query = supabase
        .from("installation_table_view")
        .select("*")
        .not("job_number", "ilike", "%memo%")
        .order("job_number", { ascending: false });

      if (params.builderName) {
        query = query.ilike("shipping_client_name", `%${params.builderName}%`);
      }

      if (params.shipDateStart) {
        query = query.gte(
          "ship_schedule",
          dayjs(params.shipDateStart).startOf("day").toISOString(),
        );
      }
      if (params.shipDateEnd) {
        query = query.lte(
          "ship_schedule",
          dayjs(params.shipDateEnd).endOf("day").toISOString(),
        );
      }

      if (params.creationDateStart) {
        query = query.gte(
          "created_at",
          dayjs(params.creationDateStart).startOf("day").toISOString(),
        );
      }
      if (params.creationDateEnd) {
        query = query.lte(
          "created_at",
          dayjs(params.creationDateEnd).endOf("day").toISOString(),
        );
      }

      if (params.shipStatus === "shipped") {
        query = query.eq("has_shipped", true);
      } else if (params.shipStatus === "partially_shipped") {
        query = query.eq("partially_shipped", true).eq("has_shipped", false);
      } else if (params.shipStatus === "not_shipped") {
        query = query.eq("has_shipped", false).eq("partially_shipped", false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BuilderSummaryItem[];
    },
  };
}
