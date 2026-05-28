-- =========================================================
-- 0. Enum expansion
-- =========================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'student';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'guardian';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'school_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';

-- =========================================================
-- 1. Profiles augmentation
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS primary_role text,
  ADD COLUMN IF NOT EXISTS organization_id uuid,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- =========================================================
-- 2. Organizations
-- =========================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'school' CHECK (type IN ('school','district','partner','agency','platform')),
  address text,
  city text,
  state text,
  website text,
  contact_email text,
  verified_status text NOT NULL DEFAULT 'pending' CHECK (verified_status IN ('pending','verified','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view verified organizations" ON public.organizations
  FOR SELECT TO authenticated USING (verified_status = 'verified' OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage organizations" ON public.organizations
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_org_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_within_org text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_memberships TO authenticated;
GRANT ALL ON public.organization_memberships TO service_role;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = _user_id AND organization_id = _org_id AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = _user_id AND organization_id = _org_id
      AND status = 'active' AND role_within_org IN ('admin','owner','school_admin')
  ) OR public.has_role(_user_id, 'admin')
$$;

CREATE POLICY "View own memberships or org admin" ON public.organization_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins insert memberships" ON public.organization_memberships
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins update memberships" ON public.organization_memberships
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "Org admins delete memberships" ON public.organization_memberships
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- =========================================================
-- 3. Students augmentation
-- =========================================================
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS student_user_id uuid,
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS expected_graduation_year integer,
  ADD COLUMN IF NOT EXISTS primary_disability_category text,
  ADD COLUMN IF NOT EXISTS strengths_summary text,
  ADD COLUMN IF NOT EXISTS interests_summary text,
  ADD COLUMN IF NOT EXISTS support_needs_summary text,
  ADD COLUMN IF NOT EXISTS family_priorities text,
  ADD COLUMN IF NOT EXISTS student_voice_statement text,
  ADD COLUMN IF NOT EXISTS current_transition_status text,
  ADD COLUMN IF NOT EXISTS readiness_level text;

-- =========================================================
-- 4. Student access tables (relationships beyond collaborators)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.student_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_user_id uuid,
  guardian_email text NOT NULL,
  relationship text,
  is_primary boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_guardians TO authenticated;
GRANT ALL ON public.student_guardians TO service_role;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access guardians via student" ON public.student_guardians
  FOR SELECT TO authenticated USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Edit guardians via student" ON public.student_guardians
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Update guardians via student" ON public.student_guardians
  FOR UPDATE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete guardians via student" ON public.student_guardians
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE TRIGGER trg_guard_updated BEFORE UPDATE ON public.student_guardians
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.student_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  member_user_id uuid,
  member_email text NOT NULL,
  role_on_team text NOT NULL DEFAULT 'teacher',
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_team_members TO authenticated;
GRANT ALL ON public.student_team_members TO service_role;
ALTER TABLE public.student_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access team via student" ON public.student_team_members
  FOR SELECT TO authenticated USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Edit team via student" ON public.student_team_members
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Update team via student" ON public.student_team_members
  FOR UPDATE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete team via student" ON public.student_team_members
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE TRIGGER trg_team_updated BEFORE UPDATE ON public.student_team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.student_partner_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  partner_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connection_type text NOT NULL DEFAULT 'referral',
  status text NOT NULL DEFAULT 'active',
  shared_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_partner_connections TO authenticated;
GRANT ALL ON public.student_partner_connections TO service_role;
ALTER TABLE public.student_partner_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access partner conns via student or partner org" ON public.student_partner_connections
  FOR SELECT TO authenticated USING (
    public.can_access_student(auth.uid(), student_id)
    OR public.is_org_member(auth.uid(), partner_organization_id)
  );
CREATE POLICY "Edit partner conns via student" ON public.student_partner_connections
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Update partner conns via student" ON public.student_partner_connections
  FOR UPDATE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete partner conns via student" ON public.student_partner_connections
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));

-- =========================================================
-- 5. Transition data
-- =========================================================
CREATE TABLE IF NOT EXISTS public.transition_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  education_training_goal text,
  employment_goal text,
  independent_living_goal text,
  community_participation_goal text,
  self_advocacy_goal text,
  transportation_goal text,
  financial_literacy_goal text,
  daily_living_goal text,
  technology_skills_goal text,
  current_services_summary text,
  current_barriers text,
  priority_needs text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transition_profiles TO authenticated;
