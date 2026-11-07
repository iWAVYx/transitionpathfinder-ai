-- PREPARED READ-ONLY COUNTS/CATALOG REVIEW; not a migration or permission.
-- Independently verify isolated staging qgrertkqbwanerqqemph first.
-- Use specifically authorized trusted access and ON_ERROR_STOP=1. No private
-- IDs, names, text, sections, paths, review notes or raw evidence are emitted.
BEGIN READ ONLY;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $visibility$
DECLARE relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY['public.students','public.documents','public.document_extractions','public.evidence_items','public.transition_profiles'] LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(relation_name) AND relkind IN('r','p')) THEN
      RAISE EXCEPTION 'The reviewed source relations are required.' USING ERRCODE='55000';
    END IF;
    EXECUTE format('LOCK TABLE %s IN ACCESS SHARE MODE',relation_name);
    IF NOT has_table_privilege(current_user,relation_name,'SELECT') OR row_security_active(relation_name::regclass) THEN
      RAISE EXCEPTION 'Complete visibility is required for this review.' USING ERRCODE='42501';
    END IF;
  END LOOP;
END;
$visibility$;
-- COUNTS QUERY
WITH reviews AS MATERIALIZED (
 SELECT e.status::text AS state,e.updated_at,e.sections,
   d.id IS NULL OR d.student_id IS DISTINCT FROM e.student_id AS source_conflict,
   d.archived_at IS NOT NULL OR d.deleted_at IS NOT NULL OR d.scan_status IS DISTINCT FROM 'clean'
     OR d.review_status IS NULL OR d.review_status='rejected' AS unavailable
 FROM public.document_extractions e LEFT JOIN public.documents d ON d.id=e.document_id
), malformed AS (
 SELECT * FROM reviews r WHERE r.updated_at IS NULL OR jsonb_typeof(r.sections) IS DISTINCT FROM 'object'
 OR EXISTS(SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(r.sections)='object' THEN r.sections ELSE '{}'::jsonb END) s
   WHERE s.key IN('student_first_name','grade_band','strengths','interests','needs','student_voice','family_concerns','transportation','supports','current_goals')
   AND s.value->>'state' IN('accepted','edited') AND (
     jsonb_typeof(s.value->'value') IS DISTINCT FROM 'string' OR char_length(s.value->>'value')>4000
     OR (s.key='grade_band' AND btrim(s.value->>'value') NOT IN('','6-8','9-10','11-12','post-secondary','not-applicable'))))
), evidence_conflicts AS (
 SELECT 1 FROM public.evidence_items i LEFT JOIN public.document_extractions e ON e.id=i.source_id
 WHERE i.source_kind='document_extraction' AND i.source_id IS NOT NULL AND
   (e.id IS NULL OR i.student_id IS DISTINCT FROM e.student_id OR i.subject_type IS DISTINCT FROM 'document'
    OR i.subject_id IS DISTINCT FROM e.document_id OR i.extraction_id IS DISTINCT FROM e.id OR i.kind IS DISTINCT FROM 'document_extraction')
)
SELECT jsonb_build_object(
 'schema','atomic-extraction-preflight-v1','expected_project_label','qgrertkqbwanerqqemph',
 'read_only',current_setting('transaction_read_only')='on','complete_relation_visibility',true,
 'review_count',(SELECT count(*) FROM reviews),
 'by_state',(SELECT jsonb_agg(jsonb_build_object('state',state,'count',(SELECT count(*) FROM reviews r WHERE r.state=s.state)) ORDER BY state)
   FROM (VALUES('pending'),('needs_review'),('in_review'),('complete')) s(state)),
 'unknown_state_count',(SELECT count(*) FROM reviews WHERE state IS NULL OR state NOT IN('pending','needs_review','in_review','complete')),
 'source_conflict_count',(SELECT count(*) FROM reviews WHERE source_conflict),
 'unavailable_source_count',(SELECT count(*) FROM reviews WHERE unavailable),
 'malformed_review_count',(SELECT count(*) FROM malformed),
 'evidence_conflict_count',(SELECT count(*) FROM evidence_conflicts),
 'relations',(SELECT jsonb_agg(jsonb_build_object('name',name,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
   'auth_select',has_table_privilege('authenticated',c.oid,'SELECT'),'auth_insert',has_table_privilege('authenticated',c.oid,'INSERT'),
   'auth_update',has_table_privilege('authenticated',c.oid,'UPDATE')) ORDER BY name)
   FROM (VALUES('public.students'),('public.documents'),('public.document_extractions'),('public.transition_profiles'),('public.evidence_items'),('public.audit_log')) r(name)
   LEFT JOIN pg_class c ON c.oid=to_regclass(name)),
 'revision_trigger',(SELECT jsonb_build_object('enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid),
   'routine',t.tgfoid::regprocedure::text,'routine_body_md5',md5(p.prosrc)) FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
   WHERE t.tgrelid='public.document_extractions'::regclass AND t.tgname='document_extractions_set_updated_at' AND NOT t.tgisinternal),
 'evidence_index',(SELECT jsonb_build_object('definition',pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,'unique',i.indisunique)
   FROM pg_index i WHERE i.indexrelid=to_regclass('public.evidence_items_source_unique')),
 'routine',(SELECT jsonb_build_object('signature',p.oid::regprocedure::text,'definer',p.prosecdef,'config',p.proconfig,'body_md5',md5(p.prosrc),
   'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),'auth_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
   'service_execute',has_function_privilege('service_role',p.oid,'EXECUTE')) FROM pg_proc p WHERE p.oid=to_regprocedure('public.apply_reviewed_document_extraction(uuid,uuid,uuid,timestamptz,jsonb,boolean)')),
 'ledger',(SELECT coalesce(jsonb_agg(jsonb_build_object('version',version,'name',name,'statements_md5',md5(array_to_string(statements,''))) ORDER BY version),'[]'::jsonb)
   FROM supabase_migrations.schema_migrations WHERE version IN('20261023030000','20261024010000','20261026010000','20261029010000')),
 'old_handlers_drained',false,'evidence_flag_decision_recorded',false,'data_repaired',false,'rollout_authorized',false
) AS inventory;
COMMIT;
