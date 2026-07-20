
-- 1. obs_events: append-only structured log/span store
CREATE TABLE public.obs_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts timestamptz NOT NULL DEFAULT now(),
  trace_id uuid NOT NULL,
  span_id uuid NOT NULL,
  parent_span_id uuid,
  user_id uuid,
  route text,
  server_fn text,
  severity text NOT NULL CHECK (severity IN ('debug','info','warn','error','fatal')),
  status text NOT NULL CHECK (status IN ('ok','error','timeout','rejected')),
  duration_ms integer,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  error jsonb
);
CREATE INDEX obs_events_ts_idx ON public.obs_events (ts DESC);
CREATE INDEX obs_events_trace_idx ON public.obs_events (trace_id);
CREATE INDEX obs_events_fn_status_ts_idx ON public.obs_events (server_fn, status, ts DESC);
CREATE INDEX obs_events_severity_ts_idx ON public.obs_events (severity, ts DESC) WHERE severity IN ('error','fatal');

GRANT SELECT ON public.obs_events TO authenticated;
GRANT ALL ON public.obs_events TO service_role;

ALTER TABLE public.obs_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read obs_events"
  ON public.obs_events FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- 2. obs_slos: per-server-fn SLO targets
CREATE TABLE public.obs_slos (
  server_fn text PRIMARY KEY,
  availability_target numeric NOT NULL DEFAULT 0.995 CHECK (availability_target > 0 AND availability_target <= 1),
  latency_p95_ms integer NOT NULL DEFAULT 800 CHECK (latency_p95_ms > 0),
  window_days integer NOT NULL DEFAULT 30 CHECK (window_days > 0 AND window_days <= 90),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.obs_slos TO authenticated;
GRANT ALL ON public.obs_slos TO service_role;

ALTER TABLE public.obs_slos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read obs_slos"
  ON public.obs_slos FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins manage obs_slos"
  ON public.obs_slos FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE TRIGGER obs_slos_updated_at
  BEFORE UPDATE ON public.obs_slos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. obs_alert_state: dedupes alert emails within cooldown
CREATE TABLE public.obs_alert_state (
  rule_key text PRIMARY KEY,
  last_fired_at timestamptz,
  last_payload jsonb,
  cooldown_minutes integer NOT NULL DEFAULT 60 CHECK (cooldown_minutes > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.obs_alert_state TO authenticated;
GRANT ALL ON public.obs_alert_state TO service_role;

ALTER TABLE public.obs_alert_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read obs_alert_state"
  ON public.obs_alert_state FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE TRIGGER obs_alert_state_updated_at
  BEFORE UPDATE ON public.obs_alert_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Retention: purge obs_events older than 30 days
CREATE OR REPLACE FUNCTION public.obs_events_purge_expired()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.obs_events WHERE ts < now() - interval '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 5. Rollup helper: compute SLO status per server fn over a window
CREATE OR REPLACE FUNCTION public.obs_slo_status(_window_hours integer DEFAULT 720)
RETURNS TABLE(
  server_fn text,
  total_count bigint,
  error_count bigint,
  availability numeric,
  p50_ms numeric,
  p95_ms numeric,
  p99_ms numeric,
  availability_target numeric,
  latency_p95_target integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH e AS (
    SELECT ev.server_fn, ev.status, ev.duration_ms
    FROM public.obs_events ev
    WHERE ev.server_fn IS NOT NULL
      AND ev.ts >= now() - make_interval(hours => _window_hours)
  ),
  agg AS (
    SELECT
      e.server_fn,
      count(*)::bigint AS total_count,
      count(*) FILTER (WHERE e.status <> 'ok')::bigint AS error_count,
      CASE WHEN count(*) = 0 THEN 1.0
        ELSE (count(*) FILTER (WHERE e.status = 'ok'))::numeric / count(*)::numeric
      END AS availability,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY e.duration_ms) AS p50_ms,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY e.duration_ms) AS p95_ms,
      percentile_cont(0.99) WITHIN GROUP (ORDER BY e.duration_ms) AS p99_ms
    FROM e
    GROUP BY e.server_fn
  )
  SELECT
    a.server_fn,
    a.total_count,
    a.error_count,
    a.availability,
    a.p50_ms,
    a.p95_ms,
    a.p99_ms,
    COALESCE(s.availability_target, 0.995) AS availability_target,
    COALESCE(s.latency_p95_ms, 800) AS latency_p95_target
  FROM agg a
  LEFT JOIN public.obs_slos s ON s.server_fn = a.server_fn
  WHERE public.is_platform_admin(auth.uid()) OR current_setting('role', true) = 'service_role';
$$;

REVOKE ALL ON FUNCTION public.obs_slo_status(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.obs_slo_status(integer) TO authenticated, service_role;
