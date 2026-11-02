-- Migration: search_results view
-- Replaces search_index as the read layer for /api/search
-- Service role only — never queried client-side
-- No PII exposed: no email, no pin, no ip, no wallet, no phone

CREATE OR REPLACE VIEW public.search_results AS

  -- Active ads
  SELECT
    id::text                                                                    AS id,
    'ad'::text                                                                  AS type,
    title                                                                       AS title,
    brand                                                                       AS subtitle,
    lower(regexp_replace(brand, '\s+', '-', 'g'))                               AS slug,
    '/arena/' || lower(regexp_replace(brand, '\s+', '-', 'g'))                  AS url,
    image_url                                                                   AS image_url,
    coalesce(points, 0)                                                         AS points,
    lower(
      coalesce(title,       '') || ' ' ||
      coalesce(brand,       '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(category,    '')
    )                                                                           AS keywords,
    true                                                                        AS active
  FROM ads
  WHERE status = 'active'

  UNION ALL

  -- Challengers (active + graduated)
  SELECT
    id::text,
    'challenger'::text,
    name,
    coalesce(track, '') || ' · ' || coalesce(country, ''),
    coalesce(brand_slug, lower(regexp_replace(name, '\s+', '-', 'g'))),
    '/office/' || coalesce(handle, intern_id),
    NULL::text,
    coalesce(points, 0),
    lower(
      coalesce(name,       '') || ' ' ||
      coalesce(first_name, '') || ' ' ||
      coalesce(track,      '') || ' ' ||
      coalesce(country,    '') || ' ' ||
      coalesce(brand_slug, '') || ' ' ||
      coalesce(handle,     '') || ' ' ||
      'challenger internship'
    ),
    true
  FROM challengers
  WHERE status IN ('active', 'graduated')
    AND is_deleted IS NOT TRUE

  UNION ALL

  -- Advertisers — name + brand only, no email, no PII
  SELECT
    id::text,
    'advertiser'::text,
    name,
    coalesce(brand_name, name),
    lower(regexp_replace(coalesce(brand_name, name), '\s+', '-', 'g')),
    '/profile/' || lower(regexp_replace(coalesce(brand_name, name), '\s+', '-', 'g')),
    NULL::text,
    coalesce(points, 0),
    lower(
      coalesce(name,       '') || ' ' ||
      coalesce(brand_name, '')
    ),
    true
  FROM ad_signups
  WHERE status IN ('active', 'trial', 'team')
    AND role != 'super';

-- Lock it down — anon cannot touch this view
REVOKE ALL ON public.search_results FROM anon;
REVOKE ALL ON public.search_results FROM authenticated;
GRANT SELECT ON public.search_results TO service_role;
