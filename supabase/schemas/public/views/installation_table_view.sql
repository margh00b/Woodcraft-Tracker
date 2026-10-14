CREATE VIEW "public"."installation_table_view" AS  SELECT j.id AS job_id,
    j.job_number,
    j.sales_order_id,
    j.prod_id,
    so.created_at,
    so.shipping_client_name,
    so.project_name,
    concat_ws(', '::text, so.shipping_street, so.shipping_city, so.shipping_province) AS site_address,
    so.is_cod,
    so.payment_received,
    so.order_type,
    c.box,
    col."Name" AS cabinet_color,
    i.installation_id,
    i.installation_date,
    i.wrap_date,
    i.inspection_date,
    i.has_shipped,
    i.partially_shipped,
    i.installation_completed,
    i.inspection_completed,
    i.installer_id,
    ins.company_name AS installer_company,
    ins.first_name AS installer_first_name,
    ins.last_name AS installer_last_name,
    ps.rush,
    ps.ship_schedule,
    ps.ship_status,
    ps.placement_date
   FROM ((((((public.jobs j
     JOIN public.sales_orders so ON ((j.sales_order_id = so.id)))
     JOIN public.installation i ON ((j.installation_id = i.installation_id)))
     LEFT JOIN public.cabinets c ON ((so.cabinet_id = c.id)))
     LEFT JOIN public.colors col ON ((c.color_id = col."Id")))
     LEFT JOIN public.installers ins ON ((i.installer_id = ins.installer_id)))
     LEFT JOIN public.production_schedule ps ON ((j.prod_id = ps.prod_id)))
  WHERE (j.is_active = true);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."installation_table_view" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."installation_table_view" TO "service_role";

REVOKE ALL ON TABLE "public"."installation_table_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."installation_table_view" TO "postgres";
