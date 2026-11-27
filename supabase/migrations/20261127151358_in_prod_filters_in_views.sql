SET local check_function_bodies = off;

DROP VIEW "public"."accounting_job_report";

DROP VIEW "public"."inspection_table_view";

DROP VIEW "public"."installation_table_view";

DROP VIEW "public"."plant_production_view";

DROP VIEW "public"."plant_shipping_view";

DROP VIEW "public"."plant_table_view";

DROP VIEW "public"."plant_wrap_view";

DROP VIEW "public"."prod_table_view";

DROP VIEW "public"."purchasing_table_view";

DROP VIEW "public"."service_orders_table_view";

CREATE OR REPLACE FUNCTION insite.submit_install_report (
  p_job_id          bigint,
  p_details         jsonb,
  p_submitted_by    text,
  p_idempotency_key uuid,
  p_attachments     jsonb
)
  RETURNS bigint
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_report_id bigint;
  v_attachment jsonb;
  v_job_base_number public.jobs.job_base_number%TYPE;
BEGIN
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Idempotency key is required'
      USING ERRCODE = '22023';
  END IF;

  IF p_job_id IS NULL THEN
    RAISE EXCEPTION 'Job ID is required'
      USING ERRCODE = '22023';
  END IF;
  SELECT job_base_number
INTO v_job_base_number
FROM public.jobs
WHERE id = p_job_id;

IF NOT FOUND THEN
  RAISE EXCEPTION 'Job % not found', p_job_id;
