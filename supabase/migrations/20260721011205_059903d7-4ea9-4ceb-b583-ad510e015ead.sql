
-- 1) channel_messages: threading, edit/delete/pin timestamps
ALTER TABLE public.channel_messages
  ADD COLUMN IF NOT EXISTS parent_message_id uuid REFERENCES public.channel_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS channel_messages_parent_idx ON public.channel_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS channel_messages_pinned_idx ON public.channel_messages(channel_id) WHERE pinned_at IS NOT NULL;

-- 2) channel_message_edits: audit trail for edits
CREATE TABLE IF NOT EXISTS public.channel_message_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  editor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  previous_body text NOT NULL,
  edited_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS channel_message_edits_message_idx ON public.channel_message_edits(message_id);

GRANT SELECT, INSERT ON public.channel_message_edits TO authenticated;
GRANT ALL ON public.channel_message_edits TO service_role;

ALTER TABLE public.channel_message_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channel_message_edits_select_members"
  ON public.channel_message_edits FOR SELECT TO authenticated
  USING (public.is_channel_member(auth.uid(), channel_id));

CREATE POLICY "channel_message_edits_insert_author"
  ON public.channel_message_edits FOR INSERT TO authenticated
  WITH CHECK (
    editor_id = auth.uid()
    AND public.is_channel_member(auth.uid(), channel_id)
  );

-- 3) channel_bookmarks: per-user saved messages
CREATE TABLE IF NOT EXISTS public.channel_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);
CREATE INDEX IF NOT EXISTS channel_bookmarks_user_idx ON public.channel_bookmarks(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_bookmarks TO authenticated;
GRANT ALL ON public.channel_bookmarks TO service_role;

ALTER TABLE public.channel_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channel_bookmarks_owner_all"
  ON public.channel_bookmarks FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_channel_member(auth.uid(), channel_id))
  WITH CHECK (user_id = auth.uid() AND public.is_channel_member(auth.uid(), channel_id));

-- 4) channel_member_prefs: per-member mute / notify level
CREATE TABLE IF NOT EXISTS public.channel_member_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  muted boolean NOT NULL DEFAULT false,
  notify_level text NOT NULL DEFAULT 'all' CHECK (notify_level IN ('all','mentions','none')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_member_prefs TO authenticated;
GRANT ALL ON public.channel_member_prefs TO service_role;

ALTER TABLE public.channel_member_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channel_member_prefs_owner_all"
  ON public.channel_member_prefs FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_channel_member(auth.uid(), channel_id))
  WITH CHECK (user_id = auth.uid() AND public.is_channel_member(auth.uid(), channel_id));

CREATE TRIGGER trg_channel_member_prefs_updated_at
  BEFORE UPDATE ON public.channel_member_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) channel_mentions: first-class @mentions of channel members
CREATE TABLE IF NOT EXISTS public.channel_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, mentioned_user_id)
);
CREATE INDEX IF NOT EXISTS channel_mentions_user_unseen_idx
  ON public.channel_mentions(mentioned_user_id) WHERE seen_at IS NULL;
CREATE INDEX IF NOT EXISTS channel_mentions_channel_idx
  ON public.channel_mentions(channel_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_mentions TO authenticated;
GRANT ALL ON public.channel_mentions TO service_role;

ALTER TABLE public.channel_mentions ENABLE ROW LEVEL SECURITY;

-- Mentioned user or channel members can see; only mentioned user can update (mark seen)
CREATE POLICY "channel_mentions_select_members_or_target"
  ON public.channel_mentions FOR SELECT TO authenticated
  USING (
    mentioned_user_id = auth.uid()
    OR public.is_channel_member(auth.uid(), channel_id)
  );

CREATE POLICY "channel_mentions_insert_author_member"
  ON public.channel_mentions FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.is_channel_member(auth.uid(), channel_id)
    AND public.is_channel_member(mentioned_user_id, channel_id)
  );

CREATE POLICY "channel_mentions_update_target_seen"
  ON public.channel_mentions FOR UPDATE TO authenticated
  USING (mentioned_user_id = auth.uid())
  WITH CHECK (mentioned_user_id = auth.uid());

-- 6) channel_actions: extend to cover structured record kinds
ALTER TABLE public.channel_actions
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'action',
  ADD COLUMN IF NOT EXISTS source_message_id uuid REFERENCES public.channel_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE public.channel_actions
    ADD CONSTRAINT channel_actions_kind_check
    CHECK (kind IN ('action','decision','question','feedback','meeting_item','opportunity_followup','referral_followup'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.channel_actions
    ADD CONSTRAINT channel_actions_status_check
    CHECK (status IN ('open','in_progress','resolved','dismissed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.channel_actions
    ADD CONSTRAINT channel_actions_priority_check
    CHECK (priority IS NULL OR priority IN ('low','normal','high','urgent'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS channel_actions_assignee_open_idx
  ON public.channel_actions(assignee_user_id) WHERE status IN ('open','in_progress');
CREATE INDEX IF NOT EXISTS channel_actions_channel_kind_idx
  ON public.channel_actions(channel_id, kind, status);
CREATE INDEX IF NOT EXISTS channel_actions_due_idx
  ON public.channel_actions(due_at) WHERE status IN ('open','in_progress') AND due_at IS NOT NULL;
