import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import {
  PaginationState,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";

interface UseInspectionTableParams {
  pagination: PaginationState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
}

export function useInspectionTable({
  pagination,
  columnFilters,
  sorting,
}: UseInspectionTableParams) {
  const { supabase, isAuthenticated } = useSupabase();

  return useQuery({
    queryKey: ["inspection_table_view", pagination, columnFilters, sorting],
    queryFn: async () => {
      let query = supabase
        .from("inspection_table_view" as any) 
        .select("*", { count: "exact" });

      columnFilters.forEach((filter) => {
        const { id, value } = filter;
        const valStr = String(value);
        if (!valStr) return;

        switch (id) {
          case "job_number":
            query = query.ilike("job_number", `%${valStr}%`);
            break;
          case "shipping_client_name":
            query = query.ilike("shipping_client_name", `%${valStr}%`);
            break;
          case "installer_company":
            query = query.or(
              `installer_company.ilike.%${valStr}%,installer_first_name.ilike.%${valStr}%,installer_last_name.ilike.%${valStr}%`
            );
            break;
          case "inspection_date":
            query = query.eq("inspection_date", valStr);
            break;
          default:
            break;
        }
      });

      if (sorting.length > 0) {
        const { id, desc } = sorting[0];
        query = query.order(id, { ascending: !desc });
      } else {
        query = query.order("inspection_date", { ascending: true });
      }

      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return {
        data,
        count,
      };
    },
    enabled: isAuthenticated,
    placeholderData: (previousData) => previousData,
  });
}