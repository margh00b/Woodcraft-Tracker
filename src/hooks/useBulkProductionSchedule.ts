import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabase";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import { TablesUpdate } from "@/types/db";

export type BulkProductionSchedulePayload =
  TablesUpdate<"production_schedule"> & {
    prodIds: number[];
    wrap_date?: string | null;
  };

export function useBulkProductionSchedule() {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BulkProductionSchedulePayload) => {
      const { prodIds, ...updates } = payload;

      if (!prodIds || prodIds.length === 0) {
        console.warn("No production IDs provided for bulk update");
        throw new Error("No valid production IDs found for selected jobs");
      }

      const prodUpdates: any = {};

      // Handle all date fields
      if (updates.received_date !== undefined)
        prodUpdates.received_date = updates.received_date
          ? dayjs(updates.received_date).format("YYYY-MM-DD")
          : null;

      if (updates.placement_date !== undefined)
        prodUpdates.placement_date = updates.placement_date
          ? dayjs(updates.placement_date).format("YYYY-MM-DD")
          : null;

      // wrap_date is on the installation table, handled separately below

      if (updates.ship_schedule !== undefined)
        prodUpdates.ship_schedule = updates.ship_schedule
          ? dayjs(updates.ship_schedule).format("YYYY-MM-DD")
          : null;

      if (updates.ship_status !== undefined)
        prodUpdates.ship_status = updates.ship_status;

      // Doors schedule
      if (updates.doors_in_schedule !== undefined)
        prodUpdates.doors_in_schedule = updates.doors_in_schedule
          ? dayjs(updates.doors_in_schedule).format("YYYY-MM-DD")
          : null;

      if (updates.doors_out_schedule !== undefined)
        prodUpdates.doors_out_schedule = updates.doors_out_schedule
          ? dayjs(updates.doors_out_schedule).format("YYYY-MM-DD")
          : null;

      // Cutting schedule
      if (updates.cut_finish_schedule !== undefined)
        prodUpdates.cut_finish_schedule = updates.cut_finish_schedule
          ? dayjs(updates.cut_finish_schedule).format("YYYY-MM-DD")
          : null;

      if (updates.cut_melamine_schedule !== undefined)
        prodUpdates.cut_melamine_schedule = updates.cut_melamine_schedule
          ? dayjs(updates.cut_melamine_schedule).format("YYYY-MM-DD")
          : null;

      // Paint schedule
      if (updates.paint_in_schedule !== undefined)
        prodUpdates.paint_in_schedule = updates.paint_in_schedule
          ? dayjs(updates.paint_in_schedule).format("YYYY-MM-DD")
          : null;

      if (updates.paint_out_schedule !== undefined)
        prodUpdates.paint_out_schedule = updates.paint_out_schedule
          ? dayjs(updates.paint_out_schedule).format("YYYY-MM-DD")
          : null;

      // Assembly
      if (updates.assembly_schedule !== undefined)
        prodUpdates.assembly_schedule = updates.assembly_schedule
          ? dayjs(updates.assembly_schedule).format("YYYY-MM-DD")
          : null;

      const promises = [];

      // Perform bulk update for production_schedule
      if (Object.keys(prodUpdates).length > 0) {
        const { data, error } = await supabase
          .from("production_schedule")
          .update(prodUpdates)
          .in("prod_id", prodIds)
          .select();

        if (error) throw error;

        if (!data || data.length === 0) {
          console.warn(
            "Update succeeded but returned no data. Check RLS policies or IDs."
          );
          // We won't throw here to avoid failing if other parts succeed, but we should note it.
          // Actually, if RLS blocked it, we want to know.
        }
        promises.push(Promise.resolve(data));
      }

      // Handle wrap_date update on installation table
      if (updates.wrap_date !== undefined) {
        const formattedWrapDate = updates.wrap_date
          ? dayjs(updates.wrap_date).format("YYYY-MM-DD")
          : null;

        // Fetch installation IDs linked to these production IDs
        const { data: jobs } = await supabase
          .from("jobs")
          .select("installation_id")
          .in("prod_id", prodIds);

        const installationIds = jobs
          ?.map((j) => j.installation_id)
          .filter((id) => id !== null) as number[];

        if (installationIds && installationIds.length > 0) {
          promises.push(
            supabase
              .from("installation")
              .update({ wrap_date: formattedWrapDate })
              .in("installation_id", installationIds)
          );
        }
      }

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prod_table_view"] });
      queryClient.invalidateQueries({ queryKey: ["production_schedule_list"] });
      notifications.show({
        title: "Success",
        message: "Bulk production update completed successfully",
        color: "green",
      });
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });
}
