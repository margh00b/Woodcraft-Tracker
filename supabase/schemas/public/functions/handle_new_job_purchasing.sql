CREATE OR REPLACE FUNCTION public.handle_new_job_purchasing()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  INSERT INTO public.purchase_tracking (job_id)
  VALUES (new.id);
  RETURN new;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."handle_new_job_purchasing"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."handle_new_job_purchasing"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."handle_new_job_purchasing"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_job_purchasing"() TO "postgres";
