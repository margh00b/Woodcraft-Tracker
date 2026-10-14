CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."set_updated_at_timestamp"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."set_updated_at_timestamp"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."set_updated_at_timestamp"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_updated_at_timestamp"() TO "postgres";
