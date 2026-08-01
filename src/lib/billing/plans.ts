/**
 * Client-safe billing catalog.
 *
 * Price ids are the human-readable Stripe lookup keys, stable across test
 * and live. Capacity numbers mirror `public.plan_capacities` — the database
 * is authoritative at allocation time; this copy exists so pricing and
 * console UI can render without a round trip.
 */

/** Free trial length applied to recurring individual plans at checkout. */
export const TRIAL_PERIOD_DAYS = 30;

/** The three capacity types a plan can grant. */
export type LicenseType = "pathway" | "staff" | "admin";

export type PlanKey =
  | "pathway_snapshot"
  | "individual_pathway"
  | "educator_solo"
  | "school_core"
  | "school_plus"
  | "founding_pilot"
  | "district_starter"
  | "district_growth"
  | "district_enterprise"
  | "student_addon"
  | "staff_addon"
  | "partner_premium";

export interface PlanCapacity {
  /** Active Student Pathway Licenses included. */
  pathwayLicenses: number;
  /** Educator / counselor staff seats included. */
  staffSeats: number;
  /** Administrative seats included. */
  adminSeats: number;
  /** Schools a district plan may cover. */
  maxSchools: number | null;
  /** Connected parent/guardian accounts covered by one pathway license. */
  familyAccountsPerPathway: number;
}

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  blurb: string;
  /** True when one person buys it for themselves, not an organization. */
  personal: boolean;
  /** Which organization kind may buy it, when it is an org plan. */
  orgKind: "school" | "district" | "partner" | null;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
  oneTimePriceId: string | null;
  monthlyAmount: string | null;
  yearlyAmount: string | null;
  /** Fixed term in months, when the plan is not an open-ended subscription. */
  termMonths: number | null;
  /** False for the Founding Pilot — it never rolls into a paid plan. */
  autoConvert: boolean;
  /** True for District Enterprise — quote and invoice, no self-serve price. */
  salesAssisted: boolean;
  /** True for capacity packs bought on top of a base plan. */
  isAddon: boolean;
  capacity: PlanCapacity;
}

function capacity(
  pathwayLicenses: number,
  staffSeats: number,
  adminSeats: number,
  maxSchools: number | null = null,
): PlanCapacity {
  return {
    pathwayLicenses,
    staffSeats,
    adminSeats,
    maxSchools,
    familyAccountsPerPathway: 3,
  };
}

