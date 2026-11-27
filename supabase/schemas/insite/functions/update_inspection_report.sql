CREATE OR REPLACE FUNCTION insite.update_inspection_report (
  p_report_id              bigint,
  p_details                jsonb,
  p_deleted_attachment_ids bigint[],
  p_new_attachments        jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_job_id bigint;
  v_attachment jsonb;
BEGIN

  -- Find report
  SELECT job_id
  INTO v_job_id
  FROM insite.inspection_reports
  WHERE id = p_report_id;

  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'Inspection report not found'
      USING ERRCODE = '22023';
  END IF;

  -- Validate details
  IF p_details IS NULL
     OR jsonb_typeof(p_details) <> 'object' THEN
    RAISE EXCEPTION 'Inspection details must be a JSON object'
      USING ERRCODE = '22023';
  END IF;

  -- Validate new attachments
  IF p_new_attachments IS NOT NULL
     AND jsonb_typeof(p_new_attachments) <> 'array' THEN
    RAISE EXCEPTION 'New attachments must be a JSON array'
      USING ERRCODE = '22023';
  END IF;

  IF p_new_attachments IS NOT NULL THEN
    FOR v_attachment IN
      SELECT value
      FROM jsonb_array_elements(p_new_attachments)
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

  -- Update report details
  UPDATE insite.inspection_reports
  SET details = p_details,
      updated_at = now()
  WHERE id = p_report_id;

  -- Delete selected attachments belonging to this report only
  IF p_deleted_attachment_ids IS NOT NULL
     AND array_length(p_deleted_attachment_ids, 1) > 0 THEN

    DELETE FROM public.job_attachments
    WHERE id = ANY(p_deleted_attachment_ids)
      AND inspection_report_id = p_report_id;

  END IF;

  -- Insert new attachments
  IF p_new_attachments IS NOT NULL THEN
    FOR v_attachment IN
      SELECT value
      FROM jsonb_array_elements(p_new_attachments)
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

GRANT EXECUTE ON FUNCTION
  insite.update_inspection_report(bigint, jsonb, bigint[], jsonb)
TO authenticated;

REVOKE ALL ON FUNCTION
  insite.update_inspection_report(bigint, jsonb, bigint[], jsonb)
FROM PUBLIC;
