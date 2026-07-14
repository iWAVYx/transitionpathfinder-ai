/**
 * Shared types for the Next Action system used across every signed-in
 * dashboard, admin hub, and demo/workspace preview.
 */

export type NextActionStatus =
  | "not_started"
  | "in_progress"
  | "waiting"
  | "needs_review"
  | "due_soon"
  | "overdue"
  | "completed"
  | "dismissed";

export type NextActionUrgency = "overdue" | "due_soon" | "normal" | "later";

export type NextActionRole =
  | "student"
  | "family"
  | "educator"
  | "school_admin"
  | "district_admin"
  | "partner"
  | "admin";

export interface NextAction {
  id: string;
  kind: string;
  title: string;
  reason: string;
  ownerLabel: string;
  ctaLabel: string;
  ctaRoute: string;
  secondaryLabel?: string;
  secondaryRoute?: string;
  status: NextActionStatus;
  urgency: NextActionUrgency;
  dueLabel?: string;
  blockedReason?: string;
  priority: number;
  studentId?: string;
  organizationId?: string;
  relatedDocumentId?: string;
  relatedReportId?: string;
  relatedMeetingId?: string;
  relatedOpportunityId?: string;
  completedAt?: string;
  updatedAt?: string;
}

export interface ActivityEvent {
  id: string;
  eventType: string;
  actorLabel: string;
  subjectTitle: string;
  subjectRoute?: string;
  occurredAt: string;
  note?: string;
}

/**
 * Priority weights used to sort a list of next actions.
 * Lower priority number = shown higher.
 */
export const URGENCY_WEIGHT: Record<NextActionUrgency, number> = {
  overdue: 0,
  due_soon: 10,
  normal: 30,
  later: 60,
};

export const STATUS_WEIGHT: Record<NextActionStatus, number> = {
  overdue: 0,
  due_soon: 5,
  waiting: 12,
  needs_review: 15,
  in_progress: 20,
  not_started: 25,
  completed: 90,
  dismissed: 95,
};

export function sortNextActions<T extends NextAction>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const sa = STATUS_WEIGHT[a.status] ?? 50;
    const sb = STATUS_WEIGHT[b.status] ?? 50;
    if (sa !== sb) return sa - sb;
    const ua = URGENCY_WEIGHT[a.urgency] ?? 40;
    const ub = URGENCY_WEIGHT[b.urgency] ?? 40;
    if (ua !== ub) return ua - ub;
    return (a.priority ?? 50) - (b.priority ?? 50);
  });
}

export function isActive(a: NextAction): boolean {
  return a.status !== "completed" && a.status !== "dismissed";
}
