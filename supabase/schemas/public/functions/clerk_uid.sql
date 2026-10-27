CREATE OR REPLACE FUNCTION public.clerk_uid()
RETURNS text
LANGUAGE sql
STABLE
AS $function$
  SELECT auth.uid()::text;
$function$;

GRANT EXECUTE ON FUNCTION "public"."clerk_uid"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."clerk_uid"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."clerk_uid"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."clerk_uid"() TO "postgres";
