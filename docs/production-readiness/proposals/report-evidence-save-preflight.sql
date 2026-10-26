-- Prepared metadata-only check. Independently confirm isolated staging project
-- qgrertkqbwanerqqemph in the management UI; this string is only a label.
BEGIN READ ONLY;
SELECT jsonb_build_object(
 'expected_project_label','qgrertkqbwanerqqemph',
 'operator',current_user,'database',current_database(),'read_only',current_setting('transaction_read_only'),
 'ledger',(SELECT jsonb_agg(jsonb_build_object('version',version,'name',name,'statements_md5',md5(array_to_string(statements,'')))) FROM supabase_migrations.schema_migrations WHERE version IN('20261024010000','20261026010000')),
 'table',(SELECT jsonb_build_object('owner',pg_get_userbyid(relowner),'rls',relrowsecurity,'force_rls',relforcerowsecurity) FROM pg_class WHERE oid='public.report_evidence_links'::regclass),
 'indexes',(SELECT jsonb_agg(jsonb_build_object('definition',pg_get_indexdef(indexrelid),'valid',indisvalid,'unique',indisunique)) FROM pg_index WHERE indrelid='public.report_evidence_links'::regclass),
 'policies',(SELECT jsonb_agg(jsonb_build_object('name',policyname,'roles',roles,'command',cmd,'using',qual,'check',with_check)) FROM pg_policies WHERE schemaname='public' AND tablename='report_evidence_links'),
 'routines',(SELECT jsonb_agg(jsonb_build_object('name',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'config',p.proconfig,'body_md5',md5(p.prosrc),'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),'service_execute',has_function_privilege('service_role',p.oid,'EXECUTE'))) FROM pg_proc p WHERE p.oid IN(to_regprocedure('public.save_extracted_report_evidence(uuid,text,uuid,text,jsonb)'),to_regprocedure('public.can_edit_student(uuid,uuid)'),to_regprocedure('public.can_access_student(uuid,uuid)')))
) AS evidence_save_preflight;
COMMIT;
