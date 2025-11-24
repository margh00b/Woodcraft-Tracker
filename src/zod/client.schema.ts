import { z } from "zod";

export const ClientSchema = z.object({
  id: z.number().optional(),
  designer: z.string().optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().min(2, "Last Name is required"),
  street: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  phone1: z.string().optional().nullable(),
  phone2: z.string().optional().nullable(),
  email1: z.string().email().optional().or(z.literal("")).nullable(),
  email2: z.string().email().optional().or(z.literal("")).nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type ClientFormValues = z.infer<typeof ClientSchema>;
