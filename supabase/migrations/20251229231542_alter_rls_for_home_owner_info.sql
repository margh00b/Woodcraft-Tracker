ALTER POLICY "Enable insert for sales editors"
ON public.homeowners_info
WITH CHECK (public.clerk_user_role() IN ('admin', 'installation', 'service'));