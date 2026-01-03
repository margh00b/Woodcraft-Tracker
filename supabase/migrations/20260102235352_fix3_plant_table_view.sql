drop view if exists public.plant_table_view;

create or replace view public.plant_table_view as
select
  j.id as job_id,
  j.prod_id,
  j.job_number,
  so.shipping_client_name as client_name,
  so.project_name,
  so.shipping_street,
  so.shipping_city,
  so.shipping_province,
  so.shipping_zip,
  c.box as cabinet_box,
  ds.name as cabinet_door_style,
  s."Species" as cabinet_species,
  col."Name" as cabinet_color,
  i.installation_id,
  i.wrap_date,
  i.wrap_completed,
  i.has_shipped,
  i.installation_completed,
  i.partially_shipped,
  i.installation_notes,
  i.in_warehouse,
  ps.placement_date,
  ps.doors_completed_actual,
  ps.cut_finish_completed_actual,
  ps.custom_finish_completed_actual,
  ps.paint_completed_actual,
  ps.assembly_completed_actual,
  ps.cut_melamine_completed_actual,
  ps.drawer_completed_actual,
  ps.ship_schedule,
  ps.ship_status
from
  public.jobs j
  left join public.sales_orders so on j.sales_order_id = so.id
  left join public.cabinets c on so.cabinet_id = c.id
  left join public.door_styles ds on c.door_style_id = ds.id
  left join public.species s on c.species_id = s."Id"
  left join public.colors col on c.color_id = col."Id"
  join public.installation i on j.installation_id = i.installation_id
  left join public.production_schedule ps on j.prod_id = ps.prod_id
where
  j.is_active = true;