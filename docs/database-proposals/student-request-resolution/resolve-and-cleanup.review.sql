-- Separate review draft 17. Not a canonical migration or hosted authorization.
BEGIN;
ALTER TABLE public.student_lifecycle_receipts
 ADD COLUMN creation_closed boolean NOT NULL DEFAULT false;

CREATE FUNCTION public.close_student_creation_request(_expected_viewer_id uuid,_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $body$
DECLARE actor uuid:=auth.uid();receipt public.student_lifecycle_receipts%ROWTYPE;current_owner uuid;state text;
BEGIN
 IF actor IS NULL OR actor IS DISTINCT FROM _expected_viewer_id OR _request_id IS NULL THEN
  RAISE EXCEPTION 'Account changed. Check setup again.' USING ERRCODE='42501';
 END IF;
 -- A minimal reservation, never a student DELETE. The existing BEFORE INSERT
 -- trigger reserves this same unique key, so concurrent/in-flight creation must
 -- either commit first or fail after closure. A failed creation rolls back its key.
 -- Do not mark an untracked legacy student absent or claim to have removed it.
 INSERT INTO public.student_lifecycle_receipts(student_id,original_owner_id,removed_at,creation_closed)
 SELECT _request_id,actor,clock_timestamp(),true
 WHERE NOT EXISTS(SELECT 1 FROM public.students WHERE id=_request_id)
 ON CONFLICT(student_id) DO NOTHING;
 -- Same owner-scoped student-before-receipt read order as draft16.
 SELECT owner_id INTO current_owner FROM public.students
 WHERE id=_request_id AND owner_id=actor FOR SHARE;
 SELECT * INTO receipt FROM public.student_lifecycle_receipts
 WHERE student_id=_request_id AND original_owner_id=actor;
 IF NOT FOUND THEN state:='unconfirmed';
 ELSIF current_owner=actor THEN state:='present';
 ELSIF receipt.creation_closed OR receipt.removed_at IS NOT NULL THEN state:='closed';
 ELSE state:='unconfirmed'; END IF;
 RETURN jsonb_build_object('schema','student-request-closure-v1','actor_id',actor,
  'request_id',_request_id,'status',state);
END;$body$;
REVOKE ALL ON FUNCTION public.close_student_creation_request(uuid,uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.close_student_creation_request(uuid,uuid) TO authenticated;

-- FK actions hold the referenced student identity through child writes, including
-- raw writers. No application loop or read-then-delete race is called atomic.
-- NOT VALID preserves historical orphans for explicit review; new writes and
-- parent deletions are enforced immediately. No existing row is removed here.
ALTER TABLE public.feed_events ADD CONSTRAINT feed_events_student_cleanup_fk
 FOREIGN KEY(student_id) REFERENCES public.students(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.in_app_notifications ADD CONSTRAINT in_app_notifications_student_cleanup_fk
 FOREIGN KEY(student_id) REFERENCES public.students(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.student_saved_partners ADD CONSTRAINT student_saved_partners_student_cleanup_fk
 FOREIGN KEY(student_id) REFERENCES public.students(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.document_apply_completion_receipts ADD CONSTRAINT document_apply_completion_receipts_student_cleanup_fk
 FOREIGN KEY(student_id) REFERENCES public.students(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.document_registration_completion_receipts ADD CONSTRAINT document_registration_completion_receipts_student_cleanup_fk
 FOREIGN KEY(student_id) REFERENCES public.students(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.document_summary_completion_receipts ADD CONSTRAINT document_summary_completion_receipts_student_cleanup_fk
 FOREIGN KEY(student_id) REFERENCES public.students(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.document_summary_operation_bindings ADD CONSTRAINT document_summary_operation_bindings_student_cleanup_fk
 FOREIGN KEY(student_id) REFERENCES public.students(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.document_upload_operation_bindings ADD CONSTRAINT document_upload_operation_bindings_student_cleanup_fk
 FOREIGN KEY(student_id) REFERENCES public.students(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.form_responses ADD CONSTRAINT form_responses_student_cleanup_fk
 FOREIGN KEY(student_id) REFERENCES public.students(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.message_threads ADD CONSTRAINT message_threads_student_cleanup_fk
 FOREIGN KEY(student_id) REFERENCES public.students(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.ppt_meeting_preps ADD CONSTRAINT ppt_meeting_preps_student_cleanup_fk
 FOREIGN KEY(student_id) REFERENCES public.students(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.student_voice_responses ADD CONSTRAINT student_voice_responses_student_cleanup_fk
 FOREIGN KEY(student_id) REFERENCES public.students(id) ON DELETE RESTRICT NOT VALID;

-- Existing Transition Channel cascades can erase messages, attachments and
-- retained-history grants. Preserve both channels and recorded removal choices
-- until an explicit conversation-retention cleanup protocol has completed.
DO $chat_guard$
DECLARE relation text;dependency record;n integer;
BEGIN
 FOREACH relation IN ARRAY ARRAY['channels','student_channel_removals'] LOOP
  SELECT count(*) INTO n FROM pg_constraint WHERE conrelid=to_regclass('public.'||relation)
   AND confrelid='public.students'::regclass AND contype='f';
  IF n<>1 THEN RAISE EXCEPTION 'Expected exactly one conversation/student reference.';END IF;
  SELECT * INTO dependency FROM pg_constraint WHERE conrelid=to_regclass('public.'||relation)
   AND confrelid='public.students'::regclass AND contype='f';
  IF dependency.confdeltype<>'c' OR dependency.conkey<>ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=to_regclass('public.'||relation) AND attname='student_id')]::smallint[]
   OR dependency.confkey<>ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='public.students'::regclass AND attname='id')]::smallint[] THEN
   RAISE EXCEPTION 'Unexpected conversation reference baseline.';END IF;
  EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I',relation,dependency.conname);
  EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY(student_id) REFERENCES public.students(id) ON DELETE RESTRICT NOT VALID',relation,dependency.conname);
  IF dependency.convalidated THEN EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I',relation,dependency.conname);END IF;
 END LOOP;
END;$chat_guard$;

-- Ensure each new reference has a usable leading-column index without duplicating
-- an existing one. No index grants or table policies are changed.
DO $indexes$
DECLARE relation text;relation_oid oid;column_number smallint;
BEGIN
 FOREACH relation IN ARRAY ARRAY['feed_events','in_app_notifications','student_saved_partners','document_apply_completion_receipts','document_registration_completion_receipts','document_summary_completion_receipts','document_summary_operation_bindings','document_upload_operation_bindings','form_responses','message_threads','ppt_meeting_preps','student_voice_responses'] LOOP
  relation_oid:=to_regclass('public.'||relation);
  SELECT attnum INTO column_number FROM pg_attribute WHERE attrelid=relation_oid AND attname='student_id' AND NOT attisdropped;
  IF NOT EXISTS(SELECT 1 FROM pg_index WHERE indrelid=relation_oid AND indisvalid AND indpred IS NULL AND indkey[0]=column_number) THEN
   EXECUTE format('CREATE INDEX %I ON public.%I(student_id)',relation||'_student_cleanup_idx',relation);
  END IF;
 END LOOP;
END;$indexes$;
COMMIT;
