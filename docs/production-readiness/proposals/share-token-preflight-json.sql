-- READ-ONLY catalog/ledger metadata only; no application rows or secret values.
-- Target must be verified as isolated staging qgrertkqbwanerqqemph in the UI.
BEGIN READ ONLY;
SELECT jsonb_build_object(
  'read_only', current_setting('transaction_read_only'),
  'observed_at', now(),
  'operator', current_user,
  'tables', (SELECT jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity,
    'force_rls',c.relforcerowsecurity,'owner',pg_get_userbyid(c.relowner)))
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('share_tokens','pathway_reports')),
  'roles', (SELECT jsonb_agg(jsonb_build_object('name',rolname,'superuser',rolsuper,
    'bypass_rls',rolbypassrls,'inherit',rolinherit)) FROM pg_catalog.pg_roles
    WHERE rolname IN ('anon','authenticated','service_role')),
  'memberships', (SELECT jsonb_agg(jsonb_build_object('member',member.rolname,'role',granted.rolname))
    FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles member ON member.oid=m.member
    JOIN pg_catalog.pg_roles granted ON granted.oid=m.roleid
    WHERE member.rolname IN ('anon','authenticated','service_role')),
  'columns', (SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',pg_catalog.format_type(a.atttypid,a.atttypmod),
    'auth_update',has_column_privilege('authenticated',a.attrelid,a.attname,'UPDATE'),
    'anon_update',has_column_privilege('anon',a.attrelid,a.attname,'UPDATE')) ORDER BY a.attnum)
    FROM pg_catalog.pg_attribute a WHERE a.attrelid='public.share_tokens'::regclass AND a.attnum>0 AND NOT a.attisdropped),
  'table_grants', (SELECT jsonb_agg(jsonb_build_object('role',actor,
    'select',has_table_privilege(actor,'public.share_tokens','SELECT'),
    'insert',has_table_privilege(actor,'public.share_tokens','INSERT'),
    'update',has_table_privilege(actor,'public.share_tokens','UPDATE'),
    'delete',has_table_privilege(actor,'public.share_tokens','DELETE')))
    FROM (VALUES ('anon'),('authenticated'),('service_role')) AS roles(actor)),
  'policies', (SELECT jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'permissive',permissive,
    'roles',roles,'command',cmd,'using',qual,'check',with_check) ORDER BY tablename,policyname)
    FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename IN ('share_tokens','pathway_reports')),
  'routines', (SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definer',p.prosecdef,
    'config',p.proconfig,'body_md5',md5(p.prosrc),
    'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
    'auth_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
    'service_execute',has_function_privilege('service_role',p.oid,'EXECUTE')) ORDER BY p.oid::regprocedure::text)
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('resolve_share_token','track_share_view')),
  'ledger', (SELECT jsonb_agg(jsonb_build_object('version',version,'name',name,
    'statements_md5',md5(array_to_string(statements,E'\n'))) ORDER BY version)
    FROM supabase_migrations.schema_migrations
    WHERE version IN ('20260715152133','20261006180000','20261012190000'))
) AS staging_share_preflight;
COMMIT;
