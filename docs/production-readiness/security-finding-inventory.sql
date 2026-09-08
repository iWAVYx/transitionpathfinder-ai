-- Read-only catalog inventory for the Lovable security-finding alignment.
-- Run only after visually confirming the intended Supabase project. The query
-- returns database metadata, routine permissions, and extension locations; it
-- does not read application rows, auth users, credentials, or secrets.

SELECT
  current_database() AS database_name,
  current_user AS database_user,
  now() AT TIME ZONE 'utc' AS observed_at_utc;

SELECT
  n.nspname AS function_schema,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  p.proconfig AS function_settings,
  EXISTS (
    SELECT 1
    FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
    WHERE acl.grantee = 0
      AND acl.privilege_type = 'EXECUTE'
  ) AS executable_by_public,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS executable_by_anon,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS executable_by_authenticated,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS executable_by_service_role
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef
ORDER BY n.nspname, p.proname, pg_get_function_identity_arguments(p.oid);

SELECT
  e.extname AS extension_name,
  n.nspname AS extension_schema,
  e.extversion AS extension_version
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
ORDER BY e.extname;

SELECT
  has_table_privilege('anon', 'public.resource_sources', 'SELECT')
    AS anon_can_read_resource_source_base_table,
  has_function_privilege('anon', 'public.list_public_resource_sources()', 'EXECUTE')
    AS anon_can_execute_public_resource_listing,
  has_table_privilege('anon', 'public.form_templates', 'SELECT')
    AS anon_can_read_form_templates,
  has_table_privilege('authenticated', 'public.form_templates', 'SELECT')
    AS authenticated_has_table_wide_form_template_select,
  has_function_privilege('anon', 'public.is_partner_only(uuid)', 'EXECUTE')
    AS anon_can_execute_partner_only_helper,
  has_function_privilege('authenticated', 'public.is_partner_only(uuid)', 'EXECUTE')
    AS authenticated_can_execute_partner_only_helper;
