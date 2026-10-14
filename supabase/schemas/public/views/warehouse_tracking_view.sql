CREATE VIEW "public"."warehouse_tracking_view" AS  SELECT min(wt.id) AS id,
    min(wt.job_id) AS job_id,
        CASE
            WHEN (count(*) > 1) THEN j.job_base_number
            ELSE max((j.job_base_number || COALESCE(('-'::text || j.job_suffix), ''::text)))
        END AS job_number,
    max(so.shipping_client_name) AS shipping_client_name,
    max(concat_ws(', '::text, so.shipping_street, so.shipping_city, so.shipping_province, so.shipping_zip)) AS shipping_address,
    sum((COALESCE(NULLIF(regexp_replace((c.box)::text, '[^0-9]'::text, ''::text, 'g'::text), ''::text), '0'::text))::integer) AS box,
    wt.dropoff_date,
    wt.pickup_date,
    wt.pallets,
    max(wt.notes) AS notes,
    count(*) AS grouped_count
   FROM (((public.warehouse_tracking wt
     LEFT JOIN public.jobs j ON ((wt.job_id = j.id)))
     LEFT JOIN public.sales_orders so ON ((j.sales_order_id = so.id)))
     LEFT JOIN public.cabinets c ON ((so.cabinet_id = c.id)))
  GROUP BY j.job_base_number, wt.dropoff_date, wt.pickup_date, wt.pallets;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."warehouse_tracking_view" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."warehouse_tracking_view" TO "service_role";

REVOKE ALL ON TABLE "public"."warehouse_tracking_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."warehouse_tracking_view" TO "postgres";
