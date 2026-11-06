-- REVIEW PROPOSAL ONLY: no hosted execution or provider admission authorized.
-- Atomic review replacement only. Does not serialize relationship revocation,
-- prove pasted-text provenance, or fence independent/raw legacy writers.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $text_save_preflight$
BEGIN
 IF to_regprocedure('public.can_edit_student(uuid,uuid)') IS NULL
  OR to_regprocedure('public.can_view_document(uuid,uuid)') IS NULL
  OR to_regprocedure('public.is_partner_only(uuid)') IS NULL
  OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.document_extractions'::regclass
    AND tgname='document_extractions_set_updated_at' AND tgenabled='O' AND tgtype=19 AND NOT tgisinternal AND tgnargs=0 AND tgqual IS NULL AND tgattr::text='')
  OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.documents'::regclass
    AND tgname='set_updated_at_documents' AND tgenabled='O' AND tgtype=19 AND NOT tgisinternal AND tgnargs=0 AND tgqual IS NULL AND tgattr::text='')
  OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.documents'::regclass AND relrowsecurity)
  OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.document_extractions'::regclass AND relrowsecurity) THEN
  RAISE EXCEPTION 'Current document review and revision safeguards are required.' USING ERRCODE='55000';
 END IF;
END; $text_save_preflight$;
CREATE FUNCTION public.save_document_text_review(_extraction_id uuid,_student_id uuid,_document_id uuid,
 _expected_review_revision timestamptz,_expected_document_revision timestamptz,_expected_review_status text,
 _raw_extract jsonb,_sections jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $text_save$
DECLARE actor uuid:=auth.uid();e public.document_extractions%ROWTYPE;d public.documents%ROWTYPE;
 saved public.document_extractions%ROWTYPE;
BEGIN
 IF actor IS NULL OR _extraction_id IS NULL OR _student_id IS NULL OR _document_id IS NULL
  OR _expected_review_revision IS NULL OR _expected_document_revision IS NULL
  OR _expected_review_status IS NULL OR _expected_review_status NOT IN('pending','needs_review','in_review')
  OR jsonb_typeof(_raw_extract) IS DISTINCT FROM 'object' OR octet_length(_raw_extract::text)>250000
  OR jsonb_typeof(_sections) IS DISTINCT FROM 'object' OR octet_length(_sections::text)>100000
  OR current_setting('transaction_isolation')<>'read committed'
  OR public.is_partner_only(actor) IS DISTINCT FROM false
  OR public.can_edit_student(actor,_student_id) IS DISTINCT FROM true
  OR public.can_view_document(actor,_document_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Reload this document review and check your editing access before saving.' USING ERRCODE='42501';
 END IF;
 -- Same extraction -> document order as Apply. Locks are held through commit.
 SELECT * INTO e FROM public.document_extractions WHERE id=_extraction_id FOR UPDATE;
 IF NOT FOUND OR e.document_id IS DISTINCT FROM _document_id OR e.student_id IS DISTINCT FROM _student_id
  OR e.updated_at IS DISTINCT FROM _expected_review_revision OR e.status::text IS DISTINCT FROM _expected_review_status THEN
  RAISE EXCEPTION 'This review changed. Reload it before saving.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO d FROM public.documents WHERE id=_document_id AND student_id=_student_id FOR SHARE;
 IF NOT FOUND OR d.updated_at IS DISTINCT FROM _expected_document_revision
  OR d.scan_status IS DISTINCT FROM 'clean' OR d.review_status IS NULL OR d.review_status='rejected'
  OR d.archived_at IS NOT NULL OR d.deleted_at IS NOT NULL
  OR public.is_partner_only(actor) IS DISTINCT FROM false
  OR public.can_edit_student(actor,_student_id) IS DISTINCT FROM true
  OR public.can_view_document(actor,_document_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'This document changed or is not editable. Reload the review before saving.' USING ERRCODE='42501';
 END IF;
 UPDATE public.document_extractions SET raw_extract=_raw_extract,sections=_sections,status='needs_review'
 WHERE id=e.id AND student_id=e.student_id AND document_id=e.document_id AND updated_at=e.updated_at
  AND status=e.status RETURNING * INTO saved;
 IF NOT FOUND OR saved.updated_at IS NOT DISTINCT FROM e.updated_at THEN
  RAISE EXCEPTION 'This review save could not be confirmed. Reload it before continuing.' USING ERRCODE='42501';
 END IF;
 RETURN jsonb_build_object('schema','document-text-review-saved-v1','extraction',to_jsonb(saved));
END; $text_save$;
REVOKE ALL ON FUNCTION public.save_document_text_review(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_document_text_review(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb,jsonb) TO authenticated;
COMMENT ON FUNCTION public.save_document_text_review(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb,jsonb) IS 'Caller-RLS atomic document/review save. Not provider admission, byte provenance, access-revocation serialization or permission for hosted rollout.';
COMMIT;
