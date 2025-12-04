import { z } from "zod";

// 1. Cabinet Specifications
export const CabinetSpecsSchema = z.object({
  species: z.string().optional(),
  color: z.string().optional(),
  door_style: z.string().optional(),
  top_drawer_front: z.string().optional(),
  interior: z.string().optional(),
  drawer_box: z.string().optional(),
  drawer_hardware: z.string().optional(),
  box: z.string().optional(),
  doors_parts_only: z.boolean().default(false),
  handles_supplied: z.boolean().default(false),
  handles_selected: z.boolean().default(false),
  glass: z.boolean().default(false),
  glass_type: z.string().optional(),
  piece_count: z.string().optional(),
});

// 2. Shipping Information
export const ShippingSchema = z.object({
  shipping_client_name: z.string().optional(),
  shipping_street: z.string().optional(),
  shipping_city: z.string().optional(),
  shipping_province: z.string().optional(),
  shipping_zip: z.string().optional(),
  shipping_phone_1: z.string().optional(),
  shipping_phone_2: z.string().optional(),
  shipping_email_1: z.email().or(z.literal("")).optional(),
  shipping_email_2: z.email().or(z.literal("")).optional(),
});

// 5. Master Form Input
export const MasterOrderSchema = z.object({
  client_id: z.number().min(1, "Client is required"),
  stage: z.enum(["QUOTE", "SOLD"]),
  total: z.number().min(0),
  deposit: z.number().min(0),
  comments: z.string().optional(),
  install: z.boolean({
    error: "Select Yes/No",
  }),
  delivery_type: z.string({ error: "Delivery Type is required" }),
  order_type: z.string({ error: "Order Type is required" }),
  flooring_type: z.string().optional(),
  flooring_clearance: z.string().optional(),
  cabinet: CabinetSpecsSchema,
  shipping: ShippingSchema,
  parent_job_number_input: z.string().optional().nullable(),
  manual_job_base: z.number().optional(),
  manual_job_suffix: z.string().optional(),
  is_memo: z.boolean().default(false),
});

export type MasterOrderInput = z.infer<typeof MasterOrderSchema>;
