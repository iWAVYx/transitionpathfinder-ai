
-- =========================================================
-- 1. FEED EVENTS
-- =========================================================
CREATE TABLE public.feed_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  actor_id uuid,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  ref_table text,
  ref_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_feed_events_student_created ON public.feed_events (student_id, created_at DESC);
CREATE INDEX idx_feed_events_kind ON public.feed_events (kind);

GRANT SELECT, INSERT, DELETE ON public.feed_events TO authenticated;
GRANT ALL ON public.feed_events TO service_role;

ALTER TABLE public.feed_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View feed via student" ON public.feed_events
  FOR SELECT TO authenticated USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Insert feed via student" ON public.feed_events
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id) AND auth.uid() = actor_id);
CREATE POLICY "Delete feed via student" ON public.feed_events
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));

-- =========================================================
-- 2. COMMUNICATION CENTER
-- =========================================================
CREATE TABLE public.message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'general',
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_message_threads_student ON public.message_threads (student_id, last_message_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_threads TO authenticated;
GRANT ALL ON public.message_threads TO service_role;

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View threads via student" ON public.message_threads
  FOR SELECT TO authenticated USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Create threads via student" ON public.message_threads
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id) AND auth.uid() = created_by);
CREATE POLICY "Update threads via student" ON public.message_threads
  FOR UPDATE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete threads via student" ON public.message_threads
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));

CREATE TRIGGER trg_message_threads_updated_at
  BEFORE UPDATE ON public.message_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_thread_created ON public.messages (thread_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View messages via thread" ON public.messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.message_threads t
            WHERE t.id = messages.thread_id
              AND public.can_access_student(auth.uid(), t.student_id))
  );
CREATE POLICY "Post messages via thread" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM public.message_threads t
            WHERE t.id = messages.thread_id
              AND public.can_edit_student(auth.uid(), t.student_id))
  );
CREATE POLICY "Edit own messages" ON public.messages
  FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Delete own messages" ON public.messages
  FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE TRIGGER trg_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 3. MEETING CENTER
-- =========================================================
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  created_by uuid NOT NULL,
  kind text NOT NULL DEFAULT 'PPT',
  title text NOT NULL,
  scheduled_at timestamptz,
  location text,
  status text NOT NULL DEFAULT 'upcoming',
  student_voice text,
  family_concerns text,
  teacher_notes text,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_meetings_student ON public.meetings (student_id, scheduled_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View meetings via student" ON public.meetings
  FOR SELECT TO authenticated USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Create meetings via student" ON public.meetings
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id) AND auth.uid() = created_by);
CREATE POLICY "Update meetings via student" ON public.meetings
  FOR UPDATE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete meetings via student" ON public.meetings
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));

CREATE TRIGGER trg_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.meeting_agenda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_meeting_agenda_meeting ON public.meeting_agenda_items (meeting_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_agenda_items TO authenticated;
GRANT ALL ON public.meeting_agenda_items TO service_role;

ALTER TABLE public.meeting_agenda_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access agenda via meeting" ON public.meeting_agenda_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_agenda_items.meeting_id
              AND public.can_access_student(auth.uid(), m.student_id))
  );
CREATE POLICY "Edit agenda via meeting" ON public.meeting_agenda_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_agenda_items.meeting_id
              AND public.can_edit_student(auth.uid(), m.student_id))
  );
CREATE POLICY "Update agenda via meeting" ON public.meeting_agenda_items
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_agenda_items.meeting_id
              AND public.can_edit_student(auth.uid(), m.student_id))
  );
CREATE POLICY "Delete agenda via meeting" ON public.meeting_agenda_items
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_agenda_items.meeting_id
              AND public.can_edit_student(auth.uid(), m.student_id))
  );

CREATE TABLE public.meeting_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  asker_role text NOT NULL DEFAULT 'family',
  asker_id uuid,
  question text NOT NULL,
  answer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_meeting_questions_meeting ON public.meeting_questions (meeting_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_questions TO authenticated;
GRANT ALL ON public.meeting_questions TO service_role;

ALTER TABLE public.meeting_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access questions via meeting" ON public.meeting_questions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_questions.meeting_id
              AND public.can_access_student(auth.uid(), m.student_id))
  );
CREATE POLICY "Insert questions via meeting" ON public.meeting_questions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_questions.meeting_id
              AND public.can_edit_student(auth.uid(), m.student_id))
  );
CREATE POLICY "Update questions via meeting" ON public.meeting_questions
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_questions.meeting_id
              AND public.can_edit_student(auth.uid(), m.student_id))
  );
CREATE POLICY "Delete questions via meeting" ON public.meeting_questions
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_questions.meeting_id
              AND public.can_edit_student(auth.uid(), m.student_id))
  );

CREATE TABLE public.meeting_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title text NOT NULL,
  assignee_role text,
  assignee_id uuid,
  due_date date,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_meeting_action_meeting ON public.meeting_action_items (meeting_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_action_items TO authenticated;
GRANT ALL ON public.meeting_action_items TO service_role;

ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access actions via meeting" ON public.meeting_action_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_action_items.meeting_id
              AND public.can_access_student(auth.uid(), m.student_id))
  );
CREATE POLICY "Insert actions via meeting" ON public.meeting_action_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_action_items.meeting_id
              AND public.can_edit_student(auth.uid(), m.student_id))
  );
CREATE POLICY "Update actions via meeting" ON public.meeting_action_items
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_action_items.meeting_id
              AND public.can_edit_student(auth.uid(), m.student_id))
  );
CREATE POLICY "Delete actions via meeting" ON public.meeting_action_items
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_action_items.meeting_id
              AND public.can_edit_student(auth.uid(), m.student_id))
  );

CREATE TRIGGER trg_meeting_action_items_updated_at
  BEFORE UPDATE ON public.meeting_action_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 4. FORMS LIBRARY
-- =========================================================
CREATE TABLE public.form_templates (
  slug text PRIMARY KEY,
  title text NOT NULL,
  description text,
  audience text NOT NULL DEFAULT 'family',
  category text NOT NULL DEFAULT 'general',
  schema jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.form_templates TO authenticated;
GRANT ALL ON public.form_templates TO service_role;

ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read form templates" ON public.form_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage form templates - insert" ON public.form_templates
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage form templates - update" ON public.form_templates
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage form templates - delete" ON public.form_templates
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_form_templates_updated_at
  BEFORE UPDATE ON public.form_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  template_slug text NOT NULL REFERENCES public.form_templates(slug) ON DELETE CASCADE,
  respondent_id uuid NOT NULL,
  respondent_role text NOT NULL DEFAULT 'family',
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_form_responses_student ON public.form_responses (student_id, template_slug);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_responses TO authenticated;
GRANT ALL ON public.form_responses TO service_role;

ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View form responses via student" ON public.form_responses
  FOR SELECT TO authenticated USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Insert form responses via student" ON public.form_responses
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id) AND auth.uid() = respondent_id);
CREATE POLICY "Update form responses via student" ON public.form_responses
  FOR UPDATE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete form responses via student" ON public.form_responses
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));

CREATE TRIGGER trg_form_responses_updated_at
  BEFORE UPDATE ON public.form_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 5. PROFILE EXTENSIONS (language preference)
-- =========================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

-- =========================================================
-- 6. REALTIME
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
