import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import {
  PaginationState,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";

interface UsePlantMasterTableParams {
  pagination: PaginationState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
}

export function usePlantMasterTable({
  pagination,
  columnFilters,
  sorting,
}: UsePlantMasterTableParams) {
  const { supabase, isAuthenticated } = useSupabase();

  return useQuery({
    queryKey: ["plant_master_view", pagination, columnFilters, sorting],
    queryFn: async () => {
      let query = supabase
        .from("plant_master_view")
        .select("*", { count: "exact" });

      columnFilters.forEach((filter) => {
        const { id, value } = filter;
        const valStr = String(value);
        if (!valStr) return;

        switch (id) {
          case "display_id":
            query = query.ilike("display_id", `%${valStr}%`);
            break;
          case "client_name":
            query = query.ilike("client_name", `%${valStr}%`);
            break;
          case "record_type":
            if (valStr !== "ALL") {
              query = query.eq("record_type", valStr);
            }
            break;
          case "due_date":
            query = query.eq("due_date", valStr);
            break;
          default:
            break;
        }
      });

      if (sorting.length > 0) {
        const { id, desc } = sorting[0];
        query = query.order(id, { ascending: !desc });
      } else {
        query = query.order("due_date", { ascending: true });
      }

      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw new Error(error.message);

      return { data, count };
    },
    enabled: isAuthenticated,
    placeholderData: (previousData) => previousData,
  });
}
