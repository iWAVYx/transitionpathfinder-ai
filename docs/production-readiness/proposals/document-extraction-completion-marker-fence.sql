-- REVIEW-ONLY proposal37. No hosted installation or activation authority.
-- Preserve the real bound Apply completion observer; close earlier marker
-- forgery and later completed-review mutation without granting any new writer.
BEGIN;
SET LOCAL search_path=pg_catalog;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $completion_marker_fence$
DECLARE definition text;anchor text;replacement text;old_hash text;new_hash text;protocol text;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 PERFORM public.assert_internal_document_text_protocol();
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused) OR public.count_internal_combined_document_capacity(NULL,NULL)<>0 THEN
  RAISE EXCEPTION 'Pause and reconcile unfinished work before preparing marker fences.' USING ERRCODE='55000';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.guard_document_extraction_source_write()'::regprocedure
  AND md5(prosrc)='5c4426d98589aeba2c091c1f674d5bf6' AND prosecdef AND proowner=current_user::regrole::oid
  AND proconfig=ARRAY['search_path=pg_catalog'] AND provolatile='v')
  OR (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.assert_internal_document_text_protocol()'::regprocedure)<>'c2b9bea3f70690c1a3551eb7eefe0bf7' THEN
  RAISE EXCEPTION 'Exact reviewed source writer and protocol are required.' USING ERRCODE='55000';END IF;
 definition:=pg_get_functiondef('public.guard_document_extraction_source_write()'::regprocedure);
 anchor:=' IF TG_OP=''UPDATE'' AND (to_jsonb(NEW)-''updated_at'') IS NOT DISTINCT FROM (to_jsonb(OLD)-''updated_at'') THEN RETURN NEW;END IF;';
 replacement:=$marker_checks$ IF TG_OP='UPDATE' THEN
  IF OLD.status::text='complete' AND (to_jsonb(NEW)-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'updated_at') THEN
   RAISE EXCEPTION 'A completed review is read-only.' USING ERRCODE='42501';END IF;
  IF (NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at)
   AND NEW.status::text IS DISTINCT FROM 'complete' THEN
   RAISE EXCEPTION 'Reviewer details require a confirmed Apply.' USING ERRCODE='42501';END IF;
 END IF;
$marker_checks$||anchor;
 IF position(anchor IN definition)=0 OR (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1 THEN
  RAISE EXCEPTION 'Exact revision-only recovery boundary required.' USING ERRCODE='55000';END IF;
 EXECUTE replace(definition,anchor,replacement);
 old_hash:='5c4426d98589aeba2c091c1f674d5bf6';
 SELECT md5(prosrc) INTO new_hash FROM pg_proc WHERE oid='public.guard_document_extraction_source_write()'::regprocedure;
 protocol:=pg_get_functiondef('public.assert_internal_document_text_protocol()'::regprocedure);
 anchor:=format('(''public.guard_document_extraction_source_write()'',%L,true,false,false)',old_hash);
 replacement:=format('(''public.guard_document_extraction_source_write()'',%L,true,false,false)',new_hash);
 IF position(anchor IN protocol)=0 THEN RAISE EXCEPTION 'Exact source writer protocol inventory required.' USING ERRCODE='55000';END IF;
 EXECUTE replace(protocol,anchor,replacement);
 PERFORM public.assert_internal_document_text_protocol();
END;$completion_marker_fence$;
COMMIT;