END IF;

  IF p_details IS NULL OR jsonb_typeof(p_details) <> 'object' THEN
    RAISE EXCEPTION 'Report details must be a JSON object'
      USING ERRCODE = '22023';
  END IF;

  IF p_attachments IS NOT NULL
     AND jsonb_typeof(p_attachments) <> 'array' THEN
    RAISE EXCEPTION 'Attachments must be a JSON array'
      USING ERRCODE = '22023';
  END IF;

  IF p_attachments IS NOT NULL THEN
    FOR v_attachment IN
      SELECT value
      FROM jsonb_array_elements(p_attachments)
    LOOP
      IF jsonb_typeof(v_attachment) <> 'object'
         OR NULLIF(v_attachment->>'file_name', '') IS NULL
         OR NULLIF(v_attachment->>'file_path', '') IS NULL
         OR NULLIF(v_attachment->>'file_type', '') IS NULL
         OR NULLIF(v_attachment->>'category', '') IS NULL
         OR NULLIF(v_attachment->>'file_tag', '') IS NULL
         OR NULLIF(v_attachment->>'file_size', '') IS NULL
      THEN
        RAISE EXCEPTION 'Each attachment must contain file_name, file_path, file_type, file_size, category, and file_tag'
          USING ERRCODE = '22023';
      END IF;

      IF (v_attachment->>'file_size') !~ '^[0-9]+$' THEN
        RAISE EXCEPTION 'Attachment file_size must be a non-negative integer'
          USING ERRCODE = '22023';
      END IF;
    END LOOP;
  END IF;

   INSERT INTO insite.install_reports (
    job_id,
    details,
    submitted_by,
    idempotency_key
  )
  VALUES (
    p_job_id,
    p_details,
    p_submitted_by,
    p_idempotency_key
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_report_id;

  IF v_report_id IS NULL THEN
    SELECT id
    INTO v_report_id
    FROM insite.install_reports
    WHERE idempotency_key = p_idempotency_key;

    IF v_report_id IS NULL THEN
      RAISE EXCEPTION 'Unable to resolve existing install report for idempotency key'
        USING ERRCODE = '40001';
    END IF;
  ELSE
    IF p_attachments IS NOT NULL THEN
      FOR v_attachment IN
        SELECT value
        FROM jsonb_array_elements(p_attachments)
      LOOP
        INSERT INTO public.job_attachments (
          job_id,
          install_report_id,
          file_name,
          file_path,
          file_type,
          file_size,
          category,
          file_tag,
          uploaded_by
        )
        VALUES (
          p_job_id,
          v_report_id,
          v_attachment->>'file_name',
          v_attachment->>'file_path',
          v_attachment->>'file_type',
          (v_attachment->>'file_size')::bigint,
          v_attachment->>'category',
          v_attachment->>'file_tag',
          p_submitted_by
        );
      END LOOP;
    END IF;
  END IF;



UPDATE public.installation AS i
SET installation_report_received = NOW()
FROM public.jobs AS j
WHERE j.job_base_number = v_job_base_number
  AND i.installation_id = j.installation_id
  AND i.installation_report_received IS NULL;

  RETURN v_report_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_insite_attachment_files()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_paths jsonb;
  v_project_url text;
  v_secret text;
BEGIN
  IF TG_TABLE_SCHEMA <> 'insite'
     OR TG_TABLE_NAME NOT IN ('install_reports', 'markouts') THEN
    RAISE EXCEPTION 'Unsupported table for attachment cleanup';
  END IF;

  IF TG_TABLE_NAME = 'install_reports' THEN
    SELECT COALESCE(jsonb_agg(file_path), '[]'::jsonb)
    INTO v_paths
    FROM public.job_attachments
    WHERE install_report_id = OLD.id;
  ELSE
    SELECT COALESCE(jsonb_agg(file_path), '[]'::jsonb)
    INTO v_paths
    FROM public.job_attachments
    WHERE markout_id = OLD.id;
  END IF;

  IF jsonb_array_length(v_paths) = 0 THEN
    RETURN OLD;
  END IF;

  SELECT decrypted_secret
  INTO v_project_url
  FROM vault.decrypted_secrets
  WHERE name = 'insite_cleanup_project_url';

  SELECT decrypted_secret
  INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'insite_cleanup_secret';

  IF v_project_url IS NULL OR v_secret IS NULL THEN
    RAISE EXCEPTION 'Storage cleanup secrets are missing from Vault';
  END IF;

  PERFORM net.http_post(
    url := v_project_url || '/functions/v1/delete-install-report-files',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cleanup-secret', v_secret
    ),
    body := jsonb_build_object('paths', v_paths)
  );

  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_sales_stats (
  p_filters jsonb DEFAULT '[]'::jsonb
)
  RETURNS TABLE (
    "ALL"   bigint,
    "QUOTE" bigint,
    "SOLD"  bigint
  )
  LANGUAGE sql
  STABLE
  SET search_path TO 'public'
  AS $function$
  WITH filters AS (
    SELECT
      MAX(value #>> '{}') FILTER (
        WHERE id = 'job_number'
      ) AS job_number,

      MAX(value #>> '{}') FILTER (
        WHERE id = 'clientlastName'
      ) AS client_name,

      MAX(value #>> '{}') FILTER (
        WHERE id = 'projectName'
      ) AS project_name,

      MAX(value #>> '{}') FILTER (
        WHERE id = 'designerName'
      ) AS designer_name,

      MAX(value #>> '{}') FILTER (
        WHERE id = 'my_jobs'
      ) AS my_jobs,

      MAX(value #>> '{}') FILTER (
        WHERE id = 'site_address'
      ) AS site_address,

      MAX(value ->> 0) FILTER (
        WHERE id = 'ship_schedule'
      ) AS start_ship,

      MAX(value ->> 1) FILTER (
        WHERE id = 'ship_schedule'
      ) AS end_ship,

      MAX(value ->> 0) FILTER (
        WHERE id = 'created_at'
      ) AS start_create,

      MAX(value ->> 1) FILTER (
        WHERE id = 'created_at'
      ) AS end_create

    FROM jsonb_to_recordset(
      COALESCE(p_filters, '[]'::JSONB)
    ) AS f(id TEXT, value JSONB)
  )

  SELECT
    COUNT(*) AS "ALL",

    COUNT(*) FILTER (
      WHERE s.stage = 'QUOTE'
    ) AS "QUOTE",

    COUNT(*) FILTER (
      WHERE s.stage = 'SOLD'
    ) AS "SOLD"

  FROM public.sales_table_view s
  CROSS JOIN filters f

  WHERE
    (
      NULLIF(f.job_number, '') IS NULL
      OR s.job_number ILIKE '%' || f.job_number || '%'
    )

    AND (
      NULLIF(f.client_name, '') IS NULL
      OR s.shipping_client_name ILIKE '%' || f.client_name || '%'
    )

    AND (
      NULLIF(f.project_name, '') IS NULL
      OR s.project_name ILIKE '%' || f.project_name || '%'
    )

    AND (
      NULLIF(f.designer_name, '') IS NULL
      OR s.designer ILIKE '%' || f.designer_name || '%'
    )

    AND (
      NULLIF(f.my_jobs, '') IS NULL
      OR s.designer = f.my_jobs
    )

    AND (
      NULLIF(f.site_address, '') IS NULL
      OR s.shipping_street ILIKE '%' || f.site_address || '%'
      OR s.shipping_city ILIKE '%' || f.site_address || '%'
      OR s.shipping_province ILIKE '%' || f.site_address || '%'
      OR s.shipping_zip ILIKE '%' || f.site_address || '%'
    )

    AND (
      f.start_ship IS NULL
      OR s.ship_schedule >= f.start_ship::TIMESTAMPTZ
    )

    AND (
      f.end_ship IS NULL
      OR s.ship_schedule <= f.end_ship::TIMESTAMPTZ
    )

    AND (
      f.start_create IS NULL
      OR s.created_at >= f.start_create::TIMESTAMPTZ
    )

    AND (
      f.end_create IS NULL
      OR s.created_at <= f.end_create::TIMESTAMPTZ
    );
