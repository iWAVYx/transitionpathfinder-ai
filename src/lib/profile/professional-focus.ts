// Workstream 7 — Counselor within Educator role.
//
// `professional_focus` is a DESCRIPTIVE label on a profile. It never
// widens or narrows what a user can see or do — capabilities and
// assignments (organization membership, student relationships,
// evidence permission_scope) drive access. This module is the single
// source of truth for the allowed labels and their human copy so that
// UI, seed data, and tests never drift from the DB check constraint
// declared in migration 20260720-150915.

export const PROFESSIONAL_FOCUS_VALUES = [
  "special_education_teacher",
  "case_manager",
  "school_counselor",
  "transition_coordinator",
  "related_service_professional",
  "other_authorized_staff",
] as const;

export type ProfessionalFocus = (typeof PROFESSIONAL_FOCUS_VALUES)[number];

export const PROFESSIONAL_FOCUS_LABELS: Record<ProfessionalFocus, string> = {
  special_education_teacher: "Special Education Teacher",
  case_manager: "Case Manager",
  school_counselor: "School Counselor",
  transition_coordinator: "Transition Coordinator",
  related_service_professional: "Related Service Professional",
  other_authorized_staff: "Other Authorized Staff",
};

export const EDUCATOR_ROLE_LABEL = "Educator / Case Manager / Counselor";

export function isProfessionalFocus(value: unknown): value is ProfessionalFocus {
  return (
    typeof value === "string" &&
    (PROFESSIONAL_FOCUS_VALUES as readonly string[]).includes(value)
  );
}

export function professionalFocusLabel(value: unknown): string | null {
  return isProfessionalFocus(value) ? PROFESSIONAL_FOCUS_LABELS[value] : null;
}

/**
 * Guard: professional focus MUST NOT be consulted when deciding access.
 * This helper is intentionally trivial and exists so tests + call sites
 * can be grep-audited to prove the label is never used as a permission
 * check. If you find yourself writing `if (focus === 'school_counselor')`
 * to gate a capability, use org membership / evidence permission_scope
 * instead.
 */
export function focusIsDescriptiveOnly(): true {
  return true;
}
