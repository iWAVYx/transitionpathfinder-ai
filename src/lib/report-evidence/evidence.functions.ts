import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EvidenceLink, EvidenceSourceKind } from "./types";
import { REPORT_SECTIONS } from "./types";
import type { ReportSectionId } from "@/lib/hubs/registry";

const SOURCE_KINDS = [
  "document",
  "note",
  "goal",
  "meeting",
  "voice_response",
  "assessment",
  "opportunity",
  "other",
] as const;

interface DbRow {
  id: string;
  student_id: string;
  report_section: string;
  source_kind: string;
  source_id: string | null;
  source_label: string;
  note: string | null;
  created_at: string;
}

function toDomain(r: DbRow): EvidenceLink {
  return {
    id: r.id,
    studentId: r.student_id,
    reportSection: r.report_section as ReportSectionId,
    sourceKind: r.source_kind as EvidenceSourceKind,
    sourceId: r.source_id,
    sourceLabel: r.source_label,
    note: r.note,
    createdAt: r.created_at,
  };
}

/** List all evidence links for a student the caller can view. */
export const listEvidenceForStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ student_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("report_evidence_links")
      .select(
        "id,student_id,report_section,source_kind,source_id,source_label,note,created_at",
      )
      .eq("student_id", data.student_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { links: (rows ?? []).map((r) => toDomain(r as DbRow)) };
  });

/** Attach a new evidence link. Caller must be able to edit the student. */
export const attachEvidenceLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        report_section: z.enum(REPORT_SECTIONS as [ReportSectionId, ...ReportSectionId[]]),
        source_kind: z.enum(SOURCE_KINDS),
        source_id: z.string().uuid().optional().nullable(),
        source_label: z.string().min(1).max(200),
        note: z.string().max(1000).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("report_evidence_links")
      .insert({
        student_id: data.student_id,
        report_section: data.report_section,
        source_kind: data.source_kind,
        source_id: data.source_id ?? null,
        source_label: data.source_label,
        note: data.note ?? null,
        created_by: context.userId,
      })
      .select(
        "id,student_id,report_section,source_kind,source_id,source_label,note,created_at",
      )
      .single();
    if (error) throw error;
    return { link: toDomain(row as DbRow) };
  });

/** Remove an evidence link. Caller must be able to edit the student. */
export const detachEvidenceLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("report_evidence_links")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
