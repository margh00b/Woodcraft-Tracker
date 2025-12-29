DROP VIEW IF EXISTS sales_table_view;

CREATE VIEW sales_table_view AS
SELECT
  so.id,
  so.sales_order_number,
  so.stage,
  so.total,
  so.deposit,
  so.invoice_balance,
  so.designer,
  so.created_at,
  so.shipping_client_name,
  so.shipping_street,
  so.shipping_city,
  so.shipping_province,
  so.shipping_zip,
  j.job_number,
  j.id as job_id,
  ps.ship_schedule
FROM public.sales_orders so
LEFT JOIN public.jobs j ON so.id = j.sales_order_id
LEFT JOIN public.production_schedule ps ON j.prod_id = ps.prod_id
WHERE (j.is_active = true OR j.id IS NULL);