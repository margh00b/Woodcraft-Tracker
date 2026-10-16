import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import dayjs from "dayjs";

export type ShippedNotInvoicedItem = {
  id: number;
  job_number: string;
  shipping_client_name: string | null;
  shipping_address: string | null;
  ship_date: string | null;
};

type DateRange = [Date | null, Date | null];

export function useShippedNotInvoiced(dateRange: DateRange = [null, null]) {
  const { supabase, isAuthenticated } = useSupabase();

  return useQuery({
    queryKey: ["shipped_not_invoiced_view", dateRange],
    queryFn: async () => {
      let query = supabase
        .from("shipped_not_invoiced_view")
        .select("*")
        .order("ship_date", { ascending: false });

      if (dateRange[0]) {
        query = query.gte(
          "ship_date",
          dayjs(dateRange[0]).format("YYYY-MM-DD")
        );
      }

      if (dateRange[1]) {
        query = query.lte(
          "ship_date",
          dayjs(dateRange[1]).format("YYYY-MM-DD")
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as ShippedNotInvoicedItem[];
    },
    enabled: isAuthenticated,
  });
}
