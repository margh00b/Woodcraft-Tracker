CREATE OR REPLACE FUNCTION insite.submit_inspection_report (
  p_job_id          bigint,
  p_details         jsonb,
  p_submitted_by    text,
  p_idempotency_key uuid,
  p_started_at      timestamptz,
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
  -- Required fields
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Idempotency key is required'
      USING ERRCODE = '22023';
  END IF;

  IF p_job_id IS NULL THEN
    RAISE EXCEPTION 'Job ID is required'
      USING ERRCODE = '22023';
  END IF;

  IF p_started_at IS NULL THEN
    RAISE EXCEPTION 'Inspection start time is required'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.jobs
    WHERE id = p_job_id
  ) THEN
    RAISE EXCEPTION 'Job % not found', p_job_id
      USING ERRCODE = '22023';
  END IF;

  IF p_details IS NULL
     OR jsonb_typeof(p_details) <> 'object' THEN
    RAISE EXCEPTION 'Inspection details must be a JSON object'
      USING ERRCODE = '22023';
  END IF;

  IF p_attachments IS NOT NULL
     AND jsonb_typeof(p_attachments) <> 'array' THEN
    RAISE EXCEPTION 'Attachments must be a JSON array'
      USING ERRCODE = '22023';
  END IF;

  -- Validate attachments
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
        RAISE EXCEPTION
          'Each attachment must contain file_name, file_path, file_type, file_size, category, and file_tag'
          USING ERRCODE = '22023';
      END IF;

      IF (v_attachment->>'file_size') !~ '^[0-9]+$' THEN
        RAISE EXCEPTION
          'Attachment file_size must be a non-negative integer'
          USING ERRCODE = '22023';
      END IF;
    END LOOP;
  END IF;

  -- Create inspection report
  INSERT INTO insite.inspection_reports (
    job_id,
    details,
    submitted_by,
    started_at,
    idempotency_key
  )
  VALUES (
    p_job_id,
    p_details,
    p_submitted_by,
    p_started_at,
    p_idempotency_key
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_report_id;

  -- Resolve an existing submission on retry
  IF v_report_id IS NULL THEN
    SELECT id
    INTO v_report_id
    FROM insite.inspection_reports
    WHERE idempotency_key = p_idempotency_key;

    IF v_report_id IS NULL THEN
      RAISE EXCEPTION
        'Unable to resolve existing inspection report for idempotency key'
        USING ERRCODE = '40001';
    END IF;

  ELSE
    -- Insert attachments
    IF p_attachments IS NOT NULL THEN
      FOR v_attachment IN
        SELECT value
        FROM jsonb_array_elements(p_attachments)
      LOOP
        INSERT INTO public.job_attachments (
          job_id,
          inspection_report_id,
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

  -- Completing the report also completes the inspection for its job.
  -- Keep this inside the same transaction as the report and attachment inserts.
  UPDATE public.installation AS i
  SET inspection_completed = COALESCE(i.inspection_completed, now())
  FROM public.jobs AS j
  WHERE j.id = p_job_id
    AND j.installation_id = i.installation_id;

  RETURN v_report_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION
  insite.submit_inspection_report(
    bigint, jsonb, text, uuid, timestamptz, jsonb
  )
TO authenticated;

REVOKE ALL ON FUNCTION
  insite.submit_inspection_report(
    bigint, jsonb, text, uuid, timestamptz, jsonb
  )
FROM PUBLIC;
