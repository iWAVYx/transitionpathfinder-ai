import { z } from "zod";
import { audiencesForRoles } from "@/lib/role-policy";
import { personalActionDestination, type PersonalActionRole } from "./personal-action-destination";
import { readOrganizationPages } from "@/lib/organization-query-pages";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { NextAction, NextActionStatus, NextActionUrgency, ActivityEvent } from "./types";
interface DbAction {
  id: string;
  kind: string;
  title: string;
  reason: string | null;
  cta_label: string | null;
  cta_route: string | null;
  secondary_label: string | null;
  secondary_route: string | null;
  status: NextActionStatus;
  priority: number;
  due_at: string | null;
  blocked_reason: string | null;
  owner_role: string | null;
  student_id: string | null;
  organization_id: string | null;
  related_document_id: string | null;
  related_report_id: string | null;
  related_meeting_id: string | null;
  related_opportunity_id: string | null;
  completed_at: string | null;
  updated_at: string | null;
}

function toDomain(row: DbAction): NextAction {
  const now = Date.now();
  const due = row.due_at ? new Date(row.due_at).getTime() : null;
  let urgency: NextActionUrgency = "normal";
  let dueLabel: string | undefined;
  let status: NextActionStatus = row.status;
  if (due != null && Number.isFinite(due)) {
    const days = Math.round((due - now) / 86_400_000);
    if (days < 0) {
      urgency = "overdue";
      dueLabel = `Overdue By ${Math.abs(days)}d`;
      if (status !== "completed" && status !== "dismissed") status = "overdue";
    } else if (days <= 7) {
      urgency = "due_soon";
      dueLabel = days === 0 ? "Due Today" : `Due In ${days}d`;
      if (status === "not_started") status = "due_soon";
    } else if (days > 30) {
      urgency = "later";
      dueLabel = `Due In ${days}d`;
    } else {
      dueLabel = `Due In ${days}d`;
    }
  }
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    reason: row.reason ?? "",
    ownerLabel: row.owner_role ? formatRole(row.owner_role) : "You",
    ctaLabel: row.cta_label ?? "Open",
    ctaRoute: row.cta_route ?? "/dashboard",
    secondaryLabel: row.secondary_label ?? undefined,
    secondaryRoute: row.secondary_route ?? undefined,
    status,
    urgency,
    dueLabel,
    blockedReason: row.blocked_reason ?? undefined,
    priority: row.priority,
    studentId: row.student_id ?? undefined,
    organizationId: row.organization_id ?? undefined,
    relatedDocumentId: row.related_document_id ?? undefined,
    relatedReportId: row.related_report_id ?? undefined,
    relatedMeetingId: row.related_meeting_id ?? undefined,
    relatedOpportunityId: row.related_opportunity_id ?? undefined,
    completedAt: row.completed_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

/**
 * Fetch active + recently completed next actions for the current user.
 * Also merges supported derived actions from live state (draft reports and
 * upcoming meetings) so users see something useful even
 * before any next-action rows have been inserted.
 */
export const getNextActionsForMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        role: z.enum(["student", "family", "educator", "partner"]).optional(),
        student_id: z.string().uuid().optional(),
      })
      .optional()
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const roles = await readOrganizationPages<{ role: string }>((from, to) =>
      supabase
        .from("user_roles")
        .select("id,role", { count: "exact" })
        .eq("user_id", userId)
        .order("id")
        .range(from, to),
    );
    const audiences = audiencesForRoles(roles.map((row) => row.role));
    // Owner is a management workspace, including accounts with secondary roles.
    if (audiences.has("admin")) return { active: [], recentlyCompleted: [], viewer_id: userId };
    const requested = data?.role;
    if (requested && !audiences.has(requested))
      throw new Error("This action workspace is not available for your role.");
    const role: PersonalActionRole | undefined =
      requested ??
      (["educator", "family", "student", "partner"] as const).find((value) => audiences.has(value));
    if (!role) return { active: [], recentlyCompleted: [], viewer_id: userId };

    const studentId = data?.student_id;
    if (studentId) {
      const students = await readOrganizationPages<{ id: string }>((from, to) =>
        supabase
          .from("students")
          .select("id", { count: "exact" })
          .eq("id", studentId)
          .order("id")
          .range(from, to),
      );
      if (!students.some((student) => student.id === studentId))
        throw new Error("This student is unavailable. Choose an accessible student and try again.");
    }

    const [rows, derived] = await Promise.all([
      readOrganizationPages<DbAction>((from, to) => {
        let query = supabase
          .from("next_actions")
          .select(
            "id,kind,title,reason,cta_label,cta_route,secondary_label,secondary_route,status,priority,due_at,blocked_reason,owner_role,student_id,organization_id,related_document_id,related_report_id,related_meeting_id,related_opportunity_id,completed_at,updated_at",
            { count: "exact" },
          )
          .eq("owner_user_id", userId);
        if (studentId) query = query.or(`student_id.eq.${studentId},student_id.is.null`);
        return query.order("updated_at", { ascending: false }).order("id").range(from, to) as any;
      }),
      deriveActionsFromState(supabase, role, studentId),
    ]);

    const storedRows = rows
      .filter(
        (row) =>
          !row.owner_role ||
          row.owner_role === role ||
          audiencesForRoles([row.owner_role]).has(role),
      )
      .map(toDomain);
    const eligible = (action: NextAction): NextAction[] => {
      const ctaRoute = personalActionDestination(role, action.ctaRoute);
      if (!ctaRoute) return [];
      const secondaryRoute = personalActionDestination(role, action.secondaryRoute);
      return [
        {
          ...action,
          ctaRoute,
          secondaryRoute,
          secondaryLabel: secondaryRoute ? action.secondaryLabel : undefined,
        },
      ];
    };
    const stored = storedRows.flatMap(eligible);
    // Only an active action for the exact same related record can replace a
    // suggestion. A completed older report must not hide a newer draft.
    const identity = (action: NextAction) => {
      const record =
        action.relatedReportId ??
        action.relatedMeetingId ??
        action.relatedDocumentId ??
        action.relatedOpportunityId;
      return record
        ? JSON.stringify([action.kind, action.studentId, action.organizationId, record])
        : action.id;
    };
    const seen = new Set(
      stored.filter((a) => a.status !== "completed" && a.status !== "dismissed").map(identity),
    );
    const combined = [
      ...stored,
      ...derived.filter((action) => !seen.has(identity(action))),
    ].flatMap(eligible);

    const active = combined.filter((a) => a.status !== "completed" && a.status !== "dismissed");
    const recentlyCompleted = combined.filter((a) => a.status === "completed").slice(0, 3);

    return { active, recentlyCompleted, viewer_id: userId };
  });

