-- Reviewed source only: no hosted execution without separate migration authorization.
-- Existing links are retired. The user selected permanent closure on access loss.
BEGIN;

DO $lifecycle_prerequisite$
DECLARE sig text; col record;
BEGIN
 IF current_user IN ('anon','authenticated','service_role') OR NOT EXISTS(
  SELECT 1 FROM pg_class WHERE oid='public.share_tokens'::regclass AND relowner=current_user::regrole AND relrowsecurity AND NOT relforcerowsecurity
 ) THEN RAISE EXCEPTION 'Expected privileged share-table owner with reviewed RLS'; END IF;
 FOREACH sig IN ARRAY ARRAY['public.resolve_share_token(text)','public.track_share_view(text)'] LOOP
  IF has_function_privilege('anon',sig,'EXECUTE') OR has_function_privilege('authenticated',sig,'EXECUTE') OR NOT has_function_privilege('service_role',sig,'EXECUTE') THEN RAISE EXCEPTION 'Server-only sharing prerequisite mismatch'; END IF;
 END LOOP;
 IF has_any_column_privilege('anon','public.share_tokens','SELECT') OR has_table_privilege('anon','public.share_tokens','INSERT') OR has_any_column_privilege('anon','public.share_tokens','UPDATE') OR has_table_privilege('anon','public.share_tokens','DELETE') THEN RAISE EXCEPTION 'Anonymous share-table privilege prerequisite mismatch'; END IF;
 FOR col IN SELECT attname FROM pg_attribute WHERE attrelid='public.share_tokens'::regclass AND attnum>0 AND NOT attisdropped AND attname<>'revoked' LOOP
  IF has_column_privilege('authenticated','public.share_tokens',col.attname,'UPDATE') THEN RAISE EXCEPTION 'Unexpected share-column update prerequisite'; END IF;
 END LOOP;
 IF has_table_privilege('authenticated','public.share_tokens','UPDATE') OR has_table_privilege('authenticated','public.share_tokens','DELETE') OR NOT has_column_privilege('authenticated','public.share_tokens','revoked','UPDATE') THEN RAISE EXCEPTION 'Revoked-only client mutation prerequisite mismatch'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.resolve_share_token(text)'::regprocedure AND md5(prosrc)='202a554b5536957147d0cd9a3b4873e2' AND prosecdef AND proowner=current_user::regrole AND proconfig=ARRAY['search_path=public']) THEN RAISE EXCEPTION 'Unexpected resolve_share_token prerequisite body'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.track_share_view(text)'::regprocedure AND md5(prosrc)='0b5ec346923e2ec0dc29ea4a302c9a10' AND prosecdef AND proowner=current_user::regrole AND proconfig=ARRAY['search_path=public']) THEN RAISE EXCEPTION 'Unexpected track_share_view prerequisite body'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.can_access_student(uuid,uuid)'::regprocedure AND md5(prosrc)='c2dcc71ecab9bc4b982d7f81793da2aa' AND prosecdef AND proowner=current_user::regrole AND proconfig=ARRAY['search_path=public']) THEN RAISE EXCEPTION 'Unexpected can_access_student prerequisite body'; END IF;
END;
$lifecycle_prerequisite$;

ALTER TABLE public.share_tokens
 ADD COLUMN context_bound boolean NOT NULL DEFAULT false,
 ADD COLUMN bound_student_id uuid,
 ADD COLUMN bound_report_owner_id uuid,
 ADD COLUMN bound_intake_id uuid;

-- Keep all existing sharing screens truthful: old links are closed, not shown
-- as active while the resolver rejects their unknowable original context.
UPDATE public.share_tokens SET revoked=true WHERE NOT context_bound AND NOT revoked;

