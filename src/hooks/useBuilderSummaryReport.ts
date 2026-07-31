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

export type BuilderSummaryItem = Views<"installation_table_view"> & {
};

export function useBuilderSummaryReport(params: BuilderSummaryParams) {
  const { supabase, isAuthenticated } = useSupabase();

  return useQuery({
    queryKey: ["builder_summary_report", params],
    queryFn: async () => {
      if (!params.builderName) {
        return { data: [], count: 0 };
      }

      let query = supabase
        .from("installation_table_view")
        .select("*", { count: "exact" })
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

      const from = params.page * params.pageSize;
      const to = from + params.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching builder summary report:", error);
        throw error;
      }

      return { data: data as BuilderSummaryItem[], count: count || 0 };
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
