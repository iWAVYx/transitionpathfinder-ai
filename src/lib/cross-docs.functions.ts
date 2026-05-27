import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CrossDocumentRow = {
  id: string;
  student_id: string;
  student_first_name: string;
  doc_type: string;
  title: string;
  mime_type: string | null;
  size_bytes: number | null;
  has_summary: boolean;
  created_at: string;
};

/**
 * Returns documents across every student the current user can access (via
 * ownership or accepted collaboration). Used by the cross-student
 * Documents hub at /documents.
 */
export const listAllDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("documents")
      .select(
        "id, student_id, doc_type, title, mime_type, size_bytes, parsed_summary, created_at, students(first_name)",
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
      created_at: string;
      students: { first_name: string } | null;
    };

    const rows = (data ?? []) as unknown as Row[];
    const documents: CrossDocumentRow[] = rows.map((r) => ({
      id: r.id,
      student_id: r.student_id,
      student_first_name: r.students?.first_name ?? "—",
      doc_type: r.doc_type,
      title: r.title,
      mime_type: r.mime_type,
      size_bytes: r.size_bytes,
      has_summary: r.parsed_summary !== null && r.parsed_summary !== undefined,
      created_at: r.created_at,
    }));

    return { documents };
  });