export const PLANS: Record<PlanKey, PlanDefinition> = {
  pathway_snapshot: {
    key: "pathway_snapshot",
    name: "Pathway Snapshot",
    blurb:
      "A one-time pathway report for one student. Point in time, with no ongoing updates or collaboration.",
    personal: true,
    orgKind: null,
    monthlyPriceId: null,
    yearlyPriceId: null,
    oneTimePriceId: "tf_snapshot_once",
    monthlyAmount: null,
    yearlyAmount: "$79",
    termMonths: null,
    autoConvert: false,
    salesAssisted: false,
    isAddon: false,
    capacity: capacity(1, 0, 0),
  },
  individual_pathway: {
    key: "individual_pathway",
    name: "Individual Pathway",
    blurb:
      "One student pathway with up to three connected family accounts.",
    personal: true,
    orgKind: null,
    monthlyPriceId: "tf_family_monthly",
    yearlyPriceId: "tf_family_yearly",
    oneTimePriceId: null,
    monthlyAmount: "$19",
    yearlyAmount: "$190",
    termMonths: null,
    autoConvert: true,
    salesAssisted: false,
    isAddon: false,
    capacity: capacity(1, 0, 0),
  },
  educator_solo: {
    key: "educator_solo",
    name: "Educator Solo",
    blurb: "One educator with up to five independent student pathways.",
    personal: true,
    orgKind: null,
    monthlyPriceId: "tf_educator_monthly",
    yearlyPriceId: "tf_educator_yearly",
    oneTimePriceId: null,
    monthlyAmount: "$39",
    yearlyAmount: "$390",
    termMonths: null,
    autoConvert: true,
    salesAssisted: false,
    isAddon: false,
    capacity: capacity(5, 1, 0),
  },
  school_core: {
    key: "school_core",
    name: "School Core",
    blurb: "30 student pathways, 8 staff seats, 2 school administrators.",
    personal: false,
    orgKind: "school",
    monthlyPriceId: null,
    yearlyPriceId: "tf_school_yearly",
    oneTimePriceId: null,
    monthlyAmount: null,
    yearlyAmount: "$4,800",
    termMonths: 12,
    autoConvert: true,
    salesAssisted: false,
    isAddon: false,
    capacity: capacity(30, 8, 2, 1),
  },
  school_plus: {
    key: "school_plus",
    name: "School Plus",
    blurb: "50 student pathways, 15 staff seats, 3 school administrators.",
    personal: false,
    orgKind: "school",
    monthlyPriceId: null,
    yearlyPriceId: "tf_school_plus_yearly",
    oneTimePriceId: null,
    monthlyAmount: null,
    yearlyAmount: "$6,500",
    termMonths: 12,
    autoConvert: true,
    salesAssisted: false,
    isAddon: false,
    capacity: capacity(50, 15, 3, 1),
  },
  founding_pilot: {
    key: "founding_pilot",
    name: "Founding School Pilot",
    blurb:
      "Six months with 20 pathways and 6 staff seats. No automatic conversion.",
    personal: false,
    orgKind: "school",
    monthlyPriceId: null,
    yearlyPriceId: null,
    oneTimePriceId: "tf_founding_pilot_once",
    monthlyAmount: null,
    yearlyAmount: "$2,500",
    termMonths: 6,
    autoConvert: false,
    salesAssisted: false,
    isAddon: false,
    capacity: capacity(20, 6, 1, 1),
  },
  district_starter: {
    key: "district_starter",
    name: "District Starter",
    blurb: "Up to 3 schools, 150 pathways, 35 staff seats.",
    personal: false,
    orgKind: "district",
    monthlyPriceId: null,
    yearlyPriceId: "tf_district_starter_yearly",
    oneTimePriceId: null,
    monthlyAmount: null,
    yearlyAmount: "$18,000",
    termMonths: 12,
    autoConvert: true,
    salesAssisted: false,
    isAddon: false,
    capacity: capacity(150, 35, 5, 3),
  },
  district_growth: {
    key: "district_growth",
    name: "District Growth",
    blurb: "Up to 8 schools, 400 pathways, 90 staff seats.",
    personal: false,
    orgKind: "district",
    monthlyPriceId: null,
    yearlyPriceId: "tf_district_growth_yearly",
    oneTimePriceId: null,
    monthlyAmount: null,
    yearlyAmount: "$32,000",
    termMonths: 12,
    autoConvert: true,
    salesAssisted: false,
    isAddon: false,
    capacity: capacity(400, 90, 10, 8),
  },
  district_enterprise: {
    key: "district_enterprise",
    name: "District Enterprise",
    blurb: "Custom contract sized to the district.",
    personal: false,
    orgKind: "district",
    monthlyPriceId: null,
    yearlyPriceId: null,
    oneTimePriceId: null,
    monthlyAmount: null,
    yearlyAmount: "Custom",
    termMonths: 12,
    autoConvert: false,
    salesAssisted: true,
    isAddon: false,
    capacity: capacity(0, 0, 0, null),
  },
  student_addon: {
    key: "student_addon",
    name: "Student Pathway Add-On",
    blurb: "Pack of 10 additional active student pathway licenses.",
    personal: false,
    orgKind: null,
    monthlyPriceId: null,
    yearlyPriceId: "tf_student_addon_yearly",
    oneTimePriceId: null,
    monthlyAmount: null,
    yearlyAmount: "$900",
    termMonths: 12,
    autoConvert: true,
    salesAssisted: false,
    isAddon: true,
    capacity: capacity(10, 0, 0),
  },
  staff_addon: {
    key: "staff_addon",
    name: "Staff Seat Add-On",
    blurb: "Pack of 5 additional educator or counselor staff seats.",
    personal: false,
    orgKind: null,
    monthlyPriceId: null,
    yearlyPriceId: "tf_staff_addon_yearly",
    oneTimePriceId: null,
    monthlyAmount: null,
    yearlyAmount: "$500",
    termMonths: 12,
    autoConvert: true,
    salesAssisted: false,
    isAddon: true,
    capacity: capacity(0, 5, 0),
  },
  partner_premium: {
    key: "partner_premium",
    name: "Partner Premium",
    blurb:
      "Unlimited opportunity listings, analytics, and featured placement.",
    personal: false,
    orgKind: "partner",
    monthlyPriceId: "tf_partner_premium_monthly",
    yearlyPriceId: "tf_partner_premium_yearly",
    oneTimePriceId: null,
    monthlyAmount: "$99",
    yearlyAmount: "$990",
    termMonths: null,
    autoConvert: true,
    salesAssisted: false,
    isAddon: false,
    capacity: capacity(0, 0, 0),
  },
};

