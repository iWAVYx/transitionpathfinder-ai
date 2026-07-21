
-- ============================================================
-- Transition Channel foundation
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.channel_kind AS ENUM (
    'student_transition','student_family','school_team','district_implementation',
    'partner_relationship','partner_outreach','partner_internal','platform_support'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.channel_member_role AS ENUM ('owner','admin','member','observer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.connection_request_status AS ENUM ('pending','accepted','declined','withdrawn','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.channel_action_kind AS ENUM (
    'next_action','calendar_event','meeting_agenda_item','opportunity_follow_up',
    'referral_task','feedback_record','evidence_candidate'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- channels
-- ============================================================
CREATE TABLE public.channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind public.channel_kind NOT NULL,
  title TEXT NOT NULL,
  purpose TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  partner_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  retention_days INTEGER NOT NULL DEFAULT 365,
  legal_hold BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_channels_org ON public.channels(organization_id);
CREATE INDEX idx_channels_student ON public.channels(student_id);
CREATE INDEX idx_channels_kind ON public.channels(kind);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channels TO authenticated;
GRANT ALL ON public.channels TO service_role;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- channel_members
-- ============================================================
CREATE TABLE public.channel_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_role public.channel_member_role NOT NULL DEFAULT 'member',
  muted BOOLEAN NOT NULL DEFAULT false,
  notify_email BOOLEAN NOT NULL DEFAULT true,
  notify_in_app BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  added_by UUID REFERENCES auth.users(id),
  UNIQUE (channel_id, user_id)
);
CREATE INDEX idx_channel_members_user ON public.channel_members(user_id) WHERE left_at IS NULL;
CREATE INDEX idx_channel_members_channel ON public.channel_members(channel_id) WHERE left_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_members TO authenticated;
GRANT ALL ON public.channel_members TO service_role;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Security helpers (SECURITY DEFINER to avoid RLS recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_channel_member(_user_id uuid, _channel_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channel_members
    WHERE channel_id = _channel_id AND user_id = _user_id AND left_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_channel_admin(_user_id uuid, _channel_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channel_members
    WHERE channel_id = _channel_id AND user_id = _user_id AND left_at IS NULL
      AND member_role IN ('owner','admin')
  ) OR public.is_platform_admin(_user_id);
$$;

-- ============================================================
-- channel_messages
-- ============================================================
CREATE TABLE public.channel_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  parent_id UUID REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  client_dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (channel_id, author_id, client_dedupe_key)
);
CREATE INDEX idx_channel_messages_channel ON public.channel_messages(channel_id, created_at DESC);
CREATE INDEX idx_channel_messages_parent ON public.channel_messages(parent_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_messages TO authenticated;
GRANT ALL ON public.channel_messages TO service_role;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- channel_message_reads
-- ============================================================
CREATE TABLE public.channel_message_reads (
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_message_id UUID REFERENCES public.channel_messages(id) ON DELETE SET NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_message_reads TO authenticated;
GRANT ALL ON public.channel_message_reads TO service_role;
ALTER TABLE public.channel_message_reads ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- channel_attachments
-- ============================================================
CREATE TABLE public.channel_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT,
  scan_status TEXT NOT NULL DEFAULT 'pending',
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_channel_attachments_message ON public.channel_attachments(message_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_attachments TO authenticated;
GRANT ALL ON public.channel_attachments TO service_role;
ALTER TABLE public.channel_attachments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- channel_connection_requests
-- ============================================================
CREATE TABLE public.channel_connection_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id),
  requester_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  target_partner_organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  purpose_category TEXT NOT NULL,
  message TEXT NOT NULL,
  proposed_next_step TEXT,
  status public.connection_request_status NOT NULL DEFAULT 'pending',
  responded_by UUID REFERENCES auth.users(id),
  responded_at TIMESTAMPTZ,
  resulting_channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_connreq_target ON public.channel_connection_requests(target_partner_organization_id);
CREATE INDEX idx_connreq_requester ON public.channel_connection_requests(requester_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_connection_requests TO authenticated;
GRANT ALL ON public.channel_connection_requests TO service_role;
ALTER TABLE public.channel_connection_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- channel_actions
-- ============================================================
CREATE TABLE public.channel_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  action_kind public.channel_action_kind NOT NULL,
  target_id UUID,
  promoted_by UUID NOT NULL REFERENCES auth.users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_channel_actions_channel ON public.channel_actions(channel_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_actions TO authenticated;
GRANT ALL ON public.channel_actions TO service_role;
ALTER TABLE public.channel_actions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- channel_reports
-- ============================================================
CREATE TABLE public.channel_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.channel_messages(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_reports TO authenticated;
GRANT ALL ON public.channel_reports TO service_role;
ALTER TABLE public.channel_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- channel_audit_events
-- ============================================================
CREATE TABLE public.channel_audit_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_channel_audit_channel ON public.channel_audit_events(channel_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_audit_events TO authenticated;
GRANT ALL ON public.channel_audit_events TO service_role;
ALTER TABLE public.channel_audit_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Policies
-- ============================================================

-- channels
CREATE POLICY "Members view channels" ON public.channels FOR SELECT TO authenticated
  USING (public.is_channel_member(auth.uid(), id) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "Authenticated users can create channels" ON public.channels FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Channel admins can update" ON public.channels FOR UPDATE TO authenticated
  USING (public.is_channel_admin(auth.uid(), id))
  WITH CHECK (public.is_channel_admin(auth.uid(), id));
CREATE POLICY "Channel admins can delete" ON public.channels FOR DELETE TO authenticated
  USING (public.is_channel_admin(auth.uid(), id));

-- channel_members
CREATE POLICY "Members view their own membership rows" ON public.channel_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_channel_admin(auth.uid(), channel_id));
CREATE POLICY "Channel admins insert members" ON public.channel_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_channel_admin(auth.uid(), channel_id)
    OR EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id AND c.created_by = auth.uid())
  );
CREATE POLICY "Members update own row; admins any" ON public.channel_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_channel_admin(auth.uid(), channel_id))
  WITH CHECK (user_id = auth.uid() OR public.is_channel_admin(auth.uid(), channel_id));
CREATE POLICY "Channel admins delete members" ON public.channel_members FOR DELETE TO authenticated
  USING (public.is_channel_admin(auth.uid(), channel_id) OR user_id = auth.uid());

-- channel_messages
CREATE POLICY "Members read messages" ON public.channel_messages FOR SELECT TO authenticated
  USING (public.is_channel_member(auth.uid(), channel_id) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "Members write messages" ON public.channel_messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_channel_member(auth.uid(), channel_id));
CREATE POLICY "Authors edit own messages" ON public.channel_messages FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_channel_admin(auth.uid(), channel_id))
  WITH CHECK (author_id = auth.uid() OR public.is_channel_admin(auth.uid(), channel_id));
CREATE POLICY "Authors or admins delete messages" ON public.channel_messages FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_channel_admin(auth.uid(), channel_id));

-- reads
CREATE POLICY "Users manage own reads" ON public.channel_message_reads FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- attachments
CREATE POLICY "Members read attachments" ON public.channel_attachments FOR SELECT TO authenticated
  USING (public.is_channel_member(auth.uid(), channel_id));
CREATE POLICY "Members add attachments" ON public.channel_attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.is_channel_member(auth.uid(), channel_id));
CREATE POLICY "Uploader or admin deletes attachment" ON public.channel_attachments FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.is_channel_admin(auth.uid(), channel_id));

-- connection requests
CREATE POLICY "Requester or target-org admins view" ON public.channel_connection_requests FOR SELECT TO authenticated
  USING (
    requester_id = auth.uid()
    OR public.is_org_admin(auth.uid(), target_partner_organization_id)
    OR public.is_platform_admin(auth.uid())
  );
CREATE POLICY "Authenticated users create requests" ON public.channel_connection_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Requester withdraws; target-org admins respond" ON public.channel_connection_requests FOR UPDATE TO authenticated
  USING (
    requester_id = auth.uid()
    OR public.is_org_admin(auth.uid(), target_partner_organization_id)
    OR public.is_platform_admin(auth.uid())
  )
  WITH CHECK (
    requester_id = auth.uid()
    OR public.is_org_admin(auth.uid(), target_partner_organization_id)
    OR public.is_platform_admin(auth.uid())
  );

-- actions
CREATE POLICY "Members view actions" ON public.channel_actions FOR SELECT TO authenticated
  USING (public.is_channel_member(auth.uid(), channel_id));
CREATE POLICY "Members promote actions" ON public.channel_actions FOR INSERT TO authenticated
  WITH CHECK (promoted_by = auth.uid() AND public.is_channel_member(auth.uid(), channel_id));

-- reports
CREATE POLICY "Reporter or platform admin views" ON public.channel_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_platform_admin(auth.uid()));
CREATE POLICY "Any member reports" ON public.channel_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND public.is_channel_member(auth.uid(), channel_id));
CREATE POLICY "Platform admins resolve reports" ON public.channel_reports FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- audit
CREATE POLICY "Channel admins and platform admins view audit" ON public.channel_audit_events FOR SELECT TO authenticated
  USING (public.is_channel_admin(auth.uid(), channel_id));
CREATE POLICY "Members append audit entries" ON public.channel_audit_events FOR INSERT TO authenticated
  WITH CHECK (public.is_channel_member(auth.uid(), channel_id));

-- ============================================================
-- Triggers
-- ============================================================
CREATE TRIGGER trg_channels_updated_at BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_channel_messages_updated_at BEFORE UPDATE ON public.channel_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_connreq_updated_at BEFORE UPDATE ON public.channel_connection_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Bump channels.last_message_at when a new message arrives
CREATE OR REPLACE FUNCTION public.tg_channel_bump_last_message()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  UPDATE public.channels SET last_message_at = NEW.created_at WHERE id = NEW.channel_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_channel_bump_last_message AFTER INSERT ON public.channel_messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_channel_bump_last_message();

-- Enable realtime for members and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;