$function$;

CREATE VIEW "public"."accounting_job_report" AS  SELECT j.id AS job_id,
    j.job_number,
    so.date_sold,
    so.shipping_client_name AS client_name,
    so.shipping_street,
    so.shipping_city,
    so.shipping_province,
    so.shipping_zip,
    so.total AS price,
    ps.ship_schedule,
    ps.cut_melamine_completed_actual,
    ps.cut_finish_completed_actual,
    ps.custom_finish_completed_actual,
    ps.doors_completed_actual,
    ps.drawer_completed_actual,
    ps.paint_completed_actual,
    ps.assembly_completed_actual,
    i.wrap_completed
   FROM (((public.jobs j
     LEFT JOIN public.sales_orders so ON ((j.sales_order_id = so.id)))
     LEFT JOIN public.production_schedule ps ON ((j.prod_id = ps.prod_id)))
     JOIN public.installation i ON ((j.installation_id = i.installation_id)))
  WHERE ((j.is_active = true) AND (j.in_prod = true) AND (i.has_shipped = false) AND ((ps.cut_melamine_completed_actual IS NOT NULL) OR (ps.cut_finish_completed_actual IS NOT NULL) OR (ps.custom_finish_completed_actual IS NOT NULL) OR (ps.doors_completed_actual IS NOT NULL) OR (ps.drawer_completed_actual IS NOT NULL) OR (ps.paint_completed_actual IS NOT NULL) OR (ps.assembly_completed_actual IS NOT NULL) OR (i.wrap_completed IS NOT NULL)));

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
  WHERE ((j.is_active = true) AND (j.in_prod = true));

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
  WHERE ((j.is_active = true) AND (j.in_prod = true));

CREATE VIEW "public"."plant_production_view" AS  SELECT j.id AS job_id,
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
    so.is_canopy_required,
    so.is_woodtop_required,
    so.is_custom_cab_required,
    c.box AS cabinet_box,
    c.interior AS cabinet_interior,
    ds.name AS cabinet_door_style,
    s."Species" AS cabinet_species,
    col."Name" AS cabinet_color,
    i.installation_id,
    i.wrap_date,
    i.wrap_completed,
    i.has_shipped,
    i.installation_notes,
    ps.cut_melamine_completed_actual,
    ps.doors_completed_actual,
    ps.panel_completed_actual,
    ps.custom_finish_completed_actual,
    ps.paint_doors_completed_actual,
    ps.paint_canopy_completed_actual,
    ps.paint_cust_cab_completed_actual,
    ps.assembly_completed_actual,
    ps.drawer_completed_actual,
    ps.woodtop_completed_actual,
    ps.canopy_completed_actual,
    ps.ship_schedule,
    ps.ship_status
   FROM (((((((public.jobs j
     LEFT JOIN public.sales_orders so ON ((j.sales_order_id = so.id)))
     LEFT JOIN public.cabinets c ON ((so.cabinet_id = c.id)))
     LEFT JOIN public.door_styles ds ON ((c.door_style_id = ds.id)))
     LEFT JOIN public.species s ON ((c.species_id = s."Id")))
     LEFT JOIN public.colors col ON ((c.color_id = col."Id")))
     JOIN public.installation i ON ((j.installation_id = i.installation_id)))
     LEFT JOIN public.production_schedule ps ON ((j.prod_id = ps.prod_id)))
  WHERE ((j.is_active = true) AND (j.in_prod = true));

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
  WHERE ((j.is_active = true) AND (j.in_prod = true));

