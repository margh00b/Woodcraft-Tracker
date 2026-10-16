import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import {
  PaginationState,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";

interface UseSiteChangesTableProps {
  pagination: PaginationState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
}

export function useSiteChangesTable({
  pagination,
  columnFilters,
  sorting,
}: UseSiteChangesTableProps) {
  const { supabase, isAuthenticated } = useSupabase();

  return useQuery({
    queryKey: ["site_changes", pagination, columnFilters, sorting],
    queryFn: async () => {

      let query = supabase.from("jobs").select(
        `
            *,
            installation!inner (
              installation_id,
              site_changes,
              site_changes_detail,
              installation_date
            ),
            sales_orders (
              shipping_client_name,
              shipping_street,
              shipping_city,
              shipping_province,
              shipping_zip
            )
          `,
        { count: "exact" }
      );

      query = query.not("installation.site_changes", "is", null);

      for (const filter of columnFilters) {
        const { id, value } = filter;
        if (!value) continue;
        const valStr = String(value);

        switch (id) {
          case "job_number":
            query = query.ilike("job_number", `%${valStr}%`);
            break;
          case "client_name":
            query = query.ilike(
              "sales_orders.shipping_client_name",
              `%${valStr}%`
            );
            break;
          case "shipping_address":
            query = query.or(
              `shipping_street.ilike.%${valStr}%,shipping_city.ilike.%${valStr}%,shipping_province.ilike.%${valStr}%,shipping_zip.ilike.%${valStr}%`,
              { foreignTable: "sales_orders" }
            );
            break;
          case "installation_date":
            if (Array.isArray(value)) {
              const [start, end] = value;
              if (start) {
                const startDate = new Date(start);
                startDate.setMinutes(
                  startDate.getMinutes() - startDate.getTimezoneOffset()
                );
                query = query.gte(
                  "installation.installation_date",
                  startDate.toISOString().split("T")[0]
                );
              }
              if (end) {
                const endDate = new Date(end);
                endDate.setMinutes(
                  endDate.getMinutes() - endDate.getTimezoneOffset()
                );
                query = query.lte(
                  "installation.installation_date",
                  endDate.toISOString().split("T")[0]
                );
              }
            }
            break;
        }
      }

      if (sorting.length > 0) {
        const { id, desc } = sorting[0];
        if (id === "job_number") {
          query = query.order("job_number", { ascending: !desc });
        } else if (id === "client_name") {
        } else if (id === "site_changes_detail") {
          query = query.order("site_changes_detail", {
            foreignTable: "installation",
            ascending: !desc,
          });
        }
      } else {
        query = query.order("job_number", { ascending: false });
      }

      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw new Error(error.message);

      return { data, count };
    },
    enabled: isAuthenticated,
    placeholderData: (previousData: any) => previousData,
  });
}
