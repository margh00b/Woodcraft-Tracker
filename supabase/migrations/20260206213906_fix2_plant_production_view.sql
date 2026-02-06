DROP VIEW IF EXISTS public.plant_production_view;

CREATE
OR REPLACE VIEW public.plant_production_view AS
SELECT
    j.id as job_id,
    j.prod_id,
    j.job_number,
    ps.placement_date,
    -- Client
    so.shipping_client_name as client_name,
    so.project_name,
    so.shipping_street,
    so.shipping_city,
    so.shipping_province,
    so.shipping_zip,
    -- Requirements
    so.is_canopy_required,
    so.is_woodtop_required,
    so.is_custom_cab_required,
    -- Cabinet Details
    c.box as cabinet_box,
    c.interior as cabinet_interior,
    ds.name as cabinet_door_style,
    s."Species" as cabinet_species,
    col."Name" as cabinet_color,
    -- Installation / Wrap
    i.installation_id,
    i.wrap_date,
    i.wrap_completed,
    i.has_shipped,
    i.installation_notes,
    -- Plant Tracking
    ps.cut_melamine_completed_actual,
    ps.doors_completed_actual,
    ps.panel_completed_actual,
    ps.custom_finish_completed_actual,
    -- Paint Details
    ps.paint_doors_completed_actual,
    ps.paint_canopy_completed_actual,
    ps.paint_cust_cab_completed_actual,
    -- Assembly
    ps.assembly_completed_actual,
    -- Others
    ps.drawer_completed_actual,
    ps.woodtop_completed_actual,
    ps.canopy_completed_actual,
    -- Shipping Schedule
    ps.ship_schedule,
    ps.ship_status
FROM
    public.jobs j
    LEFT JOIN public.sales_orders so ON j.sales_order_id = so.id
    LEFT JOIN public.cabinets c ON so.cabinet_id = c.id
    LEFT JOIN public.door_styles ds ON c.door_style_id = ds.id
    LEFT JOIN public.species s ON c.species_id = s."Id"
    LEFT JOIN public.colors col ON c.color_id = col."Id"
    JOIN public.installation i ON j.installation_id = i.installation_id
    LEFT JOIN public.production_schedule ps ON j.prod_id = ps.prod_id
WHERE
    j.is_active = true;