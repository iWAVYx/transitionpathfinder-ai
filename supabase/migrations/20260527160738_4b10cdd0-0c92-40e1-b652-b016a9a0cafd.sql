
-- 1. Extend role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'case_manager';

-- 2. STUDENTS
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text,
  grade_band text,
  school text,
  date_of_birth date,
  photo_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 3. STUDENT_COLLABORATORS
CREATE TABLE public.student_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  user_id uuid,
  invited_email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer', -- viewer | editor
  status text NOT NULL DEFAULT 'pending', -- pending | accepted | revoked
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, invited_email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_collaborators TO authenticated;
GRANT ALL ON public.student_collaborators TO service_role;
ALTER TABLE public.student_collaborators ENABLE ROW LEVEL SECURITY;

-- 4. Security definer: access check
CREATE OR REPLACE FUNCTION public.can_access_student(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = _student_id AND s.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.student_collaborators c
    WHERE c.student_id = _student_id
      AND c.user_id = _user_id
      AND c.status = 'accepted'
  ) OR public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.can_edit_student(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = _student_id AND s.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.student_collaborators c
    WHERE c.student_id = _student_id
      AND c.user_id = _user_id
      AND c.status = 'accepted'
      AND c.role = 'editor'
  ) OR public.has_role(_user_id, 'admin');
$$;

-- 5. Students RLS
CREATE POLICY "Owners and collaborators view students" ON public.students
  FOR SELECT TO authenticated
  USING (public.can_access_student(auth.uid(), id));
CREATE POLICY "Owners insert students" ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Editors update students" ON public.students
  FOR UPDATE TO authenticated
  USING (public.can_edit_student(auth.uid(), id));
CREATE POLICY "Owners delete students" ON public.students
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- 6. Collaborators RLS
CREATE POLICY "View collaborators of accessible students" ON public.student_collaborators
  FOR SELECT TO authenticated
  USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Editors invite collaborators" ON public.student_collaborators
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id) AND auth.uid() = invited_by);
CREATE POLICY "Invitee or owner updates collaborator" ON public.student_collaborators
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.owner_id = auth.uid())
  );
CREATE POLICY "Owner deletes collaborator" ON public.student_collaborators
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.owner_id = auth.uid()));

-- 7. GOALS
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  category text NOT NULL DEFAULT 'general', -- academic | life-skills | career | college | transportation | communication | general
  title text NOT NULL,
  description text,
  target_date date,
  status text NOT NULL DEFAULT 'not-started', -- not-started | in-progress | met | paused
  measurable_criteria text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access goals via student" ON public.goals
  FOR SELECT TO authenticated USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Edit goals via student" ON public.goals
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_student(auth.uid(), student_id) AND auth.uid() = created_by);
CREATE POLICY "Update goals via student" ON public.goals
  FOR UPDATE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete goals via student" ON public.goals
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));

-- 8. PATHWAY_PROGRESS
CREATE TABLE public.pathway_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  pathway_id text NOT NULL, -- college | technical-education | career | life-skills | progress
  step_index int NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  note text,
  updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, pathway_id, step_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pathway_progress TO authenticated;
GRANT ALL ON public.pathway_progress TO service_role;
ALTER TABLE public.pathway_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access progress via student" ON public.pathway_progress
  FOR SELECT TO authenticated USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Insert progress via student" ON public.pathway_progress
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_student(auth.uid(), student_id) AND auth.uid() = updated_by);
CREATE POLICY "Update progress via student" ON public.pathway_progress
  FOR UPDATE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete progress via student" ON public.pathway_progress
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));

-- 9. DOCUMENTS
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  doc_type text NOT NULL DEFAULT 'iep', -- iep | 504 | evaluation | other
  title text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes int,
  parsed_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access docs via student" ON public.documents
  FOR SELECT TO authenticated USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Insert docs via student" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_student(auth.uid(), student_id) AND auth.uid() = uploaded_by);
