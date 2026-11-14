-- REVIEW DRAFT ONLY. Atomic caller-RLS save and private commit-bound capacity credit.
-- No provider admission RPC, hosted execution, activation or blind release.
BEGIN;
SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
DO $preflight$
DECLARE item record;role_name text;
BEGIN
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_table_privilege(role_name,'public.document_text_extraction_capacity','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') OR has_any_column_privilege(role_name,'public.document_text_extraction_capacity','SELECT,INSERT,UPDATE') THEN
   RAISE EXCEPTION 'Reservation capabilities must remain private.' USING ERRCODE='55000';END IF;
 END LOOP;
 FOR item IN SELECT * FROM (VALUES
 ('public.save_document_text_review(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb,jsonb)','e44e6dc8a4d7b27c89a72519f6473478',false),
 ('public.guard_document_text_capacity()','7d356b9b7f61a553e8a122aedd055fa3',false),
 ('public.count_internal_document_text_capacity(uuid,uuid,text)','19de7a94af2ebf4fce3e25e7d4b84f37',true),
 ('public.lock_document_text_review_authority(uuid)','f437d1d92e80319c437aaba69590685e',true),
 ('public.lock_internal_document_text_authority(uuid,uuid)','d0ef5f64f342009b92432b279ce9c5f1',false),
 ('public.lock_internal_document_capacity_completion()','be973fc53b7930db60f9456ba1f26548',false)
 ) expected(signature,body_md5,definer) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5 AND prosecdef=item.definer AND proowner=current_user::regrole::oid
   AND proconfig=CASE WHEN item.signature='public.guard_document_text_capacity()' THEN ARRAY['search_path=pg_catalog','TimeZone=UTC'] ELSE ARRAY['search_path=pg_catalog'] END) THEN
   RAISE EXCEPTION 'Exact reviewed text save and capacity foundations are required.' USING ERRCODE='55000';END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.document_extractions'::regclass AND tgname='document_extractions_set_updated_at' AND tgenabled='O' AND tgtype=19 AND NOT tgisinternal AND tgqual IS NULL AND tgattr::text='')
  OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.documents'::regclass AND tgname='set_updated_at_documents' AND tgenabled='O' AND tgtype=19 AND NOT tgisinternal AND tgqual IS NULL AND tgattr::text='')
  OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.document_text_extraction_capacity'::regclass AND tgname='document_text_capacity_frozen' AND tgfoid='public.guard_document_text_capacity()'::regprocedure AND tgenabled='O' AND tgtype=31 AND NOT tgisinternal AND tgqual IS NULL AND tgattr::text='') THEN
  RAISE EXCEPTION 'Enabled reviewed source and reservation guards are required.' USING ERRCODE='55000';END IF;
 PERFORM public.lock_internal_document_capacity_completion();
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused) THEN
  RAISE EXCEPTION 'Keep processing paused while preparing bound saves.' USING ERRCODE='55000';END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid='public.document_text_extraction_capacity'::regclass AND (NOT relrowsecurity OR row_security_active(oid))) THEN
  RAISE EXCEPTION 'Full trusted private reservation visibility required.' USING ERRCODE='55000';END IF;
