--
-- PostgreSQL database dump
--

\restrict WXqaRiN4EIzP9dYVgP299F3bOhaZG2kmhGzgJyzugjEfrskmUkIsPw5WAeHEVJa

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: SalesStage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SalesStage" AS ENUM (
    'QUOTE',
    'SOLD'
);


--
-- Name: ShippingStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ShippingStatus" AS ENUM (
    'unprocessed',
    'tentative',
    'confirmed'
);


--
-- Name: clerk_uid(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clerk_uid() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select (auth.jwt() ->> 'user_id')::text
$$;


--
-- Name: clerk_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clerk_user_role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select (auth.jwt() ->> 'user_role')::text
$$;


--
-- Name: create_master_order_transaction(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_master_order_transaction(p_payload jsonb) RETURNS TABLE(out_job_number text, out_sales_order_number text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
    v_cabinet_id bigint;
    v_sales_order_id bigint;
    v_so_number text;
    v_job_number text;
BEGIN
    -- 1. INSERT CABINETS
    -- FIX: Target the new Foreign Key columns (*_id) and read the corresponding JSON ID keys
    INSERT INTO public.cabinets (
        species_id, color_id, door_style_id, -- CORRECTED TARGET COLUMNS
        finish, glaze, top_drawer_front,
        interior, drawer_box, drawer_hardware, box, hinge_soft_close,
        doors_parts_only, handles_supplied, handles_selected, glass, piece_count, glass_type
    )
    VALUES (
        (p_payload->'cabinet'->>'species_id')::bigint, -- FIX: Read 'species_id' and cast to BIGINT
        (p_payload->'cabinet'->>'color_id')::bigint,   -- FIX: Read 'color_id' and cast to BIGINT
        (p_payload->'cabinet'->>'door_style_id')::bigint, -- FIX: Read 'door_style_id' and cast to BIGINT
        
        p_payload->'cabinet'->>'finish', p_payload->'cabinet'->>'glaze', p_payload->'cabinet'->>'top_drawer_front',
        p_payload->'cabinet'->>'interior', p_payload->'cabinet'->>'drawer_box', p_payload->'cabinet'->>'drawer_hardware',
        p_payload->'cabinet'->>'box', (p_payload->'cabinet'->>'hinge_soft_close')::boolean,
        (p_payload->'cabinet'->>'doors_parts_only')::boolean, (p_payload->'cabinet'->>'handles_supplied')::boolean,
        (p_payload->'cabinet'->>'handles_selected')::boolean, (p_payload->'cabinet'->>'glass')::boolean,
        p_payload->'cabinet'->>'piece_count', p_payload->'cabinet'->>'glass_type'
    )
    RETURNING id INTO v_cabinet_id;
    
    -- 2. GENERATE SALES ORDER NUMBER (ATOMICALLY)
    v_so_number := generate_next_sales_order_number((p_payload->>'stage')::"SalesStage");

    -- 3. INSERT SALES ORDER (Quote/Sold)
    INSERT INTO public.sales_orders (
        client_id, cabinet_id, stage, total, deposit, designer, comments, install, 
        order_type, delivery_type, sales_order_number, -- Injected atomic number
        shipping_client_name, shipping_street, shipping_city, shipping_province, shipping_zip,
        shipping_phone_1, shipping_phone_2, shipping_email_1, shipping_email_2,
        layout_date, client_meeting_date, follow_up_date, appliance_specs_date, selections_date, 
        markout_date, review_date, second_markout_date, flooring_type, flooring_clearance, is_memo
    )
    VALUES (
        (p_payload->>'client_id')::bigint, v_cabinet_id, (p_payload->>'stage')::"SalesStage", (p_payload->>'total')::numeric, (p_payload->>'deposit')::numeric, 
        p_payload->>'designer', p_payload->>'comments', (p_payload->>'install')::boolean, 
        p_payload->>'order_type', p_payload->>'delivery_type', v_so_number,
        p_payload->'shipping'->>'shipping_client_name', p_payload->'shipping'->>'shipping_street', p_payload->'shipping'->>'shipping_city', p_payload->'shipping'->>'shipping_province', p_payload->'shipping'->>'shipping_zip',
        p_payload->'shipping'->>'shipping_phone_1', p_payload->'shipping'->>'shipping_phone_2', p_payload->'shipping'->>'shipping_email_1', p_payload->'shipping'->>'shipping_email_2',
        (p_payload->'checklist'->>'layout_date')::timestamp with time zone, (p_payload->'checklist'->>'client_meeting_date')::timestamp with time zone, (p_payload->'checklist'->>'follow_up_date')::timestamp with time zone,
        (p_payload->'checklist'->>'appliance_specs_date')::timestamp with time zone, (p_payload->'checklist'->>'selections_date')::timestamp with time zone, 
        (p_payload->'checklist'->>'markout_date')::timestamp with time zone, (p_payload->'checklist'->>'review_date')::timestamp with time zone, (p_payload->'checklist'->>'second_markout_date')::timestamp with time zone,
        p_payload->'checklist'->>'flooring_type', p_payload->'checklist'->>'flooring_clearance', (p_payload->>'is_memo')::boolean
    )
    RETURNING id INTO v_sales_order_id;

    -- 4. CONDITIONAL JOB INSERT (SOLD)
    IF (p_payload->>'stage')::text = 'SOLD' THEN
        -- MANUAL JOB DUPLICATE CHECK (CORRECTED)
        PERFORM id FROM public.jobs
        WHERE job_base_number = (p_payload->>'manual_job_base')::integer
        -- This operator safely handles NULLs vs Values vs Empty Strings
        AND job_suffix IS NOT DISTINCT FROM (p_payload->>'manual_job_suffix');

        IF FOUND THEN
            RAISE EXCEPTION 'Job %-% already exists!', 
                p_payload->>'manual_job_base', 
                COALESCE(p_payload->>'manual_job_suffix', '(No Suffix)');
        END IF;

        -- INSERT JOB
        INSERT INTO public.jobs (sales_order_id, job_base_number, job_suffix)
        VALUES (
            v_sales_order_id, 
            (p_payload->>'manual_job_base')::integer, 
            p_payload->>'manual_job_suffix'
        )
        RETURNING job_number INTO v_job_number;
        
        out_job_number := v_job_number;
    ELSE
        out_job_number := NULL;
    END IF;

    out_sales_order_number := v_so_number;

    RETURN NEXT;
END;$$;


--
-- Name: create_production_schedule_for_new_job(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_production_schedule_for_new_job() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$ DECLARE new_prod_id bigint;

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

$$;


--
-- Name: generate_next_sales_order_number(public."SalesStage"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_next_sales_order_number(p_stage public."SalesStage") RETURNS text
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: handle_new_job_installation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_job_installation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: handle_new_job_purchasing(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_job_purchasing() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.purchase_tracking (job_id)
  VALUES (new.id);
  RETURN new;
END;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: set_sales_order_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_sales_order_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Only generate if the client didn't supply a number (i.e., it's null during INSERT)
    IF NEW.sales_order_number IS NULL THEN
        NEW.sales_order_number := generate_next_sales_order_number(NEW.stage); 
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: set_updated_at_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: backorders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backorders (
    id bigint NOT NULL,
    job_id bigint NOT NULL,
    date_entered date DEFAULT CURRENT_DATE,
    due_date date,
    comments text,
    complete boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: backorders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.backorders ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.backorders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cabinets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cabinets (
    id bigint NOT NULL,
    species_name_legacy text,
    color_name_legacy text,
    finish text,
    glaze text,
    door_style_name_legacy text,
    top_drawer_front text,
    interior text,
    drawer_box text,
    drawer_hardware text,
    box text,
    hinge_soft_close boolean DEFAULT false,
    doors_parts_only boolean DEFAULT false,
    hardware_only boolean DEFAULT false,
    handles_supplied boolean DEFAULT false,
    handles_selected boolean DEFAULT false,
    glass boolean DEFAULT false,
    piece_count text,
    hardware_quantity text,
    glass_type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    species_id bigint,
    color_id bigint,
    door_style_id bigint
);


--
-- Name: cabinets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cabinets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cabinets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cabinets_id_seq OWNED BY public.cabinets.id;


--
-- Name: client; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client (
    id integer NOT NULL,
    designer text,
    "firstName" text,
    "lastName" text NOT NULL,
    street text,
    city text,
    province text,
    zip text,
    phone1 text,
    phone2 text,
    email1 text,
    email2 text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    legacy_id text
);


--
-- Name: client_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_id_seq OWNED BY public.client.id;


--
-- Name: colors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.colors (
    "Id" bigint NOT NULL,
    "Name" text
);


--
-- Name: TABLE colors; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.colors IS 'all colors';


--
-- Name: colors_Id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.colors ALTER COLUMN "Id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."colors_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: debug_auth; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.debug_auth AS
 SELECT auth.uid() AS user_id,
    (auth.jwt() ->> 'user_role'::text) AS role_in_jwt,
    auth.jwt() AS full_token_payload;


--
-- Name: door_styles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.door_styles (
    id bigint NOT NULL,
    model text NOT NULL,
    name text NOT NULL,
    is_pre_manufactured boolean DEFAULT false NOT NULL,
    is_made_in_house boolean DEFAULT false NOT NULL
);


--
-- Name: door_styles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.door_styles ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.door_styles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: homeowners_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homeowners_info (
    id bigint NOT NULL,
    job_id bigint NOT NULL,
    homeowner_name text,
    homeowner_phone text,
    homeowner_email text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: homeowners_info_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.homeowners_info ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.homeowners_info_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: installation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.installation (
    installation_id bigint NOT NULL,
    installer_id bigint,
    installation_notes text,
    wrap_date date,
    has_shipped boolean DEFAULT false NOT NULL,
    installation_date date,
    installation_completed timestamp with time zone,
    inspection_date date,
    inspection_completed timestamp with time zone,
    legacy_ref text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    wrap_completed timestamp with time zone,
    partially_shipped boolean DEFAULT false
);


--
-- Name: installers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.installers (
    installer_id bigint NOT NULL,
    acc_number text,
    is_active boolean DEFAULT true NOT NULL,
    first_name text,
    last_name text,
    company_name text,
    phone_number text,
    wcb_number text,
    has_first_aid boolean,
    has_insurance boolean,
    gst_number text,
    street_address text,
    city text,
    zip_code text,
    email text,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    legacy_installer_id text
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    job_base_number integer NOT NULL,
    job_suffix text,
    job_number text GENERATED ALWAYS AS (
CASE
    WHEN ((job_suffix IS NULL) OR (job_suffix = ''::text)) THEN (job_base_number)::text
    ELSE (((job_base_number)::text || '-'::text) || job_suffix)
END) STORED NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sales_order_id bigint,
    prod_id bigint,
    installation_id bigint,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: production_schedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_schedule (
    rush boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    placement_date date,
    doors_in_schedule date,
    doors_out_schedule date,
    cut_finish_schedule date,
    cut_melamine_schedule date,
    paint_in_schedule date,
    paint_out_schedule date,
    assembly_schedule date,
    ship_schedule date,
    in_plant_actual timestamp with time zone,
    doors_completed_actual timestamp with time zone,
    cut_finish_completed_actual timestamp with time zone,
    custom_finish_completed_actual timestamp with time zone,
    drawer_completed_actual timestamp with time zone,
    cut_melamine_completed_actual timestamp with time zone,
    paint_completed_actual timestamp with time zone,
    assembly_completed_actual timestamp with time zone,
    box_assembled_count integer DEFAULT 0 NOT NULL,
    ship_status public."ShippingStatus" DEFAULT 'unprocessed'::public."ShippingStatus" NOT NULL,
    ship_confirmed_legacy boolean,
    prod_id bigint NOT NULL,
    received_date date,
    production_comments text
);


--
-- Name: COLUMN production_schedule.received_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_schedule.received_date IS 'Received from designer';


--
-- Name: sales_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_orders (
    id bigint NOT NULL,
    sales_order_number text,
    client_id bigint NOT NULL,
    cabinet_id bigint NOT NULL,
    stage public."SalesStage" DEFAULT 'QUOTE'::public."SalesStage" NOT NULL,
    total numeric(10,2),
    deposit numeric(10,2),
    designer text,
    comments text,
    install boolean DEFAULT false NOT NULL,
    delivery_type text,
    order_type text,
    counter_by text,
    counter_top text,
    counter_color text,
    counter_type text,
    shipping_client_name text,
    shipping_street text,
    shipping_city text,
    shipping_province text,
    shipping_zip text,
    shipping_phone_1 text,
    shipping_phone_2 text,
    shipping_email_1 text,
    shipping_email_2 text,
    layout_date timestamp with time zone,
    client_meeting_date timestamp with time zone,
    follow_up_date timestamp with time zone,
    appliance_specs_date timestamp with time zone,
    selections_date timestamp with time zone,
    flooring_type text,
    flooring_clearance text,
    markout_date timestamp with time zone,
    review_date timestamp with time zone,
    second_markout_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    invoice_balance numeric GENERATED ALWAYS AS ((total - deposit)) STORED,
    is_memo boolean DEFAULT false
);


--
-- Name: inspection_table_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.inspection_table_view AS
 SELECT j.id AS job_id,
    j.job_number,
    so.shipping_client_name,
    concat_ws(', '::text, so.shipping_street, so.shipping_city, so.shipping_province) AS site_address,
    i.installation_id,
    i.installation_date,
    i.inspection_date,
    i.inspection_completed,
    i.installer_id,
    ins.company_name AS installer_company,
    ins.first_name AS installer_first_name,
    ins.last_name AS installer_last_name,
    ps.rush
   FROM ((((public.jobs j
     JOIN public.sales_orders so ON ((j.sales_order_id = so.id)))
     JOIN public.installation i ON ((j.installation_id = i.installation_id)))
     LEFT JOIN public.installers ins ON ((i.installer_id = ins.installer_id)))
     LEFT JOIN public.production_schedule ps ON ((j.prod_id = ps.prod_id)))
  WHERE (j.is_active = true);


--
-- Name: installation_installation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.installation ALTER COLUMN installation_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.installation_installation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: installation_table_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.installation_table_view AS
 SELECT j.id AS job_id,
    j.job_number,
    j.sales_order_id,
    so.shipping_client_name,
    i.installation_id,
    i.installation_date,
    i.wrap_date,
    i.inspection_date,
    i.has_shipped,
    i.installation_completed,
    i.inspection_completed,
    i.installer_id,
    ins.company_name AS installer_company,
    ins.first_name AS installer_first_name,
    ins.last_name AS installer_last_name,
    ps.rush,
    ps.ship_schedule
   FROM ((((public.jobs j
     JOIN public.sales_orders so ON ((j.sales_order_id = so.id)))
     JOIN public.installation i ON ((j.installation_id = i.installation_id)))
     LEFT JOIN public.installers ins ON ((i.installer_id = ins.installer_id)))
     LEFT JOIN public.production_schedule ps ON ((j.prod_id = ps.prod_id)))
  WHERE (j.is_active = true);


--
-- Name: installers_installer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.installers ALTER COLUMN installer_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.installers_installer_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    invoice_id bigint NOT NULL,
    invoice_number text,
    job_id bigint NOT NULL,
    date_entered date DEFAULT CURRENT_DATE,
    date_due date,
    paid_at timestamp with time zone,
    no_charge boolean DEFAULT false,
    comments text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: invoices_invoice_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.invoices ALTER COLUMN invoice_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.invoices_invoice_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: job_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_attachments (
    id bigint NOT NULL,
    job_id bigint NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_type text NOT NULL,
    file_size bigint,
    uploaded_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    category text DEFAULT 'General'::text NOT NULL
);


--
-- Name: job_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.job_attachments ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.job_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: job_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_number_seq
    START WITH 40000
    INCREMENT BY 1
    MINVALUE 40000
    MAXVALUE 9999999
    CACHE 1;


--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: service_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_orders (
    service_order_id bigint NOT NULL,
    job_id bigint NOT NULL,
    service_order_number text NOT NULL,
    date_entered timestamp with time zone DEFAULT now() NOT NULL,
    due_date date,
    completed_at timestamp with time zone,
    installer_id integer,
    service_type text,
    service_by text,
    hours_estimated integer,
    comments text,
    service_type_detail text,
    service_by_detail text,
    chargeable boolean DEFAULT false,
    is_warranty_so boolean DEFAULT false,
    warranty_order_cost numeric,
    installer_requested boolean DEFAULT false,
    created_by text
);


--
-- Name: species; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.species (
    "Id" bigint NOT NULL,
    "Species" text,
    "Prefinished" boolean DEFAULT false
);


--
-- Name: TABLE species; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.species IS 'All Species';


--
-- Name: plant_master_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.plant_master_view AS
 SELECT 'JOB'::text AS record_type,
    j.id,
    j.job_number AS display_id,
    so.shipping_client_name AS client_name,
    ps.ship_schedule AS due_date,
    concat_ws(' | '::text, NULLIF(c.box, ''::text), s."Species", cl."Name", ds.name) AS description,
    ps.created_at
   FROM ((((((public.jobs j
     JOIN public.production_schedule ps ON ((j.prod_id = ps.prod_id)))
     JOIN public.sales_orders so ON ((j.sales_order_id = so.id)))
     JOIN public.cabinets c ON ((so.cabinet_id = c.id)))
     LEFT JOIN public.species s ON ((c.species_id = s."Id")))
     LEFT JOIN public.colors cl ON ((c.color_id = cl."Id")))
     LEFT JOIN public.door_styles ds ON ((c.door_style_id = ds.id)))
  WHERE (j.is_active = true)
UNION ALL
 SELECT 'SERVICE'::text AS record_type,
    so.service_order_id AS id,
    so.service_order_number AS display_id,
    sales.shipping_client_name AS client_name,
    so.due_date,
    so.comments AS description,
    so.date_entered AS created_at
   FROM ((public.service_orders so
     JOIN public.jobs j ON ((so.job_id = j.id)))
     JOIN public.sales_orders sales ON ((j.sales_order_id = sales.id)));


--
-- Name: plant_table_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.plant_table_view AS
 SELECT j.id AS job_id,
    j.job_number,
    so.shipping_client_name AS client_name,
    so.shipping_street,
    so.shipping_city,
    so.shipping_province,
    so.shipping_zip,
    c.box AS cabinet_box,
    ds.name AS cabinet_door_style,
    s."Species" AS cabinet_species,
    col."Name" AS cabinet_color,
    i.installation_id,
    i.wrap_date,
    i.wrap_completed,
    i.has_shipped,
    i.installation_completed,
    i.partially_shipped,
    i.installation_notes,
    ps.doors_completed_actual,
    ps.cut_finish_completed_actual,
    ps.custom_finish_completed_actual,
    ps.paint_completed_actual,
    ps.assembly_completed_actual,
    ps.ship_schedule
   FROM (((((((public.jobs j
     LEFT JOIN public.sales_orders so ON ((j.sales_order_id = so.id)))
     LEFT JOIN public.cabinets c ON ((so.cabinet_id = c.id)))
     LEFT JOIN public.door_styles ds ON ((c.door_style_id = ds.id)))
     LEFT JOIN public.species s ON ((c.species_id = s."Id")))
     LEFT JOIN public.colors col ON ((c.color_id = col."Id")))
     JOIN public.installation i ON ((j.installation_id = i.installation_id)))
     LEFT JOIN public.production_schedule ps ON ((j.prod_id = ps.prod_id)))
  WHERE (j.is_active = true);


--
-- Name: prod_table_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.prod_table_view AS
 SELECT j.id,
    j.job_number,
    j.sales_order_id,
    ps.rush,
    ps.received_date,
    ps.placement_date,
    ps.ship_schedule,
    ps.ship_status,
    ps.prod_id,
    ps.in_plant_actual,
    ps.doors_completed_actual,
    ps.cut_finish_completed_actual,
    ps.custom_finish_completed_actual,
    ps.drawer_completed_actual,
    ps.cut_melamine_completed_actual,
    ps.paint_completed_actual,
    ps.assembly_completed_actual,
    so.shipping_client_name,
    concat_ws(', '::text, so.shipping_street, so.shipping_city, so.shipping_province, so.shipping_zip) AS site_address,
    cab.box AS cabinet_box,
    s."Species" AS cabinet_species,
    c."Name" AS cabinet_color,
    ds.name AS cabinet_door_style
   FROM ((((((public.jobs j
     JOIN public.production_schedule ps ON ((j.prod_id = ps.prod_id)))
     LEFT JOIN public.sales_orders so ON ((j.sales_order_id = so.id)))
     LEFT JOIN public.cabinets cab ON ((so.cabinet_id = cab.id)))
     LEFT JOIN public.species s ON ((cab.species_id = s."Id")))
     LEFT JOIN public.colors c ON ((cab.color_id = c."Id")))
     LEFT JOIN public.door_styles ds ON ((cab.door_style_id = ds.id)))
  WHERE (j.is_active = true);


--
-- Name: production_schedule_Id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.production_schedule ALTER COLUMN prod_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."production_schedule_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    id bigint NOT NULL,
    purchase_tracking_id bigint NOT NULL,
    item_type text NOT NULL,
    quantity integer DEFAULT 1,
    part_description text NOT NULL,
    company text,
    is_received boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    po_number text,
    qty_received integer DEFAULT 0
);


--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.purchase_order_items ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.purchase_order_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: purchase_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_tracking (
    purchase_check_id bigint NOT NULL,
    job_id bigint NOT NULL,
    doors_ordered_at timestamp with time zone,
    doors_received_at timestamp with time zone,
    glass_ordered_at timestamp with time zone,
    glass_received_at timestamp with time zone,
    handles_ordered_at timestamp with time zone,
    handles_received_at timestamp with time zone,
    acc_ordered_at timestamp with time zone,
    acc_received_at timestamp with time zone,
    purchasing_comments text,
    updated_at timestamp with time zone DEFAULT now(),
    doors_received_incomplete_at timestamp with time zone,
    glass_received_incomplete_at timestamp with time zone,
    handles_received_incomplete_at timestamp with time zone,
    acc_received_incomplete_at timestamp with time zone
);


--
-- Name: purchase_tracking_purchase_check_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.purchase_tracking ALTER COLUMN purchase_check_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.purchase_tracking_purchase_check_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: purchasing_table_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.purchasing_table_view AS
 SELECT pt.purchase_check_id,
    pt.job_id,
    pt.doors_ordered_at,
    pt.doors_received_at,
    pt.doors_received_incomplete_at,
    pt.glass_ordered_at,
    pt.glass_received_at,
    pt.glass_received_incomplete_at,
    pt.handles_ordered_at,
    pt.handles_received_at,
    pt.handles_received_incomplete_at,
    pt.acc_ordered_at,
    pt.acc_received_at,
    pt.acc_received_incomplete_at,
    pt.purchasing_comments,
    j.job_number,
    j.sales_order_id,
    so.shipping_client_name AS client_name,
    ps.ship_schedule,
    ds.name AS door_style_name,
    ds.is_made_in_house AS door_made_in_house
   FROM (((((public.purchase_tracking pt
     JOIN public.jobs j ON ((pt.job_id = j.id)))
     LEFT JOIN public.sales_orders so ON ((j.sales_order_id = so.id)))
     LEFT JOIN public.cabinets c ON ((so.cabinet_id = c.id)))
     LEFT JOIN public.door_styles ds ON ((c.door_style_id = ds.id)))
     LEFT JOIN public.production_schedule ps ON ((j.prod_id = ps.prod_id)))
  WHERE (j.is_active = true);


--
-- Name: sales_order_sequence; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_order_sequence
    START WITH 10000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_orders_id_seq OWNED BY public.sales_orders.id;


--
-- Name: sales_table_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.sales_table_view AS
 SELECT so.id,
    so.sales_order_number,
    so.stage,
    so.total,
    so.deposit,
    so.invoice_balance,
    so.designer,
    so.created_at,
    so.shipping_client_name,
    so.shipping_street,
    so.shipping_city,
    so.shipping_province,
    so.shipping_zip,
    j.job_number,
    j.id AS job_id
   FROM (public.sales_orders so
     LEFT JOIN public.jobs j ON ((so.id = j.sales_order_id)))
  WHERE (j.is_active = true);


--
-- Name: service_order_parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_order_parts (
    id bigint NOT NULL,
    service_order_id bigint NOT NULL,
    qty integer DEFAULT 1 NOT NULL,
    part text NOT NULL,
    description text
);


--
-- Name: service_order_parts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.service_order_parts ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.service_order_parts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: service_orders_service_order_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.service_orders ALTER COLUMN service_order_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.service_orders_service_order_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: service_orders_table_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.service_orders_table_view AS
 SELECT so.service_order_id,
    so.service_order_number,
    so.date_entered,
    so.due_date,
    so.completed_at,
    so.installer_requested,
    j.id AS job_id,
    j.job_number,
    j.sales_order_id,
    s.shipping_client_name AS client_name,
    concat_ws(', '::text, s.shipping_street, s.shipping_city, s.shipping_province) AS site_address,
    i.company_name AS installer_company,
    i.first_name AS installer_first,
    i.last_name AS installer_last
   FROM (((public.service_orders so
     LEFT JOIN public.jobs j ON ((so.job_id = j.id)))
     LEFT JOIN public.sales_orders s ON ((j.sales_order_id = s.id)))
     LEFT JOIN public.installers i ON ((so.installer_id = i.installer_id)))
  WHERE (j.is_active = true);


--
-- Name: species_Id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.species ALTER COLUMN "Id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."species_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cabinets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cabinets ALTER COLUMN id SET DEFAULT nextval('public.cabinets_id_seq'::regclass);


--
-- Name: client id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client ALTER COLUMN id SET DEFAULT nextval('public.client_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: sales_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders ALTER COLUMN id SET DEFAULT nextval('public.sales_orders_id_seq'::regclass);


--
-- Name: backorders backorders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backorders
    ADD CONSTRAINT backorders_pkey PRIMARY KEY (id);


--
-- Name: cabinets cabinets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cabinets
    ADD CONSTRAINT cabinets_pkey PRIMARY KEY (id);


--
-- Name: client client_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT client_pkey PRIMARY KEY (id);


--
-- Name: colors colors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colors
    ADD CONSTRAINT colors_pkey PRIMARY KEY ("Id");


--
-- Name: door_styles door_styles_model_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.door_styles
    ADD CONSTRAINT door_styles_model_key UNIQUE (model);


--
-- Name: door_styles door_styles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.door_styles
    ADD CONSTRAINT door_styles_pkey PRIMARY KEY (id);


--
-- Name: homeowners_info homeowners_info_job_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homeowners_info
    ADD CONSTRAINT homeowners_info_job_id_key UNIQUE (job_id);


--
-- Name: homeowners_info homeowners_info_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homeowners_info
    ADD CONSTRAINT homeowners_info_pkey PRIMARY KEY (id);


--
-- Name: installation installation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation
    ADD CONSTRAINT installation_pkey PRIMARY KEY (installation_id);


--
-- Name: installers installers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installers
    ADD CONSTRAINT installers_pkey PRIMARY KEY (installer_id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (invoice_id);


--
-- Name: job_attachments job_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_attachments
    ADD CONSTRAINT job_attachments_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_installation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_installation_id_key UNIQUE (installation_id);


--
-- Name: jobs jobs_job_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_job_number_key UNIQUE (job_number);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: production_schedule production_schedule_Id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_schedule
    ADD CONSTRAINT "production_schedule_Id_key" UNIQUE (prod_id);


--
-- Name: production_schedule production_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_schedule
    ADD CONSTRAINT production_schedule_pkey PRIMARY KEY (prod_id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_tracking purchase_tracking_job_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_tracking
    ADD CONSTRAINT purchase_tracking_job_id_key UNIQUE (job_id);


--
-- Name: purchase_tracking purchase_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_tracking
    ADD CONSTRAINT purchase_tracking_pkey PRIMARY KEY (purchase_check_id);


--
-- Name: sales_orders sales_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_pkey PRIMARY KEY (id);


--
-- Name: sales_orders sales_orders_sales_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_sales_order_number_key UNIQUE (sales_order_number);


--
-- Name: service_order_parts service_order_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_order_parts
    ADD CONSTRAINT service_order_parts_pkey PRIMARY KEY (id);


--
-- Name: service_orders service_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_pkey PRIMARY KEY (service_order_id);


--
-- Name: service_orders service_orders_service_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_service_order_number_key UNIQUE (service_order_number);


--
-- Name: species species_Id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.species
    ADD CONSTRAINT "species_Id_key" UNIQUE ("Id");


--
-- Name: species species_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.species
    ADD CONSTRAINT species_pkey PRIMARY KEY ("Id");


--
-- Name: client uq_client_legacy_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT uq_client_legacy_id UNIQUE (legacy_id);


--
-- Name: jobs uq_jobs_sales_order_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT uq_jobs_sales_order_id UNIQUE (sales_order_id);


--
-- Name: idx_client_legacy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_legacy_id ON public.client USING btree (legacy_id);


--
-- Name: idx_jobs_base_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_base_number ON public.jobs USING btree (job_base_number);


--
-- Name: jobs_job_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jobs_job_number_idx ON public.jobs USING btree (job_number);


--
-- Name: sales_orders_client_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sales_orders_client_id_idx ON public.sales_orders USING btree (client_id);


--
-- Name: jobs create_production_link; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_production_link AFTER INSERT ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.create_production_schedule_for_new_job();


--
-- Name: client on_client_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_client_updated BEFORE UPDATE ON public.client FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: jobs on_job_created_create_purchasing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_job_created_create_purchasing AFTER INSERT ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.handle_new_job_purchasing();


--
-- Name: sales_orders sales_order_number_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sales_order_number_trigger BEFORE INSERT ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.set_sales_order_number();


--
-- Name: production_schedule set_production_schedule_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_production_schedule_updated_at BEFORE UPDATE ON public.production_schedule FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();


--
-- Name: jobs trg_create_installation_record; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_create_installation_record AFTER INSERT ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.handle_new_job_installation();


--
-- Name: backorders backorders_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backorders
    ADD CONSTRAINT backorders_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: cabinets fk_cabinets_colors; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cabinets
    ADD CONSTRAINT fk_cabinets_colors FOREIGN KEY (color_id) REFERENCES public.colors("Id");


--
-- Name: cabinets fk_cabinets_door_styles; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cabinets
    ADD CONSTRAINT fk_cabinets_door_styles FOREIGN KEY (door_style_id) REFERENCES public.door_styles(id);


--
-- Name: cabinets fk_cabinets_species; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cabinets
    ADD CONSTRAINT fk_cabinets_species FOREIGN KEY (species_id) REFERENCES public.species("Id");


--
-- Name: jobs fk_installation_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT fk_installation_id FOREIGN KEY (installation_id) REFERENCES public.installation(installation_id) ON DELETE SET NULL;


--
-- Name: installation fk_installer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation
    ADD CONSTRAINT fk_installer FOREIGN KEY (installer_id) REFERENCES public.installers(installer_id) ON DELETE SET NULL;


--
-- Name: jobs fk_jobs_sales_order_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT fk_jobs_sales_order_id FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE RESTRICT;


--
-- Name: homeowners_info homeowners_info_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homeowners_info
    ADD CONSTRAINT homeowners_info_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id);


--
-- Name: invoices invoices_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: job_attachments job_attachments_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_attachments
    ADD CONSTRAINT job_attachments_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_prod_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_prod_id_fkey FOREIGN KEY (prod_id) REFERENCES public.production_schedule(prod_id) ON DELETE SET NULL;


--
-- Name: purchase_order_items purchase_order_items_purchase_tracking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_purchase_tracking_id_fkey FOREIGN KEY (purchase_tracking_id) REFERENCES public.purchase_tracking(purchase_check_id) ON DELETE CASCADE;


--
-- Name: purchase_tracking purchase_tracking_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_tracking
    ADD CONSTRAINT purchase_tracking_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: sales_orders sales_orders_cabinet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_cabinet_id_fkey FOREIGN KEY (cabinet_id) REFERENCES public.cabinets(id) ON DELETE RESTRICT;


--
-- Name: sales_orders sales_orders_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.client(id) ON DELETE RESTRICT;


--
-- Name: service_order_parts service_order_parts_service_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_order_parts
    ADD CONSTRAINT service_order_parts_service_order_id_fkey FOREIGN KEY (service_order_id) REFERENCES public.service_orders(service_order_id) ON DELETE CASCADE;


--
-- Name: service_orders service_orders_installer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_installer_id_fkey FOREIGN KEY (installer_id) REFERENCES public.installers(installer_id) ON DELETE SET NULL;


--
-- Name: service_orders service_orders_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: cabinets Allow INSERT for Admins and Designers on Cabinets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow INSERT for Admins and Designers on Cabinets" ON public.cabinets FOR INSERT WITH CHECK (((public.clerk_user_role() = 'admin'::text) OR (public.clerk_user_role() = 'designer'::text)));


--
-- Name: client Allow INSERT for Admins and Designers on Client; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow INSERT for Admins and Designers on Client" ON public.client FOR INSERT WITH CHECK (((public.clerk_user_role() = 'admin'::text) OR (public.clerk_user_role() = 'designer'::text)));


--
-- Name: jobs Allow INSERT for Admins and Designers on Jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow INSERT for Admins and Designers on Jobs" ON public.jobs FOR INSERT WITH CHECK (((public.clerk_user_role() = 'admin'::text) OR (public.clerk_user_role() = 'designer'::text)));


--
-- Name: sales_orders Allow INSERT for Admins and Designers on Sales Orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow INSERT for Admins and Designers on Sales Orders" ON public.sales_orders FOR INSERT WITH CHECK (((public.clerk_user_role() = 'admin'::text) OR (public.clerk_user_role() = 'designer'::text)));


--
-- Name: cabinets Allow SELECT for Admins and Designers on Cabinets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow SELECT for Admins and Designers on Cabinets" ON public.cabinets FOR SELECT USING (((public.clerk_user_role() = 'admin'::text) OR (public.clerk_user_role() = 'designer'::text)));


--
-- Name: client Allow SELECT for Admins and Designers on Client; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow SELECT for Admins and Designers on Client" ON public.client FOR SELECT USING (((public.clerk_user_role() = 'admin'::text) OR (public.clerk_user_role() = 'designer'::text)));


--
-- Name: jobs Allow SELECT for Admins and Designers on Jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow SELECT for Admins and Designers on Jobs" ON public.jobs FOR SELECT USING (((public.clerk_user_role() = 'admin'::text) OR (public.clerk_user_role() = 'designer'::text)));


--
-- Name: sales_orders Allow SELECT for Admins and Designers on Sales Orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow SELECT for Admins and Designers on Sales Orders" ON public.sales_orders FOR SELECT USING (((public.clerk_user_role() = 'admin'::text) OR (public.clerk_user_role() = 'designer'::text)));


--
-- Name: cabinets Allow UPDATE for Admins and Designers on Cabinets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow UPDATE for Admins and Designers on Cabinets" ON public.cabinets FOR UPDATE USING (((public.clerk_user_role() = 'admin'::text) OR (public.clerk_user_role() = 'designer'::text))) WITH CHECK (((public.clerk_user_role() = 'admin'::text) OR (public.clerk_user_role() = 'designer'::text)));


--
-- Name: client Allow UPDATE for Admins and Designers on Client; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow UPDATE for Admins and Designers on Client" ON public.client FOR UPDATE USING (((public.clerk_user_role() = 'admin'::text) OR (public.clerk_user_role() = 'designer'::text))) WITH CHECK (((public.clerk_user_role() = 'admin'::text) OR (public.clerk_user_role() = 'designer'::text)));


--
-- Name: jobs Allow UPDATE for Admins and Designers on Jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow UPDATE for Admins and Designers on Jobs" ON public.jobs FOR UPDATE USING (((public.clerk_user_role() = 'admin'::text) OR (public.clerk_user_role() = 'designer'::text))) WITH CHECK (((public.clerk_user_role() = 'admin'::text) OR (public.clerk_user_role() = 'designer'::text)));


--
-- Name: sales_orders Allow UPDATE for Admins and Designers on Sales Orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow UPDATE for Admins and Designers on Sales Orders" ON public.sales_orders FOR UPDATE USING (((public.clerk_user_role() = 'admin'::text) OR (public.clerk_user_role() = 'designer'::text))) WITH CHECK (((public.clerk_user_role() = 'admin'::text) OR (public.clerk_user_role() = 'designer'::text)));


--
-- PostgreSQL database dump complete
--

\unrestrict WXqaRiN4EIzP9dYVgP299F3bOhaZG2kmhGzgJyzugjEfrskmUkIsPw5WAeHEVJa

