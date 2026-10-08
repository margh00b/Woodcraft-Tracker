CREATE
OR REPLACE VIEW job_status_report_view AS
SELECT
    j.id AS job_id,
    j.job_number,
    so.shipping_client_name,
    so.shipping_street,
    so.shipping_city,
    so.shipping_zip,
    ps.ship_schedule,
    i.installation_date,
    i.installation_completed,
    i.has_shipped,
    i.inspection_date,
    i.inspection_completed,
    COUNT(s.service_order_id) AS service_order_count
FROM
    jobs j
    JOIN sales_orders so ON j.sales_order_id = so.id
    JOIN production_schedule ps ON j.prod_id = ps.prod_id
    JOIN installation i ON j.installation_id = i.installation_id
    LEFT JOIN service_orders s ON j.id = s.job_id
WHERE
    COALESCE(so.is_memo, false) = false
    AND COALESCE(j.job_suffix, '') NOT ILIKE '%X%'
    AND j.job_number NOT ILIKE '%m%'
GROUP BY
    j.id,
    j.job_number,
    so.shipping_client_name,
    so.shipping_street,
    so.shipping_city,
    so.shipping_zip,
    ps.ship_schedule,
    i.installation_date,
    i.installation_completed,
    i.has_shipped,
    i.inspection_date,
    i.inspection_completed;