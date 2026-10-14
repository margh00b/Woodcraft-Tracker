CREATE VIEW "public"."sales_table_view" AS  SELECT so.id,
    so.sales_order_number,
    so.stage,
    so.total,
    so.deposit,
    so.invoice_balance,
    so.designer,
    so.created_at,
    so.shipping_client_name,
    so.project_name,
    so.shipping_street,
    so.shipping_city,
    so.shipping_province,
    so.shipping_zip,
    j.job_number,
    j.id AS job_id,
    ps.ship_schedule,
    cab.box AS cabinet_box,
    c."Name" AS cabinet_color
   FROM ((((public.sales_orders so
     LEFT JOIN public.jobs j ON ((so.id = j.sales_order_id)))
     LEFT JOIN public.production_schedule ps ON ((j.prod_id = ps.prod_id)))
     LEFT JOIN public.cabinets cab ON ((so.cabinet_id = cab.id)))
     LEFT JOIN public.colors c ON ((cab.color_id = c."Id")))
  WHERE ((j.is_active = true) OR (j.id IS NULL));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sales_table_view" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sales_table_view" TO "service_role";

REVOKE ALL ON TABLE "public"."sales_table_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sales_table_view" TO "postgres";
