import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import {
  PaginationState,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

interface UseServiceOrdersTableParams {
  pagination: PaginationState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
}

export function useServiceOrdersTable({
  pagination,
  columnFilters,
  sorting,
}: UseServiceOrdersTableParams) {
  const { supabase, isAuthenticated } = useSupabase();

  return useQuery({
    queryKey: ["service_orders_table_view", pagination, columnFilters, sorting],
    queryFn: async () => {
      let query = supabase
        .from("service_orders_table_view" as any)
        .select("*", { count: "exact" });

      columnFilters.forEach((filter) => {
        const { id, value } = filter;

        if (
          (id === "date_entered" || id === "due_date") &&
          Array.isArray(value)
        ) {
          const [start, end] = value;
          if (start) {
            query = query.gte(
              id,
              dayjs.utc(start).startOf("day").toISOString(),
            );
          }
          if (end) {
            query = query.lte(id, dayjs.utc(end).endOf("day").toISOString());
          }
          return;
        }

        const valStr = String(value);
        if (!valStr) return;

        switch (id) {
          case "status":
            if (valStr === "OPEN") {
              query = query.is("completed_at", null);
            } else if (valStr === "COMPLETED") {
              query = query.not("completed_at", "is", null);
            }
            break;
          case "service_order_number":
            query = query.ilike("service_order_number", `%${valStr}%`);
            break;
          case "job_number":
            query = query.ilike("job_number", `%${valStr}%`);
            break;
          case "client_name":
            query = query.ilike("client_name", `%${valStr}%`);
            break;
          case "site_address":
            query = query.ilike("site_address", `%${valStr}%`);
            break;
          case "installer_requested":
            if (valStr === "true") {
              query = query.eq("installer_requested", true);
            }
            break;
          case "order_type":
            query = query.eq("order_type", valStr);
            break;
          default:
            break;
        }
      });

      if (sorting.length > 0) {
        const { id, desc } = sorting[0];
        query = query.order(id, { ascending: !desc });
      } else {
        query = query.order("date_entered", { ascending: false });
        query = query.order("service_order_id", { ascending: false });
      }

      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.length > 0) {
        const soIds = data.map((d: any) => d.service_order_id).filter(Boolean);

        if (soIds.length > 0) {
          const { data: partsData, error: partsError } = await supabase
            .from("service_order_parts")
            .select("service_order_id, status")
            .in("service_order_id", soIds);

          if (!partsError && partsData) {
            const partsMap = new Map<number, { status: string | null }[]>();

            partsData.forEach((part: any) => {
              const existing = partsMap.get(part.service_order_id) || [];
              existing.push({ status: part.status });
              partsMap.set(part.service_order_id, existing);
            });

            data.forEach((row: any) => {
              row.service_order_parts =
                partsMap.get(row.service_order_id) || [];
            });
          }
        }
      }

      data?.forEach((row: any) => {
        if (!row.service_order_parts) row.service_order_parts = [];
      });

      return {
        data,
        count,
      };
    },
    enabled: isAuthenticated,
    placeholderData: (previousData) => previousData,
  });
}
