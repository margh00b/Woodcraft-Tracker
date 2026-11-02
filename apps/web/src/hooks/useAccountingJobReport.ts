import { useSupabase } from "@/hooks/useSupabase";
import { useQuery } from "@tanstack/react-query";

export type AccountingJobItem = {
  id: number;
  job_number: string;
  shipping_client_name: string;
  shipping_address: string;
  date_sold: string;
  ship_schedule: string | null;
  price: number | null;
};

export function useAccountingJobReport() {
  const { supabase, isAuthenticated } = useSupabase();

  return useQuery({
    queryKey: ["accounting_job_report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          id,
          job_number,
          sales_orders!inner (
            date_sold,
            total,
            shipping_client_name,
            shipping_street,
            shipping_city,
            shipping_province,
            shipping_zip
          ),
          production_schedule (
            ship_schedule
          ),
          installation!inner (
            has_shipped
          )
        `)
        .eq("installation.has_shipped", false)
        .eq("is_active", true);

      if (error) throw error;

      return (data || [])
        .map((job: any) => {
          const so = Array.isArray(job.sales_orders)
            ? job.sales_orders[0]
            : job.sales_orders;
          const production = Array.isArray(job.production_schedule)
            ? job.production_schedule[0]
            : job.production_schedule;

          const address = [
            so?.shipping_street,
            so?.shipping_city,
            so?.shipping_province,
            so?.shipping_zip,
          ]
            .filter(Boolean)
            .join(", ");

          return {
            id: job.id,
            job_number: job.job_number,
            date_sold: so?.date_sold,
            shipping_client_name: so?.shipping_client_name || "Unknown",
            shipping_address: address,
            ship_schedule: production?.ship_schedule || null,
            price: so?.total ?? null,
          };
        })
        .sort((a, b) => {
          const dateA = a.ship_schedule
            ? new Date(a.ship_schedule).getTime()
            : Infinity;
          const dateB = b.ship_schedule
            ? new Date(b.ship_schedule).getTime()
            : Infinity;
          return dateA - dateB;
        }) as AccountingJobItem[];
    },
    enabled: isAuthenticated,
  });
}
