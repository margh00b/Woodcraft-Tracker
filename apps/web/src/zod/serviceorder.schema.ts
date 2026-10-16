import { z } from "zod";

export const ServiceOrderPartSchema = z.object({
  id: z.number().optional(),
  _deleted: z.boolean().optional(),
  qty: z.number().min(1, "Quantity must be at least 1"),
  part: z.string().min(1, "Part name is required"),
  description: z.string().optional(),
  location: z.string().default("Unknown"),
  status: z.enum(["pending", "completed", "unknown"]).default("pending"),
  part_due_date: z.coerce
    .date()
    .nullable()
    .refine((date) => date !== null, { message: "Part Due date is required" }),
});

export const ServiceOrderSchema = z
  .object({
    job_id: z.string().min(1, "Job selection is required"),
    service_order_number: z.string().min(1, "Service Order Number is required"),

    due_date: z.coerce.date().nullable().optional(),
    installer_id: z.string().nullable().optional(),

    service_type: z.string().optional(),
    service_type_detail: z.string().optional(),
    service_by: z.string().optional(),
    service_by_detail: z.string().optional(),
    hours_estimated: z.number().min(0).optional(),
    chargeable: z.boolean().nullable().optional(),
    is_warranty_so: z.boolean().optional().default(false),
    warranty_order_cost: z.number().optional(),
    comments: z.string().optional(),
    installer_requested: z.boolean().optional().default(false),
    parts: z.array(ServiceOrderPartSchema).optional().default([]),
    completed_at: z.coerce.date().nullable().optional(),
    created_by: z.string().optional(),

    homeowner_name: z.string().optional(),
    homeowner_phone: z.string().optional(),
    homeowner_email: z.string().optional(),
    homeowner_details: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasParts =
      data.parts &&
      data.parts.length > 0 &&
      data.parts.some((p) => !p._deleted);

    if (
      hasParts &&
      (data.chargeable === null || data.chargeable === undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Chargeable selection is required when parts are added",
        path: ["chargeable"],
      });
    }
  });

export type ServiceOrderPartType = z.infer<typeof ServiceOrderPartSchema>;
export type ServiceOrderFormValues = z.infer<typeof ServiceOrderSchema>;
