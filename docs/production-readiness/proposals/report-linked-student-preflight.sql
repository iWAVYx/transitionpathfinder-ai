-- Metadata only. Confirm selected project qgrertkqbwanerqqemph in the management UI first.
-- The expected-project string below is a label, not proof of the actual backend.
BEGIN READ ONLY;
SELECT jsonb_build_object(
 'expected_project_label','qgrertkqbwanerqqemph',
 'operator',current_user,'database',current_database(),
 'read_only',current_setting('transaction_read_only'),'observed_at',now(),
 'ledger',(SELECT jsonb_agg(jsonb_build_object('version',version,'name',name,'statements_md5',md5(array_to_string(statements,''))))
  FROM supabase_migrations.schema_migrations WHERE version IN('20261023020000','20261023030000','20261024010000','20261024020000')),
 'routines',(SELECT jsonb_agg(jsonb_build_object('name',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'config',p.proconfig,'body_md5',md5(p.prosrc),'argument_defaults',p.pronargdefaults,
  'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),'service_execute',has_function_privilege('service_role',p.oid,'EXECUTE')))
  FROM pg_proc p WHERE p.oid IN(to_regprocedure('public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text)'),to_regprocedure('public.save_pathway_report_content_for_student(uuid,uuid,jsonb,jsonb,text)'),to_regprocedure('public.snapshot_report_content_update()'))),
 'tables',(SELECT jsonb_agg(jsonb_build_object('name',c.oid::regclass::text,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity))
  FROM pg_class c WHERE c.oid IN('public.pathway_reports'::regclass,'public.pathway_report_versions'::regclass)),
 'triggers',(SELECT jsonb_agg(jsonb_build_object('name',tgname,'function',tgfoid::regprocedure::text,'enabled',tgenabled,'type',tgtype,'columns',tgattr::text))
  FROM pg_trigger WHERE tgrelid='public.pathway_reports'::regclass AND NOT tgisinternal),
 'client_roles',(SELECT jsonb_agg(jsonb_build_object('role',rolname,'superuser',rolsuper,'bypass_rls',rolbypassrls)) FROM pg_roles WHERE rolname IN('anon','authenticated')),
 'policies',(SELECT jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'roles',roles,'command',cmd,'using',qual,'check',with_check)) FROM pg_policies WHERE schemaname='public' AND tablename IN('pathway_reports','pathway_report_versions'))
) AS linked_student_save_preflight;
COMMIT;
