/**
 * Slice D12 — Pathway shadow-run recorder (server-only, DORMANT).
 *
 * Persists the outcome of a Slice D11 `previewPathwayReportDiff` result
 * into `public.pathway_shadow_run_log` so operators can analyze drift
 * offline without re-running the preview. Pure orchestration over an
 * injected structural client — no supabase-js binding here, no writes
 * to any other table.
 *
 * Off-by-default: callers must pass `enabled: true`. Flag-off returns
 * `{ ok: true, status: "disabled" }` and performs zero DB work. No
 * route, server function, edge function, or UI wires this yet.
 *
 * `.server.ts` suffix keeps this out of the browser bundle.
 */
import type { PreviewPathwayReportDiffResult } from "./pathway-report-diff.server.ts";
import type { EngineChannel } from "./pathway-engine-invocation.ts";

/* ---------- structural writer contract ---------- */

export interface ShadowLogInsertResult {
  data: unknown;
  error: { message: string } | null;
}

/**
 * Structural shape for the audit-log writer. Eventual caller wires this
 * to `supabaseAdmin.from("pathway_shadow_run_log").insert(row)` inside
 * a server function guarded by an admin check.
 */
export interface ShadowRunLogClient {
  insertRow: (row: ShadowRunLogRow) => Promise<ShadowLogInsertResult>;
}

/* ---------- row shape (matches migration columns) ---------- */

export interface ShadowRunLogRow {
  report_id: string;
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
  diff: unknown;
  actor_id: string | null;
}

/* ---------- input / output ---------- */

export interface RecordShadowRunInput {
  /** Off-by-default. Flag-off = zero DB work. */
  enabled: boolean;
  /** Result from Slice D11 `previewPathwayReportDiff`. */
  diffResult: PreviewPathwayReportDiffResult;
  /** Optional actor stamp (typically `context.userId` from the caller). */
  actorId?: string | null;
  /** Injected writer for `pathway_shadow_run_log`. */
  logClient: ShadowRunLogClient;
}

export type RecordShadowRunResult =
  | { ok: true; status: "disabled"; reason: "flag_off" }
  | { ok: true; status: "skipped"; reason: "diff_not_ok" | "diff_disabled" }
  | { ok: true; status: "recorded"; row: ShadowRunLogRow }
  | { ok: false; error_code: "log_write_failed"; message: string };

/* ---------- recorder ---------- */

/**
 * DORMANT audit writer. Off by default. When enabled:
 *   D11 diff result → normalized row → single INSERT on `pathway_shadow_run_log`.
 * Non-diffed results (flag-off, upstream errors) are skipped, not
 * recorded — the log is a drift ledger, not a general error sink.
 */
export async function recordShadowRun(
  input: RecordShadowRunInput,
): Promise<RecordShadowRunResult> {
  if (!input.enabled) {
    return { ok: true, status: "disabled", reason: "flag_off" };
  }

  const result = input.diffResult;
  if (!result.ok) {
    return { ok: true, status: "skipped", reason: "diff_not_ok" };
  }
  if (result.status !== "diffed") {
    return { ok: true, status: "skipped", reason: "diff_disabled" };
  }

  const p = result.diff.provenance;
  const provenance_changed: string[] = [];
  if (p.rules_version.changed) provenance_changed.push("rules_version");
  if (p.prompt_version.changed) provenance_changed.push("prompt_version");
  if (p.model_version.changed) provenance_changed.push("model_version");
  if (p.engine_channel.changed) provenance_changed.push("engine_channel");

  const row: ShadowRunLogRow = {
    report_id: result.reportId,
    channel: result.shadow.engine_channel,
    rules_version: result.shadow.rules_version,
    prompt_version: result.shadow.prompt_version,
    model_version: result.shadow.model_version,
    identical: result.diff.identical,
    added_count: result.diff.recommendations.added.length,
    removed_count: result.diff.recommendations.removed.length,
    changed_count: result.diff.recommendations.changed.length,
    unchanged_count: result.diff.recommendations.unchanged_count,
    knowledge_added: result.diff.knowledge_ref.added,
    knowledge_removed: result.diff.knowledge_ref.removed,
    provenance_changed,
    diff: result.diff,
    actor_id: input.actorId ?? null,
  };

  const { error } = await input.logClient.insertRow(row);
  if (error) {
    return {
      ok: false,
      error_code: "log_write_failed",
      message: error.message,
    };
  }
  return { ok: true, status: "recorded", row };
}
