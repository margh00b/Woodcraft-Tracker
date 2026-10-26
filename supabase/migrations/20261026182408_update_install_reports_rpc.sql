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

    RETURN v_report_id;
  END IF;

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

  RETURN v_report_id;
END;
$function$;

CREATE OR REPLACE FUNCTION insite.update_install_report (
  p_report_id              bigint,
  p_details                jsonb,
  p_deleted_attachment_ids bigint[],
  p_new_attachments        jsonb
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
DECLARE
  v_job_id bigint;
  v_attachment jsonb;
BEGIN

  SELECT job_id INTO v_job_id
  FROM insite.install_reports
  WHERE id = p_report_id;

  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'Install report not found' USING ERRCODE = '22023';
  END IF;


  UPDATE insite.install_reports
  SET details = p_details,
      updated_at = now()
  WHERE id = p_report_id;


  IF p_deleted_attachment_ids IS NOT NULL AND array_length(p_deleted_attachment_ids, 1) > 0 THEN
    DELETE FROM public.job_attachments
    WHERE id = ANY(p_deleted_attachment_ids)
      AND install_report_id = p_report_id;
  END IF;


  IF p_new_attachments IS NOT NULL AND jsonb_array_length(p_new_attachments) > 0 THEN
    FOR v_attachment IN SELECT * FROM jsonb_array_elements(p_new_attachments)
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
        v_job_id,
        p_report_id,
        v_attachment->>'file_name',
        v_attachment->>'file_path',
        v_attachment->>'file_type',
        (v_attachment->>'file_size')::bigint,
        v_attachment->>'category',
        v_attachment->>'file_tag',
        v_attachment->>'uploaded_by'
      );
    END LOOP;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION "insite"."update_install_report"(bigint, jsonb, bigint[], jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "insite"."update_install_report"(bigint, jsonb, bigint[], jsonb) TO "authenticated";
