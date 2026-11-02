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
  completion_percentage: number;
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
          production_schedule!inner (
            ship_schedule,
            in_plant_actual,
            in_plant_cabinets_actual,
            cut_melamine_completed_actual,
            cut_finish_completed_actual,
            custom_finish_completed_actual,
            doors_completed_actual,
            drawer_completed_actual,
            paint_completed_actual,
            assembly_completed_actual
          ),
          installation!inner (
            wrap_completed,
            has_shipped
          )
        `)
        .eq("installation.has_shipped", false)
        .eq("is_active", true)
        .or(
          "in_plant_actual.not.is.null,in_plant_cabinets_actual.not.is.null",
          { foreignTable: "production_schedule" },
        );

      if (error) throw error;

      return (data || [])
        .map((job: any) => {
          const so = Array.isArray(job.sales_orders)
            ? job.sales_orders[0]
            : job.sales_orders;
          const production = Array.isArray(job.production_schedule)
            ? job.production_schedule[0]
            : job.production_schedule;
          const installation = Array.isArray(job.installation)
            ? job.installation[0]
            : job.installation;

          const steps = [
            production?.cut_melamine_completed_actual,
            production?.cut_finish_completed_actual,
            production?.custom_finish_completed_actual,
            production?.doors_completed_actual,
            production?.drawer_completed_actual,
            production?.paint_completed_actual,
            production?.assembly_completed_actual,
            installation?.wrap_completed,
          ];

          const completedSteps = steps.filter(
            (step) => step !== null && step !== false,
          ).length;
          const percentage = Math.round((completedSteps / steps.length) * 100);

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
            completion_percentage: percentage,
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
