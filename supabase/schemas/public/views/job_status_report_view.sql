CREATE VIEW "public"."job_status_report_view" AS  SELECT j.id AS job_id,
    j.job_number,
    so.shipping_client_name,
    so.shipping_street,
    so.shipping_city,
    so.shipping_zip,
    ps.ship_schedule,
    i.installation_date,
    i.installation_completed,
    i.has_shipped,
    i.inspection_date,
    i.inspection_completed,
    count(s.service_order_id) AS service_order_count
   FROM ((((public.jobs j
     JOIN public.sales_orders so ON ((j.sales_order_id = so.id)))
     JOIN public.production_schedule ps ON ((j.prod_id = ps.prod_id)))
     JOIN public.installation i ON ((j.installation_id = i.installation_id)))
     LEFT JOIN public.service_orders s ON ((j.id = s.job_id)))
  WHERE ((COALESCE(so.is_memo, false) = false) AND (COALESCE(j.job_suffix, ''::text) !~~* '%X%'::text) AND (j.job_number !~~* '%m%'::text))
  GROUP BY j.id, j.job_number, so.shipping_client_name, so.shipping_street, so.shipping_city, so.shipping_zip, ps.ship_schedule, i.installation_date, i.installation_completed, i.has_shipped, i.inspection_date, i.inspection_completed;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."job_status_report_view" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."job_status_report_view" TO "service_role";

REVOKE ALL ON TABLE "public"."job_status_report_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."job_status_report_view" TO "postgres";
