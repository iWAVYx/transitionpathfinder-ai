// Counselor UI slice — server functions for counselor_scope evidence_items.
//
// Reads and writes go through the caller's RLS-scoped supabase client. The
// counselor_scope RLS branch (Proof-7 migration) enforces that only the
// contributor or a platform admin can SELECT a `permission_scope =
// 'counselor_scope'` row, and INSERT requires contributor_id = auth.uid().
// This module owns nothing security-relevant beyond input validation and a
// stable server contract for the UI; the database is the source of truth.

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export type CounselorNoteRow = {
  id: string;
  student_id: string;
  contributor_id: string | null;
  created_at: string;
  updated_at: string;
  occurred_at: string | null;
  note: string;
  focus: string | null;
};

function payloadToView(row: {
  id: string;
  student_id: string;
  contributor_id: string | null;
  created_at: string;
  updated_at: string;
  occurred_at: string | null;
  payload: unknown;
}): CounselorNoteRow {
  const p = (row.payload ?? {}) as { note?: unknown; focus?: unknown };
  return {
    id: row.id,
    student_id: row.student_id,
    contributor_id: row.contributor_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    occurred_at: row.occurred_at,
    note: typeof p.note === "string" ? p.note : "",
    focus: typeof p.focus === "string" && p.focus.length > 0 ? p.focus : null,
  };
}

export const listCounselorNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { student_id: string }) =>
    z.object({ student_id: uuid }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("evidence_items")
      .select(
        "id, student_id, contributor_id, created_at, updated_at, occurred_at, payload",
      )
      .eq("student_id", data.student_id)
      .eq("permission_scope", "counselor_scope")
      .eq("source_kind", "counselor_note")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { notes: (rows ?? []).map(payloadToView) };
  });

export const createCounselorNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { student_id: string; note: string; focus?: string | null }) =>
    z
      .object({
        student_id: uuid,
        note: z.string().trim().min(1, "Note is required").max(4000),
        focus: z.string().trim().max(120).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Stable source_id so accidental retries dedupe if we later add a unique
    // index on (student_id, source_kind, source_id); for now this is just a
    // per-note identifier written by the contributor.
    const sourceId = crypto.randomUUID();

    const row = {
      student_id: data.student_id,
      kind: "counselor_note",
      subject_type: "student",
      subject_id: data.student_id,
      source_kind: "counselor_note",
      source_id: sourceId,
      contributor_id: context.userId,
      occurred_at: new Date().toISOString(),
      verification_state: "human_confirmed",
      permission_scope: "counselor_scope",
      payload: {
        note: data.note.trim(),
        focus: data.focus?.trim() || null,
      },
    };

    const { data: inserted, error } = await context.supabase
      .from("evidence_items")
      .insert(row)
      .select(
        "id, student_id, contributor_id, created_at, updated_at, occurred_at, payload",
      )
      .single();

    if (error) throw new Error(error.message);
    return { note: payloadToView(inserted) };
  });
