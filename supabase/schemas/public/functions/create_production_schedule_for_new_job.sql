CREATE OR REPLACE FUNCTION public.create_production_schedule_for_new_job()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$ DECLARE new_prod_id bigint;

BEGIN 

INSERT INTO
    public.production_schedule DEFAULT
VALUES
  
    RETURNING prod_id INTO new_prod_id;

UPDATE
    public.jobs
SET
    prod_id = new_prod_id
WHERE
    id = NEW.id;

RETURN NEW;

END;

$function$;

GRANT EXECUTE ON FUNCTION "public"."create_production_schedule_for_new_job"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."create_production_schedule_for_new_job"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."create_production_schedule_for_new_job"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_production_schedule_for_new_job"() TO "postgres";
