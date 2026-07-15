import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  NextAction,
  NextActionStatus,
  NextActionUrgency,
  ActivityEvent,
} from "./types";
import {
  REPORT_SECTIONS,
  REPORT_SECTION_LABELS,
} from "@/lib/report-evidence/types";

/** Report sections we most want covered by evidence before a report is defensible. */
const PRIORITY_EVIDENCE_SECTIONS: ReadonlyArray<
  (typeof REPORT_SECTIONS)[number]
> = ["snapshot", "student_voice", "family_priorities", "documents", "readiness"];

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
  if (due != null) {
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
 * Also merges derived actions from live state (draft reports, pending
 * meetings, unreviewed documents) so users see something useful even
 * before any next-action rows have been inserted.
 */
export const getNextActionsForMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: rows }, derived] = await Promise.all([
      supabase
        .from("next_actions")
        .select(
          "id,kind,title,reason,cta_label,cta_route,secondary_label,secondary_route,status,priority,due_at,blocked_reason,owner_role,student_id,organization_id,related_document_id,related_report_id,related_meeting_id,related_opportunity_id,completed_at,updated_at",
        )
        .or(`owner_user_id.eq.${userId}`)
        .order("updated_at", { ascending: false })
        .limit(50),
      deriveActionsFromState(supabase, userId),
    ]);

    const stored = (rows ?? []).map((r) => toDomain(r as DbAction));
    // Dedupe: prefer stored row over derived when they share (kind + student).
    const seen = new Set(stored.map((s) => `${s.kind}::${s.studentId ?? ""}`));
    const combined = [
      ...stored,
      ...derived.filter((d) => !seen.has(`${d.kind}::${d.studentId ?? ""}`)),
    ];

    const active = combined.filter((a) => a.status !== "completed" && a.status !== "dismissed");
    const recentlyCompleted = combined
      .filter((a) => a.status === "completed")
      .slice(0, 3);

    return { active, recentlyCompleted };
  });

/**
 * Cheap derivation pass — looks at a handful of user-scoped tables and
 * emits synthetic Next Actions. Never writes to the DB. All routes
 * point at real feature pages.
 */
async function deriveActionsFromState(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<NextAction[]> {
  const out: NextAction[] = [];

  // Draft pathway reports
  const { data: reports } = await supabase
    .from("pathway_reports")
    .select("id,student_id,status,updated_at")
    .in("status", ["draft", "needs_review"])
    .limit(5);
  for (const r of reports ?? []) {
    out.push({
      id: `derived:report:${r.id}`,
      kind: "review_report",
      title: "Review Draft Pathway Report",
      reason: "A draft report is waiting for review before it can be shared.",
      ownerLabel: "You",
      ctaLabel: "Open Report",
      ctaRoute: `/pathways/${r.id}`,
      status: "needs_review",
      urgency: "due_soon",
      priority: 12,
      studentId: r.student_id ?? undefined,
      relatedReportId: r.id,
    });
  }

  // Pending invitations to this user
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.email) {
    const { data: invites } = await supabase
      .from("invitations")
      .select("id,invitation_type")
      .eq("email", profile.email)
      .eq("status", "pending")
      .limit(3);
    for (const i of invites ?? []) {
      out.push({
        id: `derived:invite:${i.id}`,
        kind: "accept_invitation",
        title: "Accept Pending Invitation",
        reason: "Someone invited you to collaborate — accept to see their content.",
        ownerLabel: "You",
        ctaLabel: "Review Invitation",
        ctaRoute: `/family/invites`,
        status: "waiting",
        urgency: "due_soon",
        priority: 8,
      });
    }
  }

  // Upcoming meetings in next 14 days
  const in14 = new Date(Date.now() + 14 * 86_400_000).toISOString();
  const { data: meetings } = await supabase
    .from("meetings")
    .select("id,title,scheduled_at,student_id")
    .gte("scheduled_at", new Date().toISOString())
    .lte("scheduled_at", in14)
    .order("scheduled_at", { ascending: true })
    .limit(3);
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
      urgency: "due_soon",
      priority: 15,
      studentId: m.student_id ?? undefined,
      relatedMeetingId: m.id,
    });
  }

  return out;
}

/**
 * Mark a stored next action as complete. Also emits an activity_history row.
 */
export const completeNextAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; note?: string }) => input)
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
  .inputValidator((input: { id: string }) => input)
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
