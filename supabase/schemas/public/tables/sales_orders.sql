CREATE TABLE "public"."sales_orders" (
  "id"                     bigint                   NOT NULL DEFAULT nextval('public.sales_orders_id_seq'::regclass),
  "sales_order_number"     text,
  "client_id"              bigint                   NOT NULL,
  "cabinet_id"             bigint                   NOT NULL,
  "total"                  numeric(10,2),
  "deposit"                numeric(10,2),
  "designer"               text,
  "comments"               text,
  "install"                boolean                  NOT NULL DEFAULT false,
  "delivery_type"          text,
  "order_type"             text,
  "counter_by"             text,
  "counter_top"            text,
  "counter_color"          text,
  "counter_type"           text,
  "shipping_client_name"   text,
  "shipping_street"        text,
  "shipping_city"          text,
  "shipping_province"      text,
  "shipping_zip"           text,
  "shipping_phone_1"       text,
  "shipping_phone_2"       text,
  "shipping_email_1"       text,
  "shipping_email_2"       text,
  "layout_date"            timestamp with time zone,
  "client_meeting_date"    timestamp with time zone,
  "follow_up_date"         timestamp with time zone,
  "appliance_specs_date"   timestamp with time zone,
  "selections_date"        timestamp with time zone,
  "flooring_type"          text,
  "flooring_clearance"     text,
  "markout_date"           timestamp with time zone,
  "review_date"            timestamp with time zone,
  "second_markout_date"    timestamp with time zone,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "is_memo"                boolean                  DEFAULT false,
  "date_sold"              timestamp with time zone,
  "project_name"           text,
  "is_canopy_required"     boolean,
  "is_woodtop_required"    boolean,
  "is_custom_cab_required" boolean,
  "is_cod"                 boolean                  DEFAULT false,
  "payment_received"       boolean                  DEFAULT false,
  "site_prep"              boolean                  DEFAULT false,
  CONSTRAINT "sales_orders_cabinet_id_fkey" FOREIGN KEY (cabinet_id) REFERENCES public.cabinets(id) ON DELETE RESTRICT,
  CONSTRAINT "sales_orders_client_id_fkey" FOREIGN KEY (client_id) REFERENCES public.client(id) ON DELETE RESTRICT,
  CONSTRAINT "sales_orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "sales_orders_sales_order_number_key" UNIQUE (sales_order_number)
);

ALTER TABLE "public"."sales_orders"
  ENABLE ROW LEVEL SECURITY;

ALTER SEQUENCE "public"."sales_orders_id_seq" OWNED BY "public"."sales_orders"."id";

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "invoice_balance" numeric GENERATED ALWAYS AS ((total - deposit)) STORED;

ALTER TABLE "public"."sales_orders"
  ADD COLUMN "stage" public."SalesStage" NOT NULL DEFAULT 'QUOTE'::public."SalesStage";

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
