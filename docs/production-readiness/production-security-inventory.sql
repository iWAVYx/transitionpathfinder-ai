-- SELECT-only production security inventory.
-- Run only after visually confirming the Lovable production project and the
-- established production Supabase ref. This returns configuration metadata;
-- it does not read application rows, auth users, file contents, credentials,
-- tokens, or secret values.

WITH inventory AS (
  SELECT
    'identity'::text AS section,
    current_database()::text AS object_identity,
    jsonb_build_object(
      'database_user', current_user,
      'observed_at_utc', now() AT TIME ZONE 'utc'
    ) AS details

  UNION ALL

  SELECT
    'storage_bucket',
    bucket.id::text,
    jsonb_build_object(
      'name', bucket.name,
      'public', bucket.public,
      'file_size_limit', bucket.file_size_limit,
      'allowed_mime_types', bucket.allowed_mime_types
    )
  FROM storage.buckets bucket
  WHERE bucket.id = 'channel-attachments'

  UNION ALL

  SELECT
    'row_level_security',
    format('%I.%I', namespace.nspname, relation.relname),
    jsonb_build_object(
      'enabled', relation.relrowsecurity,
      'forced', relation.relforcerowsecurity
    )
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE (namespace.nspname, relation.relname) IN (
    ('public', 'channel_attachments'),
    ('public', 'form_templates'),
    ('storage', 'objects')
  )

  UNION ALL

  SELECT
    'policy',
    format('%I.%I:%s', policy.schemaname, policy.tablename, policy.policyname),
    jsonb_build_object(
      'command', policy.cmd,
      'permissive', policy.permissive,
      'roles', policy.roles,
      'using', policy.qual,
      'with_check', policy.with_check
    )
  FROM pg_catalog.pg_policies policy
  WHERE (
      policy.schemaname = 'public'
      AND policy.tablename IN ('channel_attachments', 'form_templates')
    )
    OR (
      policy.schemaname = 'storage'
      AND policy.tablename = 'objects'
    )

  UNION ALL

  SELECT
    'constraint',
    format('%I.%I:%s', namespace.nspname, relation.relname, constraint_row.conname),
    jsonb_build_object(
      'type', constraint_row.contype,
      'definition', pg_catalog.pg_get_constraintdef(constraint_row.oid, true)
    )
  FROM pg_catalog.pg_constraint constraint_row
  JOIN pg_catalog.pg_class relation ON relation.oid = constraint_row.conrelid
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname = 'channel_attachments'

  UNION ALL

  SELECT
    'table_privilege',
    format('%I.%I:%s', grant_row.table_schema, grant_row.table_name, grant_row.grantee),
    jsonb_build_object(
      'privilege', grant_row.privilege_type,
      'grantable', grant_row.is_grantable
    )
  FROM information_schema.role_table_grants grant_row
  WHERE grant_row.table_schema = 'public'
    AND grant_row.table_name IN ('channel_attachments', 'form_templates')
    AND grant_row.grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')

  UNION ALL

  SELECT
    'column_privilege',
    format(
      '%I.%I.%I:%s',
      grant_row.table_schema,
      grant_row.table_name,
      grant_row.column_name,
      grant_row.grantee
    ),
    jsonb_build_object(
      'privilege', grant_row.privilege_type,
      'grantable', grant_row.is_grantable
    )
  FROM information_schema.column_privileges grant_row
  WHERE grant_row.table_schema = 'public'
    AND grant_row.table_name IN ('channel_attachments', 'form_templates')
    AND grant_row.grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')

  UNION ALL

  SELECT
    'security_definer_routine',
    format(
      '%I.%I(%s)',
      namespace.nspname,
      routine.proname,
      pg_catalog.pg_get_function_identity_arguments(routine.oid)
    ),
    jsonb_build_object(
      'owner', pg_catalog.pg_get_userbyid(routine.proowner),
      'search_path', routine.proconfig,
      'public_execute', EXISTS (
        SELECT 1
        FROM pg_catalog.aclexplode(
          coalesce(
            routine.proacl,
            pg_catalog.acldefault('f', routine.proowner)
          )
        ) acl
        WHERE acl.grantee = 0
          AND acl.privilege_type = 'EXECUTE'
      ),
      'anon_execute', pg_catalog.has_function_privilege('anon', routine.oid, 'EXECUTE'),
      'authenticated_execute', pg_catalog.has_function_privilege('authenticated', routine.oid, 'EXECUTE'),
      'service_role_execute', pg_catalog.has_function_privilege('service_role', routine.oid, 'EXECUTE')
    )
  FROM pg_catalog.pg_proc routine
  JOIN pg_catalog.pg_namespace namespace ON namespace.oid = routine.pronamespace
  WHERE namespace.nspname = 'public'
    AND routine.prosecdef

  UNION ALL

  SELECT
    'default_function_privilege',
    format(
      '%s:%s',
      pg_catalog.pg_get_userbyid(default_acl.defaclrole),
      CASE
        WHEN acl.grantee = 0 THEN 'PUBLIC'
        ELSE pg_catalog.pg_get_userbyid(acl.grantee)
      END
    ),
    jsonb_build_object(
      'schema', namespace.nspname,
      'privilege', acl.privilege_type,
      'grantable', acl.is_grantable
    )
  FROM pg_catalog.pg_default_acl default_acl
  JOIN pg_catalog.pg_namespace namespace
    ON namespace.oid = default_acl.defaclnamespace
  CROSS JOIN LATERAL pg_catalog.aclexplode(default_acl.defaclacl) acl
  WHERE namespace.nspname = 'public'
    AND default_acl.defaclobjtype = 'f'
)
SELECT section, object_identity, details
FROM inventory
ORDER BY section, object_identity, details::text;
