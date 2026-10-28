CREATE VIEW "public"."test_view" AS  SELECT b.id,
    b.job_id,
    b.created_at,
    j.job_number,
    so.shipping_client_name,
    so.shipping_street,
    so.shipping_city,
    so.shipping_province,
    so.shipping_zip,
    concat_ws(', '::text, so.shipping_street, so.shipping_city, so.shipping_province, so.shipping_zip) AS site_address
   FROM ((public.backorders b
     LEFT JOIN public.jobs j ON ((b.job_id = j.id)))
     LEFT JOIN public.sales_orders so ON ((j.sales_order_id = so.id)));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."test_view" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."test_view" TO "service_role";

REVOKE ALL ON TABLE "public"."test_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."test_view" TO "postgres";
