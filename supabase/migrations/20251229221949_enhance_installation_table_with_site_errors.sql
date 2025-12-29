alter table public.installation
add column site_changes timestamptz,
add column site_changes_detail text;