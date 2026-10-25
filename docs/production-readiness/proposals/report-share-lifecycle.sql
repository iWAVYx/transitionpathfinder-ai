-- LOCAL REVIEW PROPOSAL ONLY. Not a canonical migration or deployment instruction.
-- Compatibility decision: legacy links are unbound and stop resolving; owners
-- must create fresh links. No source student/owner/intake is guessed for them.
BEGIN;

ALTER TABLE public.share_tokens
 ADD COLUMN context_bound boolean NOT NULL DEFAULT false,
 ADD COLUMN bound_student_id uuid,
 ADD COLUMN bound_report_owner_id uuid,
 ADD COLUMN bound_intake_id uuid;

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
 WHERE st.token=_token AND public.report_share_is_eligible(st.id);
$track$;
REVOKE ALL ON FUNCTION public.resolve_share_token(text),public.track_share_view(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_share_token(text),public.track_share_view(text) TO service_role;
-- Client UPDATE remains revoked-only; no privileges on the new binding columns.
COMMIT;
