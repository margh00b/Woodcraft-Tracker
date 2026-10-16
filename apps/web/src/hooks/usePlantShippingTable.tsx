import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import {
  PaginationState,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";
import dayjs from "dayjs";

interface UsePlantShippingTableParams {
  pagination: PaginationState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
}

export function usePlantShippingTable({
  pagination,
  columnFilters,
  sorting,
}: UsePlantShippingTableParams) {
  const { supabase, isAuthenticated } = useSupabase();

  const applyFilters = (query: any) => {
    const showPriorFilter = columnFilters.find((f) => f.id === "show_prior");
    const showPrior = showPriorFilter ? Boolean(showPriorFilter.value) : false;

    columnFilters.forEach((filter) => {
      const { id, value } = filter;
      if (id === "show_prior") return;

      if (id === "ship_date_range" && Array.isArray(value)) {
        const [start, end] = value;
        if (start && end) {
          if (!showPrior) {
            query = query.gte(
              "ship_schedule",
              dayjs(start).format("YYYY-MM-DD")
            );
          }
          query = query.lte("ship_schedule", dayjs(end).format("YYYY-MM-DD"));
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
            `shipping_street.ilike.%${valStr}%,shipping_city.ilike.%${valStr}%,shipping_province.ilike.%${valStr}%,shipping_zip.ilike.%${valStr}%`
          );
          break;
      }
    });
    return query;
  };

  return useQuery({
    queryKey: ["plant_shipping_table", pagination, columnFilters, sorting],
    queryFn: async () => {
      let dateQuery = supabase
        .from("plant_shipping_view")
        .select("ship_schedule")
        .not("ship_schedule", "is", null);

      dateQuery = applyFilters(dateQuery);

      const { data: dateRows, error: dateError } = await dateQuery;
      if (dateError) throw new Error(dateError.message);
      const uniqueDates = Array.from(
        new Set(dateRows.map((r) => r.ship_schedule))
      ).sort();

      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize;
      const targetDates = uniqueDates.slice(from, to);

      if (targetDates.length === 0) {
        return { data: [], count: 0 };
      }

      let jobQuery = supabase
        .from("plant_shipping_view")
        .select("*")
        .in("ship_schedule", targetDates)
        .not("ship_schedule", "is", null)
        .is("installation_completed", null);

      jobQuery = applyFilters(jobQuery);

      if (sorting.length > 0) {
        const { id, desc } = sorting[0];
        jobQuery = jobQuery
          .order(id, { ascending: !desc })
          .order("job_number", { ascending: true });
      } else {
        jobQuery = jobQuery
          .order("ship_schedule", { ascending: true })
          .order("job_number", { ascending: true });
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
