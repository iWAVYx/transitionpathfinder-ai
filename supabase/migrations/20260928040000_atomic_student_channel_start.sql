-- A channel must be born with its members in one transaction. A direct
-- channels INSERT cannot RETURN its row under member-only SELECT RLS before
-- membership exists. This narrow RPC avoids that bootstrap deadlock without
-- relaxing any channel or student RLS policy.

CREATE OR REPLACE FUNCTION public.is_linked_student_channel_participant(
  p_user_id uuid,
  p_student_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_user_id IS NOT NULL AND p_student_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = p_student_id
        AND (s.owner_id = p_user_id OR s.student_user_id = p_user_id)
    ) OR EXISTS (
      SELECT 1 FROM public.student_collaborators c
      WHERE c.student_id = p_student_id
        AND c.user_id = p_user_id
        AND c.status = 'accepted'
    ) OR EXISTS (
      SELECT 1 FROM public.student_relationships r
      WHERE r.student_id = p_student_id
        AND r.related_user_id = p_user_id
        AND r.consent_status = 'approved'
    )
  );
$$;

REVOKE ALL ON FUNCTION public.is_linked_student_channel_participant(uuid, uuid)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_student_channel_students()
RETURNS TABLE(student_id uuid, student_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT s.id,
    btrim(s.first_name || COALESCE(' ' || s.last_name, ''))
  FROM public.students s
  WHERE public.is_linked_student_channel_participant(v_actor, s.id)
  ORDER BY 2, 1
  LIMIT 100;
END;
$$;

REVOKE ALL ON FUNCTION public.list_student_channel_students()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_student_channel_students()
  TO authenticated;

CREATE OR REPLACE FUNCTION public.list_student_channel_recipients(p_student_id uuid)
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF NOT public.is_linked_student_channel_participant(v_actor, p_student_id) THEN
    RAISE EXCEPTION 'Student team unavailable' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH linked_users AS (
    SELECT s.owner_id AS linked_id FROM public.students s WHERE s.id = p_student_id
    UNION
    SELECT s.student_user_id FROM public.students s
      WHERE s.id = p_student_id AND s.student_user_id IS NOT NULL
    UNION
    SELECT c.user_id FROM public.student_collaborators c
      WHERE c.student_id = p_student_id AND c.status = 'accepted' AND c.user_id IS NOT NULL
    UNION
    SELECT r.related_user_id FROM public.student_relationships r
      WHERE r.student_id = p_student_id AND r.consent_status = 'approved'
  )
  SELECT p.id,
    COALESCE(NULLIF(btrim(p.preferred_name), ''), NULLIF(btrim(p.full_name), ''), 'Team member')
  FROM linked_users u
  JOIN public.profiles p ON p.id = u.linked_id
  WHERE u.linked_id <> v_actor
    AND public.is_linked_student_channel_participant(u.linked_id, p_student_id)
  ORDER BY 2, 1;
END;
$$;

REVOKE ALL ON FUNCTION public.list_student_channel_recipients(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_student_channel_recipients(uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.start_student_channel(
  p_student_id uuid,
  p_recipient_id uuid,
  p_title text,
  p_first_message text
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_channel_id uuid;
  v_organization_id uuid;
BEGIN
  IF v_actor IS NULL OR p_recipient_id IS NULL OR p_recipient_id = v_actor THEN
    RAISE EXCEPTION 'A different team member is required' USING ERRCODE = '42501';
  END IF;
  -- Serialize conversation creation with removal before checking eligibility.
  SELECT s.organization_id INTO v_organization_id
  FROM public.students s WHERE s.id = p_student_id FOR UPDATE;
  IF NOT public.is_linked_student_channel_participant(v_actor, p_student_id)
     OR NOT public.is_linked_student_channel_participant(p_recipient_id, p_student_id) THEN
    RAISE EXCEPTION 'Both people must belong to this student team' USING ERRCODE = '42501';
  END IF;
  IF p_title IS NULL OR char_length(btrim(p_title)) NOT BETWEEN 1 AND 120
     OR p_first_message IS NULL OR char_length(btrim(p_first_message)) NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION 'A short title and first message are required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.channels (
    kind, title, organization_id, student_id, created_by
  ) VALUES (
    'student_transition', btrim(p_title), v_organization_id, p_student_id, v_actor
  ) RETURNING id INTO v_channel_id;

  INSERT INTO public.channel_members (channel_id, user_id, member_role, added_by)
  VALUES
    (v_channel_id, v_actor, 'owner', v_actor),
    (v_channel_id, p_recipient_id, 'member', v_actor);

  INSERT INTO public.channel_messages (channel_id, author_id, body)
  VALUES (v_channel_id, v_actor, btrim(p_first_message));

  INSERT INTO public.channel_audit_events (channel_id, actor_id, event_type, target_user_id)
  VALUES (v_channel_id, v_actor, 'channel_created', p_recipient_id);

  RETURN v_channel_id;
END;
$$;

REVOKE ALL ON FUNCTION public.start_student_channel(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_student_channel(uuid, uuid, text, text)
  TO authenticated;
