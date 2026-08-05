drop view public.service_orders_table_view;

create
or replace view public.service_orders_table_view as
select
    so.service_order_id,
    so.service_order_number,
    so.date_entered,
    so.due_date,
    so.completed_at,
    so.installer_requested,
    j.id as job_id,
    j.job_number,
    j.sales_order_id,
    s.shipping_client_name as client_name,
    s.order_type,
    concat_ws (
        ', ',
        s.shipping_street,
        s.shipping_city,
        s.shipping_province
    ) as site_address,
    i.company_name as installer_company,
    i.first_name as installer_first,
    i.last_name as installer_last
from
    public.service_orders so
    left join public.jobs j on so.job_id = j.id
    left join public.sales_orders s on j.sales_order_id = s.id
    left join public.installers i on so.installer_id = i.installer_id
where
    j.is_active = true;