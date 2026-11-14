-- REVIEW DRAFT ONLY. Service-only source-bound attached-text admission/hold.
-- No provider call, deployment, migration authorization or activation.
BEGIN;
SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
CREATE FUNCTION public.assert_internal_document_text_protocol()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $text_protocol$
DECLARE item record;caller text;relation_name text;
BEGIN
 FOR item IN SELECT * FROM (VALUES
  ('public.guard_document_text_save_completion()','c1f9e966a86753b9ddcda5ecfde443ac',true,true,false),
  ('public.verify_document_text_save_commit()','d0ae2d6b7bea8cf6c8aa20829fc7c1da',true,true,false),
  ('public.guard_bound_document_text_source()','2312833f0a9da3b241bbd659e4f35bf8',true,false,false),
  ('public.prepare_bound_document_text_save(uuid,uuid,text,uuid,uuid,uuid,timestamptz,timestamptz,text)','7f02219669c91b7f6ecc6ad3651dbbef',true,false,true),
  ('public.complete_bound_document_text_save(uuid,uuid,jsonb)','75bd94fa3174894a6c12d6741504ef92',true,true,true),
  ('public.save_bound_document_text_review(uuid,uuid,text,uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb,jsonb)','eb49131e983ff85cc7323064c086b625',false,true,true),
  ('public.count_internal_document_text_capacity(uuid,uuid,text)','522274f8d24db0b5651b7e5ceadd49d8',true,false,false),
  ('public.guard_document_text_capacity()','913806fa4f0331c653abe6259d959074',false,true,false),
  ('public.lock_internal_document_capacity()','2f5b3f16774b99e22e8e61bcce8d7828',false,false,false),
  ('public.lock_internal_document_capacity_completion()','be973fc53b7930db60f9456ba1f26548',false,false,false),
  ('public.lock_internal_document_text_authority(uuid,uuid)','d0ef5f64f342009b92432b279ce9c5f1',false,false,false),
  ('public.lock_document_text_review_authority(uuid)','f437d1d92e80319c437aaba69590685e',true,false,true),
  ('public.lock_document_text_role_change()','15b2fa145f63b5612ba71394d5b503dc',false,false,false),
  ('public.save_document_text_review(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb,jsonb)','e44e6dc8a4d7b27c89a72519f6473478',false,false,true),
  ('public.reserve_internal_document_text_capacity(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text)','fe15e374b37a5df835d413cd47f2211f',false,true,false),
  ('public.hold_internal_document_text_capacity(uuid,uuid,uuid,text)','00272928f11fe32d05fd27faf2ca952b',false,false,false),
  ('public.count_internal_combined_document_capacity(uuid,uuid)','8966615b2ad7eade70f42a05530872ff',false,false,false),
  ('public.assert_internal_combined_document_capacity(uuid,uuid,integer)','223b615acaa1425b47ba71bf7c6ef182',false,false,false),
  ('public.guard_existing_capacity_text_pool()','3b6c8f5d007177362440ea64a923db74',false,false,false),
  ('public.guard_document_capacity_reservation()','f16664ce92d6398ccfea11b43fb5fc74',false,false,false)
 ) expected(signature,body_md5,definer,utc,actor_exec) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5
   AND proowner=current_user::regrole::oid AND prosecdef=item.definer
   AND proconfig=CASE WHEN item.utc THEN ARRAY['search_path=pg_catalog','TimeZone=UTC'] ELSE ARRAY['search_path=pg_catalog'] END) THEN
   RAISE EXCEPTION 'The reviewed document save protocol is unavailable.' USING ERRCODE='55000';END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(caller,item.signature,'EXECUTE') IS DISTINCT FROM (caller='authenticated' AND item.actor_exec) THEN
    RAISE EXCEPTION 'The reviewed document protocol permissions are unavailable.' USING ERRCODE='55000';END IF;
  END LOOP;
 END LOOP;
 FOREACH relation_name IN ARRAY ARRAY['public.document_text_extraction_capacity','public.document_text_save_completions','public.document_capacity_reservations'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(relation_name) AND relowner=current_user::regrole::oid AND relrowsecurity AND NOT row_security_active(oid)) THEN
   RAISE EXCEPTION 'Private document accounting is unavailable.' USING ERRCODE='55000';END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_any_column_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,REFERENCES') THEN
    RAISE EXCEPTION 'Private document accounting permissions are unavailable.' USING ERRCODE='55000';END IF;
  END LOOP;
 END LOOP;
 FOR item IN SELECT * FROM (VALUES
  ('public.document_text_save_completions','document_text_completion_frozen','public.guard_document_text_save_completion()',31,false),
  ('public.document_text_save_completions','document_text_completion_no_truncate','public.guard_document_text_save_completion()',34,false),
  ('public.document_text_save_completions','document_text_completion_commit','public.verify_document_text_save_commit()',21,true),
  ('public.document_extractions','document_text_bound_review_source','public.guard_bound_document_text_source()',27,false),
  ('public.documents','document_text_bound_document_source','public.guard_bound_document_text_source()',27,false),
  ('public.document_extractions','document_text_bound_review_truncate','public.guard_bound_document_text_source()',34,false),
  ('public.documents','document_text_bound_document_truncate','public.guard_bound_document_text_source()',34,false),
  ('public.document_text_extraction_capacity','document_text_capacity_frozen','public.guard_document_text_capacity()',31,false),
  ('public.document_text_extraction_capacity','document_text_capacity_no_truncate','public.guard_document_text_capacity()',34,false),
  ('public.document_capacity_reservations','document_capacity_text_pool','public.guard_existing_capacity_text_pool()',7,false),
  ('public.document_capacity_reservations','document_capacity_frozen','public.guard_document_capacity_reservation()',31,false),
  ('public.user_roles','user_roles_document_text_authority','public.lock_document_text_role_change()',31,false)
 ) expected(relation_name,trigger_name,signature,event_type,deferred) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass(item.relation_name) AND tgname=item.trigger_name
   AND tgfoid=to_regprocedure(item.signature) AND tgtype=item.event_type AND tgenabled='O' AND NOT tgisinternal
   AND tgdeferrable=item.deferred AND tginitdeferred=item.deferred AND tgqual IS NULL AND tgattr::text='' AND tgnargs=0) THEN
   RAISE EXCEPTION 'The reviewed document commit and capacity safeguards are unavailable.' USING ERRCODE='55000';END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.document_extractions'::regclass AND tgname='document_extractions_set_updated_at' AND tgenabled='O' AND tgtype=19 AND NOT tgisinternal AND tgqual IS NULL AND tgattr::text='' AND tgnargs=0)
  OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.documents'::regclass AND tgname='set_updated_at_documents' AND tgenabled='O' AND tgtype=19 AND NOT tgisinternal AND tgqual IS NULL AND tgattr::text='' AND tgnargs=0)
  OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.documents'::regclass AND relrowsecurity)
  OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.document_extractions'::regclass AND relrowsecurity)
  OR NOT EXISTS(SELECT 1 FROM public.document_capacity_policy WHERE singleton AND global_units=32 AND actor_units=4 AND student_units=2) THEN
  RAISE EXCEPTION 'Current source safeguards and the selected capacity policy are required.' USING ERRCODE='55000';END IF;
