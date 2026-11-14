-- REVIEW-ONLY proposal40. No hosted installation or activation authority.
-- Owner management metadata only. No content access, retry, release, resume,
-- provider-cessation assertion or private no-save resolver grant is added.
-- Verified MFA claim: https://supabase.com/docs/guides/auth/auth-mfa
BEGIN;
SET LOCAL search_path=pg_catalog;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
DO $owner_review_preflight$
DECLARE item record;caller text;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();PERFORM public.assert_internal_document_text_protocol();
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused) OR public.count_internal_combined_document_capacity(NULL,NULL)<>0 THEN
  RAISE EXCEPTION 'Pause and reconcile unfinished work before preparing Owner review.' USING ERRCODE='55000';END IF;
 IF to_regprocedure('auth.jwt()') IS NULL OR NOT has_table_privilege(current_user,'public.admin_roles','SELECT')
  OR NOT has_table_privilege(current_user,'public.admin_roles','UPDATE') OR row_security_active('public.admin_roles'::regclass)
  OR NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.admin_roles'::regclass AND attname='role' AND atttypid='public.admin_role'::regtype AND NOT attisdropped) THEN
  RAISE EXCEPTION 'Trusted canonical Owner-role visibility and verified claims are required.' USING ERRCODE='55000';END IF;
 FOR item IN SELECT * FROM (VALUES
  ('public.inspect_internal_document_operation_review(uuid)','370dccff660186cd520e5a17ad86e6ac',false,false),
  ('public.record_document_operation_review(uuid,uuid,uuid,text,text,text)','ef113c17bd354bf251bb638c42f337ad',true,true),
  ('public.reconcile_internal_document_apply_no_save(uuid,uuid,text)','6a8e1cd3465ea94f1c3957a459356695',false,false)
 ) expected(signature,body_md5,definer,service_exec) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5 AND proowner=current_user::regrole::oid
   AND prosecdef=item.definer AND proconfig=ARRAY['search_path=pg_catalog','TimeZone=UTC']) THEN
   RAISE EXCEPTION 'Exact retained review and private recovery prerequisites are required.' USING ERRCODE='55000';END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(caller,item.signature,'EXECUTE') IS DISTINCT FROM (caller='service_role' AND item.service_exec) THEN
    RAISE EXCEPTION 'Existing private recovery grants must remain unchanged.' USING ERRCODE='55000';END IF;
  END LOOP;
 END LOOP;
END;$owner_review_preflight$;

CREATE FUNCTION public.require_internal_document_work_owner(_write boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $work_owner$
DECLARE actor uuid:=auth.uid();claims jsonb:=auth.jwt();proof uuid;
BEGIN
 IF actor IS NULL OR _write IS NULL OR current_setting('transaction_isolation')<>'read committed'
  OR claims->>'sub' IS DISTINCT FROM actor::text OR claims->>'role' IS DISTINCT FROM 'authenticated'
  OR (_write AND claims->>'aal' IS DISTINCT FROM 'aal2') THEN
  RAISE EXCEPTION 'Owner access or verification could not be confirmed.' USING ERRCODE='42501';END IF;
 SELECT id INTO proof FROM public.admin_roles WHERE user_id=actor AND role='platform_owner' ORDER BY id LIMIT 1 FOR SHARE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.admin_roles WHERE id=proof AND user_id=actor AND role='platform_owner') THEN
  RAISE EXCEPTION 'Owner access or verification could not be confirmed.' USING ERRCODE='42501';END IF;
 RETURN actor;
