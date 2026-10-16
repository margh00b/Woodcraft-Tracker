import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import { Tables } from "@/types/db";

export type ServiceOrderChargeableItem = {
  service_order_id: number;
  service_order_number: string;
  job_id: number;
  job_number: string | null;
  due_date: string | null;
  chargeable: boolean | null;
  completed_at: string | null;
  service_type: string | null;
  client_name: string | null;
  shipping_address: string | null;
};

export function useServiceOrdersChargeable() {
  const { supabase, isAuthenticated } = useSupabase();

  return useQuery({
    queryKey: ["service_orders_chargeable_view"],
    queryFn: async () => {
      const { data: serviceOrders, error: soError } = await supabase
        .from("service_orders")
        .select(
          `
          service_order_id,
          service_order_number,
          due_date,
          chargeable,
          completed_at,
          service_type,
          job_id,
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
        `
        )
        .eq("chargeable", true)
        .order("due_date", { ascending: true });

      if (soError) throw soError;

      const { data: invoicedIds, error: invError } = await supabase
        .from("invoices")
        .select("service_order_id")
        .not("service_order_id", "is", null);

      if (invError) throw invError;

      const invoicedSet = new Set(invoicedIds?.map((i) => i.service_order_id));

      return serviceOrders
        .filter((so) => !invoicedSet.has(so.service_order_id))
        .map((so: any) => ({
          service_order_id: so.service_order_id,
          service_order_number: so.service_order_number,
          job_id: so.job_id,
          job_number: so.job?.job_number || null,
          due_date: so.due_date,
          chargeable: so.chargeable,
          completed_at: so.completed_at,
          service_type: so.service_type,
          client_name: so.job?.sales_orders?.shipping_client_name || null,
          shipping_address:
            [
              so.job?.sales_orders?.shipping_street,
              so.job?.sales_orders?.shipping_city,
              so.job?.sales_orders?.shipping_province,
              so.job?.sales_orders?.shipping_zip,
            ]
              .filter(Boolean)
              .join(", ") || null,
        })) as ServiceOrderChargeableItem[];
    },
    enabled: isAuthenticated,
  });
}