END;$text_protocol$;
REVOKE ALL ON FUNCTION public.assert_internal_document_text_protocol() FROM PUBLIC,anon,authenticated,service_role;
DO $text_protocol_preflight$
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 PERFORM public.assert_internal_document_text_protocol();
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused)
  OR public.count_internal_document_text_capacity(NULL,NULL,NULL)<>0 THEN
  RAISE EXCEPTION 'Keep processing paused and reconcile unfinished text work before installation.' USING ERRCODE='55000';END IF;
END;$text_protocol_preflight$;
CREATE FUNCTION public.begin_bound_document_text_extraction(_operation_id uuid,_actor_id uuid,_student_id uuid,_document_id uuid,_extraction_id uuid,
 _expected_review_revision timestamptz,_expected_document_revision timestamptz,_expected_review_status text,_source_text_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC'
AS $text_begin$
DECLARE c public.document_text_extraction_capacity%ROWTYPE;
BEGIN
 IF _operation_id IS NULL OR _actor_id IS NULL OR _student_id IS NULL OR _document_id IS NULL OR _extraction_id IS NULL
  OR _expected_review_revision IS NULL OR NOT isfinite(_expected_review_revision)
  OR _expected_document_revision IS NULL OR NOT isfinite(_expected_document_revision)
  OR _expected_review_status IS NULL OR _expected_review_status NOT IN('pending','needs_review','in_review')
  OR _source_text_sha256 IS NULL OR _source_text_sha256 !~ '^[a-f0-9]{64}$'
  OR current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'Current document details are required before processing.' USING ERRCODE='42501';END IF;
 PERFORM public.lock_internal_document_capacity();
 -- Availability is checked before any reservation or provider permission exists.
 PERFORM public.assert_internal_document_text_protocol();
 PERFORM public.reserve_internal_document_text_capacity(_operation_id,_actor_id,_student_id,_document_id,_extraction_id,
  _expected_review_revision,_expected_document_revision,_expected_review_status,_source_text_sha256);
 SELECT * INTO c FROM public.document_text_extraction_capacity WHERE operation_id=_operation_id;
 IF NOT FOUND OR c.admitted_revision NOT BETWEEN 1 AND 9007199254740991
  OR public.can_view_document(_actor_id,_document_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'The current document reservation could not be confirmed.' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('schema','document-text-extraction-admitted-v1','save_protocol','bound-document-text-review-save-v1',
  'operation_id',c.operation_id,'receipt_id',c.receipt_id,'actor_id',c.actor_id,'student_id',c.student_id,
  'document_id',c.document_id,'extraction_id',c.extraction_id,'revision',c.admitted_revision,'reserved_units',1,
  'source_text_sha256',c.source_text_sha256,'source_revision',c.source_revision,'document_revision',c.document_revision);
END;$text_begin$;
CREATE FUNCTION public.hold_bound_document_text_extraction(_operation_id uuid,_actor_id uuid,_receipt_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC'
AS $text_hold$
DECLARE c public.document_text_extraction_capacity%ROWTYPE;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT * INTO c FROM public.document_text_extraction_capacity WHERE operation_id=_operation_id FOR UPDATE;
 IF NOT FOUND OR _actor_id IS NULL OR _receipt_id IS NULL OR c.actor_id IS DISTINCT FROM _actor_id OR c.receipt_id IS DISTINCT FROM _receipt_id THEN
  RAISE EXCEPTION 'The matching document reservation is required.' USING ERRCODE='42501';END IF;
 -- A lost successful save reply must not reopen, hold or release completed work.
 IF EXISTS(SELECT 1 FROM public.document_text_save_completions WHERE operation_id=c.operation_id AND state='completed') THEN
  RETURN jsonb_build_object('schema','document-text-extraction-held-v1','operation_id',c.operation_id,'state','completed');END IF;
 PERFORM public.hold_internal_document_text_capacity(c.operation_id,c.actor_id,c.receipt_id,'provider_uncertain');
 RETURN jsonb_build_object('schema','document-text-extraction-held-v1','operation_id',c.operation_id,'state','needs_review');
END;$text_hold$;
REVOKE ALL ON FUNCTION public.begin_bound_document_text_extraction(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text),public.hold_bound_document_text_extraction(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.begin_bound_document_text_extraction(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text),public.hold_bound_document_text_extraction(uuid,uuid,uuid) TO service_role;
DO $public_text_permissions$
DECLARE caller text;signature text;
BEGIN
 FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  FOREACH signature IN ARRAY ARRAY['public.begin_bound_document_text_extraction(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text)','public.hold_bound_document_text_extraction(uuid,uuid,uuid)'] LOOP
   IF has_function_privilege(caller,signature,'EXECUTE') IS DISTINCT FROM (caller='service_role') THEN
    RAISE EXCEPTION 'Text admission and holds must be service-only.' USING ERRCODE='55000';END IF;
  END LOOP;
 END LOOP;
END;$public_text_permissions$;
COMMENT ON FUNCTION public.begin_bound_document_text_extraction(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text) IS 'Service-only committed source claim for attached text; one shared32/4/2 unit. Receipt stays server-private. No lookup, reuse, generic fallback, model dispatch, provider proof or rollout authority.';
COMMIT;
