/**
 * Jurisdiction configuration — client-safe.
 *
 * State-specific language, planning rules, and agency references live in
 * versioned packs in the database (`jurisdiction_versions`). This module
 * holds the shape of a pack plus the Connecticut baseline, used as a
 * synchronous fallback so UI never renders empty labels while the active
 * pack loads.
 *
 * Connecticut is the only active jurisdiction. Nothing here is a public
 * claim of multi-state support.
 */

export const DEFAULT_JURISDICTION = "US-CT";

export interface JurisdictionTerminology {
  /** Short name of the planning meeting, e.g. "PPT". */
  plan_meeting: string;
  plan_meeting_long: string;
  /** Short name of the plan document, e.g. "IEP". */
  plan_document: string;
  transition_plan_section: string;
  rights_transfer_age: number;
  transition_planning_start_age: number;
  services_end_age: number;
  vr_agency_short: string;
}

export interface JurisdictionPlanningRules {
  transition_assessment_required: boolean;
  annual_review_months: number;
  reevaluation_years: number;
  invite_student_from_age: number;
  agency_invite_requires_consent: boolean;
  summary_of_performance_required_at_exit: boolean;
}

export interface JurisdictionAgency {
  name: string;
  kind: string;
  url: string | null;
  description: string | null;
}

export interface JurisdictionSource {
  title: string;
  url: string;
  publisher: string | null;
  last_verified_at: string | null;
}

export interface JurisdictionPack {
  code: string;
  name: string;
  version: number;
  effectiveFrom: string;
  reviewDue: string | null;
  terminology: JurisdictionTerminology;
  planningRules: JurisdictionPlanningRules;
  roleLabels: Record<string, string>;
  privacyRequirements: Record<string, string | number | boolean | null>;
  agencies: JurisdictionAgency[];
  sources: JurisdictionSource[];
}

/** Connecticut baseline — mirrors jurisdiction version US-CT v1. */
export const CT_PACK: JurisdictionPack = {
  code: "US-CT",
  name: "Connecticut",
  version: 1,
  effectiveFrom: "2026-07-01",
  reviewDue: "2027-07-01",
  terminology: {
    plan_meeting: "PPT",
    plan_meeting_long: "Planning and Placement Team meeting",
    plan_document: "IEP",
    transition_plan_section: "Secondary Transition Plan",
    rights_transfer_age: 18,
    transition_planning_start_age: 14,
    services_end_age: 22,
    vr_agency_short: "BRS",
  },
  planningRules: {
    transition_assessment_required: true,
    annual_review_months: 12,
    reevaluation_years: 3,
    invite_student_from_age: 14,
    agency_invite_requires_consent: true,
    summary_of_performance_required_at_exit: true,
  },
  roleLabels: {
    case_manager: "Case Manager",
    transition_coordinator: "Transition Coordinator",
    counselor: "School Counselor",
    district_admin: "District Administrator",
    school_admin: "School Administrator",
  },
  privacyRequirements: {
    student_records_law: "FERPA",
    state_supplement: "CT General Statutes Sec. 10-76",
    parent_consent_required_for_agency_referral: true,
    record_retention_after_exit_years: 6,
  },
  agencies: [],
  sources: [],
};

/** Looks up a term with a safe fallback to the Connecticut baseline. */
export function term<K extends keyof JurisdictionTerminology>(
  pack: JurisdictionPack | null | undefined,
  key: K,
): JurisdictionTerminology[K] {
  return pack?.terminology?.[key] ?? CT_PACK.terminology[key];
}

/** Looks up a planning rule with a safe fallback. */
export function rule<K extends keyof JurisdictionPlanningRules>(
  pack: JurisdictionPack | null | undefined,
  key: K,
): JurisdictionPlanningRules[K] {
  return pack?.planningRules?.[key] ?? CT_PACK.planningRules[key];
}

/** Role label for the jurisdiction, falling back to the baseline. */
export function roleLabel(
  pack: JurisdictionPack | null | undefined,
  key: string,
): string {
  return pack?.roleLabels?.[key] ?? CT_PACK.roleLabels[key] ?? key;
}
