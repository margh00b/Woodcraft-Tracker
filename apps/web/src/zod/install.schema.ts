import z from "zod";

export const installationSchema = z.object({
  installation_id: z.number().optional(),
  installer_id: z.number().nullable(),
  installation_notes: z.string().nullable(),
  wrap_date: z.coerce.date().nullable(),
  has_shipped: z.boolean(),
  partially_shipped: z.boolean().optional(),
  installation_date: z.coerce.date().nullable(),
  installation_completed: z.string().nullable(),
  inspection_date: z.coerce.date().nullable(),
  inspection_completed: z.string().nullable(),
  legacy_ref: z.string().nullable(),
  installation_report_received: z.string().nullable(),
  in_warehouse: z.string().nullable(),
  trade_30days: z.string().nullable(),
  trade_6months: z.string().nullable(),
  site_changes: z.string().nullable(),
  site_changes_detail: z.string().nullable(),
});

export type InstallationType = z.infer<typeof installationSchema>;
