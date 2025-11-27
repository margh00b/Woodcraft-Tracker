


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."SalesStage" AS ENUM (
    'QUOTE',
    'SOLD'
);


ALTER TYPE "public"."SalesStage" OWNER TO "postgres";


CREATE TYPE "public"."ShippingStatus" AS ENUM (
    'unprocessed',
    'tentative',
    'confirmed'
);


ALTER TYPE "public"."ShippingStatus" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clerk_uid"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select (auth.jwt() ->> 'user_id')::text
$$;


ALTER FUNCTION "public"."clerk_uid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clerk_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select (auth.jwt() ->> 'user_role')::text
$$;


ALTER FUNCTION "public"."clerk_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_master_order_transaction"("p_payload" "jsonb") RETURNS TABLE("out_job_number" "text", "out_sales_order_number" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
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
        markout_date, review_date, second_markout_date, flooring_type, flooring_clearance
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
        p_payload->'checklist'->>'flooring_type', p_payload->'checklist'->>'flooring_clearance'
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


ALTER FUNCTION "public"."create_master_order_transaction"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_production_schedule_for_new_job"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."create_production_schedule_for_new_job"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_next_sales_order_number"("p_stage" "public"."SalesStage") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    current_year_month TEXT;
    prefix TEXT;
    next_seq_val BIGINT;
BEGIN
    current_year_month := TO_CHAR(CURRENT_DATE, 'YYMM');
    prefix := CASE
        WHEN p_stage::TEXT = 'SOLD' THEN 'S'
        ELSE 'Q'
    END;
    
    next_seq_val := nextval('sales_order_sequence'); 
    
    RETURN prefix || '-' || current_year_month || '-' || next_seq_val::TEXT;
END;
$$;


ALTER FUNCTION "public"."generate_next_sales_order_number"("p_stage" "public"."SalesStage") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_job_installation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."handle_new_job_installation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_job_purchasing"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.purchase_tracking (job_id)
  VALUES (new.id);
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_job_purchasing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_sales_order_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Only generate if the client didn't supply a number (i.e., it's null during INSERT)
    IF NEW.sales_order_number IS NULL THEN
        NEW.sales_order_number := generate_next_sales_order_number(NEW.stage); 
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_sales_order_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at_timestamp"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."cabinets" (
    "id" bigint NOT NULL,
    "species_name_legacy" "text",
    "color_name_legacy" "text",
    "finish" "text",
    "glaze" "text",
    "door_style_name_legacy" "text",
    "top_drawer_front" "text",
    "interior" "text",
    "drawer_box" "text",
    "drawer_hardware" "text",
    "box" "text",
    "hinge_soft_close" boolean DEFAULT false,
    "doors_parts_only" boolean DEFAULT false,
    "hardware_only" boolean DEFAULT false,
    "handles_supplied" boolean DEFAULT false,
    "handles_selected" boolean DEFAULT false,
    "glass" boolean DEFAULT false,
    "piece_count" "text",
    "hardware_quantity" "text",
    "glass_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "species_id" bigint,
    "color_id" bigint,
    "door_style_id" bigint
);


ALTER TABLE "public"."cabinets" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."cabinets_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."cabinets_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."cabinets_id_seq" OWNED BY "public"."cabinets"."id";