CREATE POLICY "Update docs via student" ON public.documents
  FOR UPDATE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete docs via student" ON public.documents
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));

-- 10. SHARE_TOKENS
CREATE TABLE public.share_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  report_id uuid NOT NULL REFERENCES public.pathway_reports(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  audience text NOT NULL DEFAULT 'family', -- family | educator
  expires_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  view_count int NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_tokens TO authenticated;
GRANT ALL ON public.share_tokens TO service_role;
ALTER TABLE public.share_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their share tokens" ON public.share_tokens
  FOR SELECT TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Owners create share tokens" ON public.share_tokens
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owners revoke share tokens" ON public.share_tokens
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Owners delete share tokens" ON public.share_tokens
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Resolver function — anonymous-safe lookup
CREATE OR REPLACE FUNCTION public.resolve_share_token(_token text)
RETURNS TABLE (report_id uuid, audience text, content jsonb, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, st.audience, r.content, r.created_at
  FROM public.share_tokens st
  JOIN public.pathway_reports r ON r.id = st.report_id
  WHERE st.token = _token
    AND st.revoked = false
    AND (st.expires_at IS NULL OR st.expires_at > now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_share_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.track_share_view(_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.share_tokens
  SET view_count = view_count + 1, last_viewed_at = now()
  WHERE token = _token AND revoked = false;
END;
$$;
GRANT EXECUTE ON FUNCTION public.track_share_view(text) TO anon, authenticated;

-- 11. AUDIT_LOG
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL, -- view | create | update | delete | share | export
  entity_type text NOT NULL, -- student | goal | report | document | share_token
  entity_id uuid,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Actor or student-accessor views audit" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    auth.uid() = actor_id
    OR (student_id IS NOT NULL AND public.can_access_student(auth.uid(), student_id))
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Authenticated inserts audit for self" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- 12. NOTIFICATION_PREFS
CREATE TABLE public.notification_prefs (
  user_id uuid PRIMARY KEY,
  email_weekly_digest boolean NOT NULL DEFAULT true,
  email_goal_reminders boolean NOT NULL DEFAULT true,
  email_collab_invites boolean NOT NULL DEFAULT true,
  email_report_ready boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_prefs TO authenticated;
GRANT ALL ON public.notification_prefs TO service_role;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own prefs select" ON public.notification_prefs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own prefs insert" ON public.notification_prefs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own prefs update" ON public.notification_prefs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 13. Optional links from existing tables
ALTER TABLE public.pathway_reports ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE SET NULL;
ALTER TABLE public.student_intakes ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE SET NULL;

-- 14. updated_at triggers
CREATE TRIGGER set_updated_at_students BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_collab BEFORE UPDATE ON public.student_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_goals BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_progress BEFORE UPDATE ON public.pathway_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_documents BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_notif BEFORE UPDATE ON public.notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 15. Indexes
CREATE INDEX idx_students_owner ON public.students(owner_id);
CREATE INDEX idx_collab_user ON public.student_collaborators(user_id);
CREATE INDEX idx_collab_email ON public.student_collaborators(invited_email);
CREATE INDEX idx_goals_student ON public.goals(student_id);
CREATE INDEX idx_progress_student ON public.pathway_progress(student_id);
CREATE INDEX idx_documents_student ON public.documents(student_id);
CREATE INDEX idx_share_tokens_token ON public.share_tokens(token);
CREATE INDEX idx_audit_student ON public.audit_log(student_id);
CREATE INDEX idx_audit_actor ON public.audit_log(actor_id);

-- 16. Private storage bucket for IEPs
INSERT INTO storage.buckets (id, name, public) VALUES ('student-documents', 'student-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: path convention "<student_id>/<filename>"
CREATE POLICY "Access student docs via student access" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND public.can_access_student(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "Upload student docs via edit access" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-documents'
    AND public.can_edit_student(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "Update student docs via edit access" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND public.can_edit_student(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "Delete student docs via edit access" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND public.can_edit_student(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
