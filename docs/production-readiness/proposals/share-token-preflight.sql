-- READ-ONLY catalog inventory. No application rows, link tokens or secrets.
-- Operator must first identify the specifically authorized isolated staging project.
BEGIN READ ONLY;
SELECT current_database() AS database_name, current_user AS operator, now() AS observed_at;
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity, pg_get_userbyid(c.relowner) AS owner
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('share_tokens','pathway_reports');
SELECT rolname, rolsuper, rolinherit, rolbypassrls FROM pg_catalog.pg_roles
WHERE rolname IN ('anon','authenticated','service_role');
SELECT member.rolname AS member, granted.rolname AS granted_role, m.admin_option
FROM pg_catalog.pg_auth_members m
JOIN pg_catalog.pg_roles member ON member.oid=m.member
JOIN pg_catalog.pg_roles granted ON granted.oid=m.roleid
WHERE member.rolname IN ('anon','authenticated','service_role');
SELECT a.attname, pg_catalog.format_type(a.atttypid,a.atttypmod) AS type,
  pg_catalog.has_column_privilege('authenticated',a.attrelid,a.attname,'UPDATE') AS auth_update,
  pg_catalog.has_column_privilege('anon',a.attrelid,a.attname,'UPDATE') AS anon_update
FROM pg_catalog.pg_attribute a WHERE a.attrelid='public.share_tokens'::regclass
AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum;
SELECT actor, has_table_privilege(actor,'public.share_tokens','SELECT') AS can_select,
  has_table_privilege(actor,'public.share_tokens','INSERT') AS can_insert,
  has_table_privilege(actor,'public.share_tokens','UPDATE') AS table_update,
  has_table_privilege(actor,'public.share_tokens','DELETE') AS can_delete
FROM (VALUES ('anon'),('authenticated'),('service_role')) AS roles(actor);
SELECT tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_catalog.pg_policies
WHERE schemaname='public' AND tablename IN ('share_tokens','pathway_reports')
ORDER BY tablename,policyname;
SELECT p.oid::regprocedure AS signature, p.prosecdef, p.proconfig, md5(p.prosrc) AS body_md5,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('resolve_share_token','track_share_view')
ORDER BY p.oid::regprocedure::text;
COMMIT;
