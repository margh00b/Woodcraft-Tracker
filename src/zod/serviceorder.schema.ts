import { z } from "zod";

// Schema for individual parts within a service order
export const ServiceOrderPartSchema = z.object({
  qty: z.number().min(1, "Quantity must be at least 1"),
  part: z.string().min(1, "Part name is required"),
  description: z.string().optional(),
});

// Main Service Order Schema
export const ServiceOrderSchema = z.object({
  // We use string for job_id in the form for Select compatibility, convert to number on submit
  job_id: z.string().min(1, "Job selection is required"),
  service_order_number: z.string().min(1, "Service Order Number is required"),

  due_date: z.coerce.date().nullable().optional(),
  installer_id: z.string().nullable().optional(), // Form uses string for Select

  service_type: z.string().optional(),
  service_type_detail: z.string().optional(),
  service_by: z.string().optional(),
  service_by_detail: z.string().optional(),
  hours_estimated: z.number().min(0).optional(),
  chargeable: z.boolean().optional().default(false),
  comments: z.string().optional(),

  parts: z.array(ServiceOrderPartSchema).optional().default([]),
  completed_at: z.coerce.date().nullable().optional(),
});

export type ServiceOrderPartType = z.infer<typeof ServiceOrderPartSchema>;
export type ServiceOrderFormValues = z.infer<typeof ServiceOrderSchema>;