GRANT ALL ON public.transition_profiles TO service_role;
ALTER TABLE public.transition_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access transition via student" ON public.transition_profiles
  FOR SELECT TO authenticated USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Insert transition via student" ON public.transition_profiles
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Update transition via student" ON public.transition_profiles
  FOR UPDATE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete transition via student" ON public.transition_profiles
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE TRIGGER trg_tp_updated BEFORE UPDATE ON public.transition_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.student_strengths_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('strength','preference','interest','need','motivator','barrier','support')),
  title text NOT NULL,
  description text,
  evidence_source text,
  impact_on_transition text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_strengths_needs TO authenticated;
GRANT ALL ON public.student_strengths_needs TO service_role;
ALTER TABLE public.student_strengths_needs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access SN via student" ON public.student_strengths_needs
  FOR SELECT TO authenticated USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Insert SN via student" ON public.student_strengths_needs
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Update SN via student" ON public.student_strengths_needs
  FOR UPDATE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete SN via student" ON public.student_strengths_needs
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));

CREATE TABLE IF NOT EXISTS public.readiness_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  category text NOT NULL,
  score integer CHECK (score BETWEEN 0 AND 100),
  level_label text,
  evidence text,
  recommendation text,
  updated_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.readiness_scores TO authenticated;
GRANT ALL ON public.readiness_scores TO service_role;
ALTER TABLE public.readiness_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access readiness via student" ON public.readiness_scores
  FOR SELECT TO authenticated USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Insert readiness via student" ON public.readiness_scores
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Update readiness via student" ON public.readiness_scores
  FOR UPDATE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete readiness via student" ON public.readiness_scores
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE TRIGGER trg_rs_updated BEFORE UPDATE ON public.readiness_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 6. Documents augmentation + summaries
-- =========================================================
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS document_category text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'family_team';

