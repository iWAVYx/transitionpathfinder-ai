/**
 * Slice D15 — Pathway shadow-run reader (server-only, DORMANT).
 *
 * Read-only cousin of Slice D12's `recordShadowRun`. Fetches persisted
 * drift rows from `public.pathway_shadow_run_log` through an injected
 * structural client so operators can review shadow-run history without
 * re-executing a preview + diff. No writes, ever.
 *
 * Off-by-default: callers must pass `enabled: true`. Flag-off returns
 * `{ ok: true, status: "disabled" }` and performs zero DB work. No
 * route, server function, edge function, or UI wires this yet.
 *
 * `.server.ts` suffix keeps this out of the browser bundle.
 */
import type { EngineChannel } from "./pathway-engine-invocation.ts";
import type { PathwayReportDiff } from "./pathway-report-diff.ts";

/* ---------- persisted row shape (mirrors migration columns) ---------- */

export interface ShadowRunLogRecord {
  id: string;
  report_id: string;
  run_at: string;
  channel: EngineChannel;
  rules_version: string;
  prompt_version: string;
  model_version: string;
  identical: boolean;
  added_count: number;
  removed_count: number;
  changed_count: number;
  unchanged_count: number;
  knowledge_added: string[];
  knowledge_removed: string[];
  provenance_changed: string[];
  diff: PathwayReportDiff;
  actor_id: string | null;
  created_at: string;
}

/* ---------- injected reader contract ---------- */

export interface ShadowLogListResult {
  data: ShadowRunLogRecord[] | null;
  error: { message: string } | null;
}

/**
 * Structural shape for the audit-log reader. The eventual caller wires
 * this to `supabaseAdmin.from("pathway_shadow_run_log").select(...)`
 * inside an admin-gated server function. Tests pass a plain-object stub.
 */
export interface ShadowRunLogReader {
  list: (query: NormalizedShadowRunLogQuery) => Promise<ShadowLogListResult>;
}

/* ---------- input / output ---------- */

export interface ListShadowRunsInput {
  /** Off-by-default. Flag-off = zero DB work. */
  enabled: boolean;
  /** Optional filter: only rows for one `pathway_reports.id`. */
  reportId?: string | null;
  /** Optional filter: exact `rules_version` match. */
  rulesVersion?: string | null;
  /** Optional filter: exact `engine_channel` match. */
  channel?: EngineChannel | null;
  /** Optional filter: only rows where `identical = false`. */
  driftOnly?: boolean;
  /** Row cap; server-clamped 1..200, default 50. */
  limit?: number;
  /** Injected reader for `pathway_shadow_run_log`. */
  logReader: ShadowRunLogReader;
}

export interface NormalizedShadowRunLogQuery {
  reportId: string | null;
  rulesVersion: string | null;
  channel: EngineChannel | null;
  driftOnly: boolean;
  limit: number;
}

export type ListShadowRunsResult =
  | { ok: true; status: "disabled"; reason: "flag_off" }
  | {
      ok: true;
      status: "listed";
      query: NormalizedShadowRunLogQuery;
      rows: ShadowRunLogRecord[];
    }
  | { ok: false; error_code: "log_query_failed"; message: string };

/* ---------- reader ---------- */

/**
 * DORMANT audit reader. Off by default. When enabled: normalizes the
 * filters, delegates to the injected `logReader.list`, and returns the
 * result rows unchanged (already newest-first per the caller's query).
 * Never writes, never re-runs a preview.
 */
export async function listShadowRuns(
  input: ListShadowRunsInput,
): Promise<ListShadowRunsResult> {
  if (!input.enabled) {
    return { ok: true, status: "disabled", reason: "flag_off" };
  }

  const query: NormalizedShadowRunLogQuery = {
    reportId: input.reportId ?? null,
    rulesVersion: input.rulesVersion ?? null,
    channel: input.channel ?? null,
    driftOnly: input.driftOnly === true,
    limit: clampLimit(input.limit),
  };

  const { data, error } = await input.logReader.list(query);
  if (error) {
    return {
      ok: false,
      error_code: "log_query_failed",
      message: error.message,
    };
  }
  return { ok: true, status: "listed", query, rows: data ?? [] };
}

function clampLimit(v: number | undefined): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 50;
  const n = Math.floor(v);
  if (n < 1) return 1;
  if (n > 200) return 200;
  return n;
}
