SET local check_function_bodies = off;

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
BEGIN
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Idempotency key is required'
      USING ERRCODE = '22023';
  END IF;

  IF p_job_id IS NULL THEN
    RAISE EXCEPTION 'Job ID is required'
      USING ERRCODE = '22023';
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
WHERE j.id = p_job_id
  AND i.installation_id = j.installation_id
  AND i.installation_report_received IS NULL;

IF NOT FOUND THEN
  IF NOT EXISTS (
    SELECT 1
    FROM public.jobs AS j
    JOIN public.installation AS i
      ON i.installation_id = j.installation_id
    WHERE j.id = p_job_id
      AND i.installation_report_received IS NULL
  ) THEN
    NULL;
  ELSE
    RAISE EXCEPTION
      'Failed to update installation_report_received for job %',
      p_job_id;
  END IF;
END IF;

  RETURN v_report_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_master_order_transaction (
  p_payload jsonb
)
  RETURNS TABLE (
    out_job_number         text,
    out_sales_order_number text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$DECLARE
    v_cabinet_id bigint;
    v_sales_order_id bigint;
    v_so_number text;
    v_job_number text;
BEGIN

    INSERT INTO public.cabinets (
        species_id, color_id, door_style_id,
        finish, glaze, top_drawer_front,
        interior, drawer_box, drawer_hardware, box, hinge_soft_close,
        doors_parts_only, handles_supplied, handles_selected, glass, piece_count, glass_type
    )
    VALUES (
        (p_payload->'cabinet'->>'species_id')::bigint, 
        (p_payload->'cabinet'->>'color_id')::bigint,  
        (p_payload->'cabinet'->>'door_style_id')::bigint, 
        
        p_payload->'cabinet'->>'finish', p_payload->'cabinet'->>'glaze', p_payload->'cabinet'->>'top_drawer_front',
        p_payload->'cabinet'->>'interior', p_payload->'cabinet'->>'drawer_box', p_payload->'cabinet'->>'drawer_hardware',
        (p_payload->'cabinet'->>'box')::integer, (p_payload->'cabinet'->>'hinge_soft_close')::boolean,
        (p_payload->'cabinet'->>'doors_parts_only')::boolean, (p_payload->'cabinet'->>'handles_supplied')::boolean,
        (p_payload->'cabinet'->>'handles_selected')::boolean, (p_payload->'cabinet'->>'glass')::boolean,
        p_payload->'cabinet'->>'piece_count', p_payload->'cabinet'->>'glass_type'
    )
    RETURNING id INTO v_cabinet_id;
    

    v_so_number := generate_next_sales_order_number((p_payload->>'stage')::"SalesStage");


    INSERT INTO public.sales_orders (
        date_sold,client_id, cabinet_id, stage, total, deposit, designer, comments, install, 
        order_type, delivery_type, sales_order_number,
        shipping_client_name, project_name, shipping_street, shipping_city, shipping_province, shipping_zip,
        shipping_phone_1, shipping_phone_2, shipping_email_1, shipping_email_2,
        layout_date, client_meeting_date, follow_up_date, appliance_specs_date, selections_date, 
        markout_date, review_date, second_markout_date, flooring_type, flooring_clearance,
        is_memo,
        is_canopy_required, is_woodtop_required, is_custom_cab_required,
        is_cod,
        payment_received,
        site_prep,
        sitesuper_email
    )
    VALUES (
        (p_payload->> 'date_sold')::timestamp with time zone,
        (p_payload->>'client_id')::bigint, v_cabinet_id, (p_payload->>'stage')::"SalesStage", (p_payload->>'total')::numeric, (p_payload->>'deposit')::numeric, 
        p_payload->>'designer', p_payload->>'comments', (p_payload->>'install')::boolean, 
        p_payload->>'order_type', p_payload->>'delivery_type', v_so_number,
        p_payload->'shipping'->>'shipping_client_name', 
        p_payload->'shipping'->>'project_name',
        p_payload->'shipping'->>'shipping_street', 
        p_payload->'shipping'->>'shipping_city', 
        p_payload->'shipping'->>'shipping_province', 
        p_payload->'shipping'->>'shipping_zip',
        p_payload->'shipping'->>'shipping_phone_1', 
        p_payload->'shipping'->>'shipping_phone_2', 
        p_payload->'shipping'->>'shipping_email_1', 
        p_payload->'shipping'->>'shipping_email_2',

        (p_payload->'checklist'->>'layout_date')::timestamp with time zone, (p_payload->'checklist'->>'client_meeting_date')::timestamp with time zone, (p_payload->'checklist'->>'follow_up_date')::timestamp with time zone,
        (p_payload->'checklist'->>'appliance_specs_date')::timestamp with time zone, (p_payload->'checklist'->>'selections_date')::timestamp with time zone, 
        (p_payload->'checklist'->>'markout_date')::timestamp with time zone, (p_payload->'checklist'->>'review_date')::timestamp with time zone, (p_payload->'checklist'->>'second_markout_date')::timestamp with time zone,
        p_payload->>'flooring_type', 
        p_payload->>'flooring_clearance',
        (p_payload->>'is_memo')::boolean,
        (p_payload->>'is_canopy_required')::boolean,
        (p_payload->>'is_woodtop_required')::boolean,
        (p_payload->>'is_custom_cab_required')::boolean,
        (p_payload->>'is_cod')::boolean,
        (p_payload->>'payment_received')::boolean,
        (p_payload->>'site_prep')::boolean,
        p_payload->>'sitesuper_email'
    )
    RETURNING id INTO v_sales_order_id;


    IF (p_payload->>'stage')::text = 'SOLD' THEN
        PERFORM id FROM public.jobs
        WHERE job_base_number = (p_payload->>'manual_job_base')
        AND job_suffix IS NOT DISTINCT FROM (p_payload->>'manual_job_suffix');

        IF FOUND THEN
            RAISE EXCEPTION 'Job %-% already exists!', 
                p_payload->>'manual_job_base', 
                COALESCE(p_payload->>'manual_job_suffix', '(No Suffix)');
        END IF;

        INSERT INTO public.jobs (sales_order_id, job_base_number, job_suffix)
        VALUES (
            v_sales_order_id, 
            (p_payload->>'manual_job_base'), 
            p_payload->>'manual_job_suffix'
        )
        RETURNING job_number INTO v_job_number;
        
        out_job_number := v_job_number;
    ELSE
        out_job_number := NULL;
    END IF;

    out_sales_order_number := v_so_number;

    RETURN NEXT;
END;$function$;

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
