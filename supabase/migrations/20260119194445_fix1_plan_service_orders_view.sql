alter table public.service_order_parts
add column if not exists part_due_date date;

create
or replace view plant_service_orders_view as
select
    so.service_order_id,
    so.service_order_number,
    so.due_date,
    so.job_id,
    j.job_number,
    s.project_name,
    s.shipping_client_name as client_name,
    s.shipping_street,
    s.shipping_city,
    s.shipping_province,
    s.shipping_zip,
    (
        select
            count(*)
        from
            service_order_parts sop
        where
            sop.service_order_id = so.service_order_id
            and sop.status = 'pending'
    ) as pending_parts_count,
    (
        select
            jsonb_agg (
                jsonb_build_object (
                    'id',
                    sop.id,
                    'part',
                    sop.part,
                    'description',
                    sop.description,
                    'qty',
                    sop.qty,
                    'location',
                    sop.location,
                    'status',
                    sop.status,
                    'part_due_date',
                    sop.part_due_date
                )
            )
        from
            service_order_parts sop
        where
            sop.service_order_id = so.service_order_id
            and sop.status = 'pending'
    ) as pending_parts
from
    service_orders so
    join jobs j on so.job_id = j.id
    left join sales_orders s on j.sales_order_id = s.id
where
    exists (
        select
            1
        from
            service_order_parts sop
        where
            sop.service_order_id = so.service_order_id
            and sop.status = 'pending'
    );