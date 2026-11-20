-- DRAFT ONLY. Retire direct generic document admission after the complete chain.
-- No body/owner rewrite, cancellation, completion, new capacity or unpause.
BEGIN;
SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
DO $private_admission_preflight$
DECLARE item record;caller text;admission_owner oid;
BEGIN
 SELECT relowner INTO admission_owner FROM pg_class WHERE oid='public.document_operation_control'::regclass;
 IF current_setting('transaction_isolation')<>'read committed' OR NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused)
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.begin_document_operation(uuid,uuid,text)'::regprocedure AND proowner=admission_owner AND prosecdef
   AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='4ff01874b39fa3e46c24a6bf3d8149fc')
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.finish_document_operation(uuid,uuid,uuid,text)'::regprocedure AND proowner=admission_owner AND prosecdef
   AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='b96db30c250af2e17a60159843b5392d')
  OR to_regclass('public.document_apply_no_save_reconciliations') IS NULL THEN RAISE EXCEPTION 'Exact paused complete admission chain required' USING ERRCODE='55000';END IF;
 FOR item IN SELECT * FROM (VALUES
 ('public.bind_document_upload_operation()','3c4a138653e5d79030b4247fd01f381e',true,false),
 ('public.begin_internal_document_rescan(uuid,uuid,uuid,timestamptz,jsonb)','5813809f271e1b2b94af7ffa0b11ffd4',false,false),
 ('public.begin_bound_document_rescan(uuid,uuid,uuid,timestamptz,jsonb)','9f791ab0018a9b712576893728de1772',true,false),
 ('public.begin_bound_document_apply(uuid,uuid,uuid,uuid,uuid,timestamptz,jsonb,boolean)','3e91e42a0bbed4937e1f971240d18910',true,true),
 ('public.claim_admitted_document_summary(uuid,integer)','c447fea2a55afefc6ad1451986ac1eea',true,false)
 ) expected(signature,body_md5,definer,utc) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND proowner=current_user::regrole::oid AND md5(prosrc)=item.body_md5 AND prosecdef=item.definer
   AND proconfig=CASE WHEN item.utc THEN ARRAY['search_path=pg_catalog','TimeZone=UTC'] ELSE ARRAY['search_path=pg_catalog'] END) THEN
   RAISE EXCEPTION 'Exact trusted source-bound caller required: %',item.signature USING ERRCODE='55000';END IF;
 END LOOP;
 FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_function_privilege(caller,'public.begin_document_operation(uuid,uuid,text)','EXECUTE') IS DISTINCT FROM (caller='service_role')
   OR has_function_privilege(caller,'public.finish_document_operation(uuid,uuid,uuid,text)','EXECUTE') IS DISTINCT FROM (caller='service_role') THEN
   RAISE EXCEPTION 'Exact existing admission and completion permissions required' USING ERRCODE='55000';END IF;
  IF has_table_privilege(caller,'public.document_operation_leases','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
   OR has_any_column_privilege(caller,'public.document_operation_leases','SELECT,INSERT,UPDATE,REFERENCES') THEN RAISE EXCEPTION 'Private lease permissions required' USING ERRCODE='55000';END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
  WHERE p.oid='public.begin_document_operation(uuid,uuid,text)'::regprocedure AND a.privilege_type='EXECUTE'
  AND a.grantee NOT IN(admission_owner,current_user::regrole::oid,'service_role'::regrole::oid)) THEN
  RAISE EXCEPTION 'Unexpected generic admission grantee requires review' USING ERRCODE='55000';END IF;
END; $private_admission_preflight$;
DO $private_admission_grants$
DECLARE executor name:=current_user;owner_name name;editing_role name;caller_owner name;owner_oid oid;
BEGIN
 SELECT proowner INTO owner_oid FROM pg_proc WHERE oid='public.begin_document_operation(uuid,uuid,text)'::regprocedure;
 SELECT rolname INTO owner_name FROM pg_roles WHERE oid=owner_oid;
 IF current_user<>owner_name THEN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=session_user AND rolsuper) THEN editing_role:=session_user;ELSE editing_role:=owner_name;END IF;
  EXECUTE format('SET LOCAL ROLE %I',editing_role);
 END IF;
 -- Hold the same control row as pause/resume and recheck after waiting.
 PERFORM 1 FROM public.document_operation_control WHERE singleton AND paused FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pause changed before generic admission retirement' USING ERRCODE='55000';END IF;
 REVOKE ALL ON FUNCTION public.begin_document_operation(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
 FOR caller_owner IN SELECT DISTINCT p.proowner::regrole::text FROM pg_proc p WHERE p.oid IN(
  'public.bind_document_upload_operation()'::regprocedure,
  'public.begin_bound_document_rescan(uuid,uuid,uuid,timestamptz,jsonb)'::regprocedure,
  'public.begin_bound_document_apply(uuid,uuid,uuid,uuid,uuid,timestamptz,jsonb,boolean)'::regprocedure,
  'public.claim_admitted_document_summary(uuid,integer)'::regprocedure) LOOP
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.begin_document_operation(uuid,uuid,text) TO %I',caller_owner);
 END LOOP;
 IF (SELECT proowner FROM pg_proc WHERE oid='public.begin_document_operation(uuid,uuid,text)'::regprocedure) IS DISTINCT FROM owner_oid THEN RAISE EXCEPTION 'Generic admission ownership changed';END IF;
 IF current_user<>executor THEN EXECUTE format('SET LOCAL ROLE %I',executor);END IF;
END; $private_admission_grants$;
DO $private_admission_proof$
DECLARE caller text;item record;
BEGIN
 FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_function_privilege(caller,'public.begin_document_operation(uuid,uuid,text)','EXECUTE')
   OR has_function_privilege(caller,'public.finish_document_operation(uuid,uuid,uuid,text)','EXECUTE') IS DISTINCT FROM (caller='service_role') THEN
   RAISE EXCEPTION 'Generic admission must be private; existing completion stays available' USING ERRCODE='55000';END IF;
 END LOOP;
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.begin_document_operation(uuid,uuid,text)'::regprocedure)<>'4ff01874b39fa3e46c24a6bf3d8149fc'
  OR (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.finish_document_operation(uuid,uuid,uuid,text)'::regprocedure)<>'b96db30c250af2e17a60159843b5392d' THEN
  RAISE EXCEPTION 'Admission/completion bodies must remain unchanged';END IF;
 FOR item IN SELECT proowner FROM pg_proc WHERE oid IN('public.bind_document_upload_operation()'::regprocedure,
  'public.begin_bound_document_rescan(uuid,uuid,uuid,timestamptz,jsonb)'::regprocedure,
  'public.begin_bound_document_apply(uuid,uuid,uuid,uuid,uuid,timestamptz,jsonb,boolean)'::regprocedure,
  'public.claim_admitted_document_summary(uuid,integer)'::regprocedure) LOOP
  IF NOT has_function_privilege(item.proowner,'public.begin_document_operation(uuid,uuid,text)'::regprocedure,'EXECUTE') THEN RAISE EXCEPTION 'Exact trusted caller bridge required';END IF;
 END LOOP;
END; $private_admission_proof$;
COMMIT;
