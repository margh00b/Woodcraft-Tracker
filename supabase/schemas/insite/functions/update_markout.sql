CREATE OR REPLACE FUNCTION insite.update_markout (
  p_markout_id             bigint,
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
  SELECT job_id INTO v_job_id
  FROM insite.markouts
  WHERE id = p_markout_id;

  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'Markout not found' USING ERRCODE = '22023';
  END IF;

  UPDATE insite.markouts
  SET details = p_details,
      updated_at = now()
  WHERE id = p_markout_id;

  IF p_deleted_attachment_ids IS NOT NULL AND array_length(p_deleted_attachment_ids, 1) > 0 THEN
    DELETE FROM public.job_attachments
    WHERE id = ANY(p_deleted_attachment_ids)
      AND markout_id = p_markout_id;
  END IF;

  IF p_new_attachments IS NOT NULL AND jsonb_array_length(p_new_attachments) > 0 THEN
    FOR v_attachment IN SELECT * FROM jsonb_array_elements(p_new_attachments)
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
        v_job_id,
        p_markout_id,
        v_attachment->>'file_name',
        v_attachment->>'file_path',
        v_attachment->>'file_type',
        (v_attachment->>'file_size')::bigint,
        v_attachment->>'category',
        COALESCE(v_attachment->>'file_tag', 'Markout'),
        v_attachment->>'uploaded_by'
      );
    END LOOP;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION "insite"."update_markout"(bigint, jsonb, bigint[], jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION "insite"."update_markout"(bigint, jsonb, bigint[], jsonb) FROM PUBLIC;
