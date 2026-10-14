CREATE OR REPLACE FUNCTION public.set_sales_order_number()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
    -- Only generate if the client didn't supply a number (i.e., it's null during INSERT)
    IF NEW.sales_order_number IS NULL THEN
        NEW.sales_order_number := generate_next_sales_order_number(NEW.stage); 
    END IF;
    RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."set_sales_order_number"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."set_sales_order_number"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."set_sales_order_number"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_sales_order_number"() TO "postgres";
