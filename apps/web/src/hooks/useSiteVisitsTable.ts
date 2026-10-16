import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import {
  PaginationState,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";
import dayjs from "dayjs";

interface UseSiteVisitsTableProps {
  pagination: PaginationState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
}

export function useSiteVisitsTable({
  pagination,
  columnFilters,
  sorting,
}: UseSiteVisitsTableProps) {
  const { supabase, isAuthenticated } = useSupabase();

  return useQuery({
    queryKey: ["site_visits", pagination, columnFilters, sorting],
    queryFn: async () => {
      const hasJobFilter = columnFilters.some((f) => f.id === "job_number");
      const hasClientOrAddressFilter = columnFilters.some((f) =>
        ["client_name", "shipping_address"].includes(f.id)
      );

      const jobsJoin =
        hasJobFilter || hasClientOrAddressFilter
          ? "jobs:job_id!inner"
          : "jobs:job_id";
      const soJoin = hasClientOrAddressFilter
        ? "sales_orders:sales_orders!inner"
        : "sales_orders:sales_orders";

      const selectString = `
        *,
        ${jobsJoin} (
          job_number,
          ${soJoin} (
            shipping_client_name,
            shipping_street,
            shipping_city,
            shipping_province,
            shipping_zip
          )
        )
      `;

      let query = supabase
        .from("site_visits")
        .select(selectString, { count: "exact" });

      columnFilters.forEach((filter) => {
        const { id, value } = filter;
        if (!value) return;

        const valStr = String(value);

        switch (id) {
          case "job_number":
            query = query.ilike("jobs.job_number", `%${valStr}%`);
            break;
          case "client_name":
            query = query.ilike(
              "jobs.sales_orders.shipping_client_name",
              `%${valStr}%`
            );
            break;
          case "shipping_address":
            query = query.or(
              `shipping_street.ilike.%${valStr}%,shipping_city.ilike.%${valStr}%,shipping_province.ilike.%${valStr}%,shipping_zip.ilike.%${valStr}%`,
              { foreignTable: "jobs.sales_orders" }
            );
            break;
          case "visit_date":
            if (Array.isArray(value)) {
              const [start, end] = value;
              if (start)
                query = query.gte(
                  "visit_date",
                  dayjs(start).format("YYYY-MM-DD")
                );
              if (end)
                query = query.lte(
                  "visit_date",
                  dayjs(end).format("YYYY-MM-DD")
                );
            }
            break;
          default:
            query = query.ilike(id, `%${valStr}%`);
            break;
        }
      });

      if (sorting.length > 0) {
        const { id, desc } = sorting[0];
        query = query.order(id, { ascending: !desc });
      } else {
        query = query.order("visit_date", { ascending: false });
        query = query.order("job_number", {
          referencedTable: "jobs",
          ascending: true,
        });
      }

      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw new Error(error.message);

      return { data, count };
    },
    enabled: isAuthenticated,
    placeholderData: (previousData) => previousData,
  });
}
