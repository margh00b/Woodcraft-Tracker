import { z } from "zod";

export const CabinetSpecsSchema = z.object({
  species: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  door_style: z.string().nullable().optional(),
  top_drawer_front: z.string().nullable().optional(),
  interior: z.string().nullable().optional(),
  drawer_box: z.string().nullable().optional(),
  drawer_hardware: z.string().nullable().optional(),
  box: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z
      .number({ error: "Box count must be a valid number" })
      .min(0, "Box count cannot be negative")
      .nullable()
      .optional(),
  ),
  doors_parts_only: z.boolean().default(false),
  handles_supplied: z.boolean().default(false),
  handles_selected: z.boolean().default(false),
  glass: z.boolean().default(false),
  glass_type: z.string().optional(),
  piece_count: z.string().optional(),
});

export const ShippingSchema = z.object({
  shipping_client_name: z.string().optional(),
  project_name: z.string().optional(),
  shipping_street: z.string().optional(),
  shipping_city: z.string().optional(),
  shipping_province: z.string().optional(),
  shipping_zip: z.string().optional(),
  shipping_phone_1: z.string().optional(),
  shipping_phone_2: z.string().optional(),
  shipping_email_1: z.string().optional(),
  shipping_email_2: z.string().optional(),
});

export const MasterOrderSchema = z
  .object({
    date_sold: z.string().nullable(),
    designer: z.string().optional(),
    client_id: z.number().min(1, "Client is required"),
    stage: z.enum(["QUOTE", "SOLD"]),
    total: z.number().min(0),
    deposit: z.number().min(0),
    comments: z.string().optional(),
    install: z.boolean().nullable().optional(),
    delivery_type: z
      .string({ error: "Please select a delivery type" })
      .trim()
      .min(1, "Please select a delivery type"),
    order_type: z.string().optional(),
    flooring_type: z.string().optional(),
    flooring_clearance: z.string().optional(),
    cabinet: CabinetSpecsSchema,
    shipping: ShippingSchema,
    parent_job_number_input: z.string().optional().nullable(),
    manual_job_base: z.string().optional(),
    manual_job_suffix: z.string().optional(),
    is_active: z.boolean().default(true).optional(),
    is_memo: z.boolean().default(false).optional(),
    is_canopy_required: z.boolean().default(false).optional(),
    is_woodtop_required: z.boolean().default(false).optional(),
    is_custom_cab_required: z.boolean().default(false).optional(),
    is_cod: z.boolean().nullable().optional(),
    payment_received: z.boolean().nullable().optional(),
    sitesuper_email: z.string().optional(),
    site_prep: z.boolean().nullable().optional(),
    markout_date: z.string().nullable().optional(),
    second_markout_date: z.string().nullable().optional(),
    in_prod: z.boolean().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (typeof data.install !== "boolean") {
      ctx.addIssue({
        code: "custom",
        path: ["install"],
        message: "Required!",
      });
    }

    if (!data.order_type?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["order_type"],
        message: "Required!",
      });
    }

    if (data.stage === "SOLD") {
      if (!data.manual_job_base?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["manual_job_base"],
          message: "Required!",
        });
      }

      if (data.in_prod == null) {
        ctx.addIssue({
          code: "custom",
          path: ["in_prod"],
          message: "Required!",
        });
      }
    }
  });

export type MasterOrderInput = z.infer<typeof MasterOrderSchema>;
