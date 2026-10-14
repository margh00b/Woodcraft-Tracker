CREATE OR REPLACE FUNCTION public.clerk_user_role()
  RETURNS text
  LANGUAGE sql
  STABLE
  AS $function$
  select (auth.jwt() ->> 'user_role')::text
$function$;

GRANT EXECUTE ON FUNCTION "public"."clerk_user_role"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."clerk_user_role"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."clerk_user_role"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."clerk_user_role"() TO "postgres";
