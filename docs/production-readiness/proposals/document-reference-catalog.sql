-- READ-ONLY CATALOG AUDIT. No user rows, payloads or function bodies returned.
-- Run after the complete canonical replay and thirteen unapplied proposals.
-- Candidate references, not proof of a complete writer/retention inventory.
WITH targets AS (
  SELECT name,to_regclass(name) AS oid FROM (VALUES
    ('public.documents'),('public.document_upload_attempts'),
    ('public.document_upload_resolution_claims'),('storage.objects')) t(name)
), relations AS (
  SELECT oid FROM targets WHERE oid IS NOT NULL
  UNION SELECT conrelid FROM pg_catalog.pg_constraint WHERE contype='f' AND confrelid IN(SELECT oid FROM targets)
  UNION SELECT to_regclass('public.ai_jobs')
), relation_names AS (
  SELECT c.oid,format('%I.%I',n.nspname,c.relname) AS name,c.relrowsecurity,c.relforcerowsecurity
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE c.oid IN(SELECT oid FROM relations)
), fk AS (
  SELECT k.conname AS name,format('%I.%I',ns.nspname,s.relname) AS source_table,
    format('%I.%I',nt.nspname,t.relname) AS target_table,
    ARRAY(SELECT a.attname FROM unnest(k.conkey) WITH ORDINALITY u(attnum,ord)
      JOIN pg_catalog.pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=u.attnum ORDER BY u.ord) AS source_columns,
    ARRAY(SELECT a.attname FROM unnest(k.confkey) WITH ORDINALITY u(attnum,ord)
      JOIN pg_catalog.pg_attribute a ON a.attrelid=k.confrelid AND a.attnum=u.attnum ORDER BY u.ord) AS target_columns,
    CASE k.confdeltype WHEN 'a' THEN 'no_action' WHEN 'r' THEN 'restrict' WHEN 'c' THEN 'cascade'
      WHEN 'n' THEN 'set_null' WHEN 'd' THEN 'set_default' END AS delete_action,
    k.convalidated AS validated,k.condeferrable AS deferrable
  FROM pg_catalog.pg_constraint k
    JOIN pg_catalog.pg_class s ON s.oid=k.conrelid JOIN pg_catalog.pg_namespace ns ON ns.oid=s.relnamespace
    JOIN pg_catalog.pg_class t ON t.oid=k.confrelid JOIN pg_catalog.pg_namespace nt ON nt.oid=t.relnamespace
  WHERE k.contype='f' AND (k.confrelid IN(SELECT oid FROM targets) OR k.conrelid IN(SELECT oid FROM targets))
), columns AS (
  SELECT format('%I.%I',n.nspname,c.relname) AS table_name,a.attname AS column_name,
    pg_catalog.format_type(a.atttypid,a.atttypmod) AS data_type
  FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname IN('public','storage') AND c.relkind IN('r','p') AND a.attnum>0 AND NOT a.attisdropped
), routines AS (
  SELECT format('%I.%I(%s)',n.nspname,p.proname,pg_catalog.pg_get_function_identity_arguments(p.oid)) AS signature,
    p.prokind AS routine_kind,p.prosecdef AS security_definer,p.provolatile AS volatility,p.proconfig AS settings
  FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.prokind IN('f','p')
    AND CASE WHEN p.prokind IN('f','p') THEN pg_catalog.pg_get_functiondef(p.oid) ELSE '' END ~* '(documents|document_upload_attempts|document_upload_resolution_claims|storage[.]objects|ai_jobs)'
), triggers AS (
  SELECT r.name AS table_name,t.tgname AS name,t.tgenabled AS enabled,
    t.tgfoid::regprocedure::text AS function_signature
  FROM pg_catalog.pg_trigger t JOIN relation_names r ON r.oid=t.tgrelid WHERE NOT t.tgisinternal
), permissions AS (
  SELECT r.name AS table_name,r.relrowsecurity AS rls,r.relforcerowsecurity AS force_rls,
    role_name,has_table_privilege(role_name,r.oid,'SELECT') AS can_select,
    has_table_privilege(role_name,r.oid,'INSERT') AS can_insert,
    has_table_privilege(role_name,r.oid,'UPDATE') AS can_update,
    has_table_privilege(role_name,r.oid,'DELETE') AS can_delete,
    has_table_privilege(role_name,r.oid,'TRUNCATE') AS can_truncate
  FROM relation_names r CROSS JOIN (VALUES('anon'),('authenticated'),('service_role')) roles(role_name)
)
SELECT jsonb_build_object(
  'schema','document-reference-catalog-v1','catalog_metadata_only',true,'data_rows_inspected',false,
  'reader_role',current_user,'read_only_transaction',current_setting('transaction_read_only')='on',
  'reader_can_select_protected_relations',(SELECT coalesce(bool_or(has_table_privilege(current_user,oid,'SELECT')),false) FROM targets WHERE oid IS NOT NULL),
  'reader_can_select_job_rows',has_table_privilege(current_user,'public.ai_jobs','SELECT'),
  'reference_inventory_complete',false,'cleanup_authorized',false,
  'targets',(SELECT jsonb_agg(jsonb_build_object('name',name,'present',oid IS NOT NULL) ORDER BY name) FROM targets),
  'foreign_keys',(SELECT coalesce(jsonb_agg(to_jsonb(fk) ORDER BY source_table,name),'[]'::jsonb) FROM fk),
  'named_reference_candidates',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY table_name,column_name),'[]'::jsonb)
    FROM columns c WHERE column_name ~* '(^|_)(document|attachment|storage|upload|file)(_|$)'),
  'untyped_json_candidates',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY table_name,column_name),'[]'::jsonb)
    FROM columns c WHERE data_type IN('json','jsonb')),
  'routine_candidates',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY signature),'[]'::jsonb) FROM routines r),
  'triggers',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY table_name,name),'[]'::jsonb) FROM triggers t),
  'effective_table_grants',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY table_name,role_name),'[]'::jsonb) FROM permissions p)
) AS inventory;
