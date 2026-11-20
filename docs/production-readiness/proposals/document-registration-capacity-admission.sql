-- DRAFT ONLY: registration capacity admission; not canonical or hosted.
-- Reserve both obligations before the upload reservation transaction returns.
-- Producer result/queue/settlement integration remains a separate requirement.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $preflight$
DECLARE relation_name text; caller text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused)
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.bind_document_upload_operation()'::regprocedure
   AND md5(prosrc)='3c523e43d31e411968ea0c768fd33222' AND prosecdef AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog'])
  OR has_function_privilege('service_role','public.reserve_internal_document_capacity(uuid,uuid)','EXECUTE')
  OR has_function_privilege('authenticated','public.reserve_internal_document_capacity(uuid,uuid)','EXECUTE')
  OR has_function_privilege('anon','public.reserve_internal_document_capacity(uuid,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Reviewed paused registration capacity prerequisites required';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.reserve_internal_document_capacity(uuid,uuid)'::regprocedure
  AND md5(prosrc)='08c62d8c20c1c5cb0eb6b1bbd14cde2d' AND NOT prosecdef AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog'])
  OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.document_upload_attempts'::regclass
   AND tgname='upload_attempt_bind_operation' AND tgfoid='public.bind_document_upload_operation()'::regprocedure
   AND tgtype=5 AND tgenabled='O' AND NOT tgisinternal) THEN
  RAISE EXCEPTION 'Reviewed reservation helper and binding trigger required';
 END IF;
 FOREACH relation_name IN ARRAY ARRAY['public.document_capacity_reservations','public.document_capacity_policy','public.document_upload_operation_bindings'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(relation_name) AND relowner=current_user::regrole::oid AND relrowsecurity) THEN
   RAISE EXCEPTION 'Private registration capacity ownership and RLS required'; END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_any_column_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,REFERENCES') THEN
    RAISE EXCEPTION 'Private registration capacity permissions required'; END IF;
  END LOOP;
 END LOOP;
END; $preflight$;
CREATE OR REPLACE FUNCTION public.bind_document_upload_operation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $bind_interval$
DECLARE operation uuid:=gen_random_uuid(); receipt jsonb;
BEGIN
 IF auth.uid() IS NULL OR NEW.actor_id IS DISTINCT FROM auth.uid() OR NEW.state<>'reserved'
  OR NEW.registered_document_id IS NOT NULL OR NEW.held_at IS NOT NULL OR NEW.hold_reason IS NOT NULL
  OR public.can_edit_student(NEW.actor_id,NEW.student_id) IS DISTINCT FROM true OR public.is_partner_only(NEW.actor_id) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'This upload could not be tracked.' USING ERRCODE='42501';
 END IF;
 receipt:=public.begin_document_operation(operation,NEW.actor_id,'register');
 IF receipt->>'schema' IS DISTINCT FROM 'document-operation-admitted-v1' OR receipt->>'operation_id' IS DISTINCT FROM operation::text THEN
  RAISE EXCEPTION 'This upload could not be tracked.' USING ERRCODE='55000';
 END IF;
 INSERT INTO public.document_upload_operation_bindings(attempt_id,operation_id,actor_id,student_id,storage_path,content_sha256,review_context_sha256)
  VALUES(NEW.id,operation,NEW.actor_id,NEW.student_id,NEW.storage_path,NEW.claimed_content_sha256,NEW.review_context_sha256);
 PERFORM public.reserve_internal_document_capacity(operation,NEW.student_id);
 IF NOT EXISTS(SELECT 1 FROM public.document_capacity_reservations
  WHERE operation_id=operation AND actor_id=NEW.actor_id AND student_id=NEW.student_id
   AND producer_kind='register' AND reserved_units=2 AND summary_job_id IS NULL AND summary_operation_id IS NULL)
  OR NOT EXISTS(SELECT 1 FROM public.document_upload_operation_bindings WHERE attempt_id=NEW.id
   AND operation_id=operation AND actor_id=NEW.actor_id AND student_id=NEW.student_id
   AND storage_path=NEW.storage_path AND content_sha256=NEW.claimed_content_sha256
   AND review_context_sha256=NEW.review_context_sha256) THEN
  RAISE EXCEPTION 'The upload capacity reservation could not be confirmed.' USING ERRCODE='55000';
 END IF;
 RETURN NEW;
END; $bind_interval$;
COMMIT;