/**
 * Caller-visible derivation pass — reads complete counted source lists and
 * emits synthetic Next Actions for the authenticated personal role. Never writes to the DB.
 * Unsupported invitation and evidence-attachment suggestions are intentionally omitted.
 */
async function deriveActionsFromState(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  role: PersonalActionRole,
  studentId?: string,
): Promise<NextAction[]> {
  const out: NextAction[] = [];

  if (role === "partner") return out;

  // Draft pathway reports
  const reports = await readOrganizationPages<any>((from, to) => {
    let query = supabase
      .from("pathway_reports")
      .select("id,student_id,status,updated_at", { count: "exact" })
      .in("status", ["draft", "needs_review"]);
    if (studentId) query = query.eq("student_id", studentId);
    return query.order("id").range(from, to);
  });
  for (const r of reports ?? []) {
    out.push({
      id: `derived:report:${r.id}`,
      kind: "review_report",
      title: "Review Draft Pathway Report",
      reason: "A visible draft report is available to review.",
      ownerLabel: "You",
      ctaLabel: "Open Report",
      ctaRoute: `/reports/${r.id}`,
      status: "needs_review",
      urgency: "normal",
      priority: 12,
      studentId: r.student_id ?? undefined,
      relatedReportId: r.id,
    });
  }

  // General invitations require their emailed secure token; Family's inbox
  // handles collaborator invites instead. Do not invent a token or inbox CTA.
  if (role === "student") return out;

  // Upcoming meetings in next 14 days
  const in14 = new Date(Date.now() + 14 * 86_400_000).toISOString();
  const now = new Date().toISOString();
  const meetings = await readOrganizationPages<any>((from, to) => {
    let query = supabase
      .from("meetings")
      .select("id,title,scheduled_at,student_id", { count: "exact" })
      .gte("scheduled_at", now)
      .lte("scheduled_at", in14);
    if (studentId) query = query.eq("student_id", studentId);
    return query.order("scheduled_at", { ascending: true }).order("id").range(from, to);
  });
  for (const m of meetings ?? []) {
    out.push({
      id: `derived:meeting:${m.id}`,
      kind: "prepare_meeting",
      title: `Prepare For ${m.title ?? "Upcoming Meeting"}`,
      reason: "Confirm attendance and review the agenda before the meeting.",
      ownerLabel: "You",
      ctaLabel: "Open Meeting",
      ctaRoute: `/meetings/${m.id}`,
      status: "needs_review",
      urgency:
        new Date(m.scheduled_at).getTime() - Date.now() <= 7 * 86_400_000 ? "due_soon" : "normal",
      priority: 15,
      studentId: m.student_id ?? undefined,
      relatedMeetingId: m.id,
    });
  }

  // Evidence attachment controls are not mounted in a live tool yet. A
  // reports-list link cannot promise that workflow, so emit no gap task here.
  return out;
}
/**
 * Mark a stored next action as complete. Also emits an activity_history row.
 */
