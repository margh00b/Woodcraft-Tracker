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
        .from("accounting_job_report")
        .select("*");

      if (error) throw error;

      return (data || [])
        .map((job) => {
          const steps = [
            job.cut_melamine_completed_actual,
            job.cut_finish_completed_actual,
            job.custom_finish_completed_actual,
            job.doors_completed_actual,
            job.drawer_completed_actual,
            job.paint_completed_actual,
            job.assembly_completed_actual,
            job.wrap_completed,
          ];

          const completedSteps = steps.filter(
            (step) => step !== null && step !== false,
          ).length;

          const percentage = Math.round((completedSteps / steps.length) * 100);

          const address = [
            job.shipping_street,
            job.shipping_city,
            job.shipping_province,
            job.shipping_zip,
          ]
            .filter(Boolean)
            .join(", ");

          return {
            id: job.job_id,
            job_number: job.job_number,
            date_sold: job.date_sold,
            shipping_client_name: job.client_name || "Unknown",
            shipping_address: address,
            ship_schedule: job.ship_schedule,
            price: job.price,
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
