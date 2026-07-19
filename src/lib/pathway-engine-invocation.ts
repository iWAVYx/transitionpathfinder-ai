/**
 * Slice D4 — PathwayEngineInvocation provenance resolver (DORMANT).
 *
 * Pure, isomorphic helper that turns a snapshot of the D1 registries
 * (`pathway_rules_versions`, `pathway_knowledge_sources`) plus the caller's
 * prompt/model identifiers into a validated `RecProvenance` payload that
 * every future engine run will stamp onto `pathway_reports` and every
 * `RecommendationV1` it emits.
 *
 * No writer, reader, or route consumes this yet. Injecting the DB adapter
 * (rather than importing supabase) keeps this module test-only and lets
 * the eventual server function decide which client to use.
 */
import { RecProvenance, type RecProvenance as RecProvenanceT } from "./pathway-recommendation-v1.ts";

export type EngineChannel = "shadow" | "canary" | "production" | "retired";

export interface RulesVersionRow {
  version: string;
  engine_channel: string;
  effective_at: string;
  retired_at: string | null;
  ruleset: unknown;
}

export interface KnowledgeSourceRow {
  slug: string;
  version: string | null;
  retired_at: string | null;
}

export interface ResolveInvocationInput {
  rulesRow: RulesVersionRow | null;
  knowledgeRows: KnowledgeSourceRow[];
  promptVersion: string;
  modelVersion: string;
  /** Optional override; defaults to the rules row's own channel. */
  channelOverride?: EngineChannel;
  /** Cap on knowledge refs (schema max is 20). */
  maxKnowledgeRefs?: number;
}

export type ResolveInvocationResult =
  | { ok: true; provenance: RecProvenanceT; knowledge_dropped: number }
  | { ok: false; error_code: ResolveErrorCode; message: string };

export type ResolveErrorCode =
  | "no_active_rules"
  | "rules_retired"
  | "invalid_channel"
  | "provenance_invalid";

const VALID_CHANNELS: readonly EngineChannel[] = ["shadow", "canary", "production", "retired"];

function isValidChannel(v: string): v is EngineChannel {
  return (VALID_CHANNELS as readonly string[]).includes(v);
}

/**
 * Build a knowledge_ref string for a source row. Format: `<slug>@<version>`
 * when a version exists, else the bare slug. Retired sources are excluded
 * upstream in `resolvePathwayEngineInvocation`.
 */
export function knowledgeRefFor(row: KnowledgeSourceRow): string {
  return row.version ? `${row.slug}@${row.version}` : row.slug;
}

/**
 * Pure resolver. Given a snapshot of registry rows + caller identifiers,
 * returns a schema-validated `RecProvenance` or a structured error. Never
 * throws — callers get a discriminated union they can log/short-circuit on.
 */
export function resolvePathwayEngineInvocation(
  input: ResolveInvocationInput,
): ResolveInvocationResult {
  const { rulesRow, knowledgeRows, promptVersion, modelVersion, channelOverride } = input;
  const cap = Math.max(0, Math.min(input.maxKnowledgeRefs ?? 20, 20));

  if (!rulesRow) {
    return { ok: false, error_code: "no_active_rules", message: "No pathway_rules_versions row supplied" };
  }
  if (rulesRow.retired_at) {
    return {
      ok: false,
      error_code: "rules_retired",
      message: `Rules version ${rulesRow.version} was retired at ${rulesRow.retired_at}`,
    };
  }

  const rawChannel = channelOverride ?? rulesRow.engine_channel;
  if (!isValidChannel(rawChannel)) {
    return { ok: false, error_code: "invalid_channel", message: `Unknown engine_channel: ${rawChannel}` };
  }

  const liveKnowledge = knowledgeRows.filter((r) => !r.retired_at);
  const refs = liveKnowledge.map(knowledgeRefFor);
  const capped = refs.slice(0, cap);
  const dropped = refs.length - capped.length;

  const parsed = RecProvenance.safeParse({
    rules_version: rulesRow.version,
    prompt_version: promptVersion,
    model_version: modelVersion,
    engine_channel: rawChannel,
    knowledge_ref: capped,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error_code: "provenance_invalid",
      message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }

  return { ok: true, provenance: parsed.data, knowledge_dropped: dropped };
}

/**
 * Convenience: derive the columns that will land on `pathway_reports` from
 * a resolved provenance. Kept separate from the resolver so callers can
 * write provenance without also writing a full report row.
 */
export function provenanceToReportColumns(p: RecProvenanceT) {
  return {
    rules_version: p.rules_version,
    prompt_version: p.prompt_version,
    model_version: p.model_version,
    engine_channel: p.engine_channel,
    knowledge_snapshot: { knowledge_ref: p.knowledge_ref },
  };
}
