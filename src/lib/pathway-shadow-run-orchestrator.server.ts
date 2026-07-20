/**
 * Slice D13 — Pathway shadow-run orchestrator (server-only, DORMANT).
 *
 * Single entry that composes Slice D11's `previewPathwayReportDiff`
 * with Slice D12's `recordShadowRun`. Operators (and, later, a cron
 * job) invoke one function to (a) build the shadow snapshot, (b) fetch
 * the current `pathway_reports` row, (c) diff them, and (d) append the
 * result to `pathway_shadow_run_log`. Zero writes to any other table.
 *
 * Off by default. `enabled: false` short-circuits before any I/O — no
 * loader read, no current-row fetch, no generator call, no log write.
 * When the D11 diff itself returns non-`diffed` (upstream error or
 * upstream flag-off), the recorder is invoked as-is so its own
 * "skipped" contract applies; no drift row is written for those cases.
 *
 * No route, server function, edge function, or UI wires this yet.
 *
 * `.server.ts` suffix keeps this out of the browser bundle.
 */
import {
  previewPathwayReportDiff,
  type PreviewPathwayReportDiffInput,
  type PreviewPathwayReportDiffResult,
} from "./pathway-report-diff.server.ts";
import {
  recordShadowRun,
  type RecordShadowRunResult,
  type ShadowRunLogClient,
} from "./pathway-shadow-run-recorder.server.ts";

/* ---------- input / output ---------- */

export interface RunShadowDiffAndRecordInput
  extends Omit<PreviewPathwayReportDiffInput, "enabled"> {
  /** Off-by-default. Flag-off = zero I/O across both stages. */
  enabled: boolean;
  /** Injected writer for `pathway_shadow_run_log`. */
  logClient: ShadowRunLogClient;
  /** Optional actor stamp (typically `context.userId` from the caller). */
  actorId?: string | null;
}

export type RunShadowDiffAndRecordResult =
  | { ok: true; status: "disabled"; reason: "flag_off" }
  | {
      ok: true;
      status: "completed";
      diff: PreviewPathwayReportDiffResult;
      record: RecordShadowRunResult;
    };

/* ---------- orchestrator ---------- */

/**
 * DORMANT composite pipeline. Off by default. When enabled:
 *   D11 diff → D12 recorder. Both stages are always reported so callers
 * can distinguish "diff failed" from "diff succeeded but log write
 * failed". Neither stage's failure is thrown; failures surface as
 * structured results on `.diff` / `.record`.
 */
export async function runShadowDiffAndRecord(
  input: RunShadowDiffAndRecordInput,
): Promise<RunShadowDiffAndRecordResult> {
  if (!input.enabled) {
    return { ok: true, status: "disabled", reason: "flag_off" };
  }

  const diff = await previewPathwayReportDiff({
    enabled: true,
    reportId: input.reportId,
    age_band: input.age_band,
    pillars: input.pillars,
    promptVersion: input.promptVersion,
    modelVersion: input.modelVersion,
    channel: input.channel,
    maxKnowledgeRefs: input.maxKnowledgeRefs,
    registryClient: input.registryClient,
    currentClient: input.currentClient,
    generate: input.generate,
  });

  const record = await recordShadowRun({
    enabled: true,
    diffResult: diff,
    actorId: input.actorId ?? null,
    logClient: input.logClient,
  });

  return { ok: true, status: "completed", diff, record };
}