CREATE TABLE IF NOT EXISTS public.document_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  summary text,
  key_findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  strengths_identified jsonb NOT NULL DEFAULT '[]'::jsonb,
  needs_identified jsonb NOT NULL DEFAULT '[]'::jsonb,
  goals_identified jsonb NOT NULL DEFAULT '[]'::jsonb,
  important_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_information jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_followups jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_model_used text,
  human_review_status text NOT NULL DEFAULT 'pending' CHECK (human_review_status IN ('pending','approved','flagged','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_summaries TO authenticated;
GRANT ALL ON public.document_summaries TO service_role;
ALTER TABLE public.document_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access doc summaries via student" ON public.document_summaries
  FOR SELECT TO authenticated USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Insert doc summaries via student" ON public.document_summaries
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Update doc summaries via student" ON public.document_summaries
  FOR UPDATE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete doc summaries via student" ON public.document_summaries
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE TRIGGER trg_ds_updated BEFORE UPDATE ON public.document_summaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 7. AI jobs queue
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  triggered_by_user_id uuid NOT NULL,
  job_type text NOT NULL CHECK (job_type IN ('document_summary','pathway_report','resource_recommendation','meeting_prep','goal_suggestions')),
  input_source jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed','needs_review')),
  result_id uuid,
  result_payload jsonb,
  error_message text,
  attempts integer NOT NULL DEFAULT 0,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON public.ai_jobs (status, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_jobs TO authenticated;
GRANT ALL ON public.ai_jobs TO service_role;
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own or student-accessible jobs" ON public.ai_jobs
  FOR SELECT TO authenticated
  USING (
    triggered_by_user_id = auth.uid()
    OR (student_id IS NOT NULL AND public.can_access_student(auth.uid(), student_id))
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Create jobs for accessible students" ON public.ai_jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = triggered_by_user_id
    AND (student_id IS NULL OR public.can_edit_student(auth.uid(), student_id))
  );
CREATE TRIGGER trg_aijobs_updated BEFORE UPDATE ON public.ai_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 8. Pathway reports augmentation + recommendations
-- =========================================================
ALTER TABLE public.pathway_reports
  ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS report_status text NOT NULL DEFAULT 'generated' CHECK (report_status IN ('draft','generated','reviewed','shared','archived')),
  ADD COLUMN IF NOT EXISTS executive_summary text,
  ADD COLUMN IF NOT EXISTS student_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS strengths_needs_analysis jsonb,
  ADD COLUMN IF NOT EXISTS postsecondary_goal_summary text,
  ADD COLUMN IF NOT EXISTS recommended_pathways jsonb,
  ADD COLUMN IF NOT EXISTS career_matches jsonb,
  ADD COLUMN IF NOT EXISTS readiness_scorecard_summary jsonb,
  ADD COLUMN IF NOT EXISTS iep_transition_translator jsonb,
  ADD COLUMN IF NOT EXISTS missing_information jsonb,
  ADD COLUMN IF NOT EXISTS family_action_plan jsonb,
  ADD COLUMN IF NOT EXISTS teacher_action_plan jsonb,
  ADD COLUMN IF NOT EXISTS meeting_prep_summary jsonb,
  ADD COLUMN IF NOT EXISTS opportunity_matches jsonb,
  ADD COLUMN IF NOT EXISTS resource_recommendations jsonb,
  ADD COLUMN IF NOT EXISTS ai_confidence_level text,
  ADD COLUMN IF NOT EXISTS human_review_status text NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS public.pathway_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_report_id uuid NOT NULL REFERENCES public.pathway_reports(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  pathway_type text NOT NULL CHECK (pathway_type IN ('best_fit','backup','exploration','stretch','support_needed')),
  title text NOT NULL,
  description text,
  why_it_fits text,
  related_strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  possible_barriers jsonb NOT NULL DEFAULT '[]'::jsonb,
  supports_needed jsonb NOT NULL DEFAULT '[]'::jsonb,
  school_based_experiences jsonb NOT NULL DEFAULT '[]'::jsonb,
  community_based_experiences jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_courses jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_programs jsonb NOT NULL DEFAULT '[]'::jsonb,
  career_clusters jsonb NOT NULL DEFAULT '[]'::jsonb,
  credentials_or_training jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_steps_30_days jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_steps_90_days jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_steps_6_months jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_steps_1_year jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pathway_recommendations TO authenticated;
GRANT ALL ON public.pathway_recommendations TO service_role;
ALTER TABLE public.pathway_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access path recs via student" ON public.pathway_recommendations
  FOR SELECT TO authenticated USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Insert path recs via student" ON public.pathway_recommendations
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Update path recs via student" ON public.pathway_recommendations
  FOR UPDATE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete path recs via student" ON public.pathway_recommendations
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));

-- =========================================================
-- 9. Resource library
-- =========================================================
CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  resource_type text NOT NULL CHECK (resource_type IN ('article','video','podcast','book','checklist','assessment','worksheet','guide','online_tool','local_program')),
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('student','parent_guardian','teacher','school_admin','partner','all')),
  topic text,
  format text,
  grade_range text,
  age_range text,
  reading_level text,
  location_scope text NOT NULL DEFAULT 'national',
  estimated_time text,
  url text,
  image_url text,
  source_name text,
  verified_status text NOT NULL DEFAULT 'pending' CHECK (verified_status IN ('pending','verified','rejected')),
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resources TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads verified resources" ON public.resources
  FOR SELECT USING (verified_status = 'verified' OR created_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authed users create resources" ON public.resources
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by_user_id);
CREATE POLICY "Owners or admins update resources" ON public.resources
  FOR UPDATE TO authenticated USING (auth.uid() = created_by_user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete resources" ON public.resources
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_res_updated BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.resource_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  tag text NOT NULL,
  UNIQUE (resource_id, tag)
);
GRANT SELECT ON public.resource_tags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.resource_tags TO authenticated;
GRANT ALL ON public.resource_tags TO service_role;
ALTER TABLE public.resource_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads resource tags" ON public.resource_tags FOR SELECT USING (true);
CREATE POLICY "Admins or owners manage tags" ON public.resource_tags
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.resources r WHERE r.id = resource_id AND r.created_by_user_id = auth.uid())
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.resources r WHERE r.id = resource_id AND r.created_by_user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.student_resource_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  pathway_report_id uuid REFERENCES public.pathway_reports(id) ON DELETE SET NULL,
  reason_recommended text,
  related_goal_area text,
  priority_level text NOT NULL DEFAULT 'medium' CHECK (priority_level IN ('low','medium','high')),
  status text NOT NULL DEFAULT 'recommended' CHECK (status IN ('recommended','saved','assigned','completed','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_resource_recommendations TO authenticated;
GRANT ALL ON public.student_resource_recommendations TO service_role;
ALTER TABLE public.student_resource_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access SRR via student" ON public.student_resource_recommendations
  FOR SELECT TO authenticated USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Insert SRR via student" ON public.student_resource_recommendations
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Update SRR via student" ON public.student_resource_recommendations
  FOR UPDATE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete SRR via student" ON public.student_resource_recommendations
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));

