CREATE OR REPLACE VIEW public.accounting_job_report AS
SELECT
    j.id AS job_id,
    j.job_number,

    so.date_sold,
    so.shipping_client_name AS client_name,
    so.shipping_street,
    so.shipping_city,
    so.shipping_province,
    so.shipping_zip,
    so.total AS price,

    ps.ship_schedule,

    ps.cut_melamine_completed_actual,
    ps.cut_finish_completed_actual,
    ps.custom_finish_completed_actual,
    ps.doors_completed_actual,
    ps.drawer_completed_actual,
    ps.paint_completed_actual,
    ps.assembly_completed_actual,

    i.wrap_completed

FROM public.jobs j

LEFT JOIN public.sales_orders so
    ON j.sales_order_id = so.id

LEFT JOIN public.production_schedule ps
    ON j.prod_id = ps.prod_id

JOIN public.installation i
    ON j.installation_id = i.installation_id

WHERE
    j.is_active = true
    AND i.has_shipped = false
    AND (
        ps.cut_melamine_completed_actual IS NOT NULL
        OR ps.cut_finish_completed_actual IS NOT NULL
        OR ps.custom_finish_completed_actual IS NOT NULL
        OR ps.doors_completed_actual IS NOT NULL
        OR ps.drawer_completed_actual IS NOT NULL
        OR ps.paint_completed_actual IS NOT NULL
        OR ps.assembly_completed_actual IS NOT NULL
        OR i.wrap_completed IS NOT NULL
    );

GRANT SELECT ON public.accounting_job_report TO authenticated;
GRANT SELECT ON public.accounting_job_report TO service_role;