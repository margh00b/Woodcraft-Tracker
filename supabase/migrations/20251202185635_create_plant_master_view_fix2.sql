create or replace view plant_master_view as
select
  'JOB'::text as record_type,
  j.id as id,
  j.job_number as display_id,
  so.shipping_client_name as client_name,
  ps.ship_schedule as due_date,
  ps.ship_status::text as status_raw,
  -- FIXED: Use concat_ws to safely join fields with a separator
  concat_ws(' | ', 
    nullif(c.box, ''),       -- converting empty strings to null just in case
    s."Species", 
    cl."Name", 
    ds.name
  ) as description,
  ps.created_at
from jobs j
join production_schedule ps on j.prod_id = ps.prod_id
join sales_orders so on j.sales_order_id = so.id
join cabinets c on so.cabinet_id = c.id
left join species s on c.species_id = s."Id"
left join colors cl on c.color_id = cl."Id"
left join door_styles ds on c.door_style_id = ds.id

union all

select
  'SERVICE'::text as record_type,
  so.service_order_id as id,
  so.service_order_number as display_id,
  sales.shipping_client_name as client_name,
  so.due_date as due_date,
  case 
    when so.completed_at is not null then 'completed' 
    else 'open' 
  end as status_raw,
  so.comments as description,
  so.date_entered as created_at
from service_orders so
join jobs j on so.job_id = j.id
join sales_orders sales on j.sales_order_id = sales.id;