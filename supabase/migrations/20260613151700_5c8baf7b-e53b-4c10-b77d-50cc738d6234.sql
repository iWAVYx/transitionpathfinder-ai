
-- =====================================================================
-- Phase 1 — BridgeForward + PartnerForward schema foundation
-- =====================================================================

-- ---------- students: program_track ----------
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS program_track text NOT NULL DEFAULT 'transitionforward';

ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_program_track_check;
ALTER TABLE public.students
  ADD CONSTRAINT students_program_track_check
  CHECK (program_track IN ('bridgeforward','transitionforward','postsecondary'));

-- ---------- student_voice_responses: grade_band ----------
ALTER TABLE public.student_voice_responses
  ADD COLUMN IF NOT EXISTS grade_band text;

ALTER TABLE public.student_voice_responses DROP CONSTRAINT IF EXISTS svr_grade_band_check;
ALTER TABLE public.student_voice_responses
  ADD CONSTRAINT svr_grade_band_check
  CHECK (grade_band IS NULL OR grade_band IN ('middle_school','high_school','postsecondary'));

-- =====================================================================
-- BridgeForward
-- =====================================================================

-- ---------- bridgeforward_profiles ----------
CREATE TABLE IF NOT EXISTS public.bridgeforward_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  grade smallint,
  current_school text,
  district text,
  current_supports text,
  learning_strengths text,
  learning_challenges text,
  interests text,
  favorite_subjects text,
  subjects_needing_support text,
  social_emotional_support_needs text,
  executive_functioning_needs text,
  family_concerns text,
  student_hopes_for_high_school text,
  transportation_considerations text,
  extracurricular_interests text,
  preferred_school_environment text,
  high_school_options_considered text,
  is_demo boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bf_grade_range CHECK (grade IS NULL OR grade BETWEEN 5 AND 9)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bridgeforward_profiles TO authenticated;
GRANT ALL ON public.bridgeforward_profiles TO service_role;
ALTER TABLE public.bridgeforward_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View bridgeforward profile via student"
  ON public.bridgeforward_profiles FOR SELECT TO authenticated
  USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Insert bridgeforward profile via student"
  ON public.bridgeforward_profiles FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Update bridgeforward profile via student"
  ON public.bridgeforward_profiles FOR UPDATE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete bridgeforward profile via student"
  ON public.bridgeforward_profiles FOR DELETE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));

CREATE TRIGGER bridgeforward_profiles_set_updated_at
  BEFORE UPDATE ON public.bridgeforward_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS bridgeforward_profiles_student_idx
  ON public.bridgeforward_profiles(student_id);

-- ---------- high_school_options ----------
CREATE TABLE IF NOT EXISTS public.high_school_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_name text NOT NULL,
  option_type text NOT NULL,
  notes text,
  academic_fit_notes text,
  support_services_notes text,
  transportation_notes text,
  career_technical_notes text,
  extracurricular_notes text,
  school_size_environment text,
  accessibility_notes text,
  pros text,
  cons text,
  contact_info text,
  rank smallint,
  is_demo boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hso_option_type_check CHECK (option_type IN (
    'neighborhood','magnet','technical','charter','specialized',
    'alternative','private_ood','district_program','other'
  ))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.high_school_options TO authenticated;
GRANT ALL ON public.high_school_options TO service_role;
ALTER TABLE public.high_school_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View HS options via student"
  ON public.high_school_options FOR SELECT TO authenticated
  USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Insert HS options via student"
  ON public.high_school_options FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Update HS options via student"
  ON public.high_school_options FOR UPDATE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete HS options via student"
  ON public.high_school_options FOR DELETE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));

CREATE TRIGGER high_school_options_set_updated_at
  BEFORE UPDATE ON public.high_school_options
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS high_school_options_student_idx
  ON public.high_school_options(student_id);

-- ---------- high_school_fit_reviews ----------
CREATE TABLE IF NOT EXISTS public.high_school_fit_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  comparison_priorities jsonb NOT NULL DEFAULT '{}'::jsonb,
  family_priorities text,
  student_voice text,
  questions_for_team text,
  preferred_option_id uuid REFERENCES public.high_school_options(id) ON DELETE SET NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.high_school_fit_reviews TO authenticated;
GRANT ALL ON public.high_school_fit_reviews TO service_role;
ALTER TABLE public.high_school_fit_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View HS fit review via student"
  ON public.high_school_fit_reviews FOR SELECT TO authenticated
  USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Insert HS fit review via student"
  ON public.high_school_fit_reviews FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Update HS fit review via student"
  ON public.high_school_fit_reviews FOR UPDATE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete HS fit review via student"
  ON public.high_school_fit_reviews FOR DELETE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));

