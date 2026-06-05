DROP VIEW IF EXISTS installation_table_view;

CREATE
OR REPLACE VIEW installation_table_view AS
SELECT
    j.id AS job_id,
    j.job_number,
    j.sales_order_id,
    j.prod_id,
    so.created_at,
    so.shipping_client_name,
    so.project_name,
    CONCAT_WS (
        ', ',
        so.shipping_street,
        so.shipping_city,
        so.shipping_province
    ) AS site_address,
    so.is_cod,
    so.payment_received,
    c.box AS box,
    col."Name" AS cabinet_color,
    i.installation_id,
    i.installation_date,
    i.wrap_date,
    i.inspection_date,
    i.has_shipped,
    i.partially_shipped,
    i.installation_completed,
    i.inspection_completed,
    i.installer_id,
    ins.company_name AS installer_company,
    ins.first_name AS installer_first_name,
    ins.last_name AS installer_last_name,
    ps.rush,
    ps.ship_schedule,
    ps.ship_status,
    ps.placement_date
FROM
    jobs j
    JOIN sales_orders so ON j.sales_order_id = so.id
    JOIN installation i ON j.installation_id = i.installation_id
    LEFT JOIN cabinets c ON so.cabinet_id = c.id
    LEFT JOIN colors col ON c.color_id = col."Id"
    LEFT JOIN installers ins ON i.installer_id = ins.installer_id
    LEFT JOIN production_schedule ps ON j.prod_id = ps.prod_id
WHERE
    j.is_active = true;