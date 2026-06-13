
-- 1) student_intakes: let admins access orphan (NULL student_id) rows too
DROP POLICY IF EXISTS "View intakes via owner or student access" ON public.student_intakes;
CREATE POLICY "View intakes via owner, student access, or admin"
ON public.student_intakes FOR SELECT
USING (
  auth.uid() = user_id
  OR (student_id IS NOT NULL AND public.can_access_student(auth.uid(), student_id))
  OR public.has_role(auth.uid(), 'admin')
);

-- 2) contact_submissions: capture submitter user_id and grant submitter SELECT/DELETE on own rows
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid;

-- Default future inserts to the authenticated submitter (if any)
ALTER TABLE public.contact_submissions
  ALTER COLUMN submitted_by_user_id SET DEFAULT auth.uid();

CREATE POLICY "Submitters view own contact submissions"
ON public.contact_submissions FOR SELECT
USING (submitted_by_user_id IS NOT NULL AND auth.uid() = submitted_by_user_id);

CREATE POLICY "Submitters delete own contact submissions"
ON public.contact_submissions FOR DELETE
USING (submitted_by_user_id IS NOT NULL AND auth.uid() = submitted_by_user_id);

-- 3) admin_invitations: SECURITY DEFINER resolver so invitees never need SELECT on the table
CREATE OR REPLACE FUNCTION public.resolve_admin_invitation(_token text)
RETURNS TABLE(id uuid, email text, role admin_role, expires_at timestamptz, accepted_at timestamptz, revoked_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT i.id, i.email, i.role, i.expires_at, i.accepted_at, i.revoked_at
  FROM public.admin_invitations i
  WHERE i.token = _token
    AND i.revoked_at IS NULL
    AND i.accepted_at IS NULL
    AND i.expires_at > now()
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.resolve_admin_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_admin_invitation(text) TO authenticated;

-- 4) email_unsubscribe_tokens: SECURITY DEFINER consume function so we don't need service-role from the route
CREATE OR REPLACE FUNCTION public.consume_unsubscribe_token(_token text)
RETURNS TABLE(email text, already_used boolean)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email text;
  v_used  timestamptz;
BEGIN
  SELECT t.email, t.used_at INTO v_email, v_used
  FROM public.email_unsubscribe_tokens t
  WHERE t.token = _token
  LIMIT 1;

  IF v_email IS NULL THEN
    RETURN; -- empty: invalid token
  END IF;

  IF v_used IS NOT NULL THEN
    RETURN QUERY SELECT v_email, true;
    RETURN;
  END IF;

  UPDATE public.email_unsubscribe_tokens SET used_at = now() WHERE token = _token;
  INSERT INTO public.suppressed_emails (email, reason)
  VALUES (lower(v_email), 'user_unsubscribe')
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT v_email, false;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_unsubscribe_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_unsubscribe_token(text) TO anon, authenticated;

-- 5) profiles: minimal cross-user lookup for collaborators sharing a student
CREATE OR REPLACE FUNCTION public.get_peer_profile(_peer_id uuid)
RETURNS TABLE(id uuid, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.id = _peer_id
    AND (
      auth.uid() = p.id
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1
        FROM public.student_collaborators c1
        JOIN public.student_collaborators c2 ON c2.student_id = c1.student_id
        WHERE c1.user_id = auth.uid() AND c1.status = 'accepted'
          AND c2.user_id = p.id      AND c2.status = 'accepted'
      )
      OR EXISTS (
        SELECT 1 FROM public.students s
        JOIN public.student_collaborators c ON c.student_id = s.id AND c.status = 'accepted'
        WHERE s.owner_id = auth.uid() AND c.user_id = p.id
      )
      OR EXISTS (
        SELECT 1 FROM public.students s
        JOIN public.student_collaborators c ON c.student_id = s.id AND c.status = 'accepted'
        WHERE c.user_id = auth.uid() AND s.owner_id = p.id
      )
    );
$$;
REVOKE ALL ON FUNCTION public.get_peer_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_peer_profile(uuid) TO authenticated;

-- 6) Revoke EXECUTE on internal SECURITY DEFINER helpers that should never be called by API roles.
--    (Trigger functions and queue plumbing — invoked by triggers or service role only.)
REVOKE ALL ON FUNCTION public.set_updated_at()               FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_user_ui_prefs_touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_waitlist_updated_at()      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user()              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb)     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint)     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
