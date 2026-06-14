
-- ============================================================
-- BridgeForward backend: CT high school directory, programs,
-- matching, resources, and admin source/import system.
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.ct_school_type AS ENUM (
    'comprehensive_public','technical_ctecs','magnet','charter',
    'agricultural_aste','open_choice','specialized_program',
    'alternative_program','private_or_out_of_district','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ct_program_category AS ENUM (
    'stem','arts','health_sciences','trades','manufacturing','culinary',
    'agriculture','aquaculture','aviation','digital_media','business',
    'public_service','college_credit','career_technical','special_program','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.bf_verification_status AS ENUM (
    'imported','needs_review','verified','outdated','archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.bf_match_status AS ENUM (
    'suggested','saved','discussed','dismissed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.bf_import_status AS ENUM (
    'pending','approved','rejected','merged','needs_changes'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ct_high_schools ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ct_high_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  district TEXT,
  city TEXT,
  county TEXT,
  school_type public.ct_school_type NOT NULL DEFAULT 'other',
  grades_served TEXT,
  website_url TEXT,
  admissions_url TEXT,
  application_window TEXT,
  transportation_notes TEXT,
  source_url TEXT,
  source_name TEXT,
  verification_status public.bf_verification_status NOT NULL DEFAULT 'imported',
  last_verified_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ct_high_schools_status ON public.ct_high_schools(verification_status);
CREATE INDEX IF NOT EXISTS idx_ct_high_schools_type ON public.ct_high_schools(school_type);
CREATE INDEX IF NOT EXISTS idx_ct_high_schools_name ON public.ct_high_schools(lower(name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ct_high_schools TO authenticated;
GRANT SELECT ON public.ct_high_schools TO anon;
GRANT ALL ON public.ct_high_schools TO service_role;

ALTER TABLE public.ct_high_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ct_high_schools public select verified"
  ON public.ct_high_schools FOR SELECT
  USING (verification_status = 'verified' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ct_high_schools admin insert"
  ON public.ct_high_schools FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ct_high_schools admin update"
  ON public.ct_high_schools FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ct_high_schools admin delete"
  ON public.ct_high_schools FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ct_high_schools_set_updated_at
  BEFORE UPDATE ON public.ct_high_schools
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ct_high_school_programs ---------------------------------------
CREATE TABLE IF NOT EXISTS public.ct_high_school_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.ct_high_schools(id) ON DELETE CASCADE,
  program_name TEXT NOT NULL,
  program_category public.ct_program_category NOT NULL DEFAULT 'other',
  description TEXT,
  student_fit_tags TEXT[] NOT NULL DEFAULT '{}',
  support_considerations TEXT,
  application_requirements TEXT,
  source_url TEXT,
  verification_status public.bf_verification_status NOT NULL DEFAULT 'imported',
  last_verified_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ct_programs_school ON public.ct_high_school_programs(school_id);
CREATE INDEX IF NOT EXISTS idx_ct_programs_status ON public.ct_high_school_programs(verification_status);
CREATE INDEX IF NOT EXISTS idx_ct_programs_tags ON public.ct_high_school_programs USING GIN(student_fit_tags);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ct_high_school_programs TO authenticated;
GRANT SELECT ON public.ct_high_school_programs TO anon;
GRANT ALL ON public.ct_high_school_programs TO service_role;

ALTER TABLE public.ct_high_school_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ct_programs public select verified"
  ON public.ct_high_school_programs FOR SELECT
  USING (verification_status = 'verified' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ct_programs admin insert"
  ON public.ct_high_school_programs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ct_programs admin update"
  ON public.ct_high_school_programs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ct_programs admin delete"
  ON public.ct_high_school_programs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ct_programs_set_updated_at
  BEFORE UPDATE ON public.ct_high_school_programs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- high_school_program_tags --------------------------------------
CREATE TABLE IF NOT EXISTS public.high_school_program_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  category TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.high_school_program_tags TO authenticated;
GRANT SELECT ON public.high_school_program_tags TO anon;
GRANT ALL ON public.high_school_program_tags TO service_role;

ALTER TABLE public.high_school_program_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags public select"
  ON public.high_school_program_tags FOR SELECT USING (true);
CREATE POLICY "tags admin insert"
  ON public.high_school_program_tags FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tags admin update"
  ON public.high_school_program_tags FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tags admin delete"
  ON public.high_school_program_tags FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tags_set_updated_at
  BEFORE UPDATE ON public.high_school_program_tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- bridgeforward_school_matches ----------------------------------
CREATE TABLE IF NOT EXISTS public.bridgeforward_school_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.ct_high_schools(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.ct_high_school_programs(id) ON DELETE SET NULL,
  status public.bf_match_status NOT NULL DEFAULT 'suggested',
  score NUMERIC,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  student_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions_to_ask TEXT[] NOT NULL DEFAULT '{}',
  needs_review TEXT[] NOT NULL DEFAULT '{}',
  discuss_with_team BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  saved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bf_matches_student ON public.bridgeforward_school_matches(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_bf_match_student_school_program
  ON public.bridgeforward_school_matches(student_id, school_id, COALESCE(program_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bridgeforward_school_matches TO authenticated;
GRANT ALL ON public.bridgeforward_school_matches TO service_role;

ALTER TABLE public.bridgeforward_school_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bf_matches select via access"
  ON public.bridgeforward_school_matches FOR SELECT TO authenticated
  USING (public.can_access_student(auth.uid(), student_id));
CREATE POLICY "bf_matches insert via edit"
  ON public.bridgeforward_school_matches FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "bf_matches update via edit"
  ON public.bridgeforward_school_matches FOR UPDATE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id))
  WITH CHECK (public.can_edit_student(auth.uid(), student_id));
CREATE POLICY "bf_matches delete via edit"
  ON public.bridgeforward_school_matches FOR DELETE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));

CREATE TRIGGER bf_matches_set_updated_at
  BEFORE UPDATE ON public.bridgeforward_school_matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- bridgeforward_resources ---------------------------------------
CREATE TABLE IF NOT EXISTS public.bridgeforward_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  audience TEXT NOT NULL DEFAULT 'family',
  external_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  source_name TEXT,
  source_url TEXT,
  verification_status public.bf_verification_status NOT NULL DEFAULT 'imported',
  last_verified_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bf_resources_status ON public.bridgeforward_resources(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bridgeforward_resources TO authenticated;
GRANT SELECT ON public.bridgeforward_resources TO anon;
GRANT ALL ON public.bridgeforward_resources TO service_role;

ALTER TABLE public.bridgeforward_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bf_resources public select published"
  ON public.bridgeforward_resources FOR SELECT
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "bf_resources admin insert"
  ON public.bridgeforward_resources FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "bf_resources admin update"
  ON public.bridgeforward_resources FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "bf_resources admin delete"
  ON public.bridgeforward_resources FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER bf_resources_set_updated_at
  BEFORE UPDATE ON public.bridgeforward_resources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- bridgeforward_source_records ----------------------------------
CREATE TABLE IF NOT EXISTS public.bridgeforward_source_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT,
  dedupe_key TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  normalized JSONB NOT NULL DEFAULT '{}'::jsonb,
  import_status public.bf_import_status NOT NULL DEFAULT 'pending',
  suggested_school_id UUID REFERENCES public.ct_high_schools(id) ON DELETE SET NULL,
  notes TEXT,
  imported_by UUID,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bf_source_status ON public.bridgeforward_source_records(import_status);
CREATE INDEX IF NOT EXISTS idx_bf_source_dedupe ON public.bridgeforward_source_records(dedupe_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bridgeforward_source_records TO authenticated;
GRANT ALL ON public.bridgeforward_source_records TO service_role;

ALTER TABLE public.bridgeforward_source_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bf_source admin all"
  ON public.bridgeforward_source_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER bf_source_set_updated_at
  BEFORE UPDATE ON public.bridgeforward_source_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- bridgeforward_import_reviews ----------------------------------
CREATE TABLE IF NOT EXISTS public.bridgeforward_import_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_record_id UUID NOT NULL REFERENCES public.bridgeforward_source_records(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  action TEXT NOT NULL,
  notes TEXT,
  target_school_id UUID REFERENCES public.ct_high_schools(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bf_reviews_source ON public.bridgeforward_import_reviews(source_record_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bridgeforward_import_reviews TO authenticated;
GRANT ALL ON public.bridgeforward_import_reviews TO service_role;

ALTER TABLE public.bridgeforward_import_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bf_reviews admin all"
  ON public.bridgeforward_import_reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
