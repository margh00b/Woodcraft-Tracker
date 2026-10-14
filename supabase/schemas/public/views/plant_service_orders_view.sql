CREATE VIEW "public"."plant_service_orders_view" AS  SELECT so.service_order_id,
    so.service_order_number,
    so.due_date,
    so.chargeable,
    so.job_id,
    j.job_number,
    s.project_name,
    s.shipping_client_name AS client_name,
    s.shipping_street,
    s.shipping_city,
    s.shipping_province,
    s.shipping_zip,
    ( SELECT count(*) AS count
           FROM public.service_order_parts sop
          WHERE ((sop.service_order_id = so.service_order_id) AND (sop.status = 'pending'::public.so_part_status))) AS pending_parts_count,
    ( SELECT jsonb_agg(jsonb_build_object('id', sop.id, 'part', sop.part, 'description', sop.description, 'qty', sop.qty, 'location', sop.location, 'status', sop.status, 'part_due_date', sop.part_due_date)) AS jsonb_agg
           FROM public.service_order_parts sop
          WHERE ((sop.service_order_id = so.service_order_id) AND (sop.status = 'pending'::public.so_part_status))) AS pending_parts
   FROM ((public.service_orders so
     JOIN public.jobs j ON ((so.job_id = j.id)))
     LEFT JOIN public.sales_orders s ON ((j.sales_order_id = s.id)))
  WHERE (EXISTS ( SELECT 1
           FROM public.service_order_parts sop
          WHERE ((sop.service_order_id = so.service_order_id) AND (sop.status = 'pending'::public.so_part_status))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plant_service_orders_view" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plant_service_orders_view" TO "service_role";

REVOKE ALL ON TABLE "public"."plant_service_orders_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plant_service_orders_view" TO "postgres";