END;$preflight$;
CREATE TABLE public.document_text_save_completions(
 operation_id uuid PRIMARY KEY REFERENCES public.document_text_extraction_capacity(operation_id) ON DELETE RESTRICT,
 save_txid bigint NOT NULL CHECK(save_txid>0),source_creator uuid,state text NOT NULL CHECK(state IN('preparing','completed')),
 saved_revision timestamptz,saved_sha256 text,completed_at timestamptz,
 CHECK((state='preparing' AND saved_revision IS NULL AND saved_sha256 IS NULL AND completed_at IS NULL) OR
 (state='completed' AND saved_revision IS NOT NULL AND saved_sha256 IS NOT NULL AND saved_sha256 ~ '^[a-f0-9]{64}$' AND completed_at IS NOT NULL))
);
ALTER TABLE public.document_text_save_completions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_text_save_completions FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.guard_document_text_save_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC'
AS $completion_guard$
DECLARE c public.document_text_extraction_capacity%ROWTYPE;e public.document_extractions%ROWTYPE;d public.documents%ROWTYPE;
BEGIN
 IF TG_OP IN('DELETE','TRUNCATE') THEN RAISE EXCEPTION 'Document save proof cannot be removed.' USING ERRCODE='42501';END IF;
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT * INTO c FROM public.document_text_extraction_capacity WHERE operation_id=NEW.operation_id FOR UPDATE;
 IF NOT FOUND OR c.actor_id IS DISTINCT FROM auth.uid() OR c.state<>'active' OR c.admission_txid=txid_current()
  OR NEW.save_txid IS DISTINCT FROM txid_current() OR current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'A prior committed active reservation is required.' USING ERRCODE='42501';END IF;
 SELECT * INTO e FROM public.document_extractions WHERE id=c.extraction_id FOR UPDATE;
 SELECT * INTO d FROM public.documents WHERE id=c.document_id FOR SHARE;
 PERFORM public.lock_internal_document_text_authority(c.actor_id,c.student_id);
 IF e.id IS NULL OR d.id IS NULL OR e.student_id IS DISTINCT FROM c.student_id OR e.document_id IS DISTINCT FROM c.document_id
  OR d.student_id IS DISTINCT FROM c.student_id OR d.updated_at IS DISTINCT FROM c.document_revision
  OR encode(sha256(convert_to(to_jsonb(d)::text,'UTF8')),'hex') IS DISTINCT FROM c.source_document_sha256
  OR public.can_view_document(c.actor_id,c.document_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'The admitted source is no longer available.' USING ERRCODE='42501';END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.state IS DISTINCT FROM 'preparing' OR e.updated_at IS DISTINCT FROM c.source_revision OR e.status::text IS DISTINCT FROM c.source_status
   OR encode(sha256(convert_to(e.sections::text,'UTF8')),'hex') IS DISTINCT FROM c.source_sections_sha256
   OR NEW.source_creator IS DISTINCT FROM e.created_by THEN
   RAISE EXCEPTION 'The admitted review changed before its save.' USING ERRCODE='42501';END IF;
 ELSE
  IF OLD.state<>'preparing' OR NEW.state<>'completed'
   OR (to_jsonb(NEW)-ARRAY['state','saved_revision','saved_sha256','completed_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','saved_revision','saved_sha256','completed_at'])
   OR e.created_by IS DISTINCT FROM OLD.source_creator OR e.status::text<>'needs_review'
   OR e.updated_at IS NOT DISTINCT FROM c.source_revision OR NEW.saved_revision IS DISTINCT FROM e.updated_at
   OR NEW.saved_sha256 IS DISTINCT FROM encode(sha256(convert_to(to_jsonb(e)::text,'UTF8')),'hex')
   OR NOT EXISTS(SELECT 1 FROM public.document_extractions WHERE id=e.id AND xmin::text::bigint=mod(txid_current(),4294967296)) THEN
   RAISE EXCEPTION 'The matching review save could not be proven.' USING ERRCODE='42501';END IF;
  NEW.completed_at:=clock_timestamp();
 END IF;
 RETURN NEW;
END;$completion_guard$;
CREATE TRIGGER document_text_completion_frozen BEFORE INSERT OR UPDATE OR DELETE ON public.document_text_save_completions
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_text_save_completion();
CREATE TRIGGER document_text_completion_no_truncate BEFORE TRUNCATE ON public.document_text_save_completions
 FOR EACH STATEMENT EXECUTE FUNCTION public.guard_document_text_save_completion();
CREATE FUNCTION public.verify_document_text_save_commit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC'
AS $commit_proof$
DECLARE p public.document_text_save_completions%ROWTYPE;c public.document_text_extraction_capacity%ROWTYPE;e public.document_extractions%ROWTYPE;d public.documents%ROWTYPE;
BEGIN
 SELECT * INTO p FROM public.document_text_save_completions WHERE operation_id=NEW.operation_id;
 SELECT * INTO c FROM public.document_text_extraction_capacity WHERE operation_id=NEW.operation_id;
 SELECT * INTO e FROM public.document_extractions WHERE id=c.extraction_id;
 SELECT * INTO d FROM public.documents WHERE id=c.document_id;
 IF p.operation_id IS NULL OR c.operation_id IS NULL OR e.id IS NULL OR d.id IS NULL OR p.state<>'completed' OR c.state<>'active'
  OR public.can_edit_student(c.actor_id,c.student_id) IS DISTINCT FROM true OR public.is_partner_only(c.actor_id) IS DISTINCT FROM false
  OR public.can_view_document(c.actor_id,c.document_id) IS DISTINCT FROM true
  OR p.save_txid IS DISTINCT FROM txid_current() OR p.saved_revision IS DISTINCT FROM e.updated_at
  OR p.saved_sha256 IS DISTINCT FROM encode(sha256(convert_to(to_jsonb(e)::text,'UTF8')),'hex')
  OR c.source_document_sha256 IS DISTINCT FROM encode(sha256(convert_to(to_jsonb(d)::text,'UTF8')),'hex')
  OR NOT EXISTS(SELECT 1 FROM public.document_extractions WHERE id=e.id AND xmin::text::bigint=mod(txid_current(),4294967296)) THEN
  RAISE EXCEPTION 'The complete matching review must persist through commit.' USING ERRCODE='42501';END IF;
 RETURN NULL;
END;$commit_proof$;
CREATE CONSTRAINT TRIGGER document_text_completion_commit AFTER INSERT OR UPDATE ON public.document_text_save_completions
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.verify_document_text_save_commit();

-- An actor can SET CONSTRAINTS IMMEDIATE. Prevent later same-transaction
-- edits from invalidating already-checked proof; other transactions remain legal.
CREATE FUNCTION public.guard_bound_document_text_source()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $source_fence$
BEGIN
 IF TG_OP='TRUNCATE' THEN
  IF EXISTS(SELECT 1 FROM public.document_text_save_completions WHERE save_txid=txid_current()) THEN
   RAISE EXCEPTION 'A source used by this save cannot be truncated.' USING ERRCODE='42501';END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM public.document_text_save_completions s JOIN public.document_text_extraction_capacity c USING(operation_id)
   WHERE s.save_txid=txid_current() AND ((TG_TABLE_NAME='document_extractions' AND c.extraction_id=OLD.id AND s.state='completed')
    OR (TG_TABLE_NAME='documents' AND c.document_id=OLD.id))) THEN
   RAISE EXCEPTION 'A source already bound to this save cannot change in the same transaction.' USING ERRCODE='42501';END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END;$source_fence$;