CREATE VIEW "public"."plant_table_view" AS  SELECT j.id AS job_id,
    j.prod_id,
    j.job_number,
    so.shipping_client_name AS client_name,
    so.project_name,
    so.shipping_street,
    so.shipping_city,
    so.shipping_province,
    so.shipping_zip,
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
    ps.placement_date,
    ps.ship_schedule,
    ps.ship_status,
    ps.doors_completed_actual,
    ps.cut_finish_completed_actual,
    ps.custom_finish_completed_actual,
    ps.paint_completed_actual,
    ps.assembly_completed_actual,
    ps.cut_melamine_completed_actual,
    ps.drawer_completed_actual,
    ps.panel_completed_actual,
    ps.canopy_completed_actual,
    ps.woodtop_completed_actual,
    ps.cust_fin_parts_cut_completed_actual,
    ps.cust_fin_assembled_completed_actual,
    ps.paint_doors_completed_actual,
    ps.paint_canopy_completed_actual,
    ps.paint_cust_cab_completed_actual
   FROM (((((((public.jobs j
     LEFT JOIN public.sales_orders so ON ((j.sales_order_id = so.id)))
     LEFT JOIN public.cabinets c ON ((so.cabinet_id = c.id)))
     LEFT JOIN public.door_styles ds ON ((c.door_style_id = ds.id)))
     LEFT JOIN public.species s ON ((c.species_id = s."Id")))
     LEFT JOIN public.colors col ON ((c.color_id = col."Id")))
     JOIN public.installation i ON ((j.installation_id = i.installation_id)))
     LEFT JOIN public.production_schedule ps ON ((j.prod_id = ps.prod_id)))
  WHERE ((j.is_active = true) AND (j.in_prod = true));

CREATE VIEW "public"."plant_wrap_view" AS  SELECT j.id AS job_id,
    j.prod_id,
    j.job_number,
    ps.placement_date,
    so.shipping_client_name AS client_name,
    so.project_name,
    so.shipping_street,
    so.shipping_city,
    so.shipping_province,
    so.shipping_zip,
    so.is_canopy_required,
    so.is_woodtop_required,
    so.is_custom_cab_required,
    c.box AS cabinet_box,
    ds.name AS cabinet_door_style,
    s."Species" AS cabinet_species,
    col."Name" AS cabinet_color,
    i.installation_id,
    i.wrap_date,
    i.wrap_completed,
    i.has_shipped,
    i.installation_notes,
    ps.cut_melamine_completed_actual,
    ps.doors_completed_actual,
    ps.panel_completed_actual,
    ps.custom_finish_completed_actual,
    ps.paint_doors_completed_actual,
    ps.paint_canopy_completed_actual,
    ps.paint_cust_cab_completed_actual,
    ps.assembly_completed_actual,
    ps.drawer_completed_actual,
    ps.woodtop_completed_actual,
    ps.canopy_completed_actual,
    ps.ship_schedule,
    ps.ship_status
   FROM (((((((public.jobs j
     LEFT JOIN public.sales_orders so ON ((j.sales_order_id = so.id)))
     LEFT JOIN public.cabinets c ON ((so.cabinet_id = c.id)))
     LEFT JOIN public.door_styles ds ON ((c.door_style_id = ds.id)))
     LEFT JOIN public.species s ON ((c.species_id = s."Id")))
     LEFT JOIN public.colors col ON ((c.color_id = col."Id")))
     JOIN public.installation i ON ((j.installation_id = i.installation_id)))
     LEFT JOIN public.production_schedule ps ON ((j.prod_id = ps.prod_id)))
  WHERE ((j.is_active = true) AND (j.in_prod = true));

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
  WHERE ((j.is_active = true) AND (j.in_prod = true));

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
  WHERE ((j.is_active = true) AND (j.in_prod = true));

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
    col."Name" AS cabinet_color,
    i.company_name AS installer_company,
    i.first_name AS installer_first,
    i.last_name AS installer_last
   FROM (((((public.service_orders so
     LEFT JOIN public.jobs j ON ((so.job_id = j.id)))
     LEFT JOIN public.sales_orders s ON ((j.sales_order_id = s.id)))
     LEFT JOIN public.cabinets c ON ((s.cabinet_id = c.id)))
     LEFT JOIN public.colors col ON ((c.color_id = col."Id")))
     LEFT JOIN public.installers i ON ((so.installer_id = i.installer_id)))
  WHERE ((j.is_active = true) AND (j.in_prod = true));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accounting_job_report" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."accounting_job_report" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accounting_job_report" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accounting_job_report" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."inspection_table_view" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."inspection_table_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."inspection_table_view" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."inspection_table_view" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."installation_table_view" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."installation_table_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."installation_table_view" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."installation_table_view" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plant_production_view" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."plant_production_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plant_production_view" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plant_production_view" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plant_shipping_view" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."plant_shipping_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plant_shipping_view" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plant_shipping_view" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plant_table_view" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."plant_table_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plant_table_view" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plant_table_view" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plant_wrap_view" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."plant_wrap_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plant_wrap_view" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plant_wrap_view" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."prod_table_view" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."prod_table_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."prod_table_view" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."prod_table_view" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."purchasing_table_view" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."purchasing_table_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."purchasing_table_view" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."purchasing_table_view" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."service_orders_table_view" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."service_orders_table_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."service_orders_table_view" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."service_orders_table_view" TO "service_role";
