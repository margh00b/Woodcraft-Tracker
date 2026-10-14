CREATE OR REPLACE FUNCTION public.update_shipped_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin

  if new.has_shipped = true and (old.has_shipped is distinct from true) then
    new.shipped_at = now();
  
  elsif new.has_shipped = false and (old.has_shipped is distinct from false) then
    new.shipped_at = null; 
  end if;
  
  return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."update_shipped_at"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."update_shipped_at"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."update_shipped_at"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_shipped_at"() TO "postgres";