CREATE TABLE IF NOT EXISTS "public"."client" (
    "id" integer NOT NULL,
    "designer" "text",
    "firstName" "text",
    "lastName" "text" NOT NULL,
    "street" "text",
    "city" "text",
    "province" "text",
    "zip" "text",
    "phone1" "text",
    "phone2" "text",
    "email1" "text",
    "email2" "text",
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."client_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."client_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."client_id_seq" OWNED BY "public"."client"."id";



CREATE TABLE IF NOT EXISTS "public"."colors" (
    "Id" bigint NOT NULL,
    "Name" "text"
);


ALTER TABLE "public"."colors" OWNER TO "postgres";


COMMENT ON TABLE "public"."colors" IS 'all colors';



ALTER TABLE "public"."colors" ALTER COLUMN "Id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."colors_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."debug_auth" AS
 SELECT "auth"."uid"() AS "user_id",
    ("auth"."jwt"() ->> 'user_role'::"text") AS "role_in_jwt",
    "auth"."jwt"() AS "full_token_payload";


ALTER VIEW "public"."debug_auth" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."door_styles" (
    "id" bigint NOT NULL,
    "model" "text" NOT NULL,
    "name" "text" NOT NULL,
    "is_pre_manufactured" boolean DEFAULT false NOT NULL,
    "is_made_in_house" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."door_styles" OWNER TO "postgres";


ALTER TABLE "public"."door_styles" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."door_styles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."installation" (
    "installation_id" bigint NOT NULL,
    "installer_id" bigint,
    "installation_notes" "text",
    "wrap_date" "date",
    "has_shipped" boolean DEFAULT false NOT NULL,
    "installation_date" "date",
    "installation_completed" timestamp with time zone,
    "inspection_date" "date",
    "inspection_completed" timestamp with time zone,
    "legacy_ref" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "wrap_completed" timestamp with time zone
);


ALTER TABLE "public"."installation" OWNER TO "postgres";


ALTER TABLE "public"."installation" ALTER COLUMN "installation_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."installation_installation_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."installers" (
    "installer_id" bigint NOT NULL,
    "acc_number" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "company_name" "text",
    "phone_number" "text",
    "wcb_number" "text",
    "has_first_aid" boolean,
    "has_insurance" boolean,
    "gst_number" "text",
    "street_address" "text",
    "city" "text",
    "zip_code" "text",
    "email" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."installers" OWNER TO "postgres";


ALTER TABLE "public"."installers" ALTER COLUMN "installer_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."installers_installer_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "invoice_id" bigint NOT NULL,
    "invoice_number" "text",
    "job_id" bigint NOT NULL,
    "date_entered" "date" DEFAULT CURRENT_DATE,
    "date_due" "date",
    "paid_at" timestamp with time zone,
    "no_charge" boolean DEFAULT false,
    "comments" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


ALTER TABLE "public"."invoices" ALTER COLUMN "invoice_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."invoices_invoice_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE SEQUENCE IF NOT EXISTS "public"."job_number_seq"
    START WITH 40000
    INCREMENT BY 1
    MINVALUE 40000
    MAXVALUE 9999999
    CACHE 1;


ALTER SEQUENCE "public"."job_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" bigint NOT NULL,
    "job_base_number" integer NOT NULL,
    "job_suffix" "text",
    "job_number" "text" GENERATED ALWAYS AS (
CASE
    WHEN (("job_suffix" IS NULL) OR ("job_suffix" = ''::"text")) THEN ("job_base_number")::"text"
    ELSE ((("job_base_number")::"text" || '-'::"text") || "job_suffix")
END) STORED NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sales_order_id" bigint,
    "prod_id" bigint,
    "installation_id" bigint
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."jobs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."jobs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."jobs_id_seq" OWNED BY "public"."jobs"."id";



CREATE TABLE IF NOT EXISTS "public"."production_schedule" (
    "rush" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "placement_date" "date",
    "doors_in_schedule" "date",
    "doors_out_schedule" "date",
    "cut_finish_schedule" "date",
    "cut_melamine_schedule" "date",
    "paint_in_schedule" "date",
    "paint_out_schedule" "date",
    "assembly_schedule" "date",
    "ship_schedule" "date",
    "in_plant_actual" timestamp with time zone,
    "doors_completed_actual" timestamp with time zone,
    "cut_finish_completed_actual" timestamp with time zone,
    "custom_finish_completed_actual" timestamp with time zone,
    "drawer_completed_actual" timestamp with time zone,
    "cut_melamine_completed_actual" timestamp with time zone,
    "paint_completed_actual" timestamp with time zone,
    "assembly_completed_actual" timestamp with time zone,
    "box_assembled_count" integer DEFAULT 0 NOT NULL,
    "ship_status" "public"."ShippingStatus" DEFAULT 'unprocessed'::"public"."ShippingStatus" NOT NULL,
    "ship_confirmed_legacy" boolean,
    "prod_id" bigint NOT NULL,
    "received_date" "date"
);


ALTER TABLE "public"."production_schedule" OWNER TO "postgres";


COMMENT ON COLUMN "public"."production_schedule"."received_date" IS 'Received from designer';



ALTER TABLE "public"."production_schedule" ALTER COLUMN "prod_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."production_schedule_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."purchase_tracking" (
    "purchase_check_id" bigint NOT NULL,
    "job_id" bigint NOT NULL,
    "doors_ordered_at" timestamp with time zone,
    "doors_received_at" timestamp with time zone,
    "glass_ordered_at" timestamp with time zone,
    "glass_received_at" timestamp with time zone,
    "handles_ordered_at" timestamp with time zone,
    "handles_received_at" timestamp with time zone,
    "acc_ordered_at" timestamp with time zone,
    "acc_received_at" timestamp with time zone,
    "purchasing_comments" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."purchase_tracking" OWNER TO "postgres";


ALTER TABLE "public"."purchase_tracking" ALTER COLUMN "purchase_check_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."purchase_tracking_purchase_check_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE SEQUENCE IF NOT EXISTS "public"."sales_order_sequence"
    START WITH 10000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sales_order_sequence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_orders" (
    "id" bigint NOT NULL,
    "sales_order_number" "text",
    "client_id" bigint NOT NULL,
    "cabinet_id" bigint NOT NULL,
    "stage" "public"."SalesStage" DEFAULT 'QUOTE'::"public"."SalesStage" NOT NULL,
    "total" numeric(10,2),
    "deposit" numeric(10,2),
    "designer" "text",
    "comments" "text",
    "install" boolean DEFAULT false NOT NULL,
    "delivery_type" "text",
    "order_type" "text",
    "counter_by" "text",
    "counter_top" "text",
    "counter_color" "text",
    "counter_type" "text",
    "shipping_client_name" "text",
    "shipping_street" "text",
    "shipping_city" "text",
    "shipping_province" "text",
    "shipping_zip" "text",
    "shipping_phone_1" "text",
    "shipping_phone_2" "text",
    "shipping_email_1" "text",
    "shipping_email_2" "text",
    "layout_date" timestamp with time zone,
    "client_meeting_date" timestamp with time zone,
    "follow_up_date" timestamp with time zone,
    "appliance_specs_date" timestamp with time zone,
    "selections_date" timestamp with time zone,
    "flooring_type" "text",
    "flooring_clearance" "text",
    "markout_date" timestamp with time zone,
    "review_date" timestamp with time zone,
    "second_markout_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invoice_balance" numeric GENERATED ALWAYS AS (("total" - "deposit")) STORED
);


ALTER TABLE "public"."sales_orders" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sales_orders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sales_orders_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sales_orders_id_seq" OWNED BY "public"."sales_orders"."id";



CREATE TABLE IF NOT EXISTS "public"."service_order_parts" (
    "id" bigint NOT NULL,
    "service_order_id" bigint NOT NULL,
    "qty" integer DEFAULT 1 NOT NULL,
    "part" "text" NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."service_order_parts" OWNER TO "postgres";


ALTER TABLE "public"."service_order_parts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."service_order_parts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."service_orders" (
    "service_order_id" bigint NOT NULL,
    "job_id" bigint NOT NULL,
    "service_order_number" "text" NOT NULL,
    "date_entered" timestamp with time zone DEFAULT "now"() NOT NULL,
    "due_date" "date",
    "completed_at" timestamp with time zone,
    "installer_id" integer,
    "service_type" "text",
    "service_by" "text",
    "hours_estimated" integer,
    "comments" "text",
    "service_type_detail" "text",
    "service_by_detail" "text",
    "chargeable" boolean DEFAULT false
);


ALTER TABLE "public"."service_orders" OWNER TO "postgres";


ALTER TABLE "public"."service_orders" ALTER COLUMN "service_order_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."service_orders_service_order_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."species" (
    "Id" bigint NOT NULL,
    "Species" "text",
    "Prefinished" boolean DEFAULT false
);


ALTER TABLE "public"."species" OWNER TO "postgres";


COMMENT ON TABLE "public"."species" IS 'All Species';



ALTER TABLE "public"."species" ALTER COLUMN "Id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."species_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."cabinets" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."cabinets_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."client" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."client_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."jobs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."jobs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sales_orders" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sales_orders_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."cabinets"
    ADD CONSTRAINT "cabinets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client"
    ADD CONSTRAINT "client_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."colors"
    ADD CONSTRAINT "colors_pkey" PRIMARY KEY ("Id");



ALTER TABLE ONLY "public"."door_styles"
    ADD CONSTRAINT "door_styles_model_key" UNIQUE ("model");



ALTER TABLE ONLY "public"."door_styles"
    ADD CONSTRAINT "door_styles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."installation"
    ADD CONSTRAINT "installation_pkey" PRIMARY KEY ("installation_id");



ALTER TABLE ONLY "public"."installers"
    ADD CONSTRAINT "installers_pkey" PRIMARY KEY ("installer_id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("invoice_id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_installation_id_key" UNIQUE ("installation_id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_job_number_key" UNIQUE ("job_number");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."production_schedule"
    ADD CONSTRAINT "production_schedule_Id_key" UNIQUE ("prod_id");



ALTER TABLE ONLY "public"."production_schedule"
    ADD CONSTRAINT "production_schedule_pkey" PRIMARY KEY ("prod_id");



ALTER TABLE ONLY "public"."purchase_tracking"
    ADD CONSTRAINT "purchase_tracking_job_id_key" UNIQUE ("job_id");



ALTER TABLE ONLY "public"."purchase_tracking"
    ADD CONSTRAINT "purchase_tracking_pkey" PRIMARY KEY ("purchase_check_id");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_sales_order_number_key" UNIQUE ("sales_order_number");



ALTER TABLE ONLY "public"."service_order_parts"
    ADD CONSTRAINT "service_order_parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_orders"
    ADD CONSTRAINT "service_orders_pkey" PRIMARY KEY ("service_order_id");



ALTER TABLE ONLY "public"."service_orders"
    ADD CONSTRAINT "service_orders_service_order_number_key" UNIQUE ("service_order_number");



ALTER TABLE ONLY "public"."species"
    ADD CONSTRAINT "species_Id_key" UNIQUE ("Id");



ALTER TABLE ONLY "public"."species"
    ADD CONSTRAINT "species_pkey" PRIMARY KEY ("Id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "uq_jobs_sales_order_id" UNIQUE ("sales_order_id");



CREATE INDEX "idx_jobs_base_number" ON "public"."jobs" USING "btree" ("job_base_number");



CREATE INDEX "jobs_job_number_idx" ON "public"."jobs" USING "btree" ("job_number");



CREATE INDEX "sales_orders_client_id_idx" ON "public"."sales_orders" USING "btree" ("client_id");



CREATE OR REPLACE TRIGGER "create_production_link" AFTER INSERT ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."create_production_schedule_for_new_job"();



CREATE OR REPLACE TRIGGER "on_client_updated" BEFORE UPDATE ON "public"."client" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_job_created_create_purchasing" AFTER INSERT ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_job_purchasing"();



CREATE OR REPLACE TRIGGER "sales_order_number_trigger" BEFORE INSERT ON "public"."sales_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_sales_order_number"();



CREATE OR REPLACE TRIGGER "set_production_schedule_updated_at" BEFORE UPDATE ON "public"."production_schedule" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_create_installation_record" AFTER INSERT ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_job_installation"();



ALTER TABLE ONLY "public"."cabinets"
    ADD CONSTRAINT "fk_cabinets_colors" FOREIGN KEY ("color_id") REFERENCES "public"."colors"("Id");



ALTER TABLE ONLY "public"."cabinets"
    ADD CONSTRAINT "fk_cabinets_door_styles" FOREIGN KEY ("door_style_id") REFERENCES "public"."door_styles"("id");



ALTER TABLE ONLY "public"."cabinets"
    ADD CONSTRAINT "fk_cabinets_species" FOREIGN KEY ("species_id") REFERENCES "public"."species"("Id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "fk_installation_id" FOREIGN KEY ("installation_id") REFERENCES "public"."installation"("installation_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."installation"
    ADD CONSTRAINT "fk_installer" FOREIGN KEY ("installer_id") REFERENCES "public"."installers"("installer_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "fk_jobs_sales_order_id" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_prod_id_fkey" FOREIGN KEY ("prod_id") REFERENCES "public"."production_schedule"("prod_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchase_tracking"
    ADD CONSTRAINT "purchase_tracking_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "public"."cabinets"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."service_order_parts"
    ADD CONSTRAINT "service_order_parts_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("service_order_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_orders"
    ADD CONSTRAINT "service_orders_installer_id_fkey" FOREIGN KEY ("installer_id") REFERENCES "public"."installers"("installer_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_orders"
    ADD CONSTRAINT "service_orders_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



CREATE POLICY "Allow INSERT for Admins and Designers on Cabinets" ON "public"."cabinets" FOR INSERT WITH CHECK ((("public"."clerk_user_role"() = 'admin'::"text") OR ("public"."clerk_user_role"() = 'designer'::"text")));



CREATE POLICY "Allow INSERT for Admins and Designers on Client" ON "public"."client" FOR INSERT WITH CHECK ((("public"."clerk_user_role"() = 'admin'::"text") OR ("public"."clerk_user_role"() = 'designer'::"text")));



CREATE POLICY "Allow INSERT for Admins and Designers on Jobs" ON "public"."jobs" FOR INSERT WITH CHECK ((("public"."clerk_user_role"() = 'admin'::"text") OR ("public"."clerk_user_role"() = 'designer'::"text")));



CREATE POLICY "Allow INSERT for Admins and Designers on Sales Orders" ON "public"."sales_orders" FOR INSERT WITH CHECK ((("public"."clerk_user_role"() = 'admin'::"text") OR ("public"."clerk_user_role"() = 'designer'::"text")));



CREATE POLICY "Allow SELECT for Admins and Designers on Cabinets" ON "public"."cabinets" FOR SELECT USING ((("public"."clerk_user_role"() = 'admin'::"text") OR ("public"."clerk_user_role"() = 'designer'::"text")));



CREATE POLICY "Allow SELECT for Admins and Designers on Client" ON "public"."client" FOR SELECT USING ((("public"."clerk_user_role"() = 'admin'::"text") OR ("public"."clerk_user_role"() = 'designer'::"text")));



CREATE POLICY "Allow SELECT for Admins and Designers on Jobs" ON "public"."jobs" FOR SELECT USING ((("public"."clerk_user_role"() = 'admin'::"text") OR ("public"."clerk_user_role"() = 'designer'::"text")));



CREATE POLICY "Allow SELECT for Admins and Designers on Sales Orders" ON "public"."sales_orders" FOR SELECT USING ((("public"."clerk_user_role"() = 'admin'::"text") OR ("public"."clerk_user_role"() = 'designer'::"text")));



CREATE POLICY "Allow UPDATE for Admins and Designers on Cabinets" ON "public"."cabinets" FOR UPDATE USING ((("public"."clerk_user_role"() = 'admin'::"text") OR ("public"."clerk_user_role"() = 'designer'::"text"))) WITH CHECK ((("public"."clerk_user_role"() = 'admin'::"text") OR ("public"."clerk_user_role"() = 'designer'::"text")));



CREATE POLICY "Allow UPDATE for Admins and Designers on Client" ON "public"."client" FOR UPDATE USING ((("public"."clerk_user_role"() = 'admin'::"text") OR ("public"."clerk_user_role"() = 'designer'::"text"))) WITH CHECK ((("public"."clerk_user_role"() = 'admin'::"text") OR ("public"."clerk_user_role"() = 'designer'::"text")));



CREATE POLICY "Allow UPDATE for Admins and Designers on Jobs" ON "public"."jobs" FOR UPDATE USING ((("public"."clerk_user_role"() = 'admin'::"text") OR ("public"."clerk_user_role"() = 'designer'::"text"))) WITH CHECK ((("public"."clerk_user_role"() = 'admin'::"text") OR ("public"."clerk_user_role"() = 'designer'::"text")));



CREATE POLICY "Allow UPDATE for Admins and Designers on Sales Orders" ON "public"."sales_orders" FOR UPDATE USING ((("public"."clerk_user_role"() = 'admin'::"text") OR ("public"."clerk_user_role"() = 'designer'::"text"))) WITH CHECK ((("public"."clerk_user_role"() = 'admin'::"text") OR ("public"."clerk_user_role"() = 'designer'::"text")));



ALTER TABLE "public"."cabinets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_orders" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."clerk_uid"() TO "anon";
GRANT ALL ON FUNCTION "public"."clerk_uid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clerk_uid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."clerk_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."clerk_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clerk_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_master_order_transaction"("p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_master_order_transaction"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_master_order_transaction"("p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_production_schedule_for_new_job"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_production_schedule_for_new_job"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_production_schedule_for_new_job"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_next_sales_order_number"("p_stage" "public"."SalesStage") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_next_sales_order_number"("p_stage" "public"."SalesStage") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_next_sales_order_number"("p_stage" "public"."SalesStage") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_job_installation"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_job_installation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_job_installation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_job_purchasing"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_job_purchasing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_job_purchasing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_sales_order_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_sales_order_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_sales_order_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "service_role";


















GRANT ALL ON TABLE "public"."cabinets" TO "anon";
GRANT ALL ON TABLE "public"."cabinets" TO "authenticated";
GRANT ALL ON TABLE "public"."cabinets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cabinets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cabinets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cabinets_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."client" TO "anon";
GRANT ALL ON TABLE "public"."client" TO "authenticated";
GRANT ALL ON TABLE "public"."client" TO "service_role";



GRANT ALL ON SEQUENCE "public"."client_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."client_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."client_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."colors" TO "anon";
GRANT ALL ON TABLE "public"."colors" TO "authenticated";
GRANT ALL ON TABLE "public"."colors" TO "service_role";



GRANT ALL ON SEQUENCE "public"."colors_Id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."colors_Id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."colors_Id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."debug_auth" TO "anon";
GRANT ALL ON TABLE "public"."debug_auth" TO "authenticated";
GRANT ALL ON TABLE "public"."debug_auth" TO "service_role";
GRANT SELECT ON TABLE "public"."debug_auth" TO PUBLIC;



GRANT ALL ON TABLE "public"."door_styles" TO "anon";
GRANT ALL ON TABLE "public"."door_styles" TO "authenticated";
GRANT ALL ON TABLE "public"."door_styles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."door_styles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."door_styles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."door_styles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."installation" TO "anon";
GRANT ALL ON TABLE "public"."installation" TO "authenticated";
GRANT ALL ON TABLE "public"."installation" TO "service_role";



GRANT ALL ON SEQUENCE "public"."installation_installation_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."installation_installation_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."installation_installation_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."installers" TO "anon";
GRANT ALL ON TABLE "public"."installers" TO "authenticated";
GRANT ALL ON TABLE "public"."installers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."installers_installer_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."installers_installer_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."installers_installer_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."invoices_invoice_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."invoices_invoice_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."invoices_invoice_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."job_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."job_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."job_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."jobs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."jobs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."jobs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."production_schedule" TO "anon";
GRANT ALL ON TABLE "public"."production_schedule" TO "authenticated";
GRANT ALL ON TABLE "public"."production_schedule" TO "service_role";



GRANT ALL ON SEQUENCE "public"."production_schedule_Id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."production_schedule_Id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."production_schedule_Id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_tracking" TO "anon";
GRANT ALL ON TABLE "public"."purchase_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_tracking" TO "service_role";



GRANT ALL ON SEQUENCE "public"."purchase_tracking_purchase_check_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchase_tracking_purchase_check_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchase_tracking_purchase_check_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sales_order_sequence" TO "anon";
GRANT ALL ON SEQUENCE "public"."sales_order_sequence" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sales_order_sequence" TO "service_role";



GRANT ALL ON TABLE "public"."sales_orders" TO "anon";
GRANT ALL ON TABLE "public"."sales_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sales_orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sales_orders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sales_orders_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."service_order_parts" TO "anon";
GRANT ALL ON TABLE "public"."service_order_parts" TO "authenticated";
GRANT ALL ON TABLE "public"."service_order_parts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."service_order_parts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."service_order_parts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."service_order_parts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."service_orders" TO "anon";
GRANT ALL ON TABLE "public"."service_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."service_orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."service_orders_service_order_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."service_orders_service_order_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."service_orders_service_order_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."species" TO "anon";
GRANT ALL ON TABLE "public"."species" TO "authenticated";
GRANT ALL ON TABLE "public"."species" TO "service_role";



GRANT ALL ON SEQUENCE "public"."species_Id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."species_Id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."species_Id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


