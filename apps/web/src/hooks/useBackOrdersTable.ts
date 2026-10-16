import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import {
  PaginationState,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";
import dayjs from "dayjs";

interface UseBackordersTableParams {
  pagination?: PaginationState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
  fetchAll?: boolean;
}

export function useBackordersTable({
  pagination,
  columnFilters,
  sorting,
  fetchAll = false,
}: UseBackordersTableParams) {
  const { supabase } = useSupabase();

  return useQuery({
    queryKey: ["backorders_view", pagination, columnFilters, sorting, fetchAll],
    queryFn: async () => {
      let query = supabase
        .from("backorders_view" as any)
        .select("*", { count: "exact" });

      columnFilters.forEach((filter) => {
        const { id, value } = filter;

        if (
          (id === "date_entered" || id === "due_date") &&
          Array.isArray(value)
        ) {
          const [start, end] = value;
          if (start)
            query = query.gte(id, dayjs(start).startOf("day").toISOString());
          if (end) query = query.lte(id, dayjs(end).endOf("day").toISOString());
          return;
        }

        const valStr = String(value);
        if (!valStr && valStr !== "false") return; 

        switch (id) {
          case "job_number":
            query = query.ilike("job_number", `%${valStr}%`);
            break;
          case "shipping_client_name":
            query = query.ilike("shipping_client_name", `%${valStr}%`);
            break;
          case "id": 
            query = query.eq("id", valStr);
            break;
          case "comments":
            query = query.ilike("comments", `%${valStr}%`);
            break;
          case "complete":
            if (valStr !== "all") {
              query = query.eq("complete", valStr === "true");
            }
            break;
        }
      });

      if (sorting.length > 0) {
        const { id, desc } = sorting[0];
        query = query.order(id, { ascending: !desc });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      if (!fetchAll && pagination) {
        const from = pagination.pageIndex * pagination.pageSize;
        const to = from + pagination.pageSize - 1;
        query = query.range(from, to);
      }

      const { data, count, error } = await query;

      if (error) throw new Error(error.message);

      return { data, count };
    },
    placeholderData: (previousData) => previousData,
  });
}
