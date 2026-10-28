CREATE TABLE "public"."sales_orders" (
  "id"                 bigint NOT NULL DEFAULT nextval('public.sales_orders_id_seq'::regclass),
  "sales_order_number" text,
  "client_id"          bigint NOT NULL,
  "cabinet_id"         bigint NOT NULL,
  CONSTRAINT "sales_orders_cabinet_id_fkey" FOREIGN KEY (cabinet_id) REFERENCES public.cabinets(id) ON DELETE RESTRICT,
  CONSTRAINT "sales_orders_client_id_fkey" FOREIGN KEY (client_id) REFERENCES public.client(id) ON DELETE RESTRICT,
  CONSTRAINT "sales_orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "sales_orders_sales_order_number_key" UNIQUE (sales_order_number)
);

ALTER TABLE "public"."sales_orders"
  ENABLE ROW LEVEL SECURITY;

ALTER SEQUENCE "public"."sales_orders_id_seq" OWNED BY "public"."sales_orders"."id";

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "stage" public."SalesStage" NOT NULL DEFAULT 'QUOTE'::public."SalesStage";

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "total" numeric(10,2);

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "deposit" numeric(10,2);

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "designer" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "comments" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "install" boolean NOT NULL DEFAULT false;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "delivery_type" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "order_type" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "counter_by" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "counter_top" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "counter_color" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "counter_type" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "shipping_client_name" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "shipping_street" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "shipping_city" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "shipping_province" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "shipping_zip" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "shipping_phone_1" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "shipping_phone_2" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "shipping_email_1" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "shipping_email_2" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "layout_date" timestamp WITH time zone;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "client_meeting_date" timestamp WITH time zone;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "follow_up_date" timestamp WITH time zone;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "appliance_specs_date" timestamp WITH time zone;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "selections_date" timestamp WITH time zone;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "flooring_type" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "flooring_clearance" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "markout_date" timestamp WITH time zone;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "review_date" timestamp WITH time zone;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "second_markout_date" timestamp WITH time zone;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "invoice_balance" numeric GENERATED ALWAYS AS ((total - deposit)) STORED;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "is_memo" boolean DEFAULT false;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "date_sold" timestamp WITH time zone;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "project_name" text;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "is_canopy_required" boolean;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "is_woodtop_required" boolean;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "is_custom_cab_required" boolean;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "is_cod" boolean DEFAULT false;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "payment_received" boolean DEFAULT false;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "site_prep" boolean DEFAULT false;

CREATE INDEX sales_orders_client_id_idx ON public.sales_orders USING btree (client_id);

CREATE TRIGGER sales_order_number_trigger
  BEFORE INSERT ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_sales_order_number();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "Enable delete for admin only" ON "public"."sales_orders"
  FOR DELETE
  TO PUBLIC
  USING ((public.clerk_user_role() = 'admin'::text));

CREATE POLICY "Enable insert for sales editors" ON "public"."sales_orders"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((public.clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text])));

CREATE POLICY "Enable read access for authenticated users" ON "public"."sales_orders"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Enable update for sales editors" ON "public"."sales_orders"
  FOR UPDATE
  TO PUBLIC
  USING ((public.clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text])));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sales_orders" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sales_orders" TO "service_role";

REVOKE ALL ON TABLE "public"."sales_orders" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sales_orders" TO "postgres";
