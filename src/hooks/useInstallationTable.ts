import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import {
  PaginationState,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";

interface UseInstallationTableParams {
  pagination: PaginationState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
}

export function useInstallationTable({
  pagination,
  columnFilters,
  sorting,
}: UseInstallationTableParams) {
  const { supabase, isAuthenticated } = useSupabase();

  return useQuery({
    queryKey: ["installation_table_view", pagination, columnFilters, sorting],
    queryFn: async () => {
      let query = supabase
        .from("installation_table_view")
        .select("*", { count: "exact" });

      columnFilters.forEach((filter) => {
        const { id, value } = filter;
        const valStr = String(value);
        if (!valStr) return;

        switch (id) {
          case "job_number":
            query = query.ilike("job_number", `%${valStr}%`);
            break;
          case "client":
            query = query.ilike("shipping_client_name", `%${valStr}%`);
            break;
          case "installer":
            query = query.or(
              `installer_company.ilike.%${valStr}%,installer_first_name.ilike.%${valStr}%,installer_last_name.ilike.%${valStr}%`
            );
            break;
          case "installation_date":
            query = query.eq("installation_date", valStr);
            break;
          case "ship_schedule":
            query = query.eq("ship_schedule", valStr);
            break;
          default:
            break;
        }
      });

      if (sorting.length > 0) {
        const { id, desc } = sorting[0];
        const dbColumn =
          id === "client"
            ? "shipping_client_name"
            : id === "installer"
            ? "installer_company"
            : id;

        query = query.order(dbColumn, { ascending: !desc });
      } else {
        query = query.order("installation_date", { ascending: false });
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
