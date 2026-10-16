import { z } from "zod";

export const BackorderSchema = z.object({
  id: z.number().optional(),
  job_id: z.string().min(1, "Job selection is required"),
  date_entered: z.coerce.date().nullable().optional(),
  due_date: z.coerce.date().nullable().optional(),
  comments: z.string().optional().nullable(),
  complete: z.boolean().optional().default(false),
});

export type BackorderFormValues = z.infer<typeof BackorderSchema>;
