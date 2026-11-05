SET local check_function_bodies = off;

DROP TRIGGER "cleanup_install_report_files" ON "insite"."install_reports";

DROP FUNCTION "public"."cleanup_install_report_files"();

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

CREATE TRIGGER cleanup_insite_attachment_files
  BEFORE DELETE ON insite.install_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_insite_attachment_files();

CREATE TRIGGER cleanup_insite_attachment_files
  BEFORE DELETE ON insite.markouts
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_insite_attachment_files();

GRANT EXECUTE ON FUNCTION "public"."cleanup_insite_attachment_files"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."cleanup_insite_attachment_files"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."cleanup_insite_attachment_files"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."cleanup_insite_attachment_files"() TO "service_role";
