-- REVIEW DRAFT ONLY. Retire unbound original-content writes, preserving manual review.
-- No hosted installation, application rollout, provider call or activation approval.
BEGIN;
SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
DO $writer_preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.assert_internal_document_text_protocol()'::regprocedure AND md5(prosrc)='20d204d51819ff0c89840ec8dda3fc29' AND NOT prosecdef AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog']) THEN
  RAISE EXCEPTION 'Exact reviewed source protocol required.' USING ERRCODE='55000';END IF;
 PERFORM public.lock_internal_document_capacity_completion();
 PERFORM public.assert_internal_document_text_protocol();
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused)
  OR public.count_internal_document_text_capacity(NULL,NULL,NULL)<>0 THEN
  RAISE EXCEPTION 'Pause and reconcile unfinished text work before preparing writer fences.' USING ERRCODE='55000';END IF;
END;$writer_preflight$;
CREATE FUNCTION public.has_internal_document_text_save_preparation(_extraction_id uuid,_student_id uuid,_document_id uuid,
 _review_revision timestamptz,_document_revision timestamptz,_review_status text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $has_preparation$
 SELECT auth.uid() IS NOT NULL AND current_setting('transaction_isolation')='read committed' AND EXISTS(
  SELECT 1 FROM public.document_text_extraction_capacity c JOIN public.document_text_save_completions p USING(operation_id)
  WHERE c.extraction_id=_extraction_id AND c.student_id=_student_id AND c.document_id=_document_id AND c.actor_id=auth.uid()
   AND c.source_revision=_review_revision AND c.document_revision=_document_revision AND c.source_status=_review_status
   AND c.state='active' AND c.admission_txid<>txid_current() AND p.state='preparing' AND p.save_txid=txid_current());
$has_preparation$;
CREATE FUNCTION public.require_document_text_save_preparation(_extraction_id uuid,_student_id uuid,_document_id uuid,
 _review_revision timestamptz,_document_revision timestamptz,_review_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $require_preparation$
BEGIN
 -- No new mutex/row locks: a real preparation already holds them. Refuse old
 -- callers before they can acquire source locks in the opposite order.
 IF public.has_internal_document_text_save_preparation(_extraction_id,_student_id,_document_id,_review_revision,_document_revision,_review_status) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Reload this review before replacing its original content.' USING ERRCODE='42501';END IF;
END;$require_preparation$;
CREATE FUNCTION public.guard_document_extraction_source_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $source_write_guard$
DECLARE actor uuid:=auth.uid();d public.documents%ROWTYPE;generated boolean;item record;
BEGIN
 -- Existing private DB-only recovery invalidates only the revision. It cannot
 -- change content/identity or release any capacity through this exception.
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'updated_at') IS NOT DISTINCT FROM (to_jsonb(OLD)-'updated_at') THEN RETURN NEW;END IF;
 IF actor IS NULL OR current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'Current editing access is required for this review.' USING ERRCODE='42501';END IF;
 IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.document_id IS DISTINCT FROM OLD.document_id
  OR NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.created_by IS DISTINCT FROM OLD.created_by
  OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.doc_type IS DISTINCT FROM OLD.doc_type
  OR NEW.source_label IS DISTINCT FROM OLD.source_label) THEN
  RAISE EXCEPTION 'The original document review identity cannot be changed.' USING ERRCODE='42501';END IF;
 SELECT * INTO d FROM public.documents WHERE id=NEW.document_id AND student_id=NEW.student_id FOR SHARE;
 IF NOT FOUND OR d.deleted_at IS NOT NULL OR d.archived_at IS NOT NULL OR d.review_status IS NULL OR d.review_status='rejected'
  OR public.can_view_document(actor,NEW.document_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'This document is unavailable for review changes.' USING ERRCODE='42501';END IF;
 PERFORM public.lock_internal_document_text_authority(actor,NEW.student_id);
 IF TG_OP='INSERT' THEN
  IF NEW.created_by IS DISTINCT FROM actor OR NEW.status::text IS DISTINCT FROM 'pending' OR NEW.raw_extract IS DISTINCT FROM '{}'::jsonb
   OR jsonb_typeof(NEW.sections) IS DISTINCT FROM 'object' OR octet_length(NEW.sections::text)>100000
   OR NEW.doc_type IS NOT NULL OR NEW.source_label IS NOT NULL
   OR NEW.reviewed_at IS NOT NULL OR NEW.reviewer_id IS NOT NULL
   OR NEW.review_notes IS NOT NULL OR NEW.missing_information IS DISTINCT FROM ARRAY[]::text[] OR NEW.suggested_questions IS DISTINCT FROM ARRAY[]::text[] THEN
   RAISE EXCEPTION 'A new review must start with an empty pending draft.' USING ERRCODE='42501';END IF;
  FOR item IN SELECT key,value FROM jsonb_each(NEW.sections) LOOP
   IF item.key NOT IN('student_first_name','grade_band','strengths','interests','needs','supports','transportation','communication','current_goals','family_concerns','student_voice','educator_input')
    OR item.value IS DISTINCT FROM jsonb_build_object('state','pending','value','','original_value','','notes','') THEN
    RAISE EXCEPTION 'A new review cannot include original or generated content.' USING ERRCODE='42501';END IF;
  END LOOP;
  NEW.created_at:=clock_timestamp();NEW.updated_at:=NEW.created_at;
  RETURN NEW;
 END IF;
 generated:=public.has_internal_document_text_save_preparation(OLD.id,OLD.student_id,OLD.document_id,OLD.updated_at,d.updated_at,OLD.status::text);
 IF generated THEN
  IF NEW.status::text IS DISTINCT FROM 'needs_review' OR jsonb_typeof(NEW.raw_extract) IS DISTINCT FROM 'object' OR octet_length(NEW.raw_extract::text)>250000
   OR jsonb_typeof(NEW.sections) IS DISTINCT FROM 'object' OR octet_length(NEW.sections::text)>100000 THEN
   RAISE EXCEPTION 'The bound review replacement is invalid.' USING ERRCODE='42501';END IF;
 ELSE
  IF NEW.raw_extract IS DISTINCT FROM OLD.raw_extract OR jsonb_typeof(NEW.sections) IS DISTINCT FROM 'object' THEN
   RAISE EXCEPTION 'Original content requires a matching bound save.' USING ERRCODE='42501';END IF;
  FOR item IN SELECT key,value FROM jsonb_each(OLD.sections) WHERE jsonb_typeof(value)='object' AND value ? 'original_value' LOOP
   IF (NEW.sections->item.key->'original_value') IS DISTINCT FROM (item.value->'original_value') THEN
    RAISE EXCEPTION 'Keep original section values when reviewing.' USING ERRCODE='42501';END IF;
  END LOOP;
  FOR item IN SELECT key,value FROM jsonb_each(NEW.sections) WHERE jsonb_typeof(value)='object' AND value ? 'original_value' LOOP
   IF NOT(COALESCE(jsonb_typeof(OLD.sections->item.key)='object',false) AND (OLD.sections->item.key ? 'original_value'))
    AND item.value->'original_value' IS DISTINCT FROM '""'::jsonb THEN
    RAISE EXCEPTION 'New manual sections cannot invent original values.' USING ERRCODE='42501';END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END;$source_write_guard$;
REVOKE ALL ON FUNCTION public.has_internal_document_text_save_preparation(uuid,uuid,uuid,timestamptz,timestamptz,text),
 public.require_document_text_save_preparation(uuid,uuid,uuid,timestamptz,timestamptz,text),public.guard_document_extraction_source_write() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.require_document_text_save_preparation(uuid,uuid,uuid,timestamptz,timestamptz,text) TO authenticated;
CREATE TRIGGER document_extractions_source_write_guard BEFORE INSERT OR UPDATE ON public.document_extractions
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_extraction_source_write();
-- Keep the original content writer INVOKER. Its retained authenticated EXECUTE
-- is usable only inside a nonce-validated preparation in the same transaction.
DO $bind_old_save$
DECLARE definition text;old_text text;new_text text;
BEGIN
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.save_document_text_review(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb,jsonb)'::regprocedure)<>'e44e6dc8a4d7b27c89a72519f6473478' THEN RAISE EXCEPTION 'Exact old invoker save required.' USING ERRCODE='55000';END IF;
 definition:=pg_get_functiondef('public.save_document_text_review(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb,jsonb)'::regprocedure);
 old_text:='BEGIN'||chr(10)||' IF actor IS NULL';new_text:='BEGIN'||chr(10)||' PERFORM public.require_document_text_save_preparation(_extraction_id,_student_id,_document_id,_expected_review_revision,_expected_document_revision,_expected_review_status);'||chr(10)||' IF actor IS NULL';
 IF position(old_text IN definition)=0 THEN RAISE EXCEPTION 'Exact early save gate required.' USING ERRCODE='55000';END IF;
 EXECUTE replace(definition,old_text,new_text);
END;$bind_old_save$;
-- Runtime protocol integrity checks must recognize the new exact save body and
-- require the new gate/guard, rather than being weakened or disabled.
DO $extend_protocol$
DECLARE definition text;save_hash text;gate_hash text;has_hash text;guard_hash text;anchor text;replacement text;
BEGIN
 SELECT md5(prosrc) INTO save_hash FROM pg_proc WHERE oid='public.save_document_text_review(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb,jsonb)'::regprocedure;
 SELECT md5(prosrc) INTO gate_hash FROM pg_proc WHERE oid='public.require_document_text_save_preparation(uuid,uuid,uuid,timestamptz,timestamptz,text)'::regprocedure;
 SELECT md5(prosrc) INTO has_hash FROM pg_proc WHERE oid='public.has_internal_document_text_save_preparation(uuid,uuid,uuid,timestamptz,timestamptz,text)'::regprocedure;
 SELECT md5(prosrc) INTO guard_hash FROM pg_proc WHERE oid='public.guard_document_extraction_source_write()'::regprocedure;
 definition:=pg_get_functiondef('public.assert_internal_document_text_protocol()'::regprocedure);
 anchor:='(''public.save_document_text_review(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb,jsonb)'',''e44e6dc8a4d7b27c89a72519f6473478'',false,false,true)';
 replacement:=format('(''public.save_document_text_review(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb,jsonb)'',%L,false,false,true),%s(''public.require_document_text_save_preparation(uuid,uuid,uuid,timestamptz,timestamptz,text)'',%L,true,false,true),%s(''public.has_internal_document_text_save_preparation(uuid,uuid,uuid,timestamptz,timestamptz,text)'',%L,true,false,false),%s(''public.guard_document_extraction_source_write()'',%L,true,false,false)',save_hash,chr(10),gate_hash,chr(10),has_hash,chr(10),guard_hash);
 IF position(anchor IN definition)=0 THEN RAISE EXCEPTION 'Exact protocol save inventory required.' USING ERRCODE='55000';END IF;
 definition:=replace(definition,anchor,replacement);
 anchor:='(''public.user_roles'',''user_roles_document_text_authority'',''public.lock_document_text_role_change()'',31,false)';
 replacement:=anchor||','||chr(10)||'(''public.document_extractions'',''document_extractions_source_write_guard'',''public.guard_document_extraction_source_write()'',23,false)';
 IF position(anchor IN definition)=0 THEN RAISE EXCEPTION 'Exact protocol trigger inventory required.' USING ERRCODE='55000';END IF;
 definition:=replace(definition,anchor,replacement);
 anchor:='BEGIN'||chr(10)||' FOR item IN';
 replacement:='BEGIN'||chr(10)||' IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=''public.has_internal_document_text_save_preparation(uuid,uuid,uuid,timestamptz,timestamptz,text)''::regprocedure AND provolatile=''s'') THEN RAISE EXCEPTION ''The save preparation snapshot mode changed.'' USING ERRCODE=''55000'';END IF;'||chr(10)||' FOR item IN';
 IF position(anchor IN definition)=0 THEN RAISE EXCEPTION 'Exact protocol entry required.' USING ERRCODE='55000';END IF;
 EXECUTE replace(definition,anchor,replacement);
 PERFORM public.assert_internal_document_text_protocol();
END;$extend_protocol$;
COMMENT ON FUNCTION public.guard_document_extraction_source_write() IS 'Protected original/generated review data and source identity; safe empty pending initialization and manual section/meta review retained. Does not certify provider cessation, every completion-marker writer or manual compare-and-swap semantics.';
COMMIT;
