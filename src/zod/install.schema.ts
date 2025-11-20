import z from "zod";

export const installationSchema = z.object({
  installation_id: z.number().optional(),
  installer_id: z.number().nullable(),
  installation_notes: z.string().nullable(),
  wrap_date: z.coerce.date().nullable(),
  has_shipped: z.boolean(),
  installation_date: z.coerce.date().nullable(),
  installation_completed: z.string().nullable(), // ISO String timestamp for completion
  inspection_date: z.coerce.date().nullable(),
  inspection_completed: z.string().nullable(), // ISO String timestamp for inspection sign-off
  legacy_ref: z.string().nullable(),
});

export type InstallationType = z.infer<typeof installationSchema>;
