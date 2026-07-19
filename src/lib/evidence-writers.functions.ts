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
