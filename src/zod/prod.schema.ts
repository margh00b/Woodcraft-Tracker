import z from "zod";

export const schedulingSchema = z.object({
  rush: z.boolean(),
  placement_date: z.string().nullable(),
  doors_in_schedule: z.string().nullable(),
  doors_out_schedule: z.string().nullable(),
  cut_finish_schedule: z.string().nullable(),
  cut_melamine_schedule: z.string().nullable(),
  paint_in_schedule: z.string().nullable(),
  paint_out_schedule: z.string().nullable(),
  assembly_schedule: z.string().nullable(),
  ship_schedule: z.string().nullable(),
  in_plant_actual: z.string().nullable(),
  ship_status: z.enum(["unprocessed", "tentative", "confirmed"]),
  doors_completed_actual: z.string().nullable(),
  cut_finish_completed_actual: z.string().nullable(),
  custom_finish_completed_actual: z.string().nullable(),
  drawer_completed_actual: z.string().nullable(),
  cut_melamine_completed_actual: z.string().nullable(),
  paint_completed_actual: z.string().nullable(),
  assembly_completed_actual: z.string().nullable(),
});
export type SchedulingType = z.infer<typeof schedulingSchema>;
