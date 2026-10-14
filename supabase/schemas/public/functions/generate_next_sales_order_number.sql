CREATE OR REPLACE FUNCTION public.generate_next_sales_order_number (
  p_stage public."SalesStage"
)
  RETURNS text
  LANGUAGE plpgsql
  AS $function$
DECLARE
    prefix TEXT;
    next_seq_val BIGINT;
BEGIN
    prefix := CASE
        WHEN p_stage::TEXT = 'SOLD' THEN 'S'
        ELSE 'Q'
    END;
    
    next_seq_val := nextval('sales_order_sequence'); 
    
    RETURN prefix || '-' || next_seq_val::TEXT;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."generate_next_sales_order_number"(public."SalesStage") TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."generate_next_sales_order_number"(public."SalesStage") TO "service_role";

REVOKE ALL ON FUNCTION "public"."generate_next_sales_order_number"(public."SalesStage") FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."generate_next_sales_order_number"(public."SalesStage") TO "postgres";
