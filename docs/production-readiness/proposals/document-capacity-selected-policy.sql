-- DRAFT ONLY. Owner-selected32/4/2 source policy, not hosted authorization.
-- Requires the complete reviewed control chain. Leaves admissions paused.
-- Not a repeatable update or reconciliation/release mechanism.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $selected_policy$
DECLARE item record; caller text; relation_name text; paused_state boolean; stored public.document_capacity_policy%ROWTYPE;
BEGIN
 FOR item IN SELECT * FROM (VALUES
 ('public.lock_internal_document_capacity_completion()','be973fc53b7930db60f9456ba1f26548'),
 ('public.guard_document_capacity_reservation()','43fdfb570c91ead44f38c4c5c9b02350')
 ) expected(signature,body_md5) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5
   AND NOT prosecdef AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog']) THEN
   RAISE EXCEPTION 'Exact reviewed capacity implementation required' USING ERRCODE='55000'; END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(caller,item.signature,'EXECUTE') THEN RAISE EXCEPTION 'Capacity helpers must remain private' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 FOREACH relation_name IN ARRAY ARRAY['public.document_capacity_policy','public.document_capacity_reservations'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(relation_name) AND relowner=current_user::regrole::oid AND relrowsecurity AND relkind='r')
   OR EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=to_regclass(relation_name)) THEN
   RAISE EXCEPTION 'Private capacity policy ownership and RLS required' USING ERRCODE='55000'; END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_any_column_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,REFERENCES') THEN
    RAISE EXCEPTION 'Capacity relation permissions must remain private' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.document_capacity_reservations'::regclass
  AND tgname='document_capacity_frozen' AND tgfoid='public.guard_document_capacity_reservation()'::regprocedure
  AND tgtype=31 AND tgenabled='O' AND NOT tgisinternal AND NOT tgdeferrable AND tgqual IS NULL AND tgattr::text='') THEN
  RAISE EXCEPTION 'Reviewed enabled capacity guard required' USING ERRCODE='55000'; END IF;
 FOREACH relation_name IN ARRAY ARRAY['public.document_operation_control','public.document_operation_leases','public.document_capacity_policy','public.document_capacity_reservations','public.ai_jobs'] LOOP
  IF row_security_active(relation_name::regclass) OR NOT has_table_privilege(current_user,relation_name,'SELECT') THEN
   RAISE EXCEPTION 'Full trusted policy and work visibility required' USING ERRCODE='55000'; END IF;
 END LOOP;
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT paused INTO paused_state FROM public.document_operation_control WHERE singleton FOR SHARE;
 IF NOT FOUND OR paused_state IS DISTINCT FROM true THEN RAISE EXCEPTION 'Keep processing paused during policy installation' USING ERRCODE='55000'; END IF;
 SELECT * INTO stored FROM public.document_capacity_policy WHERE singleton FOR UPDATE;
 IF NOT FOUND OR stored.global_units IS NOT NULL OR stored.actor_units IS NOT NULL OR stored.student_units IS NOT NULL
  OR EXISTS(SELECT 1 FROM public.document_capacity_reservations)
  OR EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IS DISTINCT FROM 'completed')
  OR EXISTS(SELECT 1 FROM public.ai_jobs WHERE job_type='document_summary' AND status IS DISTINCT FROM 'completed') THEN
  RAISE EXCEPTION 'Existing policy or work requires separate reconciliation' USING ERRCODE='55000'; END IF;
 UPDATE public.document_capacity_policy SET global_units=32,actor_units=4,student_units=2
  WHERE singleton AND global_units IS NULL AND actor_units IS NULL AND student_units IS NULL RETURNING * INTO stored;
 IF NOT FOUND OR stored.global_units IS DISTINCT FROM 32 OR stored.actor_units IS DISTINCT FROM 4 OR stored.student_units IS DISTINCT FROM 2 THEN
  RAISE EXCEPTION 'Exact selected capacity policy was not saved' USING ERRCODE='55000'; END IF;
END; $selected_policy$;
COMMIT;
