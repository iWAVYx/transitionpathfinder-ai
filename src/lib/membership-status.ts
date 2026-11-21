export type MembershipAccessStatus =
  | "active"
  | "pending"
  | "invited"
  | "inactive"
  | "suspended"
  | "removed"
  | "unknown";
export function membershipAccessStatus(status: unknown): MembershipAccessStatus {
  return typeof status === "string" &&
    ["active", "pending", "invited", "inactive", "suspended", "removed"].includes(status)
    ? (status as MembershipAccessStatus)
    : "unknown";
}
export function membershipStatusLabel(status: unknown) {
  const recorded = membershipAccessStatus(status);
  return recorded === "unknown"
    ? "Status Unavailable"
    : recorded.charAt(0).toUpperCase() + recorded.slice(1);
}
export function isPendingInvitation(status: unknown) {
  return status === "invited" || status === "pending";
}
