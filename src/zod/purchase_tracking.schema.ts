import { z } from "zod";

export const PurchaseTrackingSchema = z.object({
  purchase_check_id: z.number(),
  job_id: z.number(),

  doors_ordered_at: z.string().nullable(),
  doors_received_at: z.string().nullable(),

  glass_ordered_at: z.string().nullable(),
  glass_received_at: z.string().nullable(),

  handles_ordered_at: z.string().nullable(),
  handles_received_at: z.string().nullable(),

  acc_ordered_at: z.string().nullable(),
  acc_received_at: z.string().nullable(),

  laminate_ordered_at: z.string().optional().nullable(),
  laminate_received_at: z.string().optional().nullable(),

  purchasing_comments: z.string().nullable().optional(),
});

export type PurchaseTrackingType = z.infer<typeof PurchaseTrackingSchema>;
