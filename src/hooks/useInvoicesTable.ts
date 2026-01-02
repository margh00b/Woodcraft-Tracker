import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import {
  PaginationState,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";
import dayjs from "dayjs";
import { Tables } from "@/types/db";

interface UseInvoicesTableParams {
  pagination: PaginationState;
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
}

type InvoiceRow = Tables<"invoices"> & {
  job:
    | (Tables<"jobs"> & {
        sales_orders: (Tables<"sales_orders"> & {}) | null;
      })
    | null;
};

export function useInvoicesTable({
  pagination,
  columnFilters,
  sorting,
}: UseInvoicesTableParams) {
  const { supabase, isAuthenticated } = useSupabase();

  return useQuery({
    queryKey: ["invoices_list_server", pagination, columnFilters, sorting],
    queryFn: async () => {
      const selectString = `
        *,
        job:jobs!inner (
          job_number,
          sales_orders!inner (
            shipping_client_name,
            shipping_street,
            shipping_city,
            shipping_province,
            shipping_zip
          )
        )
      `;

      let query = supabase
        .from("invoices")
        .select(selectString, { count: "exact" });

      for (const filter of columnFilters) {
        const { id, value } = filter;
        const valStr = String(value);
        if (!value) continue;

        switch (id) {
          case "invoice_number":
            query = query.ilike("invoice_number", `%${valStr}%`);
            break;
          case "job_number":
            query = query.ilike("job.job_number", `%${valStr}%`);
            break;
          case "client":
            query = query.ilike(
              "job.sales_orders.shipping_client_name",
              `%${valStr}%`
            );
            break;
          case "date_entered":
            if (Array.isArray(value)) {
              const [start, end] = value;
              if (start)
                query = query.gte(
                  "date_entered",
                  dayjs(start).format("YYYY-MM-DD")
                );
              if (end)
                query = query.lt(
                  "date_entered",
                  dayjs(end).add(1, "day").format("YYYY-MM-DD")
                );
            }
            break;
          case "status":
            if (valStr === "paid") {
              query = query.not("paid_at", "is", null);
            } else if (valStr === "pending") {
              query = query.is("paid_at", null).is("no_charge", false);
            } else if (valStr === "noCharge") {
              query = query.is("no_charge", true);
            }
            break;

          case "type":
            if (valStr === "invoices") {
              query = query.is("is_creditmemo", false);
            } else if (valStr === "creditmemos") {
              query = query.is("is_creditmemo", true);
            }
            break;
        }
      }

      if (sorting.length > 0) {
        const { id, desc } = sorting[0];
        if (
          id === "invoice_number" ||
          id === "date_entered" ||
          id === "date_due"
        ) {
          query = query.order(id, { ascending: !desc });
        } else {
          query = query.order("date_entered", { ascending: false });
        }
      } else {
        query = query
          .order("date_entered", { ascending: false })
          .order("invoice_id", { ascending: false });
      }

      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      return {
        data: data as unknown as InvoiceRow[],
        count: count || 0,
      };
    },
    enabled: isAuthenticated,
    placeholderData: (previousData) => previousData,
  });
}