export const completeNextAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string; note?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("next_actions")
      .select("id,title,cta_route,student_id,organization_id,owner_role,related_document_id,related_report_id,related_meeting_id,related_opportunity_id,completed_at")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Action not found");
    if (row.completed_at) return { ok: true, alreadyCompleted: true };

    const { error } = await supabase
      .from("next_actions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        completed_by: userId,
        completion_note: data.note ?? null,
      })
      .eq("id", data.id);
    if (error) throw error;

    // Best-effort activity log
    await supabase.from("activity_history").insert({
      actor_user_id: userId,
      actor_role: row.owner_role,
      student_id: row.student_id,
      organization_id: row.organization_id,
      event_type: "step_completed",
      subject_title: row.title,
      subject_route: row.cta_route,
      related_document_id: row.related_document_id,
      related_report_id: row.related_report_id,
      related_meeting_id: row.related_meeting_id,
      related_opportunity_id: row.related_opportunity_id,
      related_action_id: row.id,
      metadata: data.note ? { note: data.note } : {},
    });

    return { ok: true };
  });

export const dismissNextAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("next_actions")
      .update({ status: "dismissed" })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Recent activity history visible to the current user. */
export const listMyActivityHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActivityEvent[]> => {
    const { supabase } = context;
    const { data } = await supabase
      .from("activity_history")
      .select("id,event_type,actor_role,subject_title,subject_route,occurred_at,metadata")
      .order("occurred_at", { ascending: false })
      .limit(50);
    return (data ?? []).map((e) => ({
      id: e.id,
      eventType: e.event_type,
      actorLabel: e.actor_role ? formatRole(e.actor_role) : "System",
      subjectTitle: e.subject_title,
      subjectRoute: e.subject_route ?? undefined,
      occurredAt: e.occurred_at,
      note:
        e.metadata && typeof e.metadata === "object" && !Array.isArray(e.metadata)
          ? ((e.metadata as Record<string, unknown>).note as string | undefined)
          : undefined,
    }));
  });
