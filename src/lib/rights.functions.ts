import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const RIGHTS_STATUS_VALUES = [
  "under_18_parent_rights_active",
  "approaching_transfer_of_rights",
  "rights_transferred_to_student",
  "student_shared_decision_making",
  "parent_guardian_authorized_by_student",
  "legal_representative_or_conservator",
  "unknown_needs_review",
] as const;

export type RightsStatus = (typeof RIGHTS_STATUS_VALUES)[number];

export const RIGHTS_STATUS_LABELS: Record<RightsStatus, string> = {
  under_18_parent_rights_active: "Under 18 — parent/guardian rights active",
  approaching_transfer_of_rights: "Approaching transfer of rights (age 17)",
  rights_transferred_to_student: "Rights transferred to student (18+)",
  student_shared_decision_making: "Student shared decision-making",
  parent_guardian_authorized_by_student: "Parent/guardian authorized by student",
  legal_representative_or_conservator: "Legal representative or conservator",
  unknown_needs_review: "Unknown — needs review",
};

export type RightsTransferRow = {
  id: string;
  student_id: string;
  current_status: RightsStatus;
  transfer_notice_date: string | null;
  student_authorized_parent_access: boolean;
  decision_making_notes: string | null;
  legal_representative_notes: string | null;
  reviewed_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export const getRightsStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ student_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: student, error: sErr } = await supabase
      .from("students")
      .select("id, rights_status, transfer_notice_acknowledged_at, date_of_birth, age")
      .eq("id", data.student_id)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!student) throw new Error("Student not found");

    const { data: history, error: hErr } = await supabase
      .from("rights_transfer_status")
      .select("*")
      .eq("student_id", data.student_id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (hErr) throw new Error(hErr.message);

    return {
      student: student as {
        id: string;
        rights_status: RightsStatus;
        transfer_notice_acknowledged_at: string | null;
        date_of_birth: string | null;
        age: number | null;
      },
      history: (history ?? []) as RightsTransferRow[],
      latest: ((history ?? [])[0] ?? null) as RightsTransferRow | null,
    };
  });

const SetSchema = z.object({
  student_id: z.string().uuid(),
  current_status: z.enum(RIGHTS_STATUS_VALUES),
  transfer_notice_date: z.string().nullable().optional(),
  student_authorized_parent_access: z.boolean().optional(),
  decision_making_notes: z.string().max(2000).nullable().optional(),
  legal_representative_notes: z.string().max(2000).nullable().optional(),
});

export const setRightsStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => SetSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Insert a new history row (RLS enforces can_edit_student).
    const { data: inserted, error: insErr } = await supabase
      .from("rights_transfer_status")
      .insert({
        student_id: data.student_id,
        current_status: data.current_status,
        transfer_notice_date: data.transfer_notice_date ?? null,
        student_authorized_parent_access: data.student_authorized_parent_access ?? false,
        decision_making_notes: data.decision_making_notes ?? null,
        legal_representative_notes: data.legal_representative_notes ?? null,
        reviewed_by_user_id: userId,
      })
      .select("*")
      .single();
    if (insErr) throw new Error(insErr.message);

    // 2. Mirror onto students.rights_status (and acknowledged_at when relevant).
    const acknowledged =
      data.current_status === "rights_transferred_to_student" ||
      data.current_status === "parent_guardian_authorized_by_student";
    const { error: updErr } = await supabase
      .from("students")
      .update({
        rights_status: data.current_status,
        ...(acknowledged
          ? { transfer_notice_acknowledged_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", data.student_id);
    if (updErr) throw new Error(updErr.message);

    // 2b. If student has authorized continued parent access (post-18) or rights
    // are explicitly held under student-authorized parent/guardian access, record
    // a team_sharing consent so the audit trail captures the basis.
    if (
      data.student_authorized_parent_access ||
      data.current_status === "parent_guardian_authorized_by_student"
    ) {
      try {
        await supabase.from("consent_records").insert({
          student_id: data.student_id,
          consenting_user_id: userId,
          consent_type: "team_sharing",
          consent_status: "granted",
          consent_text_snapshot:
            "Student authorizes continued parent/guardian access to transition planning records under TransitionForward's family access policy. This is a planning record, not legal advice — verify with district or counsel if uncertain.",
        });
      } catch (e) {
        console.warn("consent record write failed", e);
      }
    }


    // 3. If the student now controls their own records, auto-grant them
    // view_document on their own IEP / transition-plan documents.
    if (data.current_status === "rights_transferred_to_student") {
      try {
        const { data: studentRow } = await supabase
          .from("students")
          .select("student_user_id")
          .eq("id", data.student_id)
          .maybeSingle();
        const studentUserId = (studentRow as { student_user_id: string | null } | null)?.student_user_id;
        if (studentUserId) {
          const { data: docs } = await supabase
            .from("documents")
            .select("id")
            .eq("student_id", data.student_id)
            .in("doc_type", ["iep", "current-iep", "previous-iep", "transition-plan"]);
          for (const d of docs ?? []) {
            await supabase
              .from("document_permissions")
              .upsert(
                {
                  document_id: d.id,
                  student_id: data.student_id,
                  user_id: studentUserId,
                  permission_level: "view_document",
                  granted_by: userId,
                  notes: "Auto-granted on transfer of rights",
                },
                { onConflict: "document_id,user_id" },
              );
          }
        }
      } catch (e) {
        console.warn("auto-grant on transfer of rights failed", e);
      }
    }

    // 4. Best-effort audit log entry.
    try {
      await supabase.from("audit_log").insert({
        actor_id: userId,
        student_id: data.student_id,
        action: "rights_status.updated",
        entity_type: "student",
        entity_id: data.student_id,
        metadata: {
          status: data.current_status,
          authorized_parent_access: data.student_authorized_parent_access ?? false,
        },
      });
    } catch {
      // Audit log is non-critical to the operation.
    }

    return { row: inserted as RightsTransferRow };
  });
