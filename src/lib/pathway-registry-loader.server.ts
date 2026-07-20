/**
 * Slice D5 — Pathway registry loader (DORMANT, server-only).
 *
 * Server-side adapter that reads the D1 registries
 * (`pathway_rules_versions`, `pathway_knowledge_sources`) via an injected
 * Supabase-like client and feeds them into the D4 pure resolver
 * (`resolvePathwayEngineInvocation`) to produce a schema-validated
 * `RecProvenance`.
 *
 * Kept DORMANT: no server function, edge function, writer, or UI imports
 * this yet. The client is injected (not imported) so unit tests can drive
 * it with an in-memory stub, and the eventual caller decides whether to
 * use `supabaseAdmin` (bypass RLS — the registries are admin-only anyway)
 * or a service-role client from an edge function.
 *
 * `.server.ts` suffix keeps this out of the browser bundle even if a
 * client-imported module accidentally references it — Vite's import
 * protection blocks the whole file from the client graph by filename.
 */
import {
  resolvePathwayEngineInvocation,
  type EngineChannel,
  type KnowledgeSourceRow,
  type ResolveInvocationResult,
  type RulesVersionRow,
} from "./pathway-engine-invocation.ts";

/* ---------- minimal client contract (structural, not nominal) ---------- */

/**
 * Structural shape of the query-builder we need out of the injected
 * client. Deliberately narrow — we don't want to bind this loader to a
 * specific supabase-js major version, and we want the test double to be
 * a few dozen lines of plain objects.
 */
export interface RegistryQueryBuilder<Row> {
  select: (columns: string) => RegistryQueryBuilder<Row>;
  eq: (column: string, value: unknown) => RegistryQueryBuilder<Row>;
  is: (column: string, value: unknown) => RegistryQueryBuilder<Row>;
  order: (
    column: string,
    opts?: { ascending?: boolean; nullsFirst?: boolean },
  ) => RegistryQueryBuilder<Row>;
  limit: (n: number) => RegistryQueryBuilder<Row>;
  maybeSingle: () => Promise<{ data: Row | null; error: { message: string } | null }>;
  // Used for the knowledge-source list read.
  then?: never;
}

export interface RegistryListResult<Row> {
  data: Row[] | null;
  error: { message: string } | null;
}

export interface RegistryClient {
  from: (
    table: "pathway_rules_versions",
  ) => RegistryQueryBuilder<RulesVersionRow> & {
    // Same builder, but terminates with a list read.
    list: () => Promise<RegistryListResult<RulesVersionRow>>;
  };
  fromKnowledge: () => {
    select: (columns: string) => {
      is: (
        column: string,
        value: unknown,
      ) => Promise<RegistryListResult<KnowledgeSourceRow>>;
    };
  };
}

/* ---------- input / output ---------- */

export interface LoadInvocationInput {
  client: RegistryClient;
  promptVersion: string;
  modelVersion: string;
  /**
   * Which channel's active ruleset to load. Defaults to `"shadow"` — the
   * safe default while D-stage work is dormant. Callers that want to
   * stamp a report with a different channel (canary / production) pass
   * it explicitly.
   */
  channel?: EngineChannel;
  /** Cap on knowledge refs forwarded into provenance (schema max 20). */
  maxKnowledgeRefs?: number;
}

export type LoadInvocationResult =
  | (Extract<ResolveInvocationResult, { ok: true }> & {
      rulesRow: RulesVersionRow;
      knowledgeRows: KnowledgeSourceRow[];
    })
  | { ok: false; error_code: LoadErrorCode; message: string };

export type LoadErrorCode =
  | "rules_query_failed"
  | "knowledge_query_failed"
  | "no_active_rules"
  | "rules_retired"
  | "invalid_channel"
  | "provenance_invalid";

/* ---------- loader ---------- */

/**
 * Load the active rules row for `channel` + all non-retired knowledge
 * sources, then delegate to the pure D4 resolver. Returns a discriminated
 * union — never throws on expected failures (missing rules, invalid
 * channel, DB error). Unexpected exceptions from the client bubble up.
 */
export async function loadPathwayEngineInvocation(
  input: LoadInvocationInput,
): Promise<LoadInvocationResult> {
  const channel: EngineChannel = input.channel ?? "shadow";

  // 1. Active (non-retired) rules row for the requested channel, newest first.
  const rulesQuery = input.client
    .from("pathway_rules_versions")
    .select("version, engine_channel, effective_at, retired_at, ruleset")
    .eq("engine_channel", channel)
    .is("retired_at", null)
    .order("effective_at", { ascending: false })
    .limit(1);

  const { data: rulesRow, error: rulesErr } = await rulesQuery.maybeSingle();
  if (rulesErr) {
    return {
      ok: false,
      error_code: "rules_query_failed",
      message: rulesErr.message,
    };
  }
  if (!rulesRow) {
    return {
      ok: false,
      error_code: "no_active_rules",
      message: `No active pathway_rules_versions row on channel "${channel}"`,
    };
  }

  // 2. All live knowledge sources. Ordering by slug keeps knowledge_ref
  //    deterministic across runs — critical for report diffs.
  const { data: knowledgeRows, error: knowledgeErr } = await input.client
    .fromKnowledge()
    .select("slug, version, retired_at")
    .is("retired_at", null);
  if (knowledgeErr) {
    return {
      ok: false,
      error_code: "knowledge_query_failed",
      message: knowledgeErr.message,
    };
  }

  // 3. Delegate to the pure D4 resolver (schema validation + capping).
  const resolved = resolvePathwayEngineInvocation({
    rulesRow,
    knowledgeRows: knowledgeRows ?? [],
    promptVersion: input.promptVersion,
    modelVersion: input.modelVersion,
    channelOverride: channel,
    maxKnowledgeRefs: input.maxKnowledgeRefs,
  });

  if (!resolved.ok) {
    return { ok: false, error_code: resolved.error_code, message: resolved.message };
  }

  return {
    ok: true,
    provenance: resolved.provenance,
    knowledge_dropped: resolved.knowledge_dropped,
    rulesRow,
    knowledgeRows: knowledgeRows ?? [],
  };
}
