import { z } from "zod";

export const InstallerSchema = z.object({
  first_name: z.string().min(1, "First Name is required"),
  last_name: z.string().min(1, "Last Name is required"),
  company_name: z.string().optional().nullable(),
  acc_number: z.string().optional().nullable(),

  email: z.string().optional().or(z.literal("")),
  phone_number: z.string().optional().nullable(),

  street_address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  zip_code: z.string().optional().nullable(),

  gst_number: z.string().optional().nullable(),
  wcb_number: z.string().optional().nullable(),

  is_active: z.boolean().default(true),
  has_first_aid: z.boolean().default(false),
  has_insurance: z.boolean().default(false),

  notes: z.string().optional().nullable(),
});

export type InstallerFormValues = z.infer<typeof InstallerSchema>;
