import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import {
  PaginationState,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";

interface UseInspectionTableParams {
  pagination?: PaginationState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
  fetchAll?: boolean;
}

export function useInspectionTable({
  pagination,
  columnFilters,
  sorting,
  fetchAll = false,
}: UseInspectionTableParams) {
  const { supabase, isAuthenticated } = useSupabase();

  return useQuery({
    queryKey: [
      "inspection_table_view",
      fetchAll ? "all" : pagination,
      columnFilters,
      sorting,
    ],
    queryFn: async () => {
      let query = supabase
        .from("inspection_table_view" as any)
        .select("*", { count: "exact" });

      columnFilters.forEach((filter) => {
        const { id, value } = filter;

        if (value === undefined || value === null || value === "") return;

        switch (id) {
          case "job_number":
            query = query.ilike("job_number", `%${String(value)}%`);
            break;
          case "shipping_client_name":
            query = query.ilike("shipping_client_name", `%${String(value)}%`);
            break;
          case "site_address":
            query = query.ilike("site_address", `%${String(value)}%`);
            break;
          case "installer_company":
            query = query.or(
              `installer_company.ilike.%${String(
                value,
              )}%,installer_first_name.ilike.%${String(
                value,
              )}%,installer_last_name.ilike.%${String(value)}%`,
            );
            break;
          case "inspection_date":
            if (Array.isArray(value)) {
              const [start, end] = value;
              if (start) query = query.gte("inspection_date", start);
              if (end) query = query.lte("inspection_date", end);
            } else {
              query = query.eq("inspection_date", String(value));
            }
            break;
          case "installation_date":
            if (Array.isArray(value)) {
              const [start, end] = value;
              if (start) query = query.gte("installation_date", start);
              if (end) query = query.lte("installation_date", end);
            }
            break;
          case "unscheduled":
            if (value === true) {
              query = query.is("inspection_date", null);
            }
            break;
          case "incomplete":
            if (value === true) {
              query = query.is("inspection_completed", null);
            }
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
        query = query.order("job_number", { ascending: true });
      }

      if (!fetchAll && pagination) {
        const from = pagination.pageIndex * pagination.pageSize;
        const to = from + pagination.pageSize - 1;
        query = query.range(from, to);
      }

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
  });
}
