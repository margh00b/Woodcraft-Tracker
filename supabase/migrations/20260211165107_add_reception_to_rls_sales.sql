
BEGIN;

-- 2. Update JOBS Table (Insert/Update)
-- Adds 'reception' to the existing sales editors array
DROP POLICY IF EXISTS "Enable insert for sales editors" ON public.jobs;
CREATE POLICY "Enable insert for sales editors" ON public.jobs
FOR INSERT TO public
WITH CHECK (clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text]));

DROP POLICY IF EXISTS "Enable update for sales editors" ON public.jobs;
CREATE POLICY "Enable update for sales editors" ON public.jobs
FOR UPDATE TO public
USING (clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text]));


-- 3. Update SALES_ORDERS Table (Insert/Update)
DROP POLICY IF EXISTS "Enable insert for sales editors" ON public.sales_orders;
CREATE POLICY "Enable insert for sales editors" ON public.sales_orders
FOR INSERT TO public
WITH CHECK (clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text]));

DROP POLICY IF EXISTS "Enable update for sales editors" ON public.sales_orders;
CREATE POLICY "Enable update for sales editors" ON public.sales_orders
FOR UPDATE TO public
USING (clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text]));


-- 4. Update CABINETS Table (Insert/Update)
DROP POLICY IF EXISTS "Enable insert for sales editors" ON public.cabinets;
CREATE POLICY "Enable insert for sales editors" ON public.cabinets
FOR INSERT TO public
WITH CHECK (clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text]));

DROP POLICY IF EXISTS "Enable update for sales editors" ON public.cabinets;
CREATE POLICY "Enable update for sales editors" ON public.cabinets
FOR UPDATE TO public
USING (clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text]));


-- 5. Update SPECIES Table (Insert/Update)
DROP POLICY IF EXISTS "Enable insert for sales editors" ON public.species;
CREATE POLICY "Enable insert for sales editors" ON public.species
FOR INSERT TO public
WITH CHECK (clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text]));

DROP POLICY IF EXISTS "Enable update for sales editors" ON public.species;
CREATE POLICY "Enable update for sales editors" ON public.species
FOR UPDATE TO public
USING (clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text]));


-- 6. Update COLORS Table (Insert/Update)
DROP POLICY IF EXISTS "Enable insert for sales editors" ON public.colors;
CREATE POLICY "Enable insert for sales editors" ON public.colors
FOR INSERT TO public
WITH CHECK (clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text]));

DROP POLICY IF EXISTS "Enable update for sales editors" ON public.colors;
CREATE POLICY "Enable update for sales editors" ON public.colors
FOR UPDATE TO public
USING (clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text]));


-- 7. Update DOOR_STYLES Table (Insert/Update)
DROP POLICY IF EXISTS "Enable insert for sales editors" ON public.door_styles;
CREATE POLICY "Enable insert for sales editors" ON public.door_styles
FOR INSERT TO public
WITH CHECK (clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text]));

DROP POLICY IF EXISTS "Enable update for sales editors" ON public.door_styles;
CREATE POLICY "Enable update for sales editors" ON public.door_styles
FOR UPDATE TO public
USING (clerk_user_role() = ANY (ARRAY['admin'::text, 'designer'::text, 'scheduler'::text, 'reception'::text]));

COMMIT;