
-- Slice D1 — Pathway rules & knowledge source registry (dormant).
-- Additive. No readers/writers wired yet.

CREATE TABLE IF NOT EXISTS public.pathway_rules_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retired_at TIMESTAMPTZ,
  engine_channel TEXT NOT NULL DEFAULT 'shadow'
    CHECK (engine_channel IN ('shadow','canary','production','retired')),
  description TEXT,
  checksum TEXT,
  ruleset JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pathway_rules_versions TO authenticated;
GRANT ALL ON public.pathway_rules_versions TO service_role;

ALTER TABLE public.pathway_rules_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pathway_rules_versions admin read"
  ON public.pathway_rules_versions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "pathway_rules_versions admin write"
  ON public.pathway_rules_versions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS pathway_rules_versions_channel_idx
  ON public.pathway_rules_versions (engine_channel, effective_at DESC);

-- Knowledge sources: research papers, IDEA/CSDE guidance, framework docs
-- cited by the engine. Checksum lets us prove which snapshot a report used.
CREATE TABLE IF NOT EXISTS public.pathway_knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  publisher TEXT,
  source_url TEXT,
  jurisdiction TEXT,
  kind TEXT NOT NULL DEFAULT 'guidance'
    CHECK (kind IN ('guidance','regulation','research','framework','curriculum','dataset','other')),
  version TEXT,
  checksum TEXT,
  fetched_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pathway_knowledge_sources TO authenticated;
GRANT ALL ON public.pathway_knowledge_sources TO service_role;

ALTER TABLE public.pathway_knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pathway_knowledge_sources admin read"
  ON public.pathway_knowledge_sources FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "pathway_knowledge_sources admin write"
  ON public.pathway_knowledge_sources FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS pathway_knowledge_sources_kind_idx
  ON public.pathway_knowledge_sources (kind, retired_at);

-- Shared updated_at trigger for both tables (scoped, matches existing pattern).
CREATE OR REPLACE FUNCTION public.set_pathway_registry_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pathway_rules_versions_updated_at ON public.pathway_rules_versions;
CREATE TRIGGER trg_pathway_rules_versions_updated_at
  BEFORE UPDATE ON public.pathway_rules_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_pathway_registry_updated_at();

DROP TRIGGER IF EXISTS trg_pathway_knowledge_sources_updated_at ON public.pathway_knowledge_sources;
CREATE TRIGGER trg_pathway_knowledge_sources_updated_at
  BEFORE UPDATE ON public.pathway_knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_pathway_registry_updated_at();

-- Additive provenance stamps on pathway_reports. All nullable so existing
-- rows are unaffected and no writer is forced to populate them yet.
ALTER TABLE public.pathway_reports
  ADD COLUMN IF NOT EXISTS rules_version TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT,
  ADD COLUMN IF NOT EXISTS model_version TEXT,
  ADD COLUMN IF NOT EXISTS knowledge_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS engine_channel TEXT;

COMMENT ON COLUMN public.pathway_reports.rules_version IS
  'FK-by-value to pathway_rules_versions.version. Stamped at generation time.';
COMMENT ON COLUMN public.pathway_reports.knowledge_snapshot IS
  'Array of {slug, version, checksum} entries from pathway_knowledge_sources used at generation time.';
