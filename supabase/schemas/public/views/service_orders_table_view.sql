CREATE VIEW "public"."service_orders_table_view" AS  SELECT so.service_order_id,
    so.service_order_number,
    so.date_entered,
    so.due_date,
    so.completed_at,
    so.installer_requested,
    j.id AS job_id,
    j.job_number,
    j.sales_order_id,
    s.shipping_client_name AS client_name,
    s.order_type,
    concat_ws(', '::text, s.shipping_street, s.shipping_city, s.shipping_province) AS site_address,
    i.company_name AS installer_company,
    i.first_name AS installer_first,
    i.last_name AS installer_last
   FROM (((public.service_orders so
     LEFT JOIN public.jobs j ON ((so.job_id = j.id)))
     LEFT JOIN public.sales_orders s ON ((j.sales_order_id = s.id)))
     LEFT JOIN public.installers i ON ((so.installer_id = i.installer_id)))
  WHERE (j.is_active = true);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."service_orders_table_view" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."service_orders_table_view" TO "service_role";

REVOKE ALL ON TABLE "public"."service_orders_table_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."service_orders_table_view" TO "postgres";
