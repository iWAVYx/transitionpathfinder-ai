/**
 * Slice D7 — Pathway report writer (DORMANT, server-only).
 *
 * Ties Slice D5 (registry loader) + Slice D6 (shadow-channel engine
 * adapter) + Slice D4's `provenanceToReportColumns` into a single
 * function that:
 *   1. Loads the active ruleset + live knowledge snapshot for the
 *      requested channel.
 *   2. Runs the shadow orchestrator with the resolved provenance.
 *   3. Stamps the produced batch + provenance columns onto
 *      `pathway_reports` via an injected client.
 *
 * Off-by-default: callers must pass `enabled: true`. Flag-off returns
 * `{ ok: true, status: "disabled" }` and performs zero DB work — no
 * loader read, no writer call, no generator call. This is the guarantee
 * that shipping this file cannot mutate a `pathway_reports` row until an
 * explicit rollout flips the flag.
 *
 * `.server.ts` suffix keeps this out of the browser bundle via Vite's
 * import-protection filename rule.
 */
import {
  loadPathwayEngineInvocation,
  type LoadInvocationInput,
  type LoadInvocationResult,
} from "./pathway-registry-loader.server.ts";
import {
  provenanceToReportColumns,
  type EngineChannel,
} from "./pathway-engine-invocation.ts";
import {
  runPathwayEngineShadow,
  type PillarInput,
  type RecommendationGenerator,
  type RunPathwayEngineResult,
} from "./pathway-engine-shadow.ts";
import type {
  RecAgeBand,
  RecommendationV1,
} from "./pathway-recommendation-v1.ts";

/* ---------- minimal writer client contract ---------- */

/**
 * Structural shape of the writer we need. Deliberately narrow so the
 * test double is a plain object and this module never binds to a
 * specific supabase-js major. The eventual caller wires this to
 * `supabaseAdmin.from("pathway_reports").update(...).eq("id", ...)`
 * inside a server function.
 */
export interface ReportUpdateResult {
  data: unknown;
  error: { message: string } | null;
}

export interface ReportWriterClient {
  updateReport: (
    reportId: string,
    columns: {
      rules_version: string;
      prompt_version: string;
      model_version: string;
      engine_channel: EngineChannel;
      knowledge_snapshot: { knowledge_ref: string[] };
      recommendations: RecommendationV1[];
    },
  ) => Promise<ReportUpdateResult>;
}

/* ---------- input / output ---------- */

export interface WritePathwayReportInput {
  /** Must be true to perform any DB work. Off-by-default. */
  enabled: boolean;
  reportId: string;
  age_band: RecAgeBand;
  pillars: PillarInput[];
  promptVersion: string;
  modelVersion: string;
  channel?: EngineChannel;
  maxKnowledgeRefs?: number;
  /** Injected — the D5 loader's client. */
  registryClient: LoadInvocationInput["client"];
  /** Injected — the writer for `pathway_reports`. */
  writerClient: ReportWriterClient;
  /** Injected recommendation generator (see Slice D6). */
  generate: RecommendationGenerator;
}

export type WritePathwayReportResult =
  | { ok: true; status: "disabled"; reason: "flag_off" }
  | {
      ok: true;
      status: "written";
      reportId: string;
      recommendationCount: number;
      knowledge_dropped: number;
      per_pillar: Extract<
        RunPathwayEngineResult,
        { ok: true; status: "produced" }
      >["per_pillar"];
    }
  | {
      ok: false;
      error_code:
        | LoadInvocationResult extends { ok: false; error_code: infer C } ? C : never
        | Extract<RunPathwayEngineResult, { ok: false }>["error_code"]
        | "write_failed";
      message: string;
    };

/* ---------- writer ---------- */

/**
 * DORMANT end-to-end pipeline. Off by default. When enabled:
 *   loader → engine → schema-validated batch → `pathway_reports` update.
 * All failures short-circuit with a structured error — never throws on
 * expected failures. Unexpected client exceptions bubble.
 */
export async function writePathwayReport(
  input: WritePathwayReportInput,
): Promise<WritePathwayReportResult> {
  if (!input.enabled) {
    return { ok: true, status: "disabled", reason: "flag_off" };
  }

  // 1. Loader — resolves active ruleset + live knowledge snapshot into
  //    a schema-valid RecProvenance.
  const loaded = await loadPathwayEngineInvocation({
    client: input.registryClient,
    promptVersion: input.promptVersion,
    modelVersion: input.modelVersion,
    channel: input.channel,
    maxKnowledgeRefs: input.maxKnowledgeRefs,
  });
  if (!loaded.ok) {
    return {
      ok: false,
      error_code: loaded.error_code as WritePathwayReportResult extends {
        ok: false;
        error_code: infer C;
      }
        ? C
        : never,
      message: loaded.message,
    };
  }

  // 2. Engine — runs sufficiency check + schema gate per pillar.
  const engine = await runPathwayEngineShadow({
    enabled: true,
    reportId: input.reportId,
    age_band: input.age_band,
    pillars: input.pillars,
    provenance: loaded.provenance,
    generate: input.generate,
  });
  if (!engine.ok) {
    return {
      ok: false,
      error_code: engine.error_code as WritePathwayReportResult extends {
        ok: false;
        error_code: infer C;
      }
        ? C
        : never,
      message: engine.message,
    };
  }
  // `status: "disabled"` cannot happen here — we passed `enabled: true`.
  if (engine.status !== "produced") {
    return {
      ok: false,
      error_code: "batch_invalid" as WritePathwayReportResult extends {
        ok: false;
        error_code: infer C;
      }
        ? C
        : never,
      message: `unexpected engine status: ${engine.status}`,
    };
  }

  // 3. Writer — stamp provenance columns + validated recommendations.
  const columns = {
    ...provenanceToReportColumns(loaded.provenance),
    recommendations: engine.batch,
  };
  const { error } = await input.writerClient.updateReport(input.reportId, columns);
  if (error) {
    return {
      ok: false,
      error_code: "write_failed" as WritePathwayReportResult extends {
        ok: false;
        error_code: infer C;
      }
        ? C
        : never,
      message: error.message,
    };
  }

  return {
    ok: true,
    status: "written",
    reportId: input.reportId,
    recommendationCount: engine.batch.length,
    knowledge_dropped: loaded.knowledge_dropped,
    per_pillar: engine.per_pillar,
  };
}
