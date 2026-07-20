/**
 * Slice D10 — Pathway shadow-vs-current diff helper (DORMANT).
 *
 * Pure, isomorphic helper (no supabase, no react, no server imports) that
 * compares the columns + recommendations a shadow-channel run *would*
 * write (typically the `columns` payload returned by `previewPathwayReport`
 * from Slice D9) against the current row already persisted in
 * `pathway_reports`. Callers use it to inspect drift before the shadow
 * write flag is flipped on.
 *
 * DORMANT: nothing wires this into a route, server function, edge
 * function, writer, or UI yet. Ship-safe by construction — this file has
 * no side effects and does not touch any client.
 */
import type { EngineChannel } from "./pathway-engine-invocation.ts";
import type { RecommendationV1 } from "./pathway-recommendation-v1.ts";

/* ---------- inputs ---------- */

export interface PathwayReportSnapshot {
  rules_version: string | null | undefined;
  prompt_version: string | null | undefined;
  model_version: string | null | undefined;
  engine_channel: EngineChannel | null | undefined;
  knowledge_snapshot:
    | { knowledge_ref?: string[] | null }
    | null
    | undefined;
  recommendations: RecommendationV1[] | null | undefined;
}

/* ---------- output ---------- */

export type ProvenanceFieldDiff<T> = {
  changed: boolean;
  current: T | null;
  shadow: T | null;
};

export interface KnowledgeRefDiff {
  changed: boolean;
  added: string[];
  removed: string[];
  unchanged: string[];
}

export interface RecommendationDiffEntry {
  id: string;
  status: "added" | "removed" | "changed" | "unchanged";
  /** Field paths that differ (e.g. "title", "provenance.rules_version"). */
  changed_fields: string[];
}

export interface RecommendationDiff {
  added: RecommendationDiffEntry[];
  removed: RecommendationDiffEntry[];
  changed: RecommendationDiffEntry[];
  unchanged_count: number;
}

export interface PathwayReportDiff {
  identical: boolean;
  provenance: {
    rules_version: ProvenanceFieldDiff<string>;
    prompt_version: ProvenanceFieldDiff<string>;
    model_version: ProvenanceFieldDiff<string>;
    engine_channel: ProvenanceFieldDiff<EngineChannel>;
  };
  knowledge_ref: KnowledgeRefDiff;
  recommendations: RecommendationDiff;
}

/* ---------- helpers ---------- */

function normStr<T extends string>(v: T | null | undefined): T | null {
  return v == null ? null : v;
}

function fieldDiff<T extends string>(
  current: T | null | undefined,
  shadow: T | null | undefined,
): ProvenanceFieldDiff<T> {
  const c = normStr(current);
  const s = normStr(shadow);
  return { changed: c !== s, current: c, shadow: s };
}

function knowledgeDiff(
  current: string[] | null | undefined,
  shadow: string[] | null | undefined,
): KnowledgeRefDiff {
  const c = new Set(current ?? []);
  const s = new Set(shadow ?? []);
  const added: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];
  for (const ref of s) (c.has(ref) ? unchanged : added).push(ref);
  for (const ref of c) if (!s.has(ref)) removed.push(ref);
  added.sort();
  removed.sort();
  unchanged.sort();
  return { changed: added.length > 0 || removed.length > 0, added, removed, unchanged };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
    .join(",")}}`;
}

function collectChangedFields(
  a: unknown,
  b: unknown,
  path: string,
  out: string[],
): void {
  if (stableStringify(a) === stableStringify(b)) return;
  const aIsObj = a && typeof a === "object" && !Array.isArray(a);
  const bIsObj = b && typeof b === "object" && !Array.isArray(b);
  if (aIsObj && bIsObj) {
    const keys = new Set([
      ...Object.keys(a as Record<string, unknown>),
      ...Object.keys(b as Record<string, unknown>),
    ]);
    for (const k of Array.from(keys).sort()) {
      collectChangedFields(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
        path ? `${path}.${k}` : k,
        out,
      );
    }
    return;
  }
  out.push(path || "<root>");
}

function recommendationsDiff(
  current: RecommendationV1[] | null | undefined,
  shadow: RecommendationV1[] | null | undefined,
): RecommendationDiff {
  const cMap = new Map<string, RecommendationV1>();
  for (const r of current ?? []) cMap.set(r.id, r);
  const sMap = new Map<string, RecommendationV1>();
  for (const r of shadow ?? []) sMap.set(r.id, r);

  const added: RecommendationDiffEntry[] = [];
  const removed: RecommendationDiffEntry[] = [];
  const changed: RecommendationDiffEntry[] = [];
  let unchanged_count = 0;

  for (const [id, sRec] of sMap) {
    const cRec = cMap.get(id);
    if (!cRec) {
      added.push({ id, status: "added", changed_fields: [] });
      continue;
    }
    const fields: string[] = [];
    collectChangedFields(cRec, sRec, "", fields);
    if (fields.length === 0) unchanged_count += 1;
    else changed.push({ id, status: "changed", changed_fields: fields });
  }
  for (const [id] of cMap) {
    if (!sMap.has(id)) removed.push({ id, status: "removed", changed_fields: [] });
  }

  const byId = (a: RecommendationDiffEntry, b: RecommendationDiffEntry) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  added.sort(byId);
  removed.sort(byId);
  changed.sort(byId);

  return { added, removed, changed, unchanged_count };
}

/* ---------- entry point ---------- */

/**
 * Compare two report snapshots (current row vs. shadow-would-write) and
 * return a structured diff. Pure — no I/O, no throws on missing fields
 * (nulls compare equal to nulls, unequal to strings). `identical: true`
 * means every provenance field, the knowledge_ref set, and the full
 * recommendation batch match.
 */
export function diffPathwayReport(
  current: PathwayReportSnapshot,
  shadow: PathwayReportSnapshot,
): PathwayReportDiff {
  const provenance = {
    rules_version: fieldDiff(current.rules_version, shadow.rules_version),
    prompt_version: fieldDiff(current.prompt_version, shadow.prompt_version),
    model_version: fieldDiff(current.model_version, shadow.model_version),
    engine_channel: fieldDiff<EngineChannel>(
      current.engine_channel ?? null,
      shadow.engine_channel ?? null,
    ),
  };
  const knowledge_ref = knowledgeDiff(
    current.knowledge_snapshot?.knowledge_ref ?? null,
    shadow.knowledge_snapshot?.knowledge_ref ?? null,
  );
  const recommendations = recommendationsDiff(
    current.recommendations,
    shadow.recommendations,
  );

  const identical =
    !provenance.rules_version.changed &&
    !provenance.prompt_version.changed &&
    !provenance.model_version.changed &&
    !provenance.engine_channel.changed &&
    !knowledge_ref.changed &&
    recommendations.added.length === 0 &&
    recommendations.removed.length === 0 &&
    recommendations.changed.length === 0;

  return { identical, provenance, knowledge_ref, recommendations };
}