/** Every price lookup key the catalog can sell, mapped to its plan. */
export const PRICE_TO_PLAN: Record<string, PlanKey> = Object.values(
  PLANS,
).reduce<Record<string, PlanKey>>((acc, plan) => {
  for (const id of [
    plan.monthlyPriceId,
    plan.yearlyPriceId,
    plan.oneTimePriceId,
  ]) {
    if (id) acc[id] = plan.key;
  }
  return acc;
}, {});

/** Resolves a price lookup key back to its plan definition. */
export function planForPriceId(priceId: string | null): PlanDefinition | null {
  if (!priceId) return null;
  const key = PRICE_TO_PLAN[priceId];
  return key ? PLANS[key] : null;
}

/**
 * Add-on packs are the only prices sold by quantity — an admin buys N packs.
 * Base school and district plans carry fixed capacity instead.
 */
export const QUANTITY_BASED_PRICE_IDS: readonly string[] = Object.values(PLANS)
  .filter((p) => p.isAddon)
  .map((p) => p.yearlyPriceId)
  .filter((id): id is string => id != null);

/** Upper bound offered in the pack stepper (matches the Stripe price max). */
export const MAX_SEATS = 50;

/** True when a price id is sold by quantity (add-on packs). */
export function isSeatBasedPrice(priceId: string | null): boolean {
  return priceId != null && QUANTITY_BASED_PRICE_IDS.includes(priceId);
}

/** Capacity a plan grants, multiplied by the purchased quantity. */
export function capacityForPurchase(
  priceId: string | null,
  quantity: number,
): PlanCapacity | null {
  const plan = planForPriceId(priceId);
  if (!plan) return null;
  const q = Math.max(1, quantity);
  return {
    pathwayLicenses: plan.capacity.pathwayLicenses * q,
    staffSeats: plan.capacity.staffSeats * q,
    adminSeats: plan.capacity.adminSeats * q,
    maxSchools: plan.capacity.maxSchools,
    familyAccountsPerPathway: plan.capacity.familyAccountsPerPathway,
  };
}

/** Utilization thresholds that trigger an in-console alert. */
export const UTILIZATION_ALERTS = [0.8, 0.9, 1] as const;

/** Alert band for a utilization ratio, or null when below 80%. */
export function utilizationBand(ratio: number): 80 | 90 | 100 | null {
  if (ratio >= 1) return 100;
  if (ratio >= 0.9) return 90;
  if (ratio >= 0.8) return 80;
  return null;
}

/** Human label for a Stripe subscription status. */
export function subscriptionStatusLabel(status: string): string {
  switch (status) {
    case "trialing":
      return "Free trial";
    case "active":
      return "Active";
    case "past_due":
      return "Payment failed";
    case "canceled":
      return "Canceled";
    case "paused":
      return "Paused";
    case "incomplete":
    case "incomplete_expired":
      return "Incomplete";
    default:
      return status;
  }
}

/** Human label for a license type. */
export function licenseTypeLabel(type: LicenseType): string {
  switch (type) {
    case "pathway":
      return "Student pathways";
    case "staff":
      return "Staff seats";
    case "admin":
      return "Administrator seats";
  }
}

/**
 * True when the plan is a one-time purchase that buys a point-in-time
 * report only. Snapshot buyers keep the report they paid for; ongoing
 * monitoring, updates, and collaboration require a membership.
 */
export function isSnapshotPlan(key: PlanKey | null | undefined): boolean {
  return key === "pathway_snapshot";
}

/**
 * Entitlement plan type stored on `access_entitlements` for a catalog plan.
 * Snapshot is deliberately distinct so gating can grant the report without
 * the continuing-access features.
 */
export function entitlementPlanTypeFor(key: PlanKey): string | null {
  switch (key) {
    case "pathway_snapshot":
      return "pathway_snapshot";
    case "individual_pathway":
      return "family_early_access";
    case "educator_solo":
      return "educator_individual";
    case "partner_premium":
      return "partner_featured";
    case "student_addon":
    case "staff_addon":
      return null;
    default:
      return "school_plan";
  }
}
