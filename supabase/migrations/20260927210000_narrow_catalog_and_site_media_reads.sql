-- Replace broad catalog-table reads with reviewed, column-limited RPCs and
-- make the private site-media bucket match the application's signed-URL flow.
--
-- Forward-only. Applying this file requires a separate staging or production
-- database authorization; committing it does not change either database.

BEGIN;

-- -------------------------------------------------------------------------
-- Remove direct client reads. Service-role and owner access remain available
-- for trusted server operations and administrative maintenance.
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can read jurisdictions" ON public.jurisdictions;
DROP POLICY IF EXISTS "Anyone can read active jurisdiction versions"
  ON public.jurisdiction_versions;
DROP POLICY IF EXISTS "Anyone can read agencies of active versions"
  ON public.jurisdiction_agencies;
DROP POLICY IF EXISTS "Anyone can read sources of active versions"
  ON public.jurisdiction_sources;
REVOKE SELECT ON public.jurisdictions FROM PUBLIC, anon, authenticated;
REVOKE SELECT ON public.jurisdiction_versions FROM PUBLIC, anon, authenticated;
REVOKE SELECT ON public.jurisdiction_agencies FROM PUBLIC, anon, authenticated;
REVOKE SELECT ON public.jurisdiction_sources FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "tags public select" ON public.high_school_program_tags;
REVOKE SELECT ON public.high_school_program_tags FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Plan capacities are readable" ON public.plan_capacities;
REVOKE SELECT ON public.plan_capacities FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "pf_categories public select"
  ON public.partnerforward_incentive_categories;
REVOKE SELECT ON public.partnerforward_incentive_categories
  FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Anyone authenticated can read form templates"
  ON public.form_templates;
REVOKE SELECT ON public.form_templates FROM PUBLIC, anon, authenticated;
REVOKE SELECT (
  slug,
  title,
  description,
  audience,
  category,
  schema,
  created_at,
  updated_at
) ON public.form_templates FROM PUBLIC, anon, authenticated;

-- This bucket is private. Public pages receive a server-generated signed URL;
-- they never need SELECT on storage.objects itself.
DROP POLICY IF EXISTS "Public can read site-media" ON storage.objects;

-- The new jurisdiction pack supersedes this row-returning helper, which
-- exposed every column of jurisdiction_versions.
REVOKE EXECUTE ON FUNCTION public.active_jurisdiction_version(text)
  FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------------------
