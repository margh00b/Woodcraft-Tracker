CREATE VIEW "public"."inspection_table_view" AS  SELECT j.id AS job_id,
    j.job_number,
    so.shipping_client_name,
    concat_ws(', '::text, so.shipping_street, so.shipping_city, so.shipping_province) AS site_address,
    i.installation_id,
    i.installation_date,
    i.inspection_date,
    i.inspection_completed,
    i.installer_id,
    ins.company_name AS installer_company,
    ins.first_name AS installer_first_name,
    ins.last_name AS installer_last_name,
    ps.rush
   FROM ((((public.jobs j
     JOIN public.sales_orders so ON ((j.sales_order_id = so.id)))
     JOIN public.installation i ON ((j.installation_id = i.installation_id)))
     LEFT JOIN public.installers ins ON ((i.installer_id = ins.installer_id)))
     LEFT JOIN public.production_schedule ps ON ((j.prod_id = ps.prod_id)))
  WHERE (j.is_active = true);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."inspection_table_view" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."inspection_table_view" TO "service_role";

REVOKE ALL ON TABLE "public"."inspection_table_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."inspection_table_view" TO "postgres";
