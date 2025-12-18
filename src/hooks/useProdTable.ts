import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import {
  PaginationState,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";
import dayjs from "dayjs";

interface UseProdTableParams {
  pagination: PaginationState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
}

export function useProdTable({
  pagination,
  columnFilters,
  sorting,
}: UseProdTableParams) {
  const { supabase, isAuthenticated } = useSupabase();

  return useQuery({
    queryKey: ["prod_table_view", pagination, columnFilters, sorting],
    queryFn: async () => {
      let query = supabase
        .from("prod_table_view")
        .select("*", { count: "exact" });

      columnFilters.forEach((filter) => {
        const { id, value } = filter;

        if (
          (id === "received_date" ||
            id === "placement_date" ||
            id === "ship_schedule") &&
          Array.isArray(value)
        ) {
          const [start, end] = value;
          if (start) query = query.gte(id, dayjs(start).format("YYYY-MM-DD"));
          if (end) query = query.lte(id, dayjs(end).format("YYYY-MM-DD"));
          return;
        }

        // Handle Standard Text Filters
        const valStr = String(value);
        if (!valStr) return;

        switch (id) {
          case "job_number":
            query = query.ilike("job_number", `%${valStr}%`);
            break;
          case "client":
            query = query.ilike("shipping_client_name", `%${valStr}%`);
            break;
          case "site_address":
            query = query.ilike("site_address", `%${valStr}%`);
            break;
          default:
            query = query.ilike(id, `%${valStr}%`);
        }
      });

      if (sorting.length > 0) {
        const { id, desc } = sorting[0];
        const dbColumn = id === "client" ? "shipping_client_name" : id;
        query = query.order(dbColumn, { ascending: !desc });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return {
        data: data,
        count,
      };
    },
    enabled: isAuthenticated,
    placeholderData: (previousData) => previousData,
  });
}
