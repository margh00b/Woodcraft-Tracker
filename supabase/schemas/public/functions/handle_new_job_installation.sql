CREATE OR REPLACE FUNCTION public.handle_new_job_installation()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  new_install_id bigint;
BEGIN
  -- Step 1: Insert a new row into the installation table and capture its generated ID
  INSERT INTO public.installation (installer_id, has_shipped)
  VALUES (NULL, FALSE)
  RETURNING installation_id INTO new_install_id;

  -- Step 2: Update the newly created jobs record to link the installation ID
  -- This UPDATE is performed on the *newly inserted* job record (identified by NEW.id)
  UPDATE public.jobs
  SET installation_id = new_install_id
  WHERE id = NEW.id;

  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."handle_new_job_installation"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."handle_new_job_installation"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."handle_new_job_installation"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_job_installation"() TO "postgres";
