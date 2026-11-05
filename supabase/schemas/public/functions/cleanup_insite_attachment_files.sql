CREATE OR REPLACE FUNCTION public.cleanup_insite_attachment_files()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;