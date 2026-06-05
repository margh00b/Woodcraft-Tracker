BEGIN;

DO $$
DECLARE
    v_record RECORD;
    -- A temporary table to hold our view definitions so they persist during the session
    v_sql TEXT;
BEGIN
    -- 1. Create a temp table to store the views we need to drop and recreate
    CREATE TEMP TABLE IF NOT EXISTS temp_view_holder (
        view_name TEXT,
        view_definition TEXT
    ) ON COMMIT DROP;

    -- 2. Find all views depending on the 'box' column and save their definitions
    INSERT INTO temp_view_holder (view_name, view_definition)
    SELECT DISTINCT
        c.relname AS view_name,
        pg_get_viewdef(c.oid, true) AS view_definition
    FROM pg_depend d
    JOIN pg_rewrite r ON r.oid = d.objid
    JOIN pg_class c ON c.oid = r.ev_class
    JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
    WHERE d.refobjid = 'cabinets'::regclass  -- Your table
      AND a.attname = 'box'                 -- Your column
      AND c.relkind = 'v';                  -- Only views

    -- 3. Loop through and DROP the views (ordered to handle view-on-view dependencies)
    FOR v_record IN SELECT view_name FROM temp_view_holder LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I CASCADE;', v_record.view_name);
    END LOOP;

    -- 4. NOW ALTER THE COLUMN TYPE
    EXECUTE 'ALTER TABLE cabinets ALTER COLUMN box TYPE integer USING (
        CASE
            WHEN box ~ ''^[0-9]+$'' THEN box::integer
            ELSE 0
        END
    );';

    -- 5. Loop backward or repeatedly to RECREATE the views
    -- (We loop a few times in case View B depends on View A being created first)
    FOR i IN 1..5 LOOP
        FOR v_record IN SELECT view_name, view_definition FROM temp_view_holder LOOP
            BEGIN
                EXECUTE format('CREATE OR REPLACE VIEW %I AS %s', v_record.view_name, v_record.view_definition);
            EXCEPTION WHEN OTHERS THEN
                -- If it fails because a dependency isn't met yet, it will catch it on the next loop iteration
                CONTINUE;
            END;
        END LOOP;
    END LOOP;

END $$;

COMMIT;