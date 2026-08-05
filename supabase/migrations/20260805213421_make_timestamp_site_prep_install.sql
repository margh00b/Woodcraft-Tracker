ALTER TABLE public.installation
DROP COLUMN site_prep_install,
ADD COLUMN site_prep_install timestamptz;