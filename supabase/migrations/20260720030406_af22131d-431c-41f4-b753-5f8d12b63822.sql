
-- Slice D12: pathway shadow-run audit log.
-- Persists the outcome of a Slice D11 shadow-vs-current diff so operators can
-- analyze drift over time without re-running previews. Read/write is admin-only;
-- no anon access. Nothing writes to this table yet — the D12 recorder helper
-- is dormant until an operator flips the shadow rollout flag.

CREATE TABLE public.pathway_shadow_run_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel TEXT NOT NULL,
  rules_version TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  model_version TEXT NOT NULL,
  identical BOOLEAN NOT NULL,
  added_count INT NOT NULL DEFAULT 0,
  removed_count INT NOT NULL DEFAULT 0,
  changed_count INT NOT NULL DEFAULT 0,
  unchanged_count INT NOT NULL DEFAULT 0,
  knowledge_added TEXT[] NOT NULL DEFAULT '{}',
  knowledge_removed TEXT[] NOT NULL DEFAULT '{}',
  provenance_changed TEXT[] NOT NULL DEFAULT '{}',
  diff JSONB NOT NULL,
  actor_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX pathway_shadow_run_log_report_id_run_at_idx
  ON public.pathway_shadow_run_log (report_id, run_at DESC);
CREATE INDEX pathway_shadow_run_log_rules_version_idx
  ON public.pathway_shadow_run_log (rules_version);

-- Admin-only surface. No anon grant; regular authenticated users cannot see or
-- write shadow-run rows. service_role for maintenance jobs.
GRANT SELECT, INSERT ON public.pathway_shadow_run_log TO authenticated;
GRANT ALL ON public.pathway_shadow_run_log TO service_role;

ALTER TABLE public.pathway_shadow_run_log ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read the log.
CREATE POLICY "Platform admins can read shadow run log"
  ON public.pathway_shadow_run_log
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Only platform admins can insert rows (and only stamping themselves as actor).
CREATE POLICY "Platform admins can insert shadow run log"
  ON public.pathway_shadow_run_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    AND (actor_id IS NULL OR actor_id = auth.uid())
  );

-- No UPDATE / DELETE policies: log is append-only for everyone but service_role.
