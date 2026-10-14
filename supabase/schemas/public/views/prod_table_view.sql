CREATE VIEW "public"."prod_table_view" AS  SELECT j.id,
    j.job_number,
    j.sales_order_id,
    ps.rush,
    ps.received_date,
    ps.placement_date,
    ps.ship_schedule,
    ps.ship_status,
    ps.prod_id,
    so.created_at,
    so.shipping_client_name,
    concat_ws(', '::text, so.shipping_street, so.shipping_city, so.shipping_province, so.shipping_zip) AS site_address,
    cab.box AS cabinet_box,
    s."Species" AS cabinet_species,
    c."Name" AS cabinet_color,
    ds.name AS cabinet_door_style,
    i.has_shipped,
    i.partially_shipped
   FROM (((((((public.jobs j
     JOIN public.production_schedule ps ON ((j.prod_id = ps.prod_id)))
     LEFT JOIN public.sales_orders so ON ((j.sales_order_id = so.id)))
     LEFT JOIN public.cabinets cab ON ((so.cabinet_id = cab.id)))
     LEFT JOIN public.species s ON ((cab.species_id = s."Id")))
     LEFT JOIN public.colors c ON ((cab.color_id = c."Id")))
     LEFT JOIN public.door_styles ds ON ((cab.door_style_id = ds.id)))
     LEFT JOIN public.installation i ON ((j.installation_id = i.installation_id)))
  WHERE (j.is_active = true);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."prod_table_view" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."prod_table_view" TO "service_role";

REVOKE ALL ON TABLE "public"."prod_table_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."prod_table_view" TO "postgres";
