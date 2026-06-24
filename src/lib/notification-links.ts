/**
 * Resolve an in-app deep link for a notification row.
 *
 * Used by the in-app NotificationsBell so each item navigates to the
 * relevant surface instead of being a dead-end. Returns null when no
 * confident target exists — the row stays clickable to mark-read only.
 */
export type NotificationLinkable = {
  notification_type: string;
  related_student_id: string | null;
  related_record_type: string | null;
  related_record_id: string | null;
};

export function resolveNotificationHref(n: NotificationLinkable): string | null {
  const type = (n.related_record_type ?? "").toLowerCase();
  const nType = (n.notification_type ?? "").toLowerCase();
  const id = n.related_record_id;
  const studentId = n.related_student_id;

  // Explicit record-typed deep links
  if (id) {
    if (type === "pathway_report" || type === "report") return `/reports/${id}`;
    if (type === "student") return `/students/${id}`;
    if (type === "document") return `/documents/${id}/review`;
    if (type === "meeting") return `/meetings/${id}`;
    if (type === "message" || type === "thread") return `/messages`;
    if (type === "goal") return `/goals`;
    if (type === "invitation") return `/invitations`;
  }

  // Notification-type fallbacks
  if (nType.includes("report") && studentId) return `/students/${studentId}`;
  if (nType.includes("report")) return `/reports`;
  if (nType.includes("message")) return `/messages`;
  if (nType.includes("meeting")) return `/meetings`;
  if (nType.includes("document")) return `/documents`;
  if (nType.includes("invitation") || nType.includes("invite")) return `/invitations`;
  if (studentId) return `/students/${studentId}`;

  return null;
}