END;$work_owner$;
REVOKE ALL ON FUNCTION public.require_internal_document_work_owner(boolean) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.list_owner_document_work(_after_operation_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC'
AS $work_queue$
DECLARE actor uuid;revision bigint;items jsonb;more boolean;cursor_id uuid;
BEGIN
 actor:=public.require_internal_document_work_owner(false);
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT c.revision INTO revision FROM public.document_operation_control c WHERE singleton AND paused FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pause document processing before reviewing tracked work.' USING ERRCODE='55000';END IF;
 WITH page AS (SELECT operation_id,operation_kind,state FROM public.document_operation_leases
  WHERE state IN('active','needs_review') AND NOT public.is_document_apply_no_save_reconciled(operation_id)
   AND (_after_operation_id IS NULL OR operation_id>_after_operation_id) ORDER BY operation_id LIMIT 26),
 numbered AS (SELECT *,row_number() OVER(ORDER BY operation_id) AS n FROM page)
 SELECT COALESCE(jsonb_agg(jsonb_build_object('operation_id',operation_id,'operation_kind',operation_kind,'state',state) ORDER BY operation_id) FILTER(WHERE n<=25),'[]'::jsonb),
  count(*)>25,(array_agg(operation_id ORDER BY operation_id) FILTER(WHERE n<=25))[25]
 INTO items,more,cursor_id FROM numbered;
 RETURN jsonb_build_object('schema','owner-document-work-queue-v1','scope','tracked_document_work','control_revision',revision,'paused',true,
  'items',items,'has_more',more,'next_cursor',CASE WHEN more THEN cursor_id ELSE NULL END,'external_quiescence_verified',false,'release_permitted',false);
END;$work_queue$;

CREATE FUNCTION public.inspect_owner_document_work(_operation_id uuid,_review_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC'
AS $work_detail$
DECLARE actor uuid;snapshot jsonb;review jsonb;
BEGIN
 actor:=public.require_internal_document_work_owner(false);
 snapshot:=public.inspect_internal_document_operation_review(_operation_id);
 SELECT jsonb_build_object('review_id',r.review_id,'operation_id',r.operation_id,'snapshot_sha256',r.snapshot_sha256,
  'reason_class',r.reason_class,'recorded_at',r.created_at,'decision','retain_work','release_permitted',false)
 INTO review FROM public.document_operation_reconciliation_reviews r
 WHERE r.operation_id=_operation_id AND (_review_id IS NULL OR (r.review_id=_review_id AND r.operator_id=actor))
 ORDER BY r.created_at DESC,r.review_id DESC LIMIT 1;
 RETURN jsonb_build_object('schema','owner-document-work-detail-v1','snapshot',snapshot,'retained_review',review);
END;$work_detail$;

CREATE FUNCTION public.retain_owner_document_work(_review_id uuid,_operation_id uuid,_expected_snapshot_sha256 text,_reason_class text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC'
AS $work_retain$
DECLARE actor uuid;stored public.document_operation_reconciliation_reviews%ROWTYPE;artifact text;receipt jsonb;
BEGIN
 actor:=public.require_internal_document_work_owner(true);
 IF _review_id IS NULL OR _operation_id IS NULL OR _expected_snapshot_sha256 IS NULL OR _expected_snapshot_sha256!~'^[a-f0-9]{64}$'
  OR _reason_class IS NULL OR _reason_class NOT IN('provider_unknown','missing_receipt','source_changed','manual_review') THEN
  RAISE EXCEPTION 'Exact document work review is required.' USING ERRCODE='42501';END IF;
 PERFORM public.lock_internal_document_capacity_completion();
 -- This is a digest of reconstructible management-review metadata, not a
 -- claim that an external provider stopped or that a document was not saved.
 artifact:='sha256:'||encode(sha256(convert_to(jsonb_build_object('schema','owner-document-work-review-evidence-v1','review_id',_review_id,
  'operation_id',_operation_id,'operator_id',actor,'snapshot_sha256',_expected_snapshot_sha256,'reason_class',_reason_class,
  'decision','retain_work','external_quiescence_verified',false,'release_permitted',false)::text,'UTF8')),'hex');
 SELECT * INTO stored FROM public.document_operation_reconciliation_reviews WHERE review_id=_review_id FOR SHARE;
 IF FOUND THEN
  IF stored.operation_id IS DISTINCT FROM _operation_id OR stored.operator_id IS DISTINCT FROM actor OR stored.snapshot_sha256 IS DISTINCT FROM _expected_snapshot_sha256
   OR stored.artifact_digest IS DISTINCT FROM artifact OR stored.reason_class IS DISTINCT FROM _reason_class OR stored.decision<>'retain_work' THEN
   RAISE EXCEPTION 'Exact document work review is required.' USING ERRCODE='42501';END IF;
  RETURN jsonb_build_object('schema','owner-document-work-review-retained-v1','review_id',_review_id,'operation_id',_operation_id,
   'decision','retain_work','release_permitted',false,'already_recorded',true);
 END IF;
 receipt:=public.record_document_operation_review(_review_id,_operation_id,actor,_expected_snapshot_sha256,artifact,_reason_class);
 IF receipt->>'schema' IS DISTINCT FROM 'document-operation-review-retained-v1' OR receipt->>'review_id' IS DISTINCT FROM _review_id::text
  OR receipt->>'operation_id' IS DISTINCT FROM _operation_id::text OR receipt->>'decision' IS DISTINCT FROM 'retain_work' OR receipt->'release_permitted' IS DISTINCT FROM 'false'::jsonb THEN
  RAISE EXCEPTION 'Recorded review could not be confirmed.' USING ERRCODE='55000';END IF;
 RETURN jsonb_build_object('schema','owner-document-work-review-retained-v1','review_id',_review_id,'operation_id',_operation_id,
  'decision','retain_work','release_permitted',false,'already_recorded',false);
END;$work_retain$;
REVOKE ALL ON FUNCTION public.list_owner_document_work(uuid),public.inspect_owner_document_work(uuid,uuid),public.retain_owner_document_work(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.list_owner_document_work(uuid),public.inspect_owner_document_work(uuid,uuid),public.retain_owner_document_work(uuid,uuid,text,text) TO authenticated;
COMMIT;
