-- Prevent future public-schema functions created by the application migration
-- role from inheriting broad client EXECUTE privileges. Current routine grants
-- remain governed by 20260907224500_least_privilege_security_definer_grants.sql.
--
-- This migration is forward-only and changes default privileges only. It does
-- not change existing functions, tables, rows, RLS policies, buckets, storage
-- objects, auth users, extensions, or application data. Production execution
-- requires a separate, explicitly approved maintenance window.

BEGIN;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- Abort instead of recording a migration whose application-role defaults still
-- expose future functions to browser-facing roles. Preserve the service-role
-- default required by Lovable's privileged backend runtime.
DO $verify_application_function_defaults$
DECLARE
  unexpected_client_defaults text;
  service_role_default_present boolean;
BEGIN
  SELECT string_agg(
    CASE
      WHEN acl.grantee = 0 THEN 'PUBLIC'
      ELSE pg_catalog.pg_get_userbyid(acl.grantee)
    END,
    ', ' ORDER BY
      CASE
        WHEN acl.grantee = 0 THEN 'PUBLIC'
        ELSE pg_catalog.pg_get_userbyid(acl.grantee)
      END
  )
    INTO unexpected_client_defaults
  FROM pg_catalog.pg_default_acl default_acl
  JOIN pg_catalog.pg_namespace namespace
    ON namespace.oid = default_acl.defaclnamespace
  CROSS JOIN LATERAL pg_catalog.aclexplode(default_acl.defaclacl) acl
  WHERE default_acl.defaclrole = (
      SELECT migration_role.oid
      FROM pg_catalog.pg_roles migration_role
      WHERE migration_role.rolname = current_user
    )
    AND namespace.nspname = 'public'
    AND default_acl.defaclobjtype = 'f'
    AND acl.privilege_type = 'EXECUTE'
    AND (
      acl.grantee = 0
      OR pg_catalog.pg_get_userbyid(acl.grantee) IN ('anon', 'authenticated')
    );

  IF unexpected_client_defaults IS NOT NULL THEN
    RAISE EXCEPTION
      'Unexpected application function default EXECUTE privileges remain: %',
      unexpected_client_defaults;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_default_acl default_acl
    JOIN pg_catalog.pg_namespace namespace
      ON namespace.oid = default_acl.defaclnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(default_acl.defaclacl) acl
    JOIN pg_catalog.pg_roles grantee ON grantee.oid = acl.grantee
    WHERE default_acl.defaclrole = (
        SELECT migration_role.oid
        FROM pg_catalog.pg_roles migration_role
        WHERE migration_role.rolname = current_user
      )
      AND namespace.nspname = 'public'
      AND default_acl.defaclobjtype = 'f'
      AND grantee.rolname = 'service_role'
      AND acl.privilege_type = 'EXECUTE'
  ) INTO service_role_default_present;

  IF NOT service_role_default_present THEN
    RAISE EXCEPTION
      'Application function default EXECUTE is missing for service_role';
  END IF;
END;
$verify_application_function_defaults$;

COMMIT;
