/**
 * Slice D11 — Pathway shadow-vs-current diff orchestrator (server-only, DORMANT).
 *
 * Composes Slice D9's `previewPathwayReport` (what the shadow channel
 * *would* write) with the current row already persisted in
 * `pathway_reports`, then hands both snapshots to Slice D10's pure
 * `diffPathwayReport` helper. This is the operator inspection surface
 * used to eyeball drift before the shadow write flag is flipped.
 *
 * Off-by-default: callers must pass `enabled: true`. Flag-off returns
 * `{ ok: true, status: "disabled" }` and performs zero DB work — no
 * loader read, no current-row fetch, no generator call. No route,
 * server function, edge function, or UI wires this yet.
 *
 * `.server.ts` suffix keeps this out of the browser bundle.
 */
import {
  previewPathwayReport,
  type PreviewPathwayReportInput,
  type PreviewPathwayReportResult,
  type WriteErrorCode,
} from "./pathway-report-writer.server.ts";
import {
  diffPathwayReport,
  type PathwayReportDiff,
  type PathwayReportSnapshot,
} from "./pathway-report-diff.ts";
import type { EngineChannel } from "./pathway-engine-invocation.ts";
import type { RecommendationV1 } from "./pathway-recommendation-v1.ts";

/* ---------- current-row loader contract ---------- */

/**
 * Structural shape of the current-row reader. Deliberately narrow so
 * the test double is a plain object and this module never binds to a
 * supabase-js major. The eventual caller wires this to
 * `supabaseAdmin.from("pathway_reports").select(...).eq("id", ...).maybeSingle()`
 * inside a server function.
 */
export interface CurrentReportFetchResult {
  data: PathwayReportSnapshot | null;
  error: { message: string } | null;
}

export interface CurrentReportClient {
  fetchReport: (reportId: string) => Promise<CurrentReportFetchResult>;
}

/* ---------- input / output ---------- */

export interface PreviewPathwayReportDiffInput
  extends Omit<PreviewPathwayReportInput, "enabled"> {
  enabled: boolean;
  /** Injected reader for the current `pathway_reports` row. */
  currentClient: CurrentReportClient;
}

export type DiffErrorCode =
  | WriteErrorCode
  | "report_query_failed"
  | "report_not_found";

export type PreviewPathwayReportDiffResult =
  | { ok: true; status: "disabled"; reason: "flag_off" }
  | {
      ok: true;
      status: "diffed";
      reportId: string;
      diff: PathwayReportDiff;
      current: PathwayReportSnapshot;
      shadow: {
        rules_version: string;
        prompt_version: string;
        model_version: string;
        engine_channel: EngineChannel;
        knowledge_snapshot: { knowledge_ref: string[] };
        recommendations: RecommendationV1[];
      };
    }
  | { ok: false; error_code: DiffErrorCode; message: string };

/* ---------- orchestrator ---------- */

/**
 * DORMANT read-only pipeline. Off by default. When enabled:
 *   preview (loader + engine) + current-row fetch → pure diff.
 * All failures short-circuit with a structured error. Zero writes.
 */
export async function previewPathwayReportDiff(
  input: PreviewPathwayReportDiffInput,
): Promise<PreviewPathwayReportDiffResult> {
  if (!input.enabled) {
    return { ok: true, status: "disabled", reason: "flag_off" };
  }

  // 1. Preview — loader + engine, no writes. Short-circuit on failure
  //    before touching the current row so a bad ruleset/knowledge/schema
  //    isn't masked by a missing report row.
  const previewed: PreviewPathwayReportResult = await previewPathwayReport({
    enabled: true,
    reportId: input.reportId,
    age_band: input.age_band,
    pillars: input.pillars,
    promptVersion: input.promptVersion,
    modelVersion: input.modelVersion,
    channel: input.channel,
    maxKnowledgeRefs: input.maxKnowledgeRefs,
    registryClient: input.registryClient,
    generate: input.generate,
  });
  if (!previewed.ok) {
    return {
      ok: false,
      error_code: previewed.error_code,
      message: previewed.message,
    };
  }
  // `enabled: true` above means "disabled" cannot come back.
  if (previewed.status !== "previewed") {
    return {
      ok: false,
      error_code: "batch_invalid",
      message: `unexpected preview status: ${previewed.status}`,
    };
  }

  // 2. Current row — read-only fetch of the persisted snapshot.
  const fetched = await input.currentClient.fetchReport(input.reportId);
  if (fetched.error) {
    return {
      ok: false,
      error_code: "report_query_failed",
      message: fetched.error.message,
    };
  }
  if (!fetched.data) {
    return {
      ok: false,
      error_code: "report_not_found",
      message: `no pathway_reports row for id=${input.reportId}`,
    };
  }

  // 3. Pure diff — Slice D10.
  const shadowSnapshot: PathwayReportSnapshot = {
    rules_version: previewed.columns.rules_version,
    prompt_version: previewed.columns.prompt_version,
    model_version: previewed.columns.model_version,
    engine_channel: previewed.columns.engine_channel,
    knowledge_snapshot: previewed.columns.knowledge_snapshot,
    recommendations: previewed.columns.recommendations,
  };
  const diff = diffPathwayReport(fetched.data, shadowSnapshot);

  return {
    ok: true,
    status: "diffed",
    reportId: input.reportId,
    diff,
    current: fetched.data,
    shadow: previewed.columns,
  };
}