CREATE TABLE IF NOT EXISTS public.saved_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  collection_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_id, collection_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_resources TO authenticated;
GRANT ALL ON public.saved_resources TO service_role;
ALTER TABLE public.saved_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own saved resources" ON public.saved_resources
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- 10. Action items
-- =========================================================
CREATE TABLE IF NOT EXISTS public.action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  pathway_report_id uuid REFERENCES public.pathway_reports(id) ON DELETE SET NULL,
  assigned_to_user_id uuid,
  created_by_user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'family' CHECK (category IN ('family','student','teacher','school','partner')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_date date,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','complete','blocked')),
  related_goal_area text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_items TO authenticated;
GRANT ALL ON public.action_items TO service_role;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access actions via student or assignee" ON public.action_items
  FOR SELECT TO authenticated
  USING (public.can_access_student(auth.uid(), student_id) OR assigned_to_user_id = auth.uid());
CREATE POLICY "Insert actions via student" ON public.action_items
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id) AND auth.uid() = created_by_user_id);
CREATE POLICY "Update actions via student or assignee" ON public.action_items
  FOR UPDATE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id) OR assigned_to_user_id = auth.uid());
CREATE POLICY "Delete actions via student" ON public.action_items
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE TRIGGER trg_ai_updated BEFORE UPDATE ON public.action_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 11. Collaboration notes + comments
-- =========================================================
CREATE TABLE IF NOT EXISTS public.collaboration_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL,
  note_type text NOT NULL DEFAULT 'general' CHECK (note_type IN ('general','family_note','teacher_note','meeting_note','private_note','action_update')),
  visibility text NOT NULL DEFAULT 'team',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaboration_notes TO authenticated;
GRANT ALL ON public.collaboration_notes TO service_role;
ALTER TABLE public.collaboration_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View notes via student" ON public.collaboration_notes
  FOR SELECT TO authenticated USING (
    (note_type <> 'private_note' AND public.can_access_student(auth.uid(), student_id))
    OR created_by_user_id = auth.uid()
  );
CREATE POLICY "Insert notes via student" ON public.collaboration_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id) AND auth.uid() = created_by_user_id);
CREATE POLICY "Update own notes" ON public.collaboration_notes
  FOR UPDATE TO authenticated USING (created_by_user_id = auth.uid());
CREATE POLICY "Delete own notes" ON public.collaboration_notes
  FOR DELETE TO authenticated USING (created_by_user_id = auth.uid());
CREATE TRIGGER trg_cn_updated BEFORE UPDATE ON public.collaboration_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type text NOT NULL,
  parent_id uuid NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments (parent_type, parent_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View comments via student or author" ON public.comments
  FOR SELECT TO authenticated
  USING (
    created_by_user_id = auth.uid()
    OR (student_id IS NOT NULL AND public.can_access_student(auth.uid(), student_id))
  );
CREATE POLICY "Insert own comments via student" ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by_user_id
    AND (student_id IS NULL OR public.can_access_student(auth.uid(), student_id))
  );
CREATE POLICY "Update own comments" ON public.comments
  FOR UPDATE TO authenticated USING (created_by_user_id = auth.uid());
CREATE POLICY "Delete own comments" ON public.comments
  FOR DELETE TO authenticated USING (created_by_user_id = auth.uid());
CREATE TRIGGER trg_comments_updated BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 12. Meeting prep items (extends existing meetings)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.meeting_prep_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('question','concern','strength','document','goal_to_review','service_to_discuss','follow_up')),
  content text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_prep_items TO authenticated;
GRANT ALL ON public.meeting_prep_items TO service_role;
ALTER TABLE public.meeting_prep_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access prep via student" ON public.meeting_prep_items
  FOR SELECT TO authenticated USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Insert prep via student" ON public.meeting_prep_items
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Update prep via student" ON public.meeting_prep_items
  FOR UPDATE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete prep via student" ON public.meeting_prep_items
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE TRIGGER trg_mpi_updated BEFORE UPDATE ON public.meeting_prep_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 13. Partner opportunities
-- =========================================================
CREATE TABLE IF NOT EXISTS public.partner_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  opportunity_type text NOT NULL CHECK (opportunity_type IN ('college_program','technical_school','certificate_program','employer','internship','mentorship','job_shadowing','agency_support','community_resource')),
  location text,
  eligibility text,
  age_range text,
  related_career_clusters jsonb NOT NULL DEFAULT '[]'::jsonb,
  support_needs_fit jsonb NOT NULL DEFAULT '[]'::jsonb,
  contact_email text,
  application_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','approved','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_opportunities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_opportunities TO authenticated;
