import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import {
  PaginationState,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";
import dayjs from "dayjs";

interface UseSalesTableParams {
  pagination: PaginationState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
}

export function useSalesTable({
  pagination,
  columnFilters,
  sorting,
}: UseSalesTableParams) {
  const { supabase, isAuthenticated } = useSupabase();

  return useQuery({
    queryKey: ["sales_table", pagination, columnFilters, sorting],
    queryFn: async () => {
      let query = supabase
        .from("sales_table_view")
        .select("*", { count: "exact" });

      columnFilters.forEach((filter) => {
        const { id, value } = filter;
        if (id === "ship_schedule" && Array.isArray(value)) {
          const [start, end] = value;
          if (start)
            query = query.gte(
              "ship_schedule",
              dayjs(start).startOf("day").toISOString()
            );
          if (end)
            query = query.lte(
              "ship_schedule",
              dayjs(end).endOf("day").toISOString()
            );
          return;
        }

        if (id === "created_at" && Array.isArray(value)) {
          const [start, end] = value;
          if (start)
            query = query.gte(
              "created_at",
              dayjs(start).startOf("day").toISOString()
            );
          if (end)
            query = query.lte(
              "created_at",
              dayjs(end).endOf("day").toISOString()
            );
          return;
        }

        const valStr = String(value);

        if (!valStr) return;

        switch (id) {
          case "job_number":
            query = query.ilike("job_number", `%${valStr}%`);
            break;
          case "clientlastName":
            query = query.ilike("shipping_client_name", `%${valStr}%`);
            break;
          case "designerName":
            query = query.ilike("designer", `%${valStr}%`);
            break;
          case "site_address":
            query = query.or(
              `shipping_street.ilike.%${valStr}%,shipping_city.ilike.%${valStr}%,shipping_province.ilike.%${valStr}%,shipping_zip.ilike.%${valStr}%`
            );
            break;
          case "stage":
            if (valStr !== "ALL") {
              query = query.eq("stage", valStr);
            }
            break;
          case "my_jobs":
            query = query.ilike("designer", `%${valStr}%`);
            break;
          default:
            query = query.ilike(id, `%${valStr}%`);
        }
      });

      if (sorting.length > 0) {
        const { id, desc } = sorting[0];
        const dbColumn = id === "clientlastName" ? "shipping_client_name" : id;
        query = query.order(dbColumn, { ascending: !desc });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        console.error("Error fetching sales orders:", error);
        throw new Error(error.message);
      }

      return { data, count };
    },
    enabled: isAuthenticated,
    placeholderData: (previousData) => previousData,
  });
}
