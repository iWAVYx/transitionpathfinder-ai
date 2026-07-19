// Workstream B, Slice B4 — First evidence writer.
//
// Emits a single `evidence_items` row per confirmed document extraction.
// Idempotent via the partial unique index
// `evidence_items_source_unique (student_id, source_kind, source_id)`.
//
// Behind the `EVIDENCE_GRAPH_WRITES` server-only env flag (shadow-mode by
// default). Callers use `emitEvidenceForConfirmedExtraction` inside their
// own server-fn handler so RLS still applies to the caller's supabase client.

import type { SupabaseClient } from "@supabase/supabase-js";

export function evidenceWritesEnabled(): boolean {
  return process.env.EVIDENCE_GRAPH_WRITES === "true";
}

export type EmitConfirmedExtractionArgs = {
  supabase: SupabaseClient;
  userId: string;
  extractionId: string;
  studentId: string;
  documentId: string | null;
  verificationState?: "human_confirmed" | "auto_high" | "unverified";
  payload?: Record<string, unknown>;
};

/**
 * Insert (or no-op) one evidence_item row for a confirmed extraction.
 * Safe to call repeatedly — the partial unique index dedupes on
 * (student_id, source_kind='document_extraction', source_id=extractionId).
 * Returns { skipped: true } when the flag is off.
 */
export async function emitEvidenceForConfirmedExtraction(
  args: EmitConfirmedExtractionArgs,
): Promise<{ ok: boolean; skipped?: boolean; evidenceId?: string | null }> {
  if (!evidenceWritesEnabled()) return { ok: true, skipped: true };

  const row = {
    student_id: args.studentId,
    kind: "document_extraction",
    subject_type: "document",
    subject_id: args.documentId,
    source_kind: "document_extraction",
    source_id: args.extractionId,
    contributor_id: args.userId,
    occurred_at: new Date().toISOString(),
    verification_state: args.verificationState ?? "human_confirmed",
    permission_scope: "student_team",
    payload: args.payload ?? {},
    extraction_id: args.extractionId,
  };

  const { data, error } = await (args.supabase.from("evidence_items") as unknown as {
    upsert: (
      r: Record<string, unknown>,
      o: { onConflict: string; ignoreDuplicates: boolean },
    ) => {
      select: (s: string) => { maybeSingle: () => Promise<{ data: { id: string } | null; error: unknown }> };
    };
  })
    .upsert(row, {
      onConflict: "student_id,source_kind,source_id",
      ignoreDuplicates: true,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn("emitEvidenceForConfirmedExtraction upsert failed", error);
    return { ok: false };
  }
  return { ok: true, evidenceId: data?.id ?? null };
}

// -----------------------------------------------------------------------------
// Slice B5 — Second writer: evidence_item → pathway_recommendation edge.
//
// Idempotent via the unique index
// evidence_edges_from_type_from_id_to_type_to_id_relation_key on
// (from_type, from_id, to_type, to_id, relation). Runs under the caller's
// authenticated supabase client so evidence_edges RLS applies (visibility
// derives from the linked evidence_item).
// -----------------------------------------------------------------------------

export type EmitRecommendationEdgeArgs = {
  supabase: SupabaseClient;
  userId: string;
  evidenceItemId: string;
  recommendationId: string;
  relation?: "supports" | "contradicts" | "informs";
  weight?: number;
};

export async function emitRecommendationEvidenceEdge(
  args: EmitRecommendationEdgeArgs,
): Promise<{ ok: boolean; skipped?: boolean; edgeId?: string | null }> {
  if (!evidenceWritesEnabled()) return { ok: true, skipped: true };

  const row = {
    from_type: "evidence_item",
    from_id: args.evidenceItemId,
    to_type: "pathway_recommendation",
    to_id: args.recommendationId,
    relation: args.relation ?? "supports",
    weight: args.weight ?? 1,
    created_by: args.userId,
  };

  const { data, error } = await (args.supabase.from("evidence_edges") as any)
    .upsert(row, {
      onConflict: "from_type,from_id,to_type,to_id,relation",
      ignoreDuplicates: true,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn("emitRecommendationEvidenceEdge upsert failed", error);
    return { ok: false };
  }
  return { ok: true, edgeId: data?.id ?? null };
}

/**
 * Consumer read: fetch provenance rows for a given pathway_recommendation via
 * the RLS-honoring `recommendation_provenance_v1` view. Returns [] when the
 * caller has no access (RLS filters silently).
 */
export async function readRecommendationProvenance(
  supabase: SupabaseClient,
  recommendationId: string,
): Promise<Array<{ edge_id: string; evidence_id: string; relation: string }>> {
  const { data, error } = await (supabase.from("recommendation_provenance_v1") as any)
    .select("edge_id, evidence_id, relation")
    .eq("recommendation_id", recommendationId);
  if (error) {
    console.warn("readRecommendationProvenance failed", error);
    return [];
  }
  return (data ?? []) as Array<{ edge_id: string; evidence_id: string; relation: string }>;
}
