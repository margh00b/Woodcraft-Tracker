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
    queryKey: ["plant_wrap_table", pagination, columnFilters, sorting],
    queryFn: async () => {
      let dateQuery = supabase
        .from("plant_table_view")
        .select("wrap_date")
        .not("has_shipped", "is", true)
        .not("wrap_date", "is", null);

      columnFilters.forEach((filter) => {
        const { id, value } = filter;

        if (id === "wrap_date_range" && Array.isArray(value)) {
          const [start, end] = value;
          if (start && end) {
            dateQuery = dateQuery
              .gte("wrap_date", dayjs(start).format("YYYY-MM-DD"))
              .lte("wrap_date", dayjs(end).format("YYYY-MM-DD"));
          }
          return;
        }

        const valStr = String(value);
        if (!valStr) return;

        switch (id) {
          case "job_number":
            dateQuery = dateQuery.ilike("job_number", `%${valStr}%`);
            break;
          case "client":
            dateQuery = dateQuery.ilike("client_name", `%${valStr}%`);
            break;
          case "address":
            dateQuery = dateQuery.or(
              `shipping_street.ilike.%${valStr}%,shipping_city.ilike.%${valStr}%`
            );
            break;
        }
      });

      const { data: dateRows, error: dateError } = await dateQuery;
      if (dateError) throw new Error(dateError.message);

      const uniqueDates = Array.from(
        new Set(dateRows.map((r) => r.wrap_date))
      ).sort();

      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize;
      const targetDates = uniqueDates.slice(from, to);

      if (targetDates.length === 0) {
        return { data: [], count: 0 };
      }

      let jobQuery = supabase
        .from("plant_table_view")
        .select("*")
        .not("has_shipped", "is", true)
        .not("wrap_date", "is", null)
        .in("wrap_date", targetDates);

      if (sorting.length > 0) {
        const { id, desc } = sorting[0];
        jobQuery = jobQuery.order(id, { ascending: !desc });
      } else {
        jobQuery = jobQuery.order("wrap_date", { ascending: true });
      }

      const { data: jobs, error: jobError } = await jobQuery;
      if (jobError) throw new Error(jobError.message);

      return {
        data: jobs,
        count: uniqueDates.length,
      };
    },
    enabled: isAuthenticated,
    placeholderData: (previousData) => previousData,
  });
}
