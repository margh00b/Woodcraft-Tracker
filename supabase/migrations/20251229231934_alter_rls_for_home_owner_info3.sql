ALTER POLICY "Enable update for sales editors"
ON public.homeowners_info
TO public
USING (
  public.clerk_user_role() IN ('admin', 'installation', 'service')
)
WITH CHECK (
  public.clerk_user_role() IN ('admin', 'installation', 'service')
);