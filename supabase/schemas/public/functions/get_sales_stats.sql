
CREATE OR REPLACE FUNCTION public.get_sales_stats(
  p_filters JSONB DEFAULT '[]'::JSONB
)
RETURNS TABLE (
  "ALL" BIGINT,
  "QUOTE" BIGINT,
  "SOLD" BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH filters AS (
    SELECT
      MAX(value #>> '{}') FILTER (
        WHERE id = 'job_number'
      ) AS job_number,

      MAX(value #>> '{}') FILTER (
        WHERE id = 'clientlastName'
      ) AS client_name,

      MAX(value #>> '{}') FILTER (
        WHERE id = 'projectName'
      ) AS project_name,

      MAX(value #>> '{}') FILTER (
        WHERE id = 'designerName'
      ) AS designer_name,

      MAX(value #>> '{}') FILTER (
        WHERE id = 'my_jobs'
      ) AS my_jobs,

      MAX(value #>> '{}') FILTER (
        WHERE id = 'site_address'
      ) AS site_address,

      MAX(value ->> 0) FILTER (
        WHERE id = 'ship_schedule'
      ) AS start_ship,

      MAX(value ->> 1) FILTER (
        WHERE id = 'ship_schedule'
      ) AS end_ship,

      MAX(value ->> 0) FILTER (
        WHERE id = 'created_at'
      ) AS start_create,

      MAX(value ->> 1) FILTER (
        WHERE id = 'created_at'
      ) AS end_create

    FROM jsonb_to_recordset(
      COALESCE(p_filters, '[]'::JSONB)
    ) AS f(id TEXT, value JSONB)
  )

  SELECT
    COUNT(*) AS "ALL",

    COUNT(*) FILTER (
      WHERE s.stage = 'QUOTE'
    ) AS "QUOTE",

    COUNT(*) FILTER (
      WHERE s.stage = 'SOLD'
    ) AS "SOLD"

  FROM public.sales_table_view s
  CROSS JOIN filters f

  WHERE
    (
      NULLIF(f.job_number, '') IS NULL
      OR s.job_number ILIKE '%' || f.job_number || '%'
    )

    AND (
      NULLIF(f.client_name, '') IS NULL
      OR s.shipping_client_name ILIKE '%' || f.client_name || '%'
    )

    AND (
      NULLIF(f.project_name, '') IS NULL
      OR s.project_name ILIKE '%' || f.project_name || '%'
    )

    AND (
      NULLIF(f.designer_name, '') IS NULL
      OR s.designer ILIKE '%' || f.designer_name || '%'
    )

    AND (
      NULLIF(f.my_jobs, '') IS NULL
      OR s.designer = f.my_jobs
    )

    AND (
      NULLIF(f.site_address, '') IS NULL
      OR s.shipping_street ILIKE '%' || f.site_address || '%'
      OR s.shipping_city ILIKE '%' || f.site_address || '%'
      OR s.shipping_province ILIKE '%' || f.site_address || '%'
      OR s.shipping_zip ILIKE '%' || f.site_address || '%'
    )

    AND (
      f.start_ship IS NULL
      OR s.ship_schedule >= f.start_ship::TIMESTAMPTZ
    )

    AND (
      f.end_ship IS NULL
      OR s.ship_schedule <= f.end_ship::TIMESTAMPTZ
    )

    AND (
      f.start_create IS NULL
      OR s.created_at >= f.start_create::TIMESTAMPTZ
    )

    AND (
      f.end_create IS NULL
      OR s.created_at <= f.end_create::TIMESTAMPTZ
    );
$$;

REVOKE ALL ON FUNCTION public.get_sales_stats(JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_sales_stats(JSONB) TO authenticated;