CREATE TRIGGER hs_fit_reviews_set_updated_at
  BEFORE UPDATE ON public.high_school_fit_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- bridgeforward_readiness_snapshots ----------
CREATE TABLE IF NOT EXISTS public.bridgeforward_readiness_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  student_snapshot text,
  strengths_and_interests text,
  learning_supports text,
  confidence_and_self_advocacy text,
  high_school_fit_considerations text,
  family_priorities text,
  questions_for_school_team text,
  suggested_next_steps text,
  thirty_day_plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  before_high_school_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_by_ai boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bridgeforward_readiness_snapshots TO authenticated;
GRANT ALL ON public.bridgeforward_readiness_snapshots TO service_role;
ALTER TABLE public.bridgeforward_readiness_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View BF snapshot via student"
  ON public.bridgeforward_readiness_snapshots FOR SELECT TO authenticated
  USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "Insert BF snapshot via student"
  ON public.bridgeforward_readiness_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Update BF snapshot via student"
  ON public.bridgeforward_readiness_snapshots FOR UPDATE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "Delete BF snapshot via student"
  ON public.bridgeforward_readiness_snapshots FOR DELETE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));

CREATE TRIGGER bf_snapshots_set_updated_at
  BEFORE UPDATE ON public.bridgeforward_readiness_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS bf_snapshots_student_idx
  ON public.bridgeforward_readiness_snapshots(student_id);

-- =====================================================================
-- PartnerForward
-- =====================================================================

-- ---------- partner_opportunities: new columns ----------
ALTER TABLE public.partner_opportunities
  ADD COLUMN IF NOT EXISTS support_needs_accepted jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS required_documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS capacity integer;

-- ---------- partner_impact_events ----------
CREATE TABLE IF NOT EXISTS public.partner_impact_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_kind text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  participant_count integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pie_event_kind_check CHECK (event_kind IN (
    'workshop','tour','info_session','internship','job_shadowing','mentorship',
    'training','family_workshop','referral','interest_request','outreach','other'
  ))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_impact_events TO authenticated;
GRANT ALL ON public.partner_impact_events TO service_role;
ALTER TABLE public.partner_impact_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners view own impact events"
  ON public.partner_impact_events FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Partners insert own impact events"
  ON public.partner_impact_events FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Partners update own impact events"
  ON public.partner_impact_events FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete impact events"
  ON public.partner_impact_events FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER partner_impact_events_set_updated_at
  BEFORE UPDATE ON public.partner_impact_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS pie_org_idx ON public.partner_impact_events(organization_id);

-- ---------- partner_incentive_resources ----------
CREATE TABLE IF NOT EXISTS public.partner_incentive_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  short_description text NOT NULL,
  long_description text,
  category text NOT NULL,
  cautious_disclaimer text NOT NULL DEFAULT
    'May qualify. Partners should review official guidance and consult a qualified tax or legal professional.',
  external_url text,
  agency text,
  is_published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pir_category_check CHECK (category IN (
    'tax_credit','tax_deduction','wotc','state_workforce','vocational_rehab',
    'inclusive_hiring','accessibility','grant_sponsorship','other'
  ))
);
GRANT SELECT ON public.partner_incentive_resources TO anon, authenticated;
GRANT ALL ON public.partner_incentive_resources TO service_role;
ALTER TABLE public.partner_incentive_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads published incentive resources"
  ON public.partner_incentive_resources FOR SELECT
  USING (is_published OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert incentive resources"
  ON public.partner_incentive_resources FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update incentive resources"
  ON public.partner_incentive_resources FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete incentive resources"
  ON public.partner_incentive_resources FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pir_set_updated_at
  BEFORE UPDATE ON public.partner_incentive_resources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- partner_badges ----------
CREATE TABLE IF NOT EXISTS public.partner_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  badge_kind text NOT NULL,
  awarded_by uuid,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, badge_kind),
  CONSTRAINT pb_badge_kind_check CHECK (badge_kind IN (
    'verified','inclusive','youth_pathway','career_exploration',
    'community_resource','accessibility_minded','outreach_needed','needs_review'
  ))
);
GRANT SELECT ON public.partner_badges TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.partner_badges TO authenticated;
GRANT ALL ON public.partner_badges TO service_role;
ALTER TABLE public.partner_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads active partner badges"
  ON public.partner_badges FOR SELECT
  USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert partner badges"
  ON public.partner_badges FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update partner badges"
  ON public.partner_badges FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete partner badges"
  ON public.partner_badges FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER partner_badges_set_updated_at
  BEFORE UPDATE ON public.partner_badges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS partner_badges_org_idx ON public.partner_badges(organization_id);

-- ---------- index hint for students.program_track ----------
CREATE INDEX IF NOT EXISTS students_program_track_idx ON public.students(program_track);
