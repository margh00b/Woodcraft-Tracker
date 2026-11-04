CREATE OR REPLACE FUNCTION insite.submit_markout (
  p_job_id          bigint,
  p_details         jsonb,
  p_submitted_by    text,
  p_idempotency_key uuid,
  p_attachments     jsonb,
  p_sitesuper_email text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_markout_id bigint;
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
    RAISE EXCEPTION 'Markout details must be a JSON object'
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
         OR NULLIF(v_attachment->>'file_size', '') IS NULL
      THEN
        RAISE EXCEPTION 'Each attachment must contain file_name, file_path, file_type, file_size, and category'
          USING ERRCODE = '22023';
      END IF;

      IF (v_attachment->>'file_size') !~ '^[0-9]+$' THEN
        RAISE EXCEPTION 'Attachment file_size must be a non-negative integer'
          USING ERRCODE = '22023';
      END IF;
    END LOOP;
  END IF;

  INSERT INTO insite.markouts (
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
  RETURNING id INTO v_markout_id;

  IF v_markout_id IS NULL THEN
    SELECT id
    INTO v_markout_id
    FROM insite.markouts
    WHERE idempotency_key = p_idempotency_key;

    IF v_markout_id IS NULL THEN
      RAISE EXCEPTION 'Unable to resolve existing markout for idempotency key'
        USING ERRCODE = '40001';
    END IF;
  ELSE
    UPDATE public.sales_orders so
    SET sitesuper_email = NULLIF(TRIM(p_sitesuper_email), '')
    FROM public.jobs j
    WHERE j.id = p_job_id
      AND so.id = j.sales_order_id;

    IF p_attachments IS NOT NULL THEN
      FOR v_attachment IN
        SELECT value
        FROM jsonb_array_elements(p_attachments)
      LOOP
        INSERT INTO public.job_attachments (
          job_id,
          markout_id,
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
          v_markout_id,
          v_attachment->>'file_name',
          v_attachment->>'file_path',
          v_attachment->>'file_type',
          (v_attachment->>'file_size')::bigint,
          v_attachment->>'category',
          COALESCE(v_attachment->>'file_tag', 'Markout'),
          p_submitted_by
        );
      END LOOP;
    END IF;
  END IF;

  RETURN v_markout_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION insite.submit_markout(bigint, jsonb, text, uuid, jsonb, text) TO authenticated;

REVOKE ALL ON FUNCTION insite.submit_markout(bigint, jsonb, text, uuid, jsonb, text) FROM PUBLIC;