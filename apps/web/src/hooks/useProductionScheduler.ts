import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import { Tables } from "@/types/db";

type CabinetSpecsJoined = Tables<"cabinets"> & {
  door_styles: { name: string } | null;
  species: { Species: string } | null;
  colors: { Name: string } | null;
};

type SalesOrderDetails = Tables<"sales_orders"> & {
  cabinet: CabinetSpecsJoined | null;
};

export type JobProductionDetails = Tables<"jobs"> & {
  sales_orders: SalesOrderDetails | null;
  production_schedule: Tables<"production_schedule"> | null;
  installation: Pick<Tables<"installation">, "wrap_date"> | null;
};

export function useProductionScheduler(jobId: number) {
  const { supabase, isAuthenticated, isLoading: isAuthLoading } = useSupabase();

  const query = useQuery({
    queryKey: ["job-production-details", jobId],
    queryFn: async (): Promise<JobProductionDetails> => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
          *,
          production_schedule:production_schedule (*),
          installation:installation (wrap_date),
          sales_orders:sales_orders (
            id,
            shipping_street,
            shipping_city,
            shipping_province,
            shipping_zip,
            shipping_client_name,
            project_name,
            shipping_phone_1,
            shipping_email_1,
            shipping_phone_2,
            shipping_email_2,
            order_type,
            delivery_type,
            install,
            is_canopy_required,
            is_woodtop_required,
            is_custom_cab_required,
            cabinet:cabinets (
              id,
              box,
              glass,
              glaze,
              finish,
              interior,
              drawer_box,
              glass_type,
              piece_count,
              doors_parts_only,
              handles_selected,
              handles_supplied,
              hinge_soft_close,
              top_drawer_front,
              door_styles(name),
              species(Species),
              colors(Name)
            )
          )
        `,
        )
        .eq("id", jobId)
        .single();

      if (error) throw error;
      return data as unknown as JobProductionDetails;
    },
    enabled:
      !isAuthLoading && isAuthenticated && Number.isFinite(jobId) && jobId > 0,
  });

  return {
    ...query,
    isLoading: isAuthLoading || query.isLoading,
  };
}
