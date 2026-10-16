import { z } from "zod";

export const warehouseTrackingSchema = z.object({
  dropoff_date: z.string().nullable(),
  pickup_date: z.string().nullable().optional(),
  pallets: z.number().min(0, "Pallets cannot be negative").default(0),
  notes: z.string().optional(),
});

export type WarehouseTrackingFormValues = z.infer<
  typeof warehouseTrackingSchema
>;