-- Private predicate: execution is limited to trusted function owners. Use the
-- reviewed actor-specific consent helper; never impersonate a JWT or grant an
-- administrator implicit access. Normal content updates stay live on a link.
CREATE FUNCTION public.report_share_is_eligible(_share_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $eligible$
 SELECT EXISTS (
  SELECT 1 FROM public.share_tokens st JOIN public.pathway_reports r ON r.id=st.report_id
  WHERE st.id=_share_id AND st.context_bound AND NOT st.revoked
   AND st.audience IN ('family','educator')
   AND st.expires_at IS NOT NULL AND st.expires_at > now()
   AND st.bound_student_id IS NOT DISTINCT FROM r.student_id
   AND st.bound_report_owner_id IS NOT DISTINCT FROM r.user_id
   AND st.bound_intake_id IS NOT DISTINCT FROM r.intake_id
   AND ((r.student_id IS NULL AND r.user_id=st.created_by)
     OR (r.student_id IS NOT NULL AND public.can_access_student(st.created_by,r.student_id)))
 );
$eligible$;
REVOKE ALL ON FUNCTION public.report_share_is_eligible(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.bind_report_share_context()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $bind$
DECLARE r public.pathway_reports%ROWTYPE;
BEGIN
 SELECT * INTO r FROM public.pathway_reports WHERE id=NEW.report_id FOR SHARE;
 IF NOT FOUND OR NEW.created_by IS NULL OR NOT (
  (r.student_id IS NULL AND r.user_id=NEW.created_by)
  OR (r.student_id IS NOT NULL AND public.can_access_student(NEW.created_by,r.student_id))
 ) THEN RAISE EXCEPTION 'Current report access is required to create a share link.' USING ERRCODE='42501'; END IF;
 IF NEW.audience NOT IN ('family','educator') OR NEW.audience IS NULL THEN
  RAISE EXCEPTION 'Unsupported share audience.' USING ERRCODE='22023';
 END IF;
 -- Match the existing screen's 30-day default, including direct caller inserts.
 NEW.expires_at := COALESCE(NEW.expires_at,now()+interval '30 days');
 IF NEW.expires_at <= now() OR NEW.expires_at > now()+interval '365 days' THEN
  RAISE EXCEPTION 'Share link expiry must be within the next 365 days.' USING ERRCODE='22023';
 END IF;
 -- Ignore caller-supplied bindings; capture the locked report's real identity.
 NEW.context_bound:=true;
 NEW.bound_student_id:=r.student_id;
 NEW.bound_report_owner_id:=r.user_id;
 NEW.bound_intake_id:=r.intake_id;
 RETURN NEW;
END;
$bind$;
REVOKE ALL ON FUNCTION public.bind_report_share_context() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER bind_report_share_context BEFORE INSERT ON public.share_tokens
 FOR EACH ROW EXECUTE FUNCTION public.bind_report_share_context();

-- Old links must not reactivate if a report moves away and later moves back.
CREATE FUNCTION public.revoke_shares_on_report_context_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $revoke$
BEGIN
 IF NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.intake_id IS DISTINCT FROM OLD.intake_id THEN
  UPDATE public.share_tokens SET revoked=true WHERE report_id=NEW.id AND NOT revoked;
 END IF;
 RETURN NEW;
END;
$revoke$;
REVOKE ALL ON FUNCTION public.revoke_shares_on_report_context_change() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER revoke_shares_on_report_context_change
 AFTER UPDATE OF student_id,user_id,intake_id ON public.pathway_reports
 FOR EACH ROW EXECUTE FUNCTION public.revoke_shares_on_report_context_change();

-- User-selected policy: losing the final explicit student access path closes
-- this issuer's links permanently. Re-adding the person never reopens them.
CREATE FUNCTION public.close_report_links_after_access_loss(_student_id uuid,_issuer uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $close$
BEGIN
 IF _student_id IS NULL OR _issuer IS NULL THEN RETURN; END IF;
 -- Serialize access-loss checks for this student. Two simultaneous removals
 -- of different consent paths must not both see the other path as still valid.
 PERFORM pg_advisory_xact_lock(hashtextextended('tf.report-share-access:'||_student_id::text,0));
 IF public.can_access_student(_issuer,_student_id) THEN RETURN; END IF;
 -- Lock even reports without existing links: an in-flight mint holds SHARE on
 -- the report, so removal waits for it, then closes its newly committed link.
 PERFORM r.id FROM public.pathway_reports r WHERE r.student_id=_student_id
  ORDER BY r.id FOR UPDATE;
 UPDATE public.share_tokens SET revoked=true
 WHERE context_bound AND bound_student_id=_student_id AND created_by=_issuer AND NOT revoked;
END;
$close$;
REVOKE ALL ON FUNCTION public.close_report_links_after_access_loss(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.close_report_links_on_student_access_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $access_change$
DECLARE issuer uuid;
BEGIN
 IF TG_TABLE_NAME='student_collaborators' THEN
  PERFORM public.close_report_links_after_access_loss(OLD.student_id,OLD.user_id);
 ELSIF TG_TABLE_NAME='student_relationships' THEN
  PERFORM public.close_report_links_after_access_loss(OLD.student_id,OLD.related_user_id);
 ELSIF TG_TABLE_NAME='students' THEN
  FOR issuer IN SELECT DISTINCT u FROM unnest(ARRAY[OLD.owner_id,OLD.student_user_id]) AS u WHERE u IS NOT NULL ORDER BY u LOOP
   PERFORM public.close_report_links_after_access_loss(OLD.id,issuer);
  END LOOP;
 ELSE RAISE EXCEPTION 'Unexpected student access trigger source';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$access_change$;
REVOKE ALL ON FUNCTION public.close_report_links_on_student_access_change() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER close_report_links_on_collaborator_change
 AFTER UPDATE OR DELETE ON public.student_collaborators
 FOR EACH ROW EXECUTE FUNCTION public.close_report_links_on_student_access_change();
CREATE TRIGGER close_report_links_on_relationship_change
 AFTER UPDATE OR DELETE ON public.student_relationships
 FOR EACH ROW EXECUTE FUNCTION public.close_report_links_on_student_access_change();
CREATE TRIGGER close_report_links_on_student_identity_change
 AFTER UPDATE OF owner_id,student_user_id OR DELETE ON public.students
 FOR EACH ROW EXECUTE FUNCTION public.close_report_links_on_student_access_change();

CREATE OR REPLACE FUNCTION public.resolve_share_token(_token text)
RETURNS TABLE(report_id uuid,audience text,content jsonb,created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $resolve$
 SELECT r.id,st.audience,r.content,r.created_at
 FROM public.share_tokens st JOIN public.pathway_reports r ON r.id=st.report_id
 WHERE st.token=_token AND public.report_share_is_eligible(st.id);
$resolve$;
CREATE OR REPLACE FUNCTION public.track_share_view(_token text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog
AS $track$
 UPDATE public.share_tokens st SET view_count=st.view_count+1,last_viewed_at=now()
 -- Recheck mutable token fields on the UPDATE target itself. A stable helper
 -- alone can see the old statement snapshot after a row-lock wait; PostgreSQL
 -- must reject a concurrently revoked target during EvalPlanQual recheck.
 WHERE st.token=_token AND NOT st.revoked AND st.context_bound
  AND st.expires_at IS NOT NULL AND st.expires_at > now()
  AND public.report_share_is_eligible(st.id);
$track$;
REVOKE ALL ON FUNCTION public.resolve_share_token(text),public.track_share_view(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_share_token(text),public.track_share_view(text) TO service_role;
-- Client UPDATE remains revoked-only; no privileges on the new binding columns.
COMMIT;
