
-- Next Action System: two tables, RLS, GRANTs, and an updated_at trigger.

-- 1) next_actions
CREATE TABLE public.next_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_role TEXT NOT NULL,
  audience TEXT,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  reason TEXT,
  cta_label TEXT,
  cta_route TEXT,
  secondary_label TEXT,
  secondary_route TEXT,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','waiting','needs_review','due_soon','overdue','completed','dismissed')),
  priority INT NOT NULL DEFAULT 50,
  due_at TIMESTAMPTZ,
  blocked_reason TEXT,
  related_document_id UUID,
  related_report_id UUID,
  related_meeting_id UUID,
  related_opportunity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completion_note TEXT,
  dedupe_key TEXT
);
CREATE INDEX idx_next_actions_owner ON public.next_actions(owner_user_id, status);
CREATE INDEX idx_next_actions_student ON public.next_actions(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_next_actions_org ON public.next_actions(organization_id) WHERE organization_id IS NOT NULL;
CREATE UNIQUE INDEX idx_next_actions_dedupe
  ON public.next_actions(owner_user_id, kind, COALESCE(dedupe_key, ''))
  WHERE status <> 'completed' AND status <> 'dismissed';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.next_actions TO authenticated;
GRANT ALL ON public.next_actions TO service_role;

ALTER TABLE public.next_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own next actions"
  ON public.next_actions FOR SELECT TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR (student_id IS NOT NULL AND public.can_access_student(auth.uid(), student_id))
    OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users insert own next actions"
  ON public.next_actions FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users update own next actions"
  ON public.next_actions FOR UPDATE TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR (student_id IS NOT NULL AND public.can_edit_student(auth.uid(), student_id))
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    OR (student_id IS NOT NULL AND public.can_edit_student(auth.uid(), student_id))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users delete own next actions"
  ON public.next_actions FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_next_actions_updated_at
  BEFORE UPDATE ON public.next_actions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) activity_history
CREATE TABLE public.activity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  subject_title TEXT NOT NULL,
  subject_route TEXT,
  related_document_id UUID,
  related_report_id UUID,
  related_meeting_id UUID,
  related_opportunity_id UUID,
  related_action_id UUID REFERENCES public.next_actions(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_history_actor ON public.activity_history(actor_user_id, occurred_at DESC);
CREATE INDEX idx_activity_history_student ON public.activity_history(student_id, occurred_at DESC) WHERE student_id IS NOT NULL;
CREATE INDEX idx_activity_history_org ON public.activity_history(organization_id, occurred_at DESC) WHERE organization_id IS NOT NULL;

GRANT SELECT, INSERT ON public.activity_history TO authenticated;
GRANT ALL ON public.activity_history TO service_role;

ALTER TABLE public.activity_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see relevant activity"
  ON public.activity_history FOR SELECT TO authenticated
  USING (
    actor_user_id = auth.uid()
    OR (student_id IS NOT NULL AND public.can_access_student(auth.uid(), student_id))
    OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users insert own activity"
  ON public.activity_history FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid());
