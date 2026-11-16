import { z } from "zod";
import { readReportPages } from "./report-query-pages";
import { readStudentSummary } from "./student-summary.server";
import type { StudentSummaryDocument } from "./student-summary-contract";

export const READINESS_SOURCE_UNAVAILABLE = "We couldn't confirm the current planning information. Refresh your student workspace before trying again.";
type Client = { rpc(name: string, args: Record<string, string>): PromiseLike<{ data: unknown; error: unknown }> };

/** A current account-linked student relationship, never a broad management role. */
export async function assertReadinessStudentAccess(caller: unknown, actor: string, student: string) {
  try {
    const client = caller as Client;
    const access = await client.rpc("can_access_student", { _user_id: actor, _student_id: student });
    if (access.error !== null || access.data !== true) throw new Error();
    const partner = await client.rpc("is_partner_only", { _user_id: actor });
    if (partner.error !== null || partner.data !== false) throw new Error();
  } catch { throw new Error(READINESS_SOURCE_UNAVAILABLE); }
}

const documentTypeLabels: Record<StudentSummaryDocument["doc_type"], string> = {
  iep: "IEP", "current-iep": "Current IEP", "previous-iep": "Earlier IEP", "transition-plan": "Transition Plan",
};

/** Completeness matters: a duplicate beyond the first page must not make an
 * earlier score appear unambiguous. Validate identity and all page receipts. */
export async function readReadinessScoreRows(caller: unknown, student: string) {
  try {
    type ScoreQuery = { from(table: string): { select(columns: string, options: { count: "exact" }): {
      eq(column: string, value: string): { order(column: string): { range(from: number, to: number): PromiseLike<{ data: unknown[] | null; error: unknown; count: number | null }> } }
    } } };
    const rows = await readReportPages((from, to) => (caller as ScoreQuery).from("readiness_scores")
      .select("id, student_id, category, score, recommendation", { count: "exact" }).eq("student_id", student).order("id").range(from, to));
    const parsed = z.array(z.object({ id: z.string().uuid(), student_id: z.string().uuid(), category: z.string(),
      score: z.unknown().transform(value => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null),
      recommendation: z.string().nullable().optional(),
    })).parse(rows);
    if (parsed.some(row => row.student_id !== student) || new Set(parsed.map(row => row.id)).size !== parsed.length) throw new Error();
    return { data: parsed, error: null };
  } catch { throw new Error(READINESS_SOURCE_UNAVAILABLE); }
}

function ordered(documents: StudentSummaryDocument[]) {
  return [...documents].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || a.id.localeCompare(b.id));
}

/** The same reviewed-only projection used by the workspace summary reader.
 * Never SELECT raw document/extraction rows or fall back to an older summary.
 * Metadata is a bounded sample, not a claim of complete document coverage. */
export async function loadReadinessDocumentSources(caller: unknown, actor: string, student: string) {
  const scope = { student_id: student, expected_viewer_id: actor };
  try {
    const list = await readStudentSummary(caller, actor, scope, "list");
    const documents = ordered(list.documents ?? []).slice(0, 10), newest = documents[0];
    const request = newest?.summary_ready ? {
      ...scope, document_id: newest.id,
      expected_document_updated_at: newest.document_updated_at,
      expected_extraction_updated_at: newest.extraction_updated_at,
    } : null;
    const summary = request ? (await readStudentSummary(caller, actor, request, "read")).summary : null;
    if (request && (!summary?.ready || summary.sections.length === 0)) throw new Error();
    return {
      documents: documents.map(doc => ({ title: doc.title, type: documentTypeLabels[doc.doc_type], reviewed_sections_available: doc.summary_ready })),
      reviewed: summary ? { document_id: summary.document_id, title: summary.document_title, type: documentTypeLabels[summary.doc_type],
        sections: summary.sections.map(section => ({ label: section.label, value: section.value })) } : null,
      async assertCurrent() {
        try {
          const latest = await readStudentSummary(caller, actor, scope, "list");
          if (JSON.stringify(ordered(latest.documents ?? []).slice(0, 10)) !== JSON.stringify(documents)) throw new Error();
          if (request) {
            const confirmed = (await readStudentSummary(caller, actor, request, "read")).summary;
            if (JSON.stringify(confirmed) !== JSON.stringify(summary)) throw new Error();
          }
        } catch { throw new Error(READINESS_SOURCE_UNAVAILABLE); }
      },
    };
  } catch { throw new Error(READINESS_SOURCE_UNAVAILABLE); }
}
