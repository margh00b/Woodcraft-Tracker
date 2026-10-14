SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.clerk_uid()
  RETURNS text
  LANGUAGE sql
  STABLE
  AS $function$
  select (auth.jwt() ->> 'user_id')::text
$function$;

CREATE OR REPLACE FUNCTION public.clerk_user_role()
  RETURNS text
  LANGUAGE sql
  STABLE
  AS $function$
  select (auth.jwt() ->> 'user_role')::text
$function$;

CREATE OR REPLACE FUNCTION public.create_master_order_transaction (
  p_payload jsonb
)
  RETURNS TABLE (
    out_job_number         text,
    out_sales_order_number text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$DECLARE
    v_cabinet_id bigint;
    v_sales_order_id bigint;
    v_so_number text;
    v_job_number text;
BEGIN

    INSERT INTO public.cabinets (
        species_id, color_id, door_style_id,
        finish, glaze, top_drawer_front,
        interior, drawer_box, drawer_hardware, box, hinge_soft_close,
        doors_parts_only, handles_supplied, handles_selected, glass, piece_count, glass_type
    )
    VALUES (
        (p_payload->'cabinet'->>'species_id')::bigint, 
        (p_payload->'cabinet'->>'color_id')::bigint,  
        (p_payload->'cabinet'->>'door_style_id')::bigint, 
        
        p_payload->'cabinet'->>'finish', p_payload->'cabinet'->>'glaze', p_payload->'cabinet'->>'top_drawer_front',
        p_payload->'cabinet'->>'interior', p_payload->'cabinet'->>'drawer_box', p_payload->'cabinet'->>'drawer_hardware',
        (p_payload->'cabinet'->>'box')::integer, (p_payload->'cabinet'->>'hinge_soft_close')::boolean,
        (p_payload->'cabinet'->>'doors_parts_only')::boolean, (p_payload->'cabinet'->>'handles_supplied')::boolean,
        (p_payload->'cabinet'->>'handles_selected')::boolean, (p_payload->'cabinet'->>'glass')::boolean,
        p_payload->'cabinet'->>'piece_count', p_payload->'cabinet'->>'glass_type'
    )
    RETURNING id INTO v_cabinet_id;
    

    v_so_number := generate_next_sales_order_number((p_payload->>'stage')::"SalesStage");


    INSERT INTO public.sales_orders (
        date_sold,client_id, cabinet_id, stage, total, deposit, designer, comments, install, 
        order_type, delivery_type, sales_order_number,
        shipping_client_name, project_name, shipping_street, shipping_city, shipping_province, shipping_zip,
        shipping_phone_1, shipping_phone_2, shipping_email_1, shipping_email_2,
        layout_date, client_meeting_date, follow_up_date, appliance_specs_date, selections_date, 
        markout_date, review_date, second_markout_date, flooring_type, flooring_clearance,
        is_memo,
        is_canopy_required, is_woodtop_required, is_custom_cab_required,
        is_cod,
        payment_received,
        site_prep
    )
    VALUES (
        (p_payload->> 'date_sold')::timestamp with time zone,
        (p_payload->>'client_id')::bigint, v_cabinet_id, (p_payload->>'stage')::"SalesStage", (p_payload->>'total')::numeric, (p_payload->>'deposit')::numeric, 
        p_payload->>'designer', p_payload->>'comments', (p_payload->>'install')::boolean, 
        p_payload->>'order_type', p_payload->>'delivery_type', v_so_number,
        p_payload->'shipping'->>'shipping_client_name', 
        p_payload->'shipping'->>'project_name',
        p_payload->'shipping'->>'shipping_street', 
        p_payload->'shipping'->>'shipping_city', 
        p_payload->'shipping'->>'shipping_province', 
        p_payload->'shipping'->>'shipping_zip',
        p_payload->'shipping'->>'shipping_phone_1', 
        p_payload->'shipping'->>'shipping_phone_2', 
        p_payload->'shipping'->>'shipping_email_1', 
        p_payload->'shipping'->>'shipping_email_2',

        (p_payload->'checklist'->>'layout_date')::timestamp with time zone, (p_payload->'checklist'->>'client_meeting_date')::timestamp with time zone, (p_payload->'checklist'->>'follow_up_date')::timestamp with time zone,
        (p_payload->'checklist'->>'appliance_specs_date')::timestamp with time zone, (p_payload->'checklist'->>'selections_date')::timestamp with time zone, 
        (p_payload->'checklist'->>'markout_date')::timestamp with time zone, (p_payload->'checklist'->>'review_date')::timestamp with time zone, (p_payload->'checklist'->>'second_markout_date')::timestamp with time zone,
        p_payload->>'flooring_type', 
        p_payload->>'flooring_clearance',
        (p_payload->>'is_memo')::boolean,
        (p_payload->>'is_canopy_required')::boolean,
        (p_payload->>'is_woodtop_required')::boolean,
        (p_payload->>'is_custom_cab_required')::boolean,
        (p_payload->>'is_cod')::boolean,
        (p_payload->>'payment_received')::boolean,
        (p_payload->>'site_prep')::boolean
    )
    RETURNING id INTO v_sales_order_id;


    IF (p_payload->>'stage')::text = 'SOLD' THEN
        PERFORM id FROM public.jobs
        WHERE job_base_number = (p_payload->>'manual_job_base')
        AND job_suffix IS NOT DISTINCT FROM (p_payload->>'manual_job_suffix');

        IF FOUND THEN
            RAISE EXCEPTION 'Job %-% already exists!', 
                p_payload->>'manual_job_base', 
                COALESCE(p_payload->>'manual_job_suffix', '(No Suffix)');
        END IF;

        INSERT INTO public.jobs (sales_order_id, job_base_number, job_suffix)
        VALUES (
            v_sales_order_id, 
            (p_payload->>'manual_job_base'), 
            p_payload->>'manual_job_suffix'
        )
        RETURNING job_number INTO v_job_number;
        
        out_job_number := v_job_number;
    ELSE
        out_job_number := NULL;
    END IF;

    out_sales_order_number := v_so_number;

    RETURN NEXT;
END;$function$;

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

CREATE OR REPLACE FUNCTION public.handle_new_job_installation()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  new_install_id bigint;
BEGIN
  -- Step 1: Insert a new row into the installation table and capture its generated ID
  INSERT INTO public.installation (installer_id, has_shipped)
  VALUES (NULL, FALSE)
  RETURNING installation_id INTO new_install_id;

  -- Step 2: Update the newly created jobs record to link the installation ID
  -- This UPDATE is performed on the *newly inserted* job record (identified by NEW.id)
  UPDATE public.jobs
  SET installation_id = new_install_id
  WHERE id = NEW.id;

  RETURN NEW;
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.handle_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.revert_job_to_quote (
  p_sales_order_id integer
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
declare
    current_stage text;
begin
    select stage into current_stage 
    from public.sales_orders 
    where id = p_sales_order_id;
    if current_stage = 'SOLD' then
        delete from public.production_schedule
        where prod_id in (
            select prod_id from public.jobs where sales_order_id = p_sales_order_id
        );

        delete from public.installation
        where installation_id in (
            select installation_id from public.jobs where sales_order_id = p_sales_order_id
        );

        delete from public.jobs
        where sales_order_id = p_sales_order_id;

        update public.sales_orders
        set stage = 'QUOTE',
            date_sold = null
        where id = p_sales_order_id;
    end if;
end;
$function$;

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

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_check_production_subtasks()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
DECLARE
    v_canopy_req boolean;
    v_custom_req boolean;
BEGIN

    SELECT 
        COALESCE(so.is_canopy_required, false),
        COALESCE(so.is_custom_cab_required, false)
    INTO v_canopy_req, v_custom_req
    FROM public.jobs j
    JOIN public.sales_orders so ON j.sales_order_id = so.id
    WHERE j.prod_id = NEW.prod_id; 

    IF (
        NEW.paint_doors_completed_actual IS NOT NULL 
        AND (v_canopy_req IS FALSE OR NEW.paint_canopy_completed_actual IS NOT NULL)
        AND (v_custom_req IS FALSE OR NEW.paint_cust_cab_completed_actual IS NOT NULL)
    ) THEN
        IF NEW.paint_completed_actual IS NULL THEN
             NEW.paint_completed_actual := NOW();
        END IF;
    ELSE
        NEW.paint_completed_actual := NULL;
    END IF;

    RETURN NEW;
END;
$function$;

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

CREATE VIEW "public"."test_view" AS  SELECT b.id,
    b.job_id,
    b.comments,
    b.date_entered,
    b.due_date,
    b.complete,
    b.created_at,
    j.job_number,
    so.shipping_client_name,
    so.shipping_street,
    so.shipping_city,
    so.shipping_province,
    so.shipping_zip,
    concat_ws(', '::text, so.shipping_street, so.shipping_city, so.shipping_province, so.shipping_zip) AS site_address
   FROM ((public.backorders b
     LEFT JOIN public.jobs j ON ((b.job_id = j.id)))
     LEFT JOIN public.sales_orders so ON ((j.sales_order_id = so.id)));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."test_view" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."test_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."test_view" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."test_view" TO "service_role";
