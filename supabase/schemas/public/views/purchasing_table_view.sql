CREATE VIEW "public"."purchasing_table_view" AS  SELECT pt.purchase_check_id,
    pt.job_id,
    pt.doors_ordered_at,
    pt.doors_received_at,
    pt.doors_received_incomplete_at,
    pt.glass_ordered_at,
    pt.glass_received_at,
    pt.glass_received_incomplete_at,
    pt.handles_ordered_at,
    pt.handles_received_at,
    pt.handles_received_incomplete_at,
    pt.acc_ordered_at,
    pt.acc_received_at,
    pt.acc_received_incomplete_at,
    pt.purchasing_comments,
    j.job_number,
    j.sales_order_id,
    so.shipping_client_name AS client_name,
    ps.ship_schedule,
    ds.name AS door_style_name,
    ds.is_made_in_house AS door_made_in_house
   FROM (((((public.purchase_tracking pt
     JOIN public.jobs j ON ((pt.job_id = j.id)))
     LEFT JOIN public.sales_orders so ON ((j.sales_order_id = so.id)))
     LEFT JOIN public.cabinets c ON ((so.cabinet_id = c.id)))
     LEFT JOIN public.door_styles ds ON ((c.door_style_id = ds.id)))
     LEFT JOIN public.production_schedule ps ON ((j.prod_id = ps.prod_id)))
  WHERE (j.is_active = true);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."purchasing_table_view" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."purchasing_table_view" TO "service_role";

REVOKE ALL ON TABLE "public"."purchasing_table_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."purchasing_table_view" TO "postgres";
