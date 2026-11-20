-- REVIEW-ONLY proposal41. Owner metadata for the separate pasted-text ledger.
-- No content access, mutation, retry, cancellation, release or activation authority.
BEGIN;
SET LOCAL search_path=pg_catalog;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
DO $text_review_install$
DECLARE relation_name text;caller text;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();PERFORM public.assert_internal_document_text_protocol();
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused)
  OR public.count_internal_combined_document_capacity(NULL,NULL)<>0 THEN RAISE EXCEPTION 'Pause and reconcile tracked work before preparing text review.' USING ERRCODE='55000';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.require_internal_document_work_owner(boolean)'::regprocedure
  AND md5(prosrc)='0e725589f47e415c6fda0fd69beb5d97' AND NOT prosecdef AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog']) THEN RAISE EXCEPTION 'Exact transaction-held Owner authorization required.' USING ERRCODE='55000';END IF;
 FOREACH relation_name IN ARRAY ARRAY['public.document_text_extraction_capacity','public.document_text_save_completions'] LOOP
  IF row_security_active(relation_name::regclass) OR NOT has_table_privilege(current_user,relation_name,'SELECT')
   OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=relation_name::regclass AND relrowsecurity AND relowner=current_user::regrole::oid)
   OR EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=relation_name::regclass) THEN RAISE EXCEPTION 'Full private text metadata visibility required.' USING ERRCODE='55000';END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') OR has_any_column_privilege(caller,relation_name,'SELECT,INSERT,UPDATE')
    OR has_function_privilege(caller,'public.require_internal_document_work_owner(boolean)','EXECUTE') THEN RAISE EXCEPTION 'Private text metadata and Owner helper must remain inaccessible.' USING ERRCODE='55000';END IF;
  END LOOP;
 END LOOP;
END;$text_review_install$;

CREATE FUNCTION public.inspect_internal_owner_text_work(_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog SET TimeZone='UTC'
AS $text_work_detail$
DECLARE c public.document_text_extraction_capacity%ROWTYPE;p public.document_text_save_completions%ROWTYPE;revision bigint;finished boolean;relation_name text;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT t.revision INTO revision FROM public.document_operation_control t WHERE singleton AND paused FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pause document processing before reviewing text tasks.' USING ERRCODE='55000';END IF;
 FOREACH relation_name IN ARRAY ARRAY['public.document_text_extraction_capacity','public.document_text_save_completions'] LOOP
  IF row_security_active(relation_name::regclass) OR NOT has_table_privilege(current_user,relation_name,'SELECT') THEN RAISE EXCEPTION 'Full private text metadata visibility required.' USING ERRCODE='55000';END IF;
 END LOOP;
 SELECT * INTO c FROM public.document_text_extraction_capacity WHERE operation_id=_operation_id;
 IF NOT FOUND OR _operation_id IS NULL THEN RAISE EXCEPTION 'Text task could not be confirmed.' USING ERRCODE='42501';END IF;
 SELECT * INTO p FROM public.document_text_save_completions WHERE operation_id=_operation_id;
 finished:=p.operation_id IS NOT NULL;
 IF (finished AND (p.state<>'completed' OR p.saved_revision IS NULL OR p.saved_sha256 IS NULL OR p.completed_at IS NULL OR c.state<>'active'))
  OR c.state NOT IN('active','needs_review') THEN RAISE EXCEPTION 'Text work accounting requires verified review.' USING ERRCODE='55000';END IF;
 RETURN jsonb_build_object('schema','owner-text-work-detail-v1','namespace','attached_text','operation_id',c.operation_id,'control_revision',revision,
  'state',CASE WHEN finished THEN 'completed' ELSE c.state END,'hold_reason',CASE WHEN finished THEN NULL ELSE c.hold_reason END,
  'remaining_shared_units',CASE WHEN finished THEN 0 ELSE 1 END,'recorded_completion',finished,
  'external_quiescence_verified',false,'release_permitted',false);
END;$text_work_detail$;
REVOKE ALL ON FUNCTION public.inspect_internal_owner_text_work(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.list_owner_text_work(_after_operation_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC'
AS $text_work_queue$
DECLARE actor uuid;revision bigint;items jsonb;more boolean;cursor_id uuid;
BEGIN
 actor:=public.require_internal_document_work_owner(false);PERFORM public.lock_internal_document_capacity_completion();
 SELECT t.revision INTO revision FROM public.document_operation_control t WHERE singleton AND paused FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pause document processing before reviewing text tasks.' USING ERRCODE='55000';END IF;
 IF row_security_active('public.document_text_extraction_capacity'::regclass) OR row_security_active('public.document_text_save_completions'::regclass)
  OR NOT has_table_privilege(current_user,'public.document_text_extraction_capacity','SELECT') OR NOT has_table_privilege(current_user,'public.document_text_save_completions','SELECT') THEN RAISE EXCEPTION 'Full private text metadata visibility required.' USING ERRCODE='55000';END IF;
 IF EXISTS(SELECT 1 FROM public.document_text_save_completions p JOIN public.document_text_extraction_capacity c USING(operation_id) WHERE p.state<>'completed' OR p.saved_revision IS NULL OR p.saved_sha256 IS NULL OR p.completed_at IS NULL OR c.state<>'active') THEN RAISE EXCEPTION 'Text work accounting requires verified review.' USING ERRCODE='55000';END IF;
 WITH page AS(SELECT c.operation_id,c.state FROM public.document_text_extraction_capacity c
  WHERE NOT EXISTS(SELECT 1 FROM public.document_text_save_completions p WHERE p.operation_id=c.operation_id)
   AND (_after_operation_id IS NULL OR c.operation_id>_after_operation_id) ORDER BY c.operation_id LIMIT 26),
 numbered AS(SELECT *,row_number() OVER(ORDER BY operation_id) AS n FROM page)
 SELECT COALESCE(jsonb_agg(jsonb_build_object('operation_id',operation_id,'state',state) ORDER BY operation_id)FILTER(WHERE n<=25),'[]'::jsonb),count(*)>25,
  (array_agg(operation_id ORDER BY operation_id)FILTER(WHERE n<=25))[25] INTO items,more,cursor_id FROM numbered;
 RETURN jsonb_build_object('schema','owner-text-work-queue-v1','namespace','attached_text','control_revision',revision,'paused',true,
  'items',items,'has_more',more,'next_cursor',CASE WHEN more THEN cursor_id ELSE NULL END,'external_quiescence_verified',false,'release_permitted',false);
END;$text_work_queue$;

CREATE FUNCTION public.inspect_owner_text_work(_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC'
AS $text_work_boundary$
DECLARE actor uuid;
BEGIN
 actor:=public.require_internal_document_work_owner(false);
 RETURN public.inspect_internal_owner_text_work(_operation_id);
END;$text_work_boundary$;
REVOKE ALL ON FUNCTION public.list_owner_text_work(uuid),public.inspect_owner_text_work(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.list_owner_text_work(uuid),public.inspect_owner_text_work(uuid) TO authenticated;
COMMIT;
