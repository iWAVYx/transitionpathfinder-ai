import { PLANS, type PlanDefinition, type PlanKey } from "./plans.ts";

export type StripePriceInterval = "month" | "year" | null;

export interface StripeCatalogPriceSpec {
  lookupKey: string;
  planKey: PlanKey;
  productId: string;
  productName: string;
  description: string;
  currency: "usd";
  unitAmount: number;
  recurringInterval: StripePriceInterval;
  nickname: string;
}

export interface StripePriceShape {
  active?: boolean;
  currency?: string;
  livemode?: boolean;
  lookup_key?: string | null;
  metadata?: Record<string, string> | null;
  product?: string | { id?: string } | null;
  recurring?: { interval?: string; interval_count?: number } | null;
  type?: string;
  unit_amount?: number | null;
}

function usdAmountToCents(amount: string | null, label: string): number {
  if (!amount || !/^\$\d[\d,]*(?:\.\d{2})?$/.test(amount)) {
    throw new Error(`${label} must have a fixed USD amount; received ${String(amount)}.`);
  }

  const cents = Math.round(Number(amount.replace(/[$,]/g, "")) * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new Error(`${label} must resolve to a positive amount in cents.`);
  }
  return cents;
}

function productIdFor(plan: PlanDefinition): string {
  return `prod_tf_${plan.key}`;
}

function priceSpec(
  plan: PlanDefinition,
  lookupKey: string,
  amount: string | null,
  recurringInterval: StripePriceInterval,
): StripeCatalogPriceSpec {
  const cadence =
    recurringInterval === null ? "One Time" : recurringInterval === "month" ? "Monthly" : "Yearly";
  return {
    lookupKey,
    planKey: plan.key,
    productId: productIdFor(plan),
    productName: `TransitionForward ${plan.name}`,
    description: plan.blurb,
    currency: "usd",
    unitAmount: usdAmountToCents(amount, `${plan.name} ${cadence}`),
    recurringInterval,
    nickname: `${plan.name} - ${cadence}`,
  };
}

function buildStripePriceSpecs(): StripeCatalogPriceSpec[] {
  const specs: StripeCatalogPriceSpec[] = [];

  for (const plan of Object.values(PLANS)) {
    if (plan.monthlyPriceId) {
      specs.push(priceSpec(plan, plan.monthlyPriceId, plan.monthlyAmount, "month"));
    }
    if (plan.yearlyPriceId) {
      specs.push(priceSpec(plan, plan.yearlyPriceId, plan.yearlyAmount, "year"));
    }
    if (plan.oneTimePriceId) {
      specs.push(priceSpec(plan, plan.oneTimePriceId, plan.yearlyAmount, null));
    }
  }

  const lookupKeys = specs.map((spec) => spec.lookupKey);
  if (new Set(lookupKeys).size !== lookupKeys.length) {
    throw new Error("Stripe catalog lookup keys must be unique.");
  }

  return specs.sort((a, b) => a.lookupKey.localeCompare(b.lookupKey));
}

/** Machine-readable Stripe contract derived from the app's public catalog. */
export const STRIPE_PRICE_SPECS: readonly StripeCatalogPriceSpec[] = buildStripePriceSpecs();

/** Returns every immutable Stripe field that differs from the app contract. */
export function stripePriceMismatches(
  price: StripePriceShape,
  spec: StripeCatalogPriceSpec,
): string[] {
  const expectedType = spec.recurringInterval === null ? "one_time" : "recurring";
  const productId = typeof price.product === "string" ? price.product : price.product?.id;
  const actualInterval = price.recurring?.interval ?? null;
  const expectedIntervalCount = spec.recurringInterval === null ? null : 1;
  const actualIntervalCount = price.recurring?.interval_count ?? null;
  const mismatches: string[] = [];

  if (price.lookup_key !== spec.lookupKey) mismatches.push("lookup_key");
  if (price.active !== true) mismatches.push("active");
  if (price.livemode !== false) mismatches.push("livemode");
  if (price.currency !== spec.currency) mismatches.push("currency");
  if (price.unit_amount !== spec.unitAmount) mismatches.push("unit_amount");
  if (price.type !== expectedType) mismatches.push("type");
  if (actualInterval !== spec.recurringInterval) mismatches.push("recurring.interval");
  if (actualIntervalCount !== expectedIntervalCount) mismatches.push("recurring.interval_count");
  if (productId !== spec.productId) mismatches.push("product");
  if (price.metadata?.plan_key !== spec.planKey) mismatches.push("metadata.plan_key");

  return mismatches;
}
