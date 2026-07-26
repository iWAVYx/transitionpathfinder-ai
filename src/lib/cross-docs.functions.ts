import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Explicit reviewer lifecycle exposed to the Documents hub.
 *
 *   uploaded     — file is in storage but no AI draft yet
 *   ai_extracted — AI produced a draft, waiting for human triage
 *   in_review    — at least one section has been accepted / edited / rejected
 *   linked       — review complete & accepted fields written to the student
 *
 * Backed by `document_extractions.status` (pending → needs_review →
 * in_review → complete). A document with no extraction row falls back to
 * `uploaded`; legacy documents that have a `parsed_summary` but no
 * extraction row are surfaced as `linked` so they keep their old
 * "summarized" semantics.
 */
export type DocumentReviewStatus =
  | "uploaded"
  | "ai_extracted"
  | "in_review"
  | "linked";

export type CrossDocumentRow = {
  id: string;
  student_id: string;
  student_first_name: string;
  doc_type: string;
  title: string;
  mime_type: string | null;
  size_bytes: number | null;
  has_summary: boolean;
  review_status: DocumentReviewStatus;
  scan_status: string | null;
  created_at: string;
};


export const listAllDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("documents")
      .select(
        "id, student_id, doc_type, title, mime_type, size_bytes, parsed_summary, scan_status, created_at, students(first_name)",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("listAllDocuments failed", error);
      return { documents: [] as CrossDocumentRow[] };
    }

    type Row = {
      id: string;
      student_id: string;
      doc_type: string;
      title: string;
      mime_type: string | null;
      size_bytes: number | null;
      parsed_summary: unknown;
      scan_status: string | null;
      created_at: string;
      students: { first_name: string } | null;
    };


    const rows = (data ?? []) as unknown as Row[];
    const ids = rows.map((r) => r.id);

    // Best-effort join to document_extractions.status. RLS scopes this to
    // extractions on documents the user can already see, so a failure here
    // just degrades to the binary uploaded/linked view.
    const statusByDoc: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: extRows } = await supabase
        .from("document_extractions")
        .select("document_id, status")
        .in("document_id", ids);
      ((extRows ?? []) as Array<{ document_id: string; status: string }>).forEach(
        (e) => {
          statusByDoc[e.document_id] = e.status;
        },
      );
    }

    function deriveStatus(r: Row): DocumentReviewStatus {
      const s = statusByDoc[r.id];
      if (s === "complete") return "linked";
      if (s === "in_review") return "in_review";
      if (s === "needs_review") return "ai_extracted";
      if (s === "pending") return "ai_extracted";
      // Legacy summarized doc with no extraction row.
      if (r.parsed_summary !== null && r.parsed_summary !== undefined)
        return "linked";
      return "uploaded";
    }

    const documents: CrossDocumentRow[] = rows.map((r) => {
      const review_status = deriveStatus(r);
      return {
        id: r.id,
        student_id: r.student_id,
        student_first_name: r.students?.first_name ?? "—",
        doc_type: r.doc_type,
        title: r.title,
        mime_type: r.mime_type,
        size_bytes: r.size_bytes,
        has_summary: review_status === "linked",
        review_status,
        created_at: r.created_at,
      };
    });

    return { documents };
  });
