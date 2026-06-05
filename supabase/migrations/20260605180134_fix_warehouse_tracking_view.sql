
CREATE OR REPLACE VIEW public.warehouse_tracking_view AS
SELECT
  -- 1. Unique ID for the view (Pick the first ID found in the group)
  MIN(wt.id) AS id,

  -- 2. Job ID (Useful for the 'Edit' modal to target at least one valid record)
  MIN(wt.job_id) AS job_id,

  -- 3. Job Number Display Logic
  -- If this group contains multiple jobs (e.g. A & B), show the Base Number.
  -- If it contains only 1 job (the distinct variant), show the Full Number.
  CASE 
    WHEN COUNT(*) > 1 THEN j.job_base_number 
    ELSE MAX(j.job_base_number || COALESCE('-' || j.job_suffix, ''))
  END AS job_number,

  -- 4. Aggregates
  MAX(so.shipping_client_name) AS shipping_client_name,
  MAX(CONCAT_WS(', ', so.shipping_street, so.shipping_city, so.shipping_province, so.shipping_zip)) AS shipping_address,

  -- 5. Sum Box Counts
  -- Safely strips non-numeric characters (like " boxes") before summing
  SUM(
    COALESCE(
      NULLIF(REGEXP_REPLACE(c.box::text, '[^0-9]', '', 'g'), ''), 
      '0'
    )::integer
  ) AS box,

  -- 6. Grouping Keys (The "Unique Variant" Logic)
  wt.dropoff_date,
  wt.pickup_date,
  wt.pallets,
  MAX(wt.notes) AS notes,

  -- Extra: Count to help frontend understand if this is a merged row
  COUNT(*) as grouped_count

FROM public.warehouse_tracking wt
LEFT JOIN public.jobs j ON wt.job_id = j.id
LEFT JOIN public.sales_orders so ON j.sales_order_id = so.id
LEFT JOIN public.cabinets c ON so.cabinet_id = c.id

GROUP BY
  j.job_base_number,
  wt.dropoff_date,
  wt.pickup_date,
  wt.pallets;




create
or replace view installation_table_view as
select
    j.id as job_id,
    j.job_number,
    j.sales_order_id,
    j.prod_id,
    so.created_at,
    so.shipping_client_name,
    so.project_name,
    concat_ws (
        ', ',
        so.shipping_street,
        so.shipping_city,
        so.shipping_province
    ) as site_address,
    so.is_cod,
    so.payment_received,
   c.box AS box,
    i.installation_id,
    i.installation_date,
    i.wrap_date,
    i.inspection_date,
    i.has_shipped,
    i.partially_shipped,
    i.installation_completed,
    i.inspection_completed,
    i.installer_id,
    ins.company_name as installer_company,
    ins.first_name as installer_first_name,
    ins.last_name as installer_last_name,
    ps.rush,
    ps.ship_schedule,
    ps.ship_status,
    ps.placement_date
from
    jobs j
    join sales_orders so on j.sales_order_id = so.id
    join installation i on j.installation_id = i.installation_id
    left join cabinets c on so.cabinet_id = c.id
    left join installers ins on i.installer_id = ins.installer_id
    left join production_schedule ps on j.prod_id = ps.prod_id
where
    j.is_active = true;
