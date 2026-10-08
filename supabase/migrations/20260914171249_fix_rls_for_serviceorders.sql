DROP POLICY IF EXISTS "Enable delete for admin and service" ON public.service_orders;

CREATE POLICY "Enable delete for admin and service" ON public.service_orders FOR DELETE USING (
    public.clerk_user_role () IN ('admin', 'service', 'installation')
);

DROP POLICY IF EXISTS "Enable delete for admin and service" ON public.service_order_parts;

CREATE POLICY "Enable delete for admin and service" ON public.service_order_parts FOR DELETE USING (
    public.clerk_user_role () IN ('admin', 'service', 'installation')
);