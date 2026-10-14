CREATE VIEW "public"."plant_shipping_view" AS  SELECT j.id AS job_id,
    j.prod_id,
    j.job_number,
    ps.placement_date,
    so.shipping_client_name AS client_name,
    so.project_name,
    so.shipping_street,
    so.shipping_city,
    so.shipping_province,
    so.shipping_zip,
    so.order_type,
    c.box AS cabinet_box,
    ds.name AS cabinet_door_style,
    s."Species" AS cabinet_species,
    col."Name" AS cabinet_color,
    i.installation_id,
    i.wrap_date,
    i.wrap_completed,
    i.has_shipped,
    i.installation_completed,
    i.partially_shipped,
    i.installation_notes,
    i.in_warehouse,
    wt.dropoff_date,
    wt.pickup_date,
    ps.ship_schedule,
    ps.ship_status
   FROM ((((((((public.jobs j
     LEFT JOIN public.sales_orders so ON ((j.sales_order_id = so.id)))
     LEFT JOIN public.cabinets c ON ((so.cabinet_id = c.id)))
     LEFT JOIN public.door_styles ds ON ((c.door_style_id = ds.id)))
     LEFT JOIN public.species s ON ((c.species_id = s."Id")))
     LEFT JOIN public.colors col ON ((c.color_id = col."Id")))
     JOIN public.installation i ON ((j.installation_id = i.installation_id)))
     LEFT JOIN public.production_schedule ps ON ((j.prod_id = ps.prod_id)))
     LEFT JOIN public.warehouse_tracking wt ON ((j.id = wt.job_id)))
  WHERE (j.is_active = true);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plant_shipping_view" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plant_shipping_view" TO "service_role";

REVOKE ALL ON TABLE "public"."plant_shipping_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plant_shipping_view" TO "postgres";