-- Reviewed public catalog surfaces. Each function returns only fields that
-- are intentionally rendered by the product and hides base-table evolution.
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_public_jurisdiction_pack(
  _code text DEFAULT 'US-CT'
)
RETURNS TABLE(
  code text,
  name text,
  version integer,
  effective_from date,
  review_due date,
  terminology jsonb,
  planning_rules jsonb,
  role_labels jsonb,
  privacy_requirements jsonb,
  agencies jsonb,
  sources jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    j.code,
    j.name,
    v.version,
    v.effective_from,
    v.review_due,
    v.terminology,
    v.planning_rules,
    v.role_labels,
    v.privacy_requirements,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', a.name,
            'kind', a.kind,
            'url', a.url,
            'description', a.description
          )
          ORDER BY a.sort_order, a.name
        )
        FROM public.jurisdiction_agencies a
        WHERE a.version_id = v.id
      ),
      '[]'::jsonb
    ) AS agencies,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'title', s.title,
            'url', s.url,
            'publisher', s.publisher,
            'last_verified_at', s.last_verified_at
          )
          ORDER BY s.title
        )
        FROM public.jurisdiction_sources s
        WHERE s.version_id = v.id
      ),
      '[]'::jsonb
    ) AS sources
  FROM public.jurisdictions j
  JOIN public.jurisdiction_versions v
    ON v.jurisdiction_code = j.code
  WHERE j.code = _code
    AND j.status = 'active'
    AND v.status = 'active'
    AND v.effective_from <= current_date
  ORDER BY v.version DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_jurisdiction_pack(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_jurisdiction_pack(text)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_public_high_school_program_tags()
RETURNS TABLE(
  slug text,
  label text,
  category text,
  description text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT t.slug, t.label, t.category, t.description
  FROM public.high_school_program_tags t
  ORDER BY t.category NULLS LAST, t.label;
$$;

REVOKE ALL ON FUNCTION public.list_public_high_school_program_tags()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_high_school_program_tags()
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_public_partnerforward_incentive_categories()
RETURNS TABLE(
  slug text,
  label text,
  description text,
  disclaimer_required boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT c.slug, c.label, c.description, c.disclaimer_required
  FROM public.partnerforward_incentive_categories c
  ORDER BY c.label;
$$;

REVOKE ALL ON FUNCTION public.list_public_partnerforward_incentive_categories()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_partnerforward_incentive_categories()
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_public_plan_capacities()
RETURNS TABLE(
  plan_code text,
  pathway_licenses integer,
  staff_seats integer,
  admin_seats integer,
  max_schools integer,
  family_accounts_per_pathway integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    c.plan_code,
    c.pathway_licenses,
    c.staff_seats,
    c.admin_seats,
    c.max_schools,
    c.family_accounts_per_pathway
  FROM public.plan_capacities c
  JOIN public.plans p ON p.code = c.plan_code
  WHERE p.active
  ORDER BY p.sort_order, c.plan_code;
$$;

REVOKE ALL ON FUNCTION public.list_public_plan_capacities()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_plan_capacities()
  TO anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- Signed-in form templates. The RPCs require a real session and return the
-- same eight reviewed fields without granting clients access to the table.
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_available_form_templates()
RETURNS TABLE(
  slug text,
  title text,
  description text,
  audience text,
  category text,
  schema jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    t.slug,
    t.title,
    t.description,
    t.audience,
    t.category,
    t.schema,
    t.created_at,
    t.updated_at
  FROM public.form_templates t
  WHERE auth.uid() IS NOT NULL
  ORDER BY t.title;
$$;

REVOKE ALL ON FUNCTION public.list_available_form_templates()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_available_form_templates()
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_available_form_template(_slug text)
RETURNS TABLE(
  slug text,
  title text,
  description text,
  audience text,
  category text,
  schema jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    t.slug,
    t.title,
    t.description,
    t.audience,
    t.category,
    t.schema,
    t.created_at,
    t.updated_at
  FROM public.form_templates t
  WHERE auth.uid() IS NOT NULL
    AND t.slug = _slug
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_available_form_template(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_form_template(text)
  TO authenticated, service_role;

-- -------------------------------------------------------------------------
-- Fail closed if the migration ever drifts while being replayed. This checks
-- privileges and policy names only; it does not read application rows.
-- -------------------------------------------------------------------------

DO $verify_publish_gate_alignment$
BEGIN
  IF pg_catalog.has_table_privilege('anon', 'public.jurisdictions', 'SELECT')
     OR pg_catalog.has_table_privilege('authenticated', 'public.jurisdictions', 'SELECT')
     OR pg_catalog.has_table_privilege('anon', 'public.jurisdiction_versions', 'SELECT')
     OR pg_catalog.has_table_privilege('authenticated', 'public.jurisdiction_versions', 'SELECT')
     OR pg_catalog.has_table_privilege('anon', 'public.jurisdiction_agencies', 'SELECT')
     OR pg_catalog.has_table_privilege('authenticated', 'public.jurisdiction_agencies', 'SELECT')
     OR pg_catalog.has_table_privilege('anon', 'public.jurisdiction_sources', 'SELECT')
     OR pg_catalog.has_table_privilege('authenticated', 'public.jurisdiction_sources', 'SELECT')
     OR pg_catalog.has_table_privilege('anon', 'public.high_school_program_tags', 'SELECT')
     OR pg_catalog.has_table_privilege('authenticated', 'public.high_school_program_tags', 'SELECT')
     OR pg_catalog.has_table_privilege('anon', 'public.plan_capacities', 'SELECT')
     OR pg_catalog.has_table_privilege('authenticated', 'public.plan_capacities', 'SELECT')
     OR pg_catalog.has_table_privilege('anon', 'public.partnerforward_incentive_categories', 'SELECT')
     OR pg_catalog.has_table_privilege('authenticated', 'public.partnerforward_incentive_categories', 'SELECT')
     OR pg_catalog.has_table_privilege('anon', 'public.form_templates', 'SELECT')
     OR pg_catalog.has_table_privilege('authenticated', 'public.form_templates', 'SELECT')
     OR pg_catalog.has_any_column_privilege('anon', 'public.form_templates', 'SELECT')
     OR pg_catalog.has_any_column_privilege('authenticated', 'public.form_templates', 'SELECT') THEN
    RAISE EXCEPTION 'Broad catalog SELECT privilege remains after publish-gate alignment';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'storage'
      AND p.tablename = 'objects'
      AND p.policyname = 'Public can read site-media'
  ) THEN
    RAISE EXCEPTION 'Public site-media storage policy remains after alignment';
  END IF;

  IF NOT pg_catalog.has_function_privilege(
      'anon', 'public.get_public_jurisdiction_pack(text)', 'EXECUTE'
    )
    OR NOT pg_catalog.has_function_privilege(
      'anon', 'public.list_public_high_school_program_tags()', 'EXECUTE'
    )
    OR NOT pg_catalog.has_function_privilege(
      'anon', 'public.list_public_partnerforward_incentive_categories()', 'EXECUTE'
    )
    OR NOT pg_catalog.has_function_privilege(
      'anon', 'public.list_public_plan_capacities()', 'EXECUTE'
    )
    OR pg_catalog.has_function_privilege(
      'anon', 'public.list_available_form_templates()', 'EXECUTE'
    )
    OR pg_catalog.has_function_privilege(
      'anon', 'public.get_available_form_template(text)', 'EXECUTE'
    ) THEN
    RAISE EXCEPTION 'Narrow catalog function privilege mismatch';
  END IF;
END;
$verify_publish_gate_alignment$;

COMMIT;
