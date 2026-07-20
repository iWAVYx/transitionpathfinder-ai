# Observability & SLOs — Full Platform

Ship end-to-end observability across every server function and cron path, expose it as a Health tab inside the existing `/admin/orgs` operator console, and alert platform admins by email when error budgets burn or infrastructure degrades.

## What Ships

### 1. Structured Logging
- New `obs_events` append-only table: `id`, `ts`, `trace_id`, `span_id`, `parent_span_id`, `user_id`, `route`, `server_fn`, `severity` (`debug|info|warn|error|fatal`), `status` (`ok|error|timeout|rejected`), `duration_ms`, `attributes jsonb`, `error jsonb`.
- `logEvent()` helper in `src/lib/obs/log.ts` — writes with `supabaseAdmin` (fire-and-forget, batched every 250ms via async queue).
- Wrap `requireSupabaseAuth` middleware to auto-emit a span per server function with duration + status.
- Auto-instrument pathway-report writer (`writePathwayReport`), shadow-diff orchestrator, email queue processor, and access-code redemption.
- Retention: 30-day rolling window via nightly `pg_cron` job.

### 2. Request Tracing
- Client attaches `x-trace-id` (uuid) on every server-fn call via existing `functionMiddleware`.
- Server middleware reads the header (or mints one) and threads `trace_id` + generated `span_id` through `AsyncLocalStorage`.
- Child spans (DB writes, gateway calls) inherit parent via context; each recorded row references `parent_span_id`.

### 3. SLOs & Error Budgets
- New `obs_slos` table: per-server-fn targets (default: availability 99.5%, p95 latency 800ms, 30-day window).
- Nightly rollup materialized view `obs_slo_status` — computes success rate, p50/p95/p99 latency, burn rate (fast: 1h, slow: 6h), remaining budget.
- Fast burn (>14.4x) or slow burn (>6x) → alert.

### 4. Health Dashboard (Health tab in `/admin/orgs`)
Platform-admin-only tab exposing:
- **SLO cards** — per server fn: availability, p95 latency, burn rate chip (green/amber/red), 30-day sparkline.
- **Recent errors** — last 50 error/fatal events with expandable attributes/stacktrace, trace-id copy button.
- **Trace explorer** — paste a `trace_id` → waterfall of spans with duration bars.
- **Infrastructure** — DLQ depth (auth_emails, transactional_emails), email throughput (last 24h from `email_send_log`), pathway-report shadow-diff mismatch rate, cron job health (`process-email-queue` presence + last run).
- **Filters** — time range (1h/24h/7d/30d), server-fn selector, severity.

### 5. Email Alerting
- New `obs_alert_state` table: last-fired-at per rule (dedupe within cooldown).
- `/api/public/hooks/obs-alert-check` server route, runs every 5min via `pg_cron` → checks: fast burn, slow burn, DLQ >50 messages, cron job missing while queue non-empty, error rate >5% over 15min.
- On trigger, enqueues transactional email to every `admin_roles` platform_owner/admin using existing email queue.
- Email templates: `obs_slo_burn`, `obs_dlq_backlog`, `obs_cron_missing`, `obs_error_spike`.

## Technical Details

### Schema (migration)
```sql
CREATE TABLE public.obs_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts timestamptz NOT NULL DEFAULT now(),
  trace_id uuid NOT NULL,
  span_id uuid NOT NULL,
  parent_span_id uuid,
  user_id uuid,
  route text,
  server_fn text,
  severity text NOT NULL,
  status text NOT NULL,
  duration_ms integer,
  attributes jsonb DEFAULT '{}'::jsonb,
  error jsonb
);
CREATE INDEX obs_events_ts_idx ON obs_events (ts DESC);
CREATE INDEX obs_events_trace_idx ON obs_events (trace_id);
CREATE INDEX obs_events_fn_status_idx ON obs_events (server_fn, status, ts DESC);
GRANT SELECT ON obs_events TO authenticated;
GRANT ALL ON obs_events TO service_role;
ALTER TABLE obs_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform admins read obs_events"
  ON obs_events FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE TABLE public.obs_slos (
  server_fn text PRIMARY KEY,
  availability_target numeric NOT NULL DEFAULT 0.995,
  latency_p95_ms integer NOT NULL DEFAULT 800,
  window_days integer NOT NULL DEFAULT 30,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.obs_alert_state (
  rule_key text PRIMARY KEY,
  last_fired_at timestamptz,
  cooldown_minutes integer NOT NULL DEFAULT 60
);
```
Add matching GRANTs + admin-only RLS on both.

### Files
- `src/lib/obs/log.ts` — batching writer, `withSpan()` wrapper.
- `src/lib/obs/tracing.ts` — AsyncLocalStorage context.
- `src/integrations/supabase/auth-middleware.ts` — extend to emit a span (append-only; do not rewrite).
- `src/lib/obs/slo.functions.ts` — `getSloStatus`, `listRecentErrors`, `getTrace`, `getInfrastructureHealth`.
- `src/lib/obs/alerts.ts` — rule definitions + evaluator.
- `src/routes/api/public/hooks/obs-alert-check.ts` — cron entry (verified via `apikey` header per schedule-jobs guidance).
- `src/routes/_authenticated/admin.orgs.tsx` — add `<TabsTrigger value="health">` guarded on `isPlatformAdmin`.
- `src/components/admin/health/*` — `SloCards`, `RecentErrorsTable`, `TraceExplorer`, `InfrastructurePanel`.
- Email templates via `email_domain--scaffold_transactional_email` for the four alert types.

### Verification
- Contract tests: SLO math, burn-rate calc, alert dedupe cooldown, RLS (non-admin blocked from `obs_events`).
- E2E: `tests/e2e/admin-health-tab.signedin.spec.ts` renders SLO cards, filters by time range, opens trace waterfall.
- Manually trigger a fake burn via seeded `obs_events` and confirm one email lands in `email_send_log`.
- Update `docs/release-readiness-ledger.md` with W-Obs entry.

## Out of Scope
- Third-party APM (Datadog, Sentry) — pure in-app.
- Per-user request tracing exposed to end users.
- In-app banner alerts (email only per your pick).
