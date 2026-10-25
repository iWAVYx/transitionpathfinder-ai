-- Prepared read-only catalog/aggregate verification; no token values or report content.
-- The expected-project label is not identity proof: confirm the selected isolated
-- project qgrertkqbwanerqqemph and both staging health identities independently.
BEGIN READ ONLY;
SELECT jsonb_build_object(
 'expected_project_label','qgrertkqbwanerqqemph','operator',current_user,
 'read_only',current_setting('transaction_read_only'),'observed_at',now(),
 'ledger',(SELECT jsonb_agg(jsonb_build_object('version',version,'name',name,'statements_md5',md5(array_to_string(statements,''))) ORDER BY version) FROM supabase_migrations.schema_migrations WHERE version IN ('20261023010000','20261023030000','20261024010000','20261024020000','20261024030000')),
 'routines',(SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'config',p.proconfig,'body_md5',md5(p.prosrc),'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),'service_execute',has_function_privilege('service_role',p.oid,'EXECUTE')) ORDER BY p.proname) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('resolve_share_token','track_share_view','can_access_student','report_share_is_eligible','bind_report_share_context','revoke_shares_on_report_context_change','close_report_links_after_access_loss','close_report_links_on_student_access_change')),
 'tables',(SELECT jsonb_agg(jsonb_build_object('name',c.oid::regclass::text,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity)) FROM pg_class c WHERE c.oid IN ('public.pathway_reports'::regclass,'public.pathway_report_versions'::regclass,'public.student_intakes'::regclass,'public.share_tokens'::regclass,'public.students'::regclass,'public.student_collaborators'::regclass,'public.student_relationships'::regclass)),
 'share_columns',(SELECT jsonb_agg(column_name ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='share_tokens'),
 'share_client_mutation',jsonb_build_object('table_update',has_table_privilege('authenticated','public.share_tokens','UPDATE'),'delete',has_table_privilege('authenticated','public.share_tokens','DELETE'),'revoke_column_update',has_column_privilege('authenticated','public.share_tokens','revoked','UPDATE')),
 'triggers',(SELECT jsonb_agg(jsonb_build_object('table',tgrelid::regclass::text,'name',tgname,'definition',pg_get_triggerdef(oid)) ORDER BY tgrelid,tgname) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('public.pathway_reports'::regclass,'public.share_tokens'::regclass,'public.students'::regclass,'public.student_collaborators'::regclass,'public.student_relationships'::regclass)),
 'unrevoked_link_count',(SELECT count(*) FROM public.share_tokens WHERE NOT revoked)
) AS share_lifecycle_preflight;
COMMIT;
