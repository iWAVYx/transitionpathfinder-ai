// Canonical opportunity status labels used across the partner experience.
// Maps the raw DB enum to Title Case display strings.
export type OpportunityStatusKey =
  | "draft"
  | "pending_review"
  | "approved"
  | "inactive";

export const OPPORTUNITY_STATUS_LABEL: Record<OpportunityStatusKey, string> = {
  draft: "Draft",
  pending_review: "In Review",
  approved: "Live",
  inactive: "Archived",
};

export function opportunityStatusLabel(status: string): string {
  return (
    OPPORTUNITY_STATUS_LABEL[status as OpportunityStatusKey] ??
    status.replace(/_/g, " ")
  );
}
