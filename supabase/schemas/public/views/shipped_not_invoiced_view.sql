CREATE VIEW "public"."shipped_not_invoiced_view" AS  SELECT j.id,
    j.job_number,
    ps.ship_schedule AS ship_date,
    s.shipping_client_name,
    concat_ws(', '::text, NULLIF(s.shipping_street, ''::text), NULLIF(s.shipping_city, ''::text), NULLIF(s.shipping_province, ''::text), NULLIF(s.shipping_zip, ''::text)) AS shipping_address
   FROM ((((public.jobs j
     JOIN public.installation inst ON ((j.installation_id = inst.installation_id)))
     JOIN public.sales_orders s ON ((j.sales_order_id = s.id)))
     LEFT JOIN public.production_schedule ps ON ((j.prod_id = ps.prod_id)))
     LEFT JOIN public.invoices i ON ((j.id = i.job_id)))
  WHERE ((inst.has_shipped = true) AND (i.invoice_id IS NULL));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."shipped_not_invoiced_view" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."shipped_not_invoiced_view" TO "service_role";

REVOKE ALL ON TABLE "public"."shipped_not_invoiced_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."shipped_not_invoiced_view" TO "postgres";
