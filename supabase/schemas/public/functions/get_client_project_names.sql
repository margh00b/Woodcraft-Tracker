CREATE OR REPLACE FUNCTION public.get_client_project_names (
  input_client_id bigint
)
  RETURNS TABLE (
    project_name text
  )
  LANGUAGE sql
  AS $function$
  select distinct project_name
  from sales_orders
  where client_id = input_client_id
  and project_name is not null
  and trim(project_name) <> ''
  order by project_name;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_client_project_names"(bigint) TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."get_client_project_names"(bigint) TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_client_project_names"(bigint) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_client_project_names"(bigint) TO "postgres";
