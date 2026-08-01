/**
 * Client-safe billing catalog. Price ids are the human-readable Stripe
 * lookup keys, stable across test and live.
 */

/** Free trial length applied to every recurring plan at checkout. */
export const TRIAL_PERIOD_DAYS = 30;

export type PlanKey = "family" | "educator" | "school" | "partner_premium";

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  /** True when the plan is bought by one person, not by an organization. */
  personal: boolean;
  monthlyPriceId: string;
  yearlyPriceId: string;
  /** Entitlement plan_type written by the payment webhook. */
  entitlementPlanType: string;
}

export const PLANS: Record<PlanKey, PlanDefinition> = {
  family: {
    key: "family",
    name: "Family",
    personal: true,
    monthlyPriceId: "tf_family_monthly",
    yearlyPriceId: "tf_family_yearly",
    entitlementPlanType: "family_early_access",
  },
  educator: {
    key: "educator",
    name: "Educator",
    personal: true,
    monthlyPriceId: "tf_educator_monthly",
    yearlyPriceId: "tf_educator_yearly",
    entitlementPlanType: "educator_individual",
  },
  school: {
    key: "school",
    name: "School & District",
    personal: false,
    monthlyPriceId: "tf_school_monthly",
    yearlyPriceId: "tf_school_yearly",
    entitlementPlanType: "school_plan",
  },
  partner_premium: {
    key: "partner_premium",
    name: "Partner Premium",
    personal: false,
    monthlyPriceId: "tf_partner_premium_monthly",
    yearlyPriceId: "tf_partner_premium_yearly",
    entitlementPlanType: "partner_featured",
  },
};

/** Plans billed per seat — admins can adjust the quantity after purchase. */
export const SEAT_BASED_PRICE_IDS: readonly string[] = [
  PLANS.school.monthlyPriceId,
  PLANS.school.yearlyPriceId,
];

/** Upper bound offered in the seat editor (matches the Stripe price max). */
export const MAX_SEATS = 100;

/** True when a price id is sold by the seat. */
export function isSeatBasedPrice(priceId: string | null): boolean {
  return priceId != null && SEAT_BASED_PRICE_IDS.includes(priceId);
}

/** Resolves a price lookup key back to its plan definition. */
export function planForPriceId(priceId: string | null): PlanDefinition | null {
  if (!priceId) return null;
  return (
    Object.values(PLANS).find(
      (plan) =>
        plan.monthlyPriceId === priceId || plan.yearlyPriceId === priceId,
    ) ?? null
  );
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
