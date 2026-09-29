-- Prepared only: applying this migration requires separate authorization.
-- Historical access is a frozen copy, never active channel membership.
CREATE TABLE public.student_channel_removals (
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  removed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  removed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  history_access text NOT NULL CHECK (history_access IN ('remove', 'keep_read_only')),
  PRIMARY KEY (student_id, user_id)
);
ALTER TABLE public.student_channel_removals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_channel_removals FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.student_channel_removals TO service_role;

-- Both the start/list RPCs and existing channels use this revocation-aware rule.
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
  SELECT p_user_id IS NOT NULL AND p_student_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.student_channel_removals r
      WHERE r.student_id = p_student_id AND r.user_id = p_user_id)
    AND (
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

CREATE TABLE public.channel_history_grants (
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  removed_at timestamptz NOT NULL,
  PRIMARY KEY (channel_id, user_id)
);
CREATE TABLE public.channel_history_messages (
  channel_id uuid NOT NULL,
  user_id uuid NOT NULL,
  message_id uuid NOT NULL REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  body text NOT NULL,
  author_name text NOT NULL,
  sent_at timestamptz NOT NULL,
  parent_id uuid,
  PRIMARY KEY (channel_id, user_id, message_id),
  FOREIGN KEY (channel_id, user_id) REFERENCES public.channel_history_grants ON DELETE CASCADE
);
CREATE TABLE public.channel_history_attachments (
  channel_id uuid NOT NULL,
  user_id uuid NOT NULL,
  message_id uuid NOT NULL,
  attachment_id uuid NOT NULL REFERENCES public.channel_attachments(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  storage_object_id uuid NOT NULL,
  storage_updated_at timestamptz,
  PRIMARY KEY (channel_id, user_id, attachment_id),
  FOREIGN KEY (channel_id, user_id, message_id)
    REFERENCES public.channel_history_messages ON DELETE CASCADE
);
ALTER TABLE public.channel_history_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_history_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_history_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.channel_history_grants, public.channel_history_messages,
  public.channel_history_attachments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.channel_history_grants, public.channel_history_messages,
  public.channel_history_attachments TO authenticated;
GRANT ALL ON public.channel_history_grants, public.channel_history_messages,
  public.channel_history_attachments TO service_role;
CREATE POLICY history_grants_read ON public.channel_history_grants FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY history_messages_read ON public.channel_history_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY history_attachments_read ON public.channel_history_attachments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Keep membership and admin checks active-only. A retained archive does not
-- grant access to live messages, edits, actions, exports, mentions or uploads.
CREATE OR REPLACE FUNCTION public.is_channel_member(_user_id uuid, _channel_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channel_members m JOIN public.channels c ON c.id = m.channel_id
    WHERE m.channel_id = _channel_id AND m.user_id = _user_id AND m.left_at IS NULL
      AND (c.student_id IS NULL OR public.is_linked_student_channel_participant(_user_id, c.student_id))
  );
$$;
CREATE OR REPLACE FUNCTION public.is_channel_admin(_user_id uuid, _channel_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.is_platform_admin(_user_id) OR (
    public.is_channel_member(_user_id, _channel_id) AND EXISTS (
      SELECT 1 FROM public.channel_members m WHERE m.channel_id = _channel_id
        AND m.user_id = _user_id AND m.left_at IS NULL AND m.member_role IN ('owner','admin')
    )
  );
$$;

-- Prevent direct self-reactivation or role promotion via the former broad UPDATE.
REVOKE UPDATE ON public.channel_members FROM authenticated;
GRANT UPDATE (muted, notify_email, notify_in_app) ON public.channel_members TO authenticated;
CREATE POLICY active_member_preferences ON public.channel_members AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (public.is_channel_member(auth.uid(), channel_id))
  WITH CHECK (public.is_channel_member(auth.uid(), channel_id));
CREATE OR REPLACE FUNCTION public.guard_student_channel_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_student uuid;
BEGIN
  SELECT student_id INTO v_student FROM public.channels WHERE id = NEW.channel_id;
  -- Serialize new membership with removal so a concurrent insert cannot leave
  -- an apparently active notification recipient after the removal commits.
  PERFORM 1 FROM public.students WHERE id = v_student FOR UPDATE;
  IF v_student IS NOT NULL AND NOT public.is_linked_student_channel_participant(NEW.user_id, v_student) THEN
    RAISE EXCEPTION 'This person is not an active student chat participant' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_student_channel_member BEFORE INSERT OR UPDATE OF channel_id, user_id, left_at
  ON public.channel_members FOR EACH ROW WHEN (NEW.left_at IS NULL)
  EXECUTE FUNCTION public.guard_student_channel_member();

-- Existing author-only write policies must also require current membership.
CREATE POLICY current_member_message_updates ON public.channel_messages AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (public.is_channel_member(auth.uid(), channel_id))
  WITH CHECK (public.is_channel_member(auth.uid(), channel_id));
CREATE POLICY current_member_message_deletes ON public.channel_messages AS RESTRICTIVE
  FOR DELETE TO authenticated USING (public.is_channel_member(auth.uid(), channel_id));
CREATE POLICY current_member_attachment_deletes ON public.channel_attachments AS RESTRICTIVE
  FOR DELETE TO authenticated USING (public.is_channel_member(auth.uid(), channel_id));
CREATE POLICY current_member_mentions ON public.channel_mentions AS RESTRICTIVE
  FOR ALL TO authenticated USING (public.is_channel_member(auth.uid(), channel_id))
  WITH CHECK (public.is_channel_member(auth.uid(), channel_id));

-- Internal routine: callable only from the checked removal RPC / row triggers.
CREATE OR REPLACE FUNCTION public.apply_student_chat_removal(p_student uuid, p_user uuid, p_history text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_removed timestamptz := clock_timestamp();
BEGIN
  IF p_user IS NULL THEN RETURN; END IF;
  IF p_history IS NULL OR p_history NOT IN ('remove', 'keep_read_only') THEN
    RAISE EXCEPTION 'Choose chat history access' USING ERRCODE = '22023';
  END IF;
  -- Serialize changes to this student's chat grants. Snapshot queries only copy
  -- committed rows visible in this transaction; future content is never queried.
  PERFORM 1 FROM public.students WHERE id = p_student FOR UPDATE;
  PERFORM 1 FROM public.channel_members m JOIN public.channels c ON c.id = m.channel_id
    WHERE c.student_id = p_student AND m.user_id = p_user FOR UPDATE OF m;
  v_removed := clock_timestamp();
  INSERT INTO public.channel_audit_events (channel_id, actor_id, event_type, target_user_id, metadata)
    SELECT c.id, auth.uid(), 'student_member_removed', p_user,
      jsonb_build_object('history_access', p_history, 'removed_at', v_removed)
    FROM public.channels c JOIN public.channel_members m ON m.channel_id = c.id
    WHERE c.student_id = p_student AND m.user_id = p_user AND (m.left_at IS NULL OR EXISTS (
      SELECT 1 FROM public.channel_history_grants h WHERE h.channel_id = c.id AND h.user_id = p_user
    ));
  DELETE FROM public.channel_history_grants h USING public.channels c
    WHERE h.channel_id = c.id AND c.student_id = p_student AND h.user_id = p_user
      AND (p_history = 'remove' OR public.is_channel_member(p_user, c.id));
  IF p_history = 'keep_read_only' THEN
    INSERT INTO public.channel_history_grants (channel_id, user_id, title, removed_at)
      SELECT c.id, p_user, c.title, v_removed FROM public.channels c
      JOIN public.channel_members m ON m.channel_id = c.id
      WHERE c.student_id = p_student AND m.user_id = p_user AND m.left_at IS NULL
        AND public.is_channel_member(p_user, c.id)
      ON CONFLICT (channel_id, user_id) DO NOTHING;
    INSERT INTO public.channel_history_messages
      (channel_id, user_id, message_id, body, author_name, sent_at, parent_id)
      SELECT m.channel_id, p_user, m.id, m.body,
        COALESCE(NULLIF(btrim(p.preferred_name), ''), NULLIF(btrim(p.full_name), ''), 'Member'),
        m.created_at, m.parent_id
      FROM public.channel_messages m
      JOIN public.channel_history_grants h ON h.channel_id = m.channel_id AND h.user_id = p_user
      LEFT JOIN public.profiles p ON p.id = m.author_id
      WHERE h.removed_at = v_removed AND m.deleted_at IS NULL AND m.created_at <= v_removed;
    INSERT INTO public.channel_history_attachments
      (channel_id, user_id, message_id, attachment_id, storage_path, file_name, storage_object_id, storage_updated_at)
      SELECT a.channel_id, p_user, a.message_id, a.id, a.storage_path, a.file_name, o.id, o.updated_at
      FROM public.channel_attachments a JOIN public.channel_history_messages h
        ON h.message_id = a.message_id AND h.channel_id = a.channel_id AND h.user_id = p_user
      JOIN public.channel_history_grants g ON g.channel_id = h.channel_id AND g.user_id = h.user_id
      JOIN storage.objects o ON o.bucket_id = 'channel-attachments' AND o.name = a.storage_path
      WHERE g.removed_at = v_removed AND a.scan_status = 'clean' AND a.created_at <= v_removed;
  END IF;
  UPDATE public.channel_members m SET left_at = v_removed, notify_email = false, notify_in_app = false
    FROM public.channels c WHERE c.id = m.channel_id AND c.student_id = p_student
      AND m.user_id = p_user AND m.left_at IS NULL;
  INSERT INTO public.student_channel_removals (student_id, user_id, removed_by, removed_at, history_access)
    VALUES (p_student, p_user, auth.uid(), v_removed, p_history)
    ON CONFLICT (student_id, user_id) DO UPDATE SET removed_by = EXCLUDED.removed_by,
      removed_at = EXCLUDED.removed_at, history_access = EXCLUDED.history_access;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_student_member(p_kind text, p_id uuid, p_history_access text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_student uuid; v_user uuid; v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  IF p_history_access IS NULL OR p_history_access NOT IN ('remove','keep_read_only') THEN
    RAISE EXCEPTION 'Choose chat history access' USING ERRCODE = '22023';
  END IF;
  CASE p_kind
    WHEN 'collaborator' THEN SELECT student_id, user_id INTO v_student, v_user
      FROM public.student_collaborators WHERE id = p_id FOR UPDATE;
    WHEN 'relationship' THEN SELECT student_id, related_user_id INTO v_student, v_user
      FROM public.student_relationships WHERE id = p_id FOR UPDATE;
    WHEN 'team' THEN SELECT student_id, member_user_id INTO v_student, v_user
      FROM public.student_team_members WHERE id = p_id FOR UPDATE;
    WHEN 'guardian' THEN SELECT student_id, guardian_user_id INTO v_student, v_user
      FROM public.student_guardians WHERE id = p_id FOR UPDATE;
    ELSE RAISE EXCEPTION 'Unknown membership type' USING ERRCODE = '22023';
  END CASE;
  IF v_student IS NULL THEN RAISE EXCEPTION 'Member unavailable' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.students WHERE id = v_student FOR UPDATE;
  -- Match existing owner-only collaborator deletion and editor membership policies.
  IF (p_kind = 'collaborator' AND NOT EXISTS (
    SELECT 1 FROM public.students WHERE id = v_student AND owner_id = v_actor
  )) OR (p_kind <> 'collaborator' AND NOT public.can_edit_student(v_actor, v_student)) THEN
    RAISE EXCEPTION 'You cannot remove this member' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.students WHERE id = v_student
    AND (owner_id = v_user OR student_user_id = v_user)) THEN
    RAISE EXCEPTION 'The student or owner cannot be removed from their own chat' USING ERRCODE = '42501';
  END IF;
  PERFORM public.apply_student_chat_removal(v_student, v_user, p_history_access);
  CASE p_kind
    WHEN 'collaborator' THEN DELETE FROM public.student_collaborators WHERE id = p_id;
    WHEN 'relationship' THEN UPDATE public.student_relationships SET consent_status = 'revoked' WHERE id = p_id;
    WHEN 'team' THEN DELETE FROM public.student_team_members WHERE id = p_id;
    WHEN 'guardian' THEN DELETE FROM public.student_guardians WHERE id = p_id;
  END CASE;
END;
$$;

-- Status changes use the same atomic choice as deleting a membership.
CREATE OR REPLACE FUNCTION public.change_student_team_status(
  p_id uuid, p_status text, p_history_access text, p_role text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row public.student_team_members%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.student_team_members WHERE id = p_id FOR UPDATE;
  PERFORM 1 FROM public.students WHERE id = v_row.student_id FOR UPDATE;
  IF auth.uid() IS NULL OR v_row.id IS NULL OR NOT public.can_edit_student(auth.uid(), v_row.student_id) THEN
    RAISE EXCEPTION 'You cannot change this member' USING ERRCODE = '42501';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('inactive','pending') OR p_history_access IS NULL
    OR p_history_access NOT IN ('remove','keep_read_only') OR (p_role IS NOT NULL
      AND p_role NOT IN ('teacher','case_manager','educator','school_admin','admin','partner','other')) THEN
    RAISE EXCEPTION 'Choose status and chat history access' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.students WHERE id = v_row.student_id
    AND (owner_id = v_row.member_user_id OR student_user_id = v_row.member_user_id)) THEN
    RAISE EXCEPTION 'The student or owner cannot be removed from their own chat' USING ERRCODE = '42501';
  END IF;
  IF v_row.status = 'active' THEN
    PERFORM public.apply_student_chat_removal(v_row.student_id, v_row.member_user_id, p_history_access);
  END IF;
  UPDATE public.student_team_members SET status = p_status, role_on_team = COALESCE(p_role, role_on_team)
    WHERE id = p_id;
END;
$$;
REVOKE ALL ON FUNCTION public.change_student_team_status(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_student_team_status(uuid,text,text,text) TO authenticated;

-- Direct API deletion/status changes fail closed too. The explicit RPC has
-- already closed memberships before this trigger runs, preserving its choice.
CREATE OR REPLACE FUNCTION public.close_removed_student_chats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid; v_revoke boolean := TG_OP = 'DELETE';
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'student_collaborators' THEN
      v_user := OLD.user_id;
      IF TG_OP = 'UPDATE' THEN v_revoke := OLD.status = 'accepted' AND
        (NEW.status <> 'accepted' OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.student_id <> OLD.student_id); END IF;
    WHEN 'student_relationships' THEN
      v_user := OLD.related_user_id;
      IF TG_OP = 'UPDATE' THEN v_revoke := OLD.consent_status = 'approved' AND
        (NEW.consent_status <> 'approved' OR NEW.related_user_id <> OLD.related_user_id OR NEW.student_id <> OLD.student_id); END IF;
    WHEN 'student_team_members' THEN
      v_user := OLD.member_user_id;
      IF TG_OP = 'UPDATE' THEN v_revoke := OLD.status = 'active' AND
        (NEW.status <> 'active' OR NEW.member_user_id IS DISTINCT FROM OLD.member_user_id OR NEW.student_id <> OLD.student_id); END IF;
    WHEN 'student_guardians' THEN
      v_user := OLD.guardian_user_id;
      IF TG_OP = 'UPDATE' THEN v_revoke := NEW.guardian_user_id IS DISTINCT FROM OLD.guardian_user_id OR NEW.student_id <> OLD.student_id; END IF;
  END CASE;
  IF v_revoke AND v_user IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.channel_members m JOIN public.channels c ON c.id = m.channel_id
    WHERE c.student_id = OLD.student_id AND m.user_id = v_user AND m.left_at IS NULL
  ) THEN PERFORM public.apply_student_chat_removal(OLD.student_id, v_user, 'remove'); END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER close_collaborator_chats AFTER DELETE OR UPDATE ON public.student_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.close_removed_student_chats();
CREATE TRIGGER close_relationship_chats AFTER DELETE OR UPDATE ON public.student_relationships
  FOR EACH ROW EXECUTE FUNCTION public.close_removed_student_chats();
CREATE TRIGGER close_team_chats AFTER DELETE OR UPDATE ON public.student_team_members
  FOR EACH ROW EXECUTE FUNCTION public.close_removed_student_chats();
CREATE TRIGGER close_guardian_chats AFTER DELETE OR UPDATE ON public.student_guardians
  FOR EACH ROW EXECUTE FUNCTION public.close_removed_student_chats();

-- An archive follows message deletion/retention; it must not preserve a message
-- that moderation or retention has subsequently removed.
CREATE OR REPLACE FUNCTION public.purge_deleted_chat_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    DELETE FROM public.channel_history_messages WHERE message_id = NEW.id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER purge_deleted_chat_history AFTER UPDATE OF deleted_at ON public.channel_messages
  FOR EACH ROW EXECUTE FUNCTION public.purge_deleted_chat_history();

-- Historical downloads retain both the captured attachment identity and the
-- current clean verdict. They cannot open a later/replaced attachment.
CREATE OR REPLACE FUNCTION public.can_read_chat_history_attachment(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channel_history_attachments h
    JOIN public.channel_attachments a ON a.id = h.attachment_id
    JOIN storage.objects o ON o.id = h.storage_object_id
    WHERE h.user_id = auth.uid() AND h.storage_path = p_path
      AND a.storage_path = h.storage_path AND a.message_id = h.message_id
      AND a.channel_id = h.channel_id AND a.scan_status = 'clean'
      AND o.bucket_id = 'channel-attachments' AND o.name = h.storage_path
      AND o.updated_at IS NOT DISTINCT FROM h.storage_updated_at
  );
$$;
CREATE POLICY history_attachment_download ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'channel-attachments' AND public.can_read_chat_history_attachment(name));
CREATE POLICY active_channel_attachment_delete ON storage.objects AS RESTRICTIVE
  FOR DELETE TO authenticated USING (bucket_id <> 'channel-attachments'
    OR public.is_channel_member(auth.uid(), public.safe_channel_id_from_path(name)));

REVOKE ALL ON FUNCTION public.is_channel_member(uuid,uuid), public.is_channel_admin(uuid,uuid),
  public.guard_student_channel_member(), public.apply_student_chat_removal(uuid,uuid,text),
  public.remove_student_member(text,uuid,text), public.close_removed_student_chats(),
  public.purge_deleted_chat_history(), public.can_read_chat_history_attachment(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_channel_member(uuid,uuid), public.is_channel_admin(uuid,uuid),
  public.remove_student_member(text,uuid,text), public.can_read_chat_history_attachment(text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.guard_student_channel_member(),
  public.apply_student_chat_removal(uuid,uuid,text), public.remove_student_member(text,uuid,text),
  public.change_student_team_status(uuid,text,text,text), public.close_removed_student_chats(),
  public.purge_deleted_chat_history(), public.can_read_chat_history_attachment(text) TO service_role;

GRANT EXECUTE ON FUNCTION public.is_linked_student_channel_participant(uuid,uuid),
  public.list_student_channel_students(), public.list_student_channel_recipients(uuid),
  public.start_student_channel(uuid,uuid,text,text) TO service_role;