GRANT ALL ON public.partner_opportunities TO service_role;
ALTER TABLE public.partner_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads approved opportunities" ON public.partner_opportunities
  FOR SELECT USING (status = 'approved' OR public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Org members create opportunities" ON public.partner_opportunities
  FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members update opportunities" ON public.partner_opportunities
  FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Org admins delete opportunities" ON public.partner_opportunities
  FOR DELETE TO authenticated USING (public.is_org_admin(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.partner_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.student_opportunity_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.partner_opportunities(id) ON DELETE CASCADE,
  pathway_report_id uuid REFERENCES public.pathway_reports(id) ON DELETE SET NULL,
  match_reason text,
  readiness_level text,
  recommended_next_step text,
  status text NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested','saved','contacted','applied','completed','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_opportunity_matches TO authenticated;
GRANT ALL ON public.student_opportunity_matches TO service_role;
ALTER TABLE public.student_opportunity_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access opp matches via student" ON public.student_opportunity_matches
  FOR SELECT TO authenticated USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Insert opp matches via student" ON public.student_opportunity_matches
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Update opp matches via student" ON public.student_opportunity_matches
  FOR UPDATE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete opp matches via student" ON public.student_opportunity_matches
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));

-- =========================================================
-- 14. Consent + sharing
-- =========================================================
CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  consenting_user_id uuid NOT NULL,
  consent_type text NOT NULL CHECK (consent_type IN ('document_upload','ai_processing','team_sharing','partner_sharing','school_access','data_export')),
  consent_status text NOT NULL DEFAULT 'granted' CHECK (consent_status IN ('granted','revoked','expired')),
  consent_text_snapshot text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  expires_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.consent_records TO authenticated;
GRANT ALL ON public.consent_records TO service_role;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access consent via student" ON public.consent_records
  FOR SELECT TO authenticated USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Insert consent self" ON public.consent_records
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = consenting_user_id AND public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Revoke own consent" ON public.consent_records
  FOR UPDATE TO authenticated USING (auth.uid() = consenting_user_id);

CREATE TABLE IF NOT EXISTS public.sharing_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  shared_by_user_id uuid NOT NULL,
  shared_with_user_id uuid,
  shared_with_organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'view_only' CHECK (access_level IN ('view_only','comment','edit','admin')),
  shared_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  expiration_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (shared_with_user_id IS NOT NULL OR shared_with_organization_id IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sharing_permissions TO authenticated;
GRANT ALL ON public.sharing_permissions TO service_role;
ALTER TABLE public.sharing_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View sharing via student or recipient" ON public.sharing_permissions
  FOR SELECT TO authenticated
  USING (
    public.can_access_student(auth.uid(), student_id)
    OR shared_with_user_id = auth.uid()
    OR (shared_with_organization_id IS NOT NULL AND public.is_org_member(auth.uid(), shared_with_organization_id))
  );
CREATE POLICY "Editors create sharing" ON public.sharing_permissions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = shared_by_user_id AND public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Editors update sharing" ON public.sharing_permissions
  FOR UPDATE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Editors delete sharing" ON public.sharing_permissions
  FOR DELETE TO authenticated USING (public.can_edit_student(auth.uid(), student_id));
CREATE TRIGGER trg_sp_updated BEFORE UPDATE ON public.sharing_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 15. Notifications
-- =========================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  notification_type text NOT NULL DEFAULT 'general',
  related_student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  related_record_type text,
  related_record_id uuid,
  read_status boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, read_status, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Mark own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- 16. Support requests
-- =========================================================
CREATE TABLE IF NOT EXISTS public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by_user_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  assigned_to_admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_requests TO authenticated;
GRANT ALL ON public.support_requests TO service_role;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own or admin support requests" ON public.support_requests
  FOR SELECT TO authenticated
  USING (submitted_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone submits support" ON public.support_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by_user_id);
CREATE POLICY "Admins update support" ON public.support_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_sr_updated BEFORE UPDATE ON public.support_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 17. Realtime publication
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.action_items;