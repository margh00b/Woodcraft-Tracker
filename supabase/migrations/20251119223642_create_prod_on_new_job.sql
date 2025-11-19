CREATE
OR REPLACE FUNCTION public.create_production_schedule_for_new_job() RETURNS TRIGGER AS $$ DECLARE new_prod_id bigint;

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

$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_production_link
AFTER
INSERT
    ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.create_production_schedule_for_new_job();