CREATE TRIGGER document_text_bound_review_source BEFORE UPDATE OR DELETE ON public.document_extractions FOR EACH ROW EXECUTE FUNCTION public.guard_bound_document_text_source();
CREATE TRIGGER document_text_bound_document_source BEFORE UPDATE OR DELETE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.guard_bound_document_text_source();
CREATE TRIGGER document_text_bound_review_truncate BEFORE TRUNCATE ON public.document_extractions FOR EACH STATEMENT EXECUTE FUNCTION public.guard_bound_document_text_source();
CREATE TRIGGER document_text_bound_document_truncate BEFORE TRUNCATE ON public.documents FOR EACH STATEMENT EXECUTE FUNCTION public.guard_bound_document_text_source();

-- These two helpers expose only nonce-bound metadata transitions to the actor.
-- They never write document content; the public wrapper below remains INVOKER.
CREATE FUNCTION public.prepare_bound_document_text_save(_operation_id uuid,_receipt_id uuid,_text_sha256 text,
 _extraction_id uuid,_student_id uuid,_document_id uuid,_review_revision timestamptz,_document_revision timestamptz,_review_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $prepare_bound$
DECLARE c public.document_text_extraction_capacity%ROWTYPE;creator uuid;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT * INTO c FROM public.document_text_extraction_capacity WHERE operation_id=_operation_id FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR c.actor_id IS DISTINCT FROM auth.uid() OR c.receipt_id IS DISTINCT FROM _receipt_id
  OR c.source_text_sha256 IS DISTINCT FROM _text_sha256 OR c.extraction_id IS DISTINCT FROM _extraction_id
  OR c.student_id IS DISTINCT FROM _student_id OR c.document_id IS DISTINCT FROM _document_id
  OR c.source_revision IS DISTINCT FROM _review_revision OR c.document_revision IS DISTINCT FROM _document_revision
  OR c.source_status IS DISTINCT FROM _review_status THEN
  RAISE EXCEPTION 'The matching document save reservation is required.' USING ERRCODE='42501';END IF;
 SELECT created_by INTO creator FROM public.document_extractions WHERE id=c.extraction_id;
 INSERT INTO public.document_text_save_completions(operation_id,save_txid,source_creator,state) VALUES(c.operation_id,txid_current(),creator,'preparing');
END;$prepare_bound$;
CREATE FUNCTION public.complete_bound_document_text_save(_operation_id uuid,_receipt_id uuid,_saved jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC'
AS $finish_bound$
DECLARE c public.document_text_extraction_capacity%ROWTYPE;e public.document_extractions%ROWTYPE;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT * INTO c FROM public.document_text_extraction_capacity WHERE operation_id=_operation_id FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR c.actor_id IS DISTINCT FROM auth.uid() OR c.receipt_id IS DISTINCT FROM _receipt_id THEN
  RAISE EXCEPTION 'The matching document save reservation is required.' USING ERRCODE='42501';END IF;
 SELECT * INTO e FROM public.document_extractions WHERE id=c.extraction_id;
 IF _saved IS DISTINCT FROM to_jsonb(e) THEN RAISE EXCEPTION 'The saved review receipt does not match.' USING ERRCODE='42501';END IF;
 UPDATE public.document_text_save_completions SET state='completed',saved_revision=e.updated_at,
  saved_sha256=encode(sha256(convert_to(to_jsonb(e)::text,'UTF8')),'hex'),completed_at=clock_timestamp()
 WHERE operation_id=c.operation_id AND state='preparing' AND save_txid=txid_current();
 IF NOT FOUND THEN RAISE EXCEPTION 'A matching unfinished save is required.' USING ERRCODE='42501';END IF;
END;$finish_bound$;
CREATE FUNCTION public.save_bound_document_text_review(_operation_id uuid,_receipt_id uuid,_source_text_sha256 text,
 _extraction_id uuid,_student_id uuid,_document_id uuid,_expected_review_revision timestamptz,_expected_document_revision timestamptz,
 _expected_review_status text,_raw_extract jsonb,_sections jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog SET TimeZone='UTC'
AS $bound_save$
DECLARE saved jsonb;
BEGIN
 PERFORM public.prepare_bound_document_text_save(_operation_id,_receipt_id,_source_text_sha256,_extraction_id,_student_id,_document_id,
  _expected_review_revision,_expected_document_revision,_expected_review_status);
 saved:=public.save_document_text_review(_extraction_id,_student_id,_document_id,_expected_review_revision,_expected_document_revision,
  _expected_review_status,_raw_extract,_sections);
 IF saved->>'schema' IS DISTINCT FROM 'document-text-review-saved-v1' THEN RAISE EXCEPTION 'The review save could not be confirmed.' USING ERRCODE='42501';END IF;
 PERFORM public.complete_bound_document_text_save(_operation_id,_receipt_id,saved->'extraction');
 RETURN jsonb_build_object('schema','bound-document-text-review-saved-v1','operation_id',_operation_id,'operation_state','completed','extraction',saved->'extraction');
END;$bound_save$;
REVOKE ALL ON FUNCTION public.guard_document_text_save_completion(),public.verify_document_text_save_commit(),public.guard_bound_document_text_source(),
 public.prepare_bound_document_text_save(uuid,uuid,text,uuid,uuid,uuid,timestamptz,timestamptz,text),public.complete_bound_document_text_save(uuid,uuid,jsonb),
 public.save_bound_document_text_review(uuid,uuid,text,uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_bound_document_text_save(uuid,uuid,text,uuid,uuid,uuid,timestamptz,timestamptz,text),
 public.complete_bound_document_text_save(uuid,uuid,jsonb),public.save_bound_document_text_review(uuid,uuid,text,uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb,jsonb) TO authenticated;

-- Preserve existing private count owner and metadata-only EXEC grants.
CREATE OR REPLACE FUNCTION public.count_internal_document_text_capacity(_actor uuid,_student uuid,_state text)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $text_count$
 SELECT count(*) FROM public.document_text_extraction_capacity c
 WHERE (_actor IS NULL OR c.actor_id=_actor) AND (_student IS NULL OR c.student_id=_student) AND (_state IS NULL OR c.state=_state)
 AND NOT EXISTS(SELECT 1 FROM public.document_text_save_completions s WHERE s.operation_id=c.operation_id AND s.state='completed');
$text_count$;
-- Replace permanent source uniqueness with serialized unfinished-source uniqueness.
-- The shared mutex is already held by every INSERT and completion transition.
DROP INDEX public.document_text_capacity_source;
CREATE INDEX document_text_capacity_source ON public.document_text_extraction_capacity(extraction_id);
DO $extend_guard$
DECLARE definition text;
BEGIN
 definition:=pg_get_functiondef('public.guard_document_text_capacity()'::regprocedure);
 definition:=replace(definition,'IF TG_OP=''UPDATE'' THEN',
 'IF TG_OP=''UPDATE'' THEN
  IF EXISTS(SELECT 1 FROM public.document_text_save_completions WHERE operation_id=OLD.operation_id) THEN
   RAISE EXCEPTION ''A completed or saving reservation cannot be held.'' USING ERRCODE=''42501'';END IF;');
 definition:=replace(definition,'r:=public.lock_internal_document_capacity();',
 'r:=public.lock_internal_document_capacity();
 IF EXISTS(SELECT 1 FROM public.document_text_extraction_capacity c WHERE c.extraction_id=NEW.extraction_id
  AND NOT EXISTS(SELECT 1 FROM public.document_text_save_completions s WHERE s.operation_id=c.operation_id AND s.state=''completed'')) THEN
  RAISE EXCEPTION ''This review already has unfinished work.'' USING ERRCODE=''42501'';END IF;');
 EXECUTE definition;
END;$extend_guard$;
DO $private_completion_proof$
DECLARE role_name text;item record;
BEGIN
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_table_privilege(role_name,'public.document_text_save_completions','SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
   OR has_any_column_privilege(role_name,'public.document_text_save_completions','SELECT,INSERT,UPDATE') THEN
   RAISE EXCEPTION 'Completion evidence must remain private.' USING ERRCODE='55000';END IF;
  FOR item IN SELECT * FROM (VALUES
   ('public.guard_document_text_save_completion()',false),('public.verify_document_text_save_commit()',false),('public.guard_bound_document_text_source()',false),
   ('public.prepare_bound_document_text_save(uuid,uuid,text,uuid,uuid,uuid,timestamptz,timestamptz,text)',true),
   ('public.complete_bound_document_text_save(uuid,uuid,jsonb)',true),
   ('public.save_bound_document_text_review(uuid,uuid,text,uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb,jsonb)',true)
  ) expected(signature,actor_exec) LOOP
   IF has_function_privilege(role_name,item.signature,'EXECUTE') IS DISTINCT FROM (role_name='authenticated' AND item.actor_exec) THEN
    RAISE EXCEPTION 'Unexpected completion execution grant.' USING ERRCODE='55000';END IF;
  END LOOP;
 END LOOP;
END;$private_completion_proof$;
COMMENT ON TABLE public.document_text_save_completions IS 'Immutable transaction-bound proof of actual caller-RLS review saves; incomplete preparations cannot commit. Not provider cancellation or admission authority.';
COMMIT;
