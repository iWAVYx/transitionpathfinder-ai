
-- ============================================================
-- PartnerForward backend: incentive resources, sources,
-- categories, partner saves, and admin review trail.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.pf_category AS ENUM (
    'tax_credit','tax_deduction','grant','workforce_program',
    'accessibility_support','inclusive_hiring','disability_awareness_training',
    'vocational_rehabilitation','sponsorship','technical_assistance',
    'funding_opportunity','employer_support','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pf_source_type AS ENUM (
    'federal','state_ct','local','nonprofit','workforce_board','foundation','internal'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pf_status AS ENUM (
    'draft','needs_review','verified','published','archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- partnerforward_incentive_categories ---------------------------
CREATE TABLE IF NOT EXISTS public.partnerforward_incentive_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  disclaimer_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partnerforward_incentive_categories TO authenticated;
GRANT SELECT ON public.partnerforward_incentive_categories TO anon;
GRANT ALL ON public.partnerforward_incentive_categories TO service_role;

ALTER TABLE public.partnerforward_incentive_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pf_categories public select"
  ON public.partnerforward_incentive_categories FOR SELECT USING (true);
CREATE POLICY "pf_categories admin insert"
  ON public.partnerforward_incentive_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "pf_categories admin update"
  ON public.partnerforward_incentive_categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "pf_categories admin delete"
  ON public.partnerforward_incentive_categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER pf_categories_set_updated_at
  BEFORE UPDATE ON public.partnerforward_incentive_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- partnerforward_resource_sources -------------------------------
CREATE TABLE IF NOT EXISTS public.partnerforward_resource_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_type public.pf_source_type NOT NULL DEFAULT 'other'::text::public.pf_source_type,
  url TEXT,
  notes TEXT,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partnerforward_resource_sources TO authenticated;
GRANT ALL ON public.partnerforward_resource_sources TO service_role;

ALTER TABLE public.partnerforward_resource_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pf_sources admin all"
  ON public.partnerforward_resource_sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER pf_sources_set_updated_at
  BEFORE UPDATE ON public.partnerforward_resource_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- partnerforward_resources --------------------------------------
CREATE TABLE IF NOT EXISTS public.partnerforward_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category public.pf_category NOT NULL DEFAULT 'other',
  summary TEXT,
  partner_value TEXT,
  eligibility_notes TEXT,
  action_steps TEXT,
  official_url TEXT,
  source_name TEXT,
  source_type public.pf_source_type,
  source_id UUID REFERENCES public.partnerforward_resource_sources(id) ON DELETE SET NULL,
  status public.pf_status NOT NULL DEFAULT 'draft',
  legal_financial_disclaimer_required BOOLEAN NOT NULL DEFAULT false,
  cautious_disclaimer TEXT,
  last_verified_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pf_resources_status ON public.partnerforward_resources(status);
CREATE INDEX IF NOT EXISTS idx_pf_resources_category ON public.partnerforward_resources(category);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partnerforward_resources TO authenticated;
GRANT SELECT ON public.partnerforward_resources TO anon;
GRANT ALL ON public.partnerforward_resources TO service_role;

ALTER TABLE public.partnerforward_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pf_resources public select published"
  ON public.partnerforward_resources FOR SELECT
  USING (status = 'published' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "pf_resources admin insert"
  ON public.partnerforward_resources FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "pf_resources admin update"
  ON public.partnerforward_resources FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "pf_resources admin delete"
  ON public.partnerforward_resources FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER pf_resources_set_updated_at
  BEFORE UPDATE ON public.partnerforward_resources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- partnerforward_partner_saved_resources ------------------------
CREATE TABLE IF NOT EXISTS public.partnerforward_partner_saved_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id UUID NOT NULL,
  resource_id UUID NOT NULL REFERENCES public.partnerforward_resources(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (partner_user_id, resource_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partnerforward_partner_saved_resources TO authenticated;
GRANT ALL ON public.partnerforward_partner_saved_resources TO service_role;

ALTER TABLE public.partnerforward_partner_saved_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pf_saves owner select"
  ON public.partnerforward_partner_saved_resources FOR SELECT TO authenticated
  USING (partner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "pf_saves owner insert"
  ON public.partnerforward_partner_saved_resources FOR INSERT TO authenticated
  WITH CHECK (partner_user_id = auth.uid());
CREATE POLICY "pf_saves owner update"
  ON public.partnerforward_partner_saved_resources FOR UPDATE TO authenticated
  USING (partner_user_id = auth.uid())
  WITH CHECK (partner_user_id = auth.uid());
CREATE POLICY "pf_saves owner delete"
  ON public.partnerforward_partner_saved_resources FOR DELETE TO authenticated
  USING (partner_user_id = auth.uid());

CREATE TRIGGER pf_saves_set_updated_at
  BEFORE UPDATE ON public.partnerforward_partner_saved_resources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- partnerforward_admin_reviews ----------------------------------
CREATE TABLE IF NOT EXISTS public.partnerforward_admin_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.partnerforward_resources(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  action TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pf_reviews_resource ON public.partnerforward_admin_reviews(resource_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partnerforward_admin_reviews TO authenticated;
GRANT ALL ON public.partnerforward_admin_reviews TO service_role;

ALTER TABLE public.partnerforward_admin_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pf_reviews admin all"
  ON public.partnerforward_admin_reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
