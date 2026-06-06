
-- 1. Widen resources.audience to include district_admin
ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_audience_check;
ALTER TABLE public.resources ADD CONSTRAINT resources_audience_check
  CHECK (audience = ANY (ARRAY['student','parent_guardian','teacher','school_admin','district_admin','partner','all']));

-- 2. Create resource_sources table
CREATE TABLE IF NOT EXISTS public.resource_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text,
  organization_name text,
  description text,
  source_type text NOT NULL DEFAULT 'library'
    CHECK (source_type = ANY (ARRAY['library','government','nonprofit','professional_association','research_center','curriculum','tools','media','local_resource','curated','partner'])),
  audience_focus text[] NOT NULL DEFAULT '{}',
  topic_focus text[] NOT NULL DEFAULT '{}',
  location_scope text NOT NULL DEFAULT 'national'
    CHECK (location_scope = ANY (ARRAY['national','connecticut','local','online'])),
  update_frequency text NOT NULL DEFAULT 'unknown'
    CHECK (update_frequency = ANY (ARRAY['ongoing','monthly','quarterly','yearly','unknown'])),
  review_status text NOT NULL DEFAULT 'approved'
    CHECK (review_status = ANY (ARRAY['needs_review','approved','featured','archived'])),
  last_reviewed_at timestamptz,
  next_review_due_at timestamptz,
  notes text,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.resource_sources TO authenticated;
GRANT ALL ON public.resource_sources TO service_role;

ALTER TABLE public.resource_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authed can view non-archived sources"
  ON public.resource_sources FOR SELECT TO authenticated
  USING (review_status <> 'archived' OR is_admin_hub_member(auth.uid()));

CREATE POLICY "Admin hub manages sources insert"
  ON public.resource_sources FOR INSERT TO authenticated
  WITH CHECK (is_admin_hub_member(auth.uid()));

CREATE POLICY "Admin hub manages sources update"
  ON public.resource_sources FOR UPDATE TO authenticated
  USING (is_admin_hub_member(auth.uid()))
  WITH CHECK (is_admin_hub_member(auth.uid()));

CREATE POLICY "Admin hub deletes sources"
  ON public.resource_sources FOR DELETE TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE TRIGGER trg_resource_sources_updated
  BEFORE UPDATE ON public.resource_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Extend resources table with curation fields
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS source_id uuid REFERENCES public.resource_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_resource_url text,
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS copyright_notes text,
  ADD COLUMN IF NOT EXISTS accessibility_notes text,
  ADD COLUMN IF NOT EXISTS age_appropriateness text,
  ADD COLUMN IF NOT EXISTS role_relevance text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pathway_relevance text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS published_status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS link_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS link_checked_at timestamptz;

ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_published_status_check;
ALTER TABLE public.resources ADD CONSTRAINT resources_published_status_check
  CHECK (published_status = ANY (ARRAY['draft','needs_review','approved','published','featured','archived']));

ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_link_status_check;
ALTER TABLE public.resources ADD CONSTRAINT resources_link_status_check
  CHECK (link_status = ANY (ARRAY['unknown','ok','broken']));

CREATE INDEX IF NOT EXISTS idx_resources_source_id ON public.resources(source_id);
CREATE INDEX IF NOT EXISTS idx_resources_published_status ON public.resources(published_status);
CREATE INDEX IF NOT EXISTS idx_resources_featured ON public.resources(featured) WHERE featured = true;

-- 4. Seed source libraries
INSERT INTO public.resource_sources
  (source_name, source_url, organization_name, description, source_type, audience_focus, topic_focus, location_scope, update_frequency, review_status, last_reviewed_at)
VALUES
  ('Council for Exceptional Children — Improving Your Practice',
   'https://exceptionalchildren.org/improving-your-practice',
   'Council for Exceptional Children',
   'Professional learning, high-leverage practices, and classroom-ready tools for special educators.',
   'professional_association',
   ARRAY['educator_case_manager','school_admin','district_admin'],
   ARRAY['educator-tools','iep-ppt','transition-planning','research-policy'],
   'national','ongoing','featured', now()),
  ('Council for Exceptional Children — Professional Resources',
   'https://exceptionalchildren.org/ProfessionalResources',
   'Council for Exceptional Children',
   'Repository of webinars, podcasts, learning library entries, and curricula including Life Centered Education.',
   'professional_association',
   ARRAY['educator_case_manager','school_admin','district_admin','student'],
   ARRAY['educator-tools','transition-planning','self-advocacy','employment'],
   'national','ongoing','approved', now()),
  ('Do2Learn',
   'https://do2learn.com/',
   'Do2Learn',
   'Free and low-cost teaching tools, visual supports, social-skills materials, and the JobTIPS transition curriculum.',
   'curriculum',
   ARRAY['educator_case_manager','parent_guardian','student'],
   ARRAY['social-skills','communication','independent-living','employment','behavior-support'],
   'national','ongoing','featured', now()),
  ('Connecticut State Department of Education — Special Education',
   'https://portal.ct.gov/sde/special-education/special-education-resources-for-educators',
   'Connecticut State Department of Education',
   'Connecticut-specific PPT, IEP, transition, and procedural guidance for educators and families.',
   'government',
   ARRAY['educator_case_manager','school_admin','district_admin','parent_guardian','student'],
   ARRAY['ct-resources','iep-ppt','transition-planning','educator-tools'],
   'connecticut','ongoing','featured', now()),
  ('National Center for Learning Disabilities — Research & Insights',
   'https://ncld.org/understand-the-issues/research/',
   'National Center for Learning Disabilities',
   'Research snapshots, policy analysis, and family/young-adult resources on learning disabilities.',
   'research_center',
   ARRAY['parent_guardian','educator_case_manager','school_admin','district_admin','student'],
   ARRAY['research-policy','family-support','self-advocacy'],
   'national','ongoing','featured', now()),
  ('TransitionForward Curated',
   NULL,
   'TransitionForward',
   'Resources curated and reviewed by the TransitionForward team.',
   'curated',
   ARRAY['student','parent_guardian','educator_case_manager','school_admin','district_admin','partner'],
   ARRAY['transition-planning','iep-ppt','self-advocacy','family-support'],
   'national','ongoing','approved', now()),
  ('Partner Organizations',
   NULL,
   'TransitionForward Partners',
   'Resources contributed by verified partner organizations.',
   'partner',
   ARRAY['student','parent_guardian','educator_case_manager','school_admin','district_admin','partner'],
   ARRAY['transition-planning','employment','independent-living'],
   'national','ongoing','approved', now())
ON CONFLICT DO NOTHING;

-- 5. Seed resource cards tied to sources
-- Helper CTE pattern via DO block
DO $$
DECLARE
  cec_practice uuid;
  cec_prof uuid;
  d2l uuid;
  ctsde uuid;
  ncld uuid;
BEGIN
  SELECT id INTO cec_practice FROM public.resource_sources WHERE source_name='Council for Exceptional Children — Improving Your Practice' LIMIT 1;
  SELECT id INTO cec_prof FROM public.resource_sources WHERE source_name='Council for Exceptional Children — Professional Resources' LIMIT 1;
  SELECT id INTO d2l FROM public.resource_sources WHERE source_name='Do2Learn' LIMIT 1;
  SELECT id INTO ctsde FROM public.resource_sources WHERE source_name='Connecticut State Department of Education — Special Education' LIMIT 1;
  SELECT id INTO ncld FROM public.resource_sources WHERE source_name='National Center for Learning Disabilities — Research & Insights' LIMIT 1;

  -- CEC
  INSERT INTO public.resources (title, description, resource_type, audience, topic, format, location_scope, url, original_resource_url, source_name, source_id, verified_status, published_status, featured, role_relevance, pathway_relevance)
  VALUES
  ('CEC Improving Your Practice', 'Practical strategies, high-leverage practices, and classroom-ready guidance from the Council for Exceptional Children.', 'guide', 'teacher', 'teacher-tools', 'website', 'national', 'https://exceptionalchildren.org/improving-your-practice', 'https://exceptionalchildren.org/improving-your-practice', 'Council for Exceptional Children', cec_practice, 'verified', 'featured', true, ARRAY['educator_case_manager','school_admin'], ARRAY['educator-tools']),
  ('CEC Professional Resources', 'CEC''s central hub for webinars, podcasts, learning library entries, and curricula.', 'guide', 'teacher', 'teacher-tools', 'website', 'national', 'https://exceptionalchildren.org/ProfessionalResources', 'https://exceptionalchildren.org/ProfessionalResources', 'Council for Exceptional Children', cec_prof, 'verified', 'published', false, ARRAY['educator_case_manager','school_admin','district_admin'], ARRAY['educator-tools']),
  ('CEC Learning Library', 'On-demand professional learning courses for special educators.', 'online_tool', 'teacher', 'teacher-tools', 'online_tool', 'national', 'https://exceptionalchildren.org/learning-library', 'https://exceptionalchildren.org/learning-library', 'Council for Exceptional Children', cec_prof, 'verified', 'published', false, ARRAY['educator_case_manager'], ARRAY['educator-tools']),
  ('CEC High-Leverage Practices', 'Evidence-based instructional practices for working with students with disabilities.', 'guide', 'teacher', 'teacher-tools', 'guide', 'national', 'https://highleveragepractices.org/', 'https://highleveragepractices.org/', 'Council for Exceptional Children', cec_practice, 'verified', 'featured', true, ARRAY['educator_case_manager','school_admin'], ARRAY['educator-tools','iep-ppt']),
  ('CEC Life Centered Education Transition Curriculum', 'Curriculum for teaching daily-living, personal-social, and employment skills.', 'guide', 'teacher', 'employment', 'curriculum', 'national', 'https://exceptionalchildren.org/lce', 'https://exceptionalchildren.org/lce', 'Council for Exceptional Children', cec_prof, 'verified', 'published', false, ARRAY['educator_case_manager','student'], ARRAY['employment','independent-living']),
  ('CEC Rewriting the Narrative Podcast', 'CEC''s podcast exploring stories and practice in special education.', 'podcast', 'teacher', 'teacher-tools', 'podcast', 'national', 'https://exceptionalchildren.org/podcast', 'https://exceptionalchildren.org/podcast', 'Council for Exceptional Children', cec_prof, 'verified', 'published', false, ARRAY['educator_case_manager'], ARRAY['educator-tools'])
  ON CONFLICT DO NOTHING;

  -- Do2Learn
  INSERT INTO public.resources (title, description, resource_type, audience, topic, format, location_scope, url, original_resource_url, source_name, source_id, verified_status, published_status, featured, role_relevance, pathway_relevance)
  VALUES
  ('Do2Learn Teacher Toolbox', 'Free tools, printables, and activities organized for special-education classrooms.', 'online_tool', 'teacher', 'teacher-tools', 'tool', 'national', 'https://do2learn.com/', 'https://do2learn.com/', 'Do2Learn', d2l, 'verified', 'featured', true, ARRAY['educator_case_manager'], ARRAY['educator-tools']),
  ('Do2Learn Social Skills Toolbox', 'Visual lessons and activities for teaching social and emotional skills.', 'worksheet', 'teacher', 'self-advocacy', 'tool', 'national', 'https://do2learn.com/', 'https://do2learn.com/', 'Do2Learn', d2l, 'verified', 'published', false, ARRAY['educator_case_manager','parent_guardian'], ARRAY['self-advocacy']),
  ('Do2Learn Visual Schedules', 'Printable picture schedules and routine supports.', 'worksheet', 'teacher', 'independent-living', 'worksheet', 'national', 'https://do2learn.com/picturecards/howtouse/dailyschedule.htm', 'https://do2learn.com/picturecards/howtouse/dailyschedule.htm', 'Do2Learn', d2l, 'verified', 'published', false, ARRAY['educator_case_manager','parent_guardian'], ARRAY['independent-living']),
  ('Do2Learn Picture Cards for Daily Living', 'Picture cards for hygiene, chores, and daily routines.', 'worksheet', 'teacher', 'independent-living', 'worksheet', 'national', 'https://do2learn.com/picturecards/', 'https://do2learn.com/picturecards/', 'Do2Learn', d2l, 'verified', 'published', false, ARRAY['educator_case_manager','parent_guardian'], ARRAY['independent-living']),
  ('Do2Learn JobTIPS', 'Free curriculum that helps young adults prepare for and succeed at work.', 'online_tool', 'student', 'employment', 'curriculum', 'national', 'https://do2learn.com/JobTIPS/', 'https://do2learn.com/JobTIPS/', 'Do2Learn', d2l, 'verified', 'featured', true, ARRAY['student','educator_case_manager','parent_guardian'], ARRAY['employment','career']),
  ('Do2Learn Feelings Journal', 'Self-regulation and emotion-tracking tool for students.', 'worksheet', 'student', 'self-advocacy', 'tool', 'national', 'https://do2learn.com/organizationtools/FeelingsJournal.htm', 'https://do2learn.com/organizationtools/FeelingsJournal.htm', 'Do2Learn', d2l, 'verified', 'published', false, ARRAY['student','educator_case_manager'], ARRAY['self-advocacy']),
  ('Do2Learn Communication Skills', 'Resources for building expressive and receptive communication.', 'guide', 'teacher', 'self-advocacy', 'guide', 'national', 'https://do2learn.com/', 'https://do2learn.com/', 'Do2Learn', d2l, 'verified', 'published', false, ARRAY['educator_case_manager','parent_guardian'], ARRAY['self-advocacy'])
  ON CONFLICT DO NOTHING;

  -- CT SDE
  INSERT INTO public.resources (title, description, resource_type, audience, topic, format, location_scope, url, original_resource_url, source_name, source_id, verified_status, published_status, featured, role_relevance, pathway_relevance)
  VALUES
  ('CT Transition Assessment Resource Manual', 'Connecticut''s guide to selecting and using transition assessments.', 'guide', 'teacher', 'transition-planning', 'pdf', 'connecticut', 'https://portal.ct.gov/SDE/Services/Special-Education/Resources-for-Educators', 'https://portal.ct.gov/SDE/Services/Special-Education/Resources-for-Educators', 'CT State Department of Education', ctsde, 'verified', 'featured', true, ARRAY['educator_case_manager','school_admin'], ARRAY['transition-planning']),
  ('CT Secondary Transition: Planning from School to Adult Life', 'CT SDE''s overview of secondary transition planning requirements and practices.', 'guide', 'all', 'transition-planning', 'guide', 'connecticut', 'https://portal.ct.gov/SDE/Services/Special-Education/Resources-for-Educators', 'https://portal.ct.gov/SDE/Services/Special-Education/Resources-for-Educators', 'CT State Department of Education', ctsde, 'verified', 'featured', true, ARRAY['educator_case_manager','parent_guardian','student'], ARRAY['transition-planning']),
  ('CT Special Education Procedures and Practices Manual', 'Procedural guidance for IEPs, PPTs, evaluations, and discipline in Connecticut.', 'guide', 'teacher', 'iep-ppt', 'pdf', 'connecticut', 'https://portal.ct.gov/sde/special-education/special-education-resources-for-educators', 'https://portal.ct.gov/sde/special-education/special-education-resources-for-educators', 'CT State Department of Education', ctsde, 'verified', 'published', false, ARRAY['educator_case_manager','school_admin','district_admin'], ARRAY['iep-ppt']),
  ('CT PPT Checklist', 'Checklist to help teams prepare for and run effective PPT meetings.', 'checklist', 'all', 'iep-ppt', 'checklist', 'connecticut', 'https://portal.ct.gov/sde/special-education/special-education-resources-for-educators', 'https://portal.ct.gov/sde/special-education/special-education-resources-for-educators', 'CT State Department of Education', ctsde, 'verified', 'featured', true, ARRAY['parent_guardian','educator_case_manager'], ARRAY['iep-ppt']),
  ('CT Standards-Based IEP Resources', 'Tools for writing standards-aligned IEP goals in Connecticut.', 'guide', 'teacher', 'iep-ppt', 'guide', 'connecticut', 'https://portal.ct.gov/sde/special-education/special-education-resources-for-educators', 'https://portal.ct.gov/sde/special-education/special-education-resources-for-educators', 'CT State Department of Education', ctsde, 'verified', 'published', false, ARRAY['educator_case_manager'], ARRAY['iep-ppt']),
  ('CT Special Education Updates', 'Memos and updates from CT SDE Bureau of Special Education.', 'article', 'all', 'iep-ppt', 'website', 'connecticut', 'https://portal.ct.gov/SDE/Services/Special-Education/Resources-for-Educators', 'https://portal.ct.gov/SDE/Services/Special-Education/Resources-for-Educators', 'CT State Department of Education', ctsde, 'verified', 'published', false, ARRAY['educator_case_manager','school_admin','district_admin'], ARRAY['iep-ppt']),
  ('CT Educator Best Practice Resources', 'Best-practice resources for Connecticut educators across roles.', 'guide', 'teacher', 'teacher-tools', 'guide', 'connecticut', 'https://portal.ct.gov/sde/special-education/special-education-resources-for-educators', 'https://portal.ct.gov/sde/special-education/special-education-resources-for-educators', 'CT State Department of Education', ctsde, 'verified', 'published', false, ARRAY['educator_case_manager'], ARRAY['educator-tools'])
  ON CONFLICT DO NOTHING;

  -- NCLD
  INSERT INTO public.resources (title, description, resource_type, audience, topic, format, location_scope, url, original_resource_url, source_name, source_id, verified_status, published_status, featured, role_relevance, pathway_relevance)
  VALUES
  ('NCLD Research and Insights', 'NCLD''s hub of research briefs, white papers, and policy analyses on learning disabilities.', 'article', 'all', 'family-support', 'website', 'national', 'https://ncld.org/understand-the-issues/research/', 'https://ncld.org/understand-the-issues/research/', 'National Center for Learning Disabilities', ncld, 'verified', 'featured', true, ARRAY['parent_guardian','educator_case_manager','school_admin','district_admin'], ARRAY['family-support']),
  ('NCLD Federal Reading Snapshot', 'National data snapshot on reading outcomes for students with SLDs.', 'article', 'all', 'family-support', 'research', 'national', 'https://ncld.org/understand-the-issues/research/', 'https://ncld.org/understand-the-issues/research/', 'National Center for Learning Disabilities', ncld, 'verified', 'published', false, ARRAY['school_admin','district_admin','educator_case_manager'], ARRAY['family-support']),
  ('NCLD Federal Math Snapshot', 'National data snapshot on math outcomes for students with SLDs.', 'article', 'all', 'family-support', 'research', 'national', 'https://ncld.org/understand-the-issues/research/', 'https://ncld.org/understand-the-issues/research/', 'National Center for Learning Disabilities', ncld, 'verified', 'published', false, ARRAY['school_admin','district_admin','educator_case_manager'], ARRAY['family-support']),
  ('NCLD Connecticut SLD State Snapshot', 'State-level data on identification and outcomes for students with SLDs in Connecticut.', 'article', 'all', 'ct-resources', 'research', 'connecticut', 'https://ncld.org/understand-the-issues/research/', 'https://ncld.org/understand-the-issues/research/', 'National Center for Learning Disabilities', ncld, 'verified', 'featured', true, ARRAY['school_admin','district_admin','parent_guardian'], ARRAY['family-support']),
  ('NCLD Parent and Caregiver Resources', 'Plain-language guides for families navigating special education and learning disabilities.', 'guide', 'parent_guardian', 'family-support', 'guide', 'national', 'https://ncld.org/', 'https://ncld.org/', 'National Center for Learning Disabilities', ncld, 'verified', 'featured', true, ARRAY['parent_guardian'], ARRAY['family-support','iep-ppt']),
  ('NCLD Young Adult Resources', 'Resources to help young adults with LD plan for postsecondary life.', 'guide', 'student', 'self-advocacy', 'guide', 'national', 'https://ncld.org/', 'https://ncld.org/', 'National Center for Learning Disabilities', ncld, 'verified', 'published', false, ARRAY['student'], ARRAY['self-advocacy','postsecondary'])
  ON CONFLICT DO NOTHING;
END $$;
