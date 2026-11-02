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
  WHERE ((j.is_active = true) AND (i.has_shipped = false) AND ((ps.cut_melamine_completed_actual IS NOT NULL) OR (ps.cut_finish_completed_actual IS NOT NULL) OR (ps.custom_finish_completed_actual IS NOT NULL) OR (ps.doors_completed_actual IS NOT NULL) OR (ps.drawer_completed_actual IS NOT NULL) OR (ps.paint_completed_actual IS NOT NULL) OR (ps.assembly_completed_actual IS NOT NULL) OR (i.wrap_completed IS NOT NULL)));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accounting_job_report" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."accounting_job_report" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accounting_job_report" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accounting_job_report" TO "service_role";
