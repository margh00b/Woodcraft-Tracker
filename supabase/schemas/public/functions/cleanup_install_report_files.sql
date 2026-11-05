CREATE OR REPLACE FUNCTION public.cleanup_install_report_files()
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
  SELECT COALESCE(jsonb_agg(file_path), '[]'::jsonb)
  INTO v_paths
  FROM public.job_attachments
  WHERE install_report_id = OLD.id;

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
    body := jsonb_build_object(
      'paths', v_paths
    )
  );

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS cleanup_install_report_files
ON insite.install_reports;

CREATE TRIGGER cleanup_install_report_files
BEFORE DELETE ON insite.install_reports
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_install_report_files();