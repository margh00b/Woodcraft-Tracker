import { useSupabase } from "@/hooks/useSupabase";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

export type PlantStatusItem = {
  id: number;
  job_number: string;
  shipping_client_name: string;
  shipping_address: string;
  date_sold: string;
  cut_melamine: string | null;
  cut_finish: string | null;
  custom_finish: string | null;
  doors: string | null;
  drawers: string | null;
  paint: string | null;
  assembly: string | null;
  wrap: string | null;
  completion_percentage: number;
  ship_schedule: string | null;
};

export function usePlantStatusReport() {
  const { supabase, isAuthenticated } = useSupabase();

  return useQuery({
    queryKey: ["plant_status_report"],
    queryFn: async () => {
      let query = supabase
        .from("jobs")
        .select(
          `
          id,
          job_number,
          sales_orders!inner (
            date_sold,
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
        `,
        )
        .eq("installation.has_shipped", false)
        .eq("is_active", true)
        .or(
          "in_plant_actual.not.is.null,in_plant_cabinets_actual.not.is.null",
          { foreignTable: "production_schedule" },
        );

      const { data, error } = await query;
      if (error) throw error;

      const sortedData = [...data].sort((a: any, b: any) => {
        const dateA = a.production_schedule?.ship_schedule
          ? new Date(a.production_schedule.ship_schedule).getTime()
          : Infinity;
        const dateB = b.production_schedule?.ship_schedule
          ? new Date(b.production_schedule.ship_schedule).getTime()
          : Infinity;

        return dateA - dateB;
      });

      return sortedData.map((job: any) => {
        const prod = job.production_schedule;
        const so = job.sales_orders;
        const inst = job.installation;

        const steps = [
          prod.cut_melamine_completed_actual,
          prod.cut_finish_completed_actual,
          prod.custom_finish_completed_actual,
          prod.doors_completed_actual,
          prod.drawer_completed_actual,
          prod.paint_completed_actual,
          prod.assembly_completed_actual,
          inst?.wrap_completed,
        ];

        const completedSteps = steps.filter(
          (step) => step !== null && step !== false,
        ).length;
        const percentage = Math.round((completedSteps / steps.length) * 100);

        const address = [
          so.shipping_street,
          so.shipping_city,
          so.shipping_province,
          so.shipping_zip,
        ]
          .filter(Boolean)
          .join(", ");

        return {
          id: job.id,
          job_number: job.job_number,
          date_sold: so.date_sold,
          shipping_client_name: so.shipping_client_name || "Unknown",
          shipping_address: address,
          cut_melamine: prod.cut_melamine_completed_actual,
          cut_finish: prod.cut_finish_completed_actual,
          custom_finish: prod.custom_finish_completed_actual,
          doors: prod.doors_completed_actual,
          drawers: prod.drawer_completed_actual,
          paint: prod.paint_completed_actual,
          assembly: prod.assembly_completed_actual,
          wrap: inst?.wrap_completed || null,
          completion_percentage: percentage,
          ship_schedule: prod?.ship_schedule,
        };
      }) as PlantStatusItem[];
    },
    enabled: isAuthenticated,
  });
}
