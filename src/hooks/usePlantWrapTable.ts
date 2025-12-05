import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import {
  PaginationState,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";
import dayjs from "dayjs";

interface UsePlantTableParams {
  pagination: PaginationState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
}

export function usePlantWrapTable({
  pagination,
  columnFilters,
  sorting,
}: UsePlantTableParams) {
  const { supabase, isAuthenticated } = useSupabase();

  return useQuery({
    queryKey: ["plant_table_view", pagination, columnFilters, sorting],
    queryFn: async () => {
      let query = supabase
        .from("plant_table_view")
        .select("*", { count: "exact" })
        .not("wrap_date", "is", null);

      columnFilters.forEach((filter) => {
        const { id, value } = filter;

        if (id === "wrap_date_range" && Array.isArray(value)) {
          const [start, end] = value;
          if (start && end) {
            query = query
              .gte("wrap_date", dayjs(start).format("YYYY-MM-DD"))
              .lte("wrap_date", dayjs(end).format("YYYY-MM-DD"));
          }
          return;
        }

        const valStr = String(value);
        if (!valStr) return;

        switch (id) {
          case "job_number":
            query = query.ilike("job_number", `%${valStr}%`);
            break;
          case "client":
            query = query.ilike("client_name", `%${valStr}%`);
            break;
          case "address":
            query = query.or(
              `shipping_street.ilike.%${valStr}%,shipping_city.ilike.%${valStr}%`
            );
            break;
          default:
            break;
        }
      });

      if (sorting.length > 0) {
        const { id, desc } = sorting[0];
        query = query.order(id, { ascending: !desc });
      } else {
        query = query.order("wrap_date", { ascending: true });
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
