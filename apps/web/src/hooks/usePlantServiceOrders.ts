import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import {
  PaginationState,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";
import dayjs from "dayjs";

interface UsePlantServiceOrdersParams {
  pagination?: PaginationState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
  fetchAll?: boolean;
  enabled?: boolean;
}

export function usePlantServiceOrders({
  pagination = { pageIndex: 0, pageSize: 15 },
  columnFilters,
  sorting,
  fetchAll = false,
  enabled = true,
}: UsePlantServiceOrdersParams) {
  const { supabase, isAuthenticated } = useSupabase();

  const applyFilters = (query: any) => {
    columnFilters.forEach((filter) => {
      const { id, value } = filter;

      if (id === "service_date_range" && Array.isArray(value)) {
        const [start, end] = value;
        if (start && end) {
          query = query
            .gte("due_date", dayjs(start).format("YYYY-MM-DD"))
            .lte("due_date", dayjs(end).format("YYYY-MM-DD"));
        }
        return;
      }

      if (id === "part_due_date_range" && Array.isArray(value)) {
        const [start, end] = value;
        if (start && end) {
          query = query
            .gte(
              "service_order_parts.part_due_date",
              dayjs(start).format("YYYY-MM-DD"),
            )
            .lte(
              "service_order_parts.part_due_date",
              dayjs(end).format("YYYY-MM-DD"),
            );
        }
        return;
      }

      const valStr = String(value);
      if (!valStr) return;

      switch (id) {
        case "service_order_number":
          query = query.ilike("service_order_number", `%${valStr}%`);
          break;
        case "job_number":
          query = query.ilike("job_number", `%${valStr}%`);
          break;
        case "client":
          query = query.ilike("client_name", `%${valStr}%`);
          break;
        case "address":
          query = query.or(
            `shipping_street.ilike.%${valStr}%,shipping_city.ilike.%${valStr}%,shipping_province.ilike.%${valStr}%`,
          );
          break;
      }
    });
    return query;
  };

  return useQuery({
    queryKey: [
      "plant_service_orders",
      pagination,
      columnFilters,
      sorting,
      fetchAll,
    ],
    queryFn: async () => {
      const partDateFilter = columnFilters.find(
        (f) => f.id === "part_due_date_range",
      );
      const hasPartDateFilter =
        partDateFilter &&
        Array.isArray(partDateFilter.value) &&
        partDateFilter.value[0] &&
        partDateFilter.value[1];

      let dateSelect = "due_date";
      if (hasPartDateFilter) {
        dateSelect = "due_date, service_order_parts!inner(part_due_date)";
      }

      let dateQuery = supabase
        .from("plant_service_orders_view")
        .select(dateSelect)
        .gt("pending_parts_count", 0);

      dateQuery = applyFilters(dateQuery);

      const { data: dateRows, error: dateError } = await dateQuery;
      if (dateError) throw new Error(dateError.message);

      const uniqueDates = Array.from(
        new Set((dateRows as any[]).map((r: any) => r.due_date || "No Date")),
      ).sort((a, b) => {
        if (a === "No Date") return 1;
        if (b === "No Date") return -1;
        return a.localeCompare(b);
      });

      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize;
      const targetDates = fetchAll ? uniqueDates : uniqueDates.slice(from, to);

      if (targetDates.length === 0) {
        return { data: [], count: 0 };
      }

      const queryDates = targetDates.map((d) => (d === "No Date" ? null : d));

      let orderSelect = "*";
      if (hasPartDateFilter) {
        orderSelect = "*, service_order_parts!inner(part_due_date)";
      }

      let orderQuery = supabase
        .from("plant_service_orders_view")
        .select(orderSelect)
        .gt("pending_parts_count", 0);

      if (queryDates.includes(null)) {
        const validDates = queryDates.filter((d) => d !== null);
        if (validDates.length > 0) {
          orderQuery = orderQuery.or(
            `due_date.in.(${validDates.join(",")}),due_date.is.null`,
          );
        } else {
          orderQuery = orderQuery.is("due_date", null);
        }
      } else {
        orderQuery = orderQuery.in("due_date", queryDates);
      }

      orderQuery = applyFilters(orderQuery);

      if (sorting.length > 0) {
        const { id, desc } = sorting[0];
        orderQuery = orderQuery.order(id, { ascending: !desc });
      } else {
        orderQuery = orderQuery.order("due_date", { ascending: true });
      }

      const { data: orders, error: orderError } = await orderQuery;
      if (orderError) throw new Error(orderError.message);

      return {
        data: orders,
        count: uniqueDates.length,
      };
    },
    enabled: isAuthenticated && enabled,
    placeholderData: (previousData) => previousData,
  });
}
