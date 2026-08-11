#!/usr/bin/env bun

import Stripe from "stripe";
import {
  STRIPE_PRICE_SPECS,
  stripePriceMismatches,
  type StripeCatalogPriceSpec,
} from "../src/lib/billing/stripe-catalog.ts";

const MANAGED_BY = "transitionforward_staging_catalog_v1";
const APPLY = process.argv.includes("--apply");
const ALLOWED_ARGUMENTS = new Set(["--apply", "--dry-run"]);

function fail(message: string): never {
  throw new Error(message);
}

function assertArguments(): void {
  const unknown = process.argv.slice(2).filter((argument) => !ALLOWED_ARGUMENTS.has(argument));
  if (unknown.length > 0) fail(`Unknown argument(s): ${unknown.join(", ")}`);
  if (APPLY && process.argv.includes("--dry-run")) {
    fail("Choose either --apply or --dry-run, not both.");
  }
}

function requireSandboxKey(): string {
  const key = process.env.STAGING_STRIPE_API_KEY?.trim();
  if (!key) fail("STAGING_STRIPE_API_KEY is required.");
  if (!/^(?:sk_test_|rk_test_|sk_sandbox_)/.test(key)) {
    fail(
      "REFUSING TO RUN: expected a raw Stripe sandbox key (sk_test_, rk_test_, or sk_sandbox_).",
    );
  }
  if (process.env.STRIPE_LIVE_API_KEY && key === process.env.STRIPE_LIVE_API_KEY) {
    fail("REFUSING TO RUN: the staging key matches STRIPE_LIVE_API_KEY.");
  }
  return key;
}

function isMissingResource(error: unknown): boolean {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    (error.statusCode === 404 || error.code === "resource_missing")
  );
}

function productChanges(product: Stripe.Product, spec: StripeCatalogPriceSpec): string[] {
  if (product.livemode) fail(`${product.id} unexpectedly belongs to live mode.`);
  if (product.metadata.managed_by !== MANAGED_BY || product.metadata.plan_key !== spec.planKey) {
    fail(
      `${product.id} already exists but is not owned by the staging catalog provisioner. ` +
        "Resolve that product manually before retrying.",
    );
  }

  const changes: string[] = [];
  if (!product.active) changes.push("active");
  if (product.name !== spec.productName) changes.push("name");
  if ((product.description ?? "") !== spec.description) changes.push("description");
  return changes;
}

async function listActivePrices(stripe: Stripe): Promise<Stripe.Price[]> {
  const prices: Stripe.Price[] = [];
  for await (const price of stripe.prices.list({ active: true, limit: 100 })) {
    prices.push(price);
  }
  return prices;
}

async function findProduct(stripe: Stripe, id: string): Promise<Stripe.Product | null> {
  try {
    const product = await stripe.products.retrieve(id);
    return product;
  } catch (error) {
    if (isMissingResource(error)) return null;
    throw error;
  }
}

async function main(): Promise<void> {
  assertArguments();
  const stripe = new Stripe(requireSandboxKey(), {
    maxNetworkRetries: 2,
    telemetry: false,
  });

  const balance = await stripe.balance.retrieve();
  if (balance.livemode !== false) fail("REFUSING TO RUN: Stripe reported livemode=true.");

  const activePrices = await listActivePrices(stripe);
  const pricesByLookupKey = new Map<string, Stripe.Price[]>();
  for (const price of activePrices) {
    if (!price.lookup_key) continue;
    const matches = pricesByLookupKey.get(price.lookup_key) ?? [];
    matches.push(price);
    pricesByLookupKey.set(price.lookup_key, matches);
  }

  const missingPrices: StripeCatalogPriceSpec[] = [];
  for (const spec of STRIPE_PRICE_SPECS) {
    const matches = pricesByLookupKey.get(spec.lookupKey) ?? [];
    if (matches.length > 1) fail(`${spec.lookupKey} has ${matches.length} active prices.`);
    if (matches.length === 0) {
      missingPrices.push(spec);
      continue;
    }

    const mismatches = stripePriceMismatches(matches[0], spec);
    if (mismatches.length > 0) {
      fail(
        `${spec.lookupKey} exists with incompatible immutable fields: ${mismatches.join(", ")}. ` +
          "No Stripe objects were changed.",
      );
    }
  }

  const affectedPlans = new Map(missingPrices.map((spec) => [spec.planKey, spec] as const));
  const products = new Map<string, Stripe.Product | null>();
  const productUpdates = new Map<string, string[]>();
  for (const spec of affectedPlans.values()) {
    const product = await findProduct(stripe, spec.productId);
    products.set(spec.planKey, product);
    if (product) productUpdates.set(spec.planKey, productChanges(product, spec));
  }

  const createProducts = [...affectedPlans.values()].filter((spec) => !products.get(spec.planKey));
  const updateProducts = [...affectedPlans.values()].filter(
    (spec) => (productUpdates.get(spec.planKey)?.length ?? 0) > 0,
  );

  console.log(`Stripe mode: sandbox`);
  console.log(`Operation: ${APPLY ? "APPLY" : "DRY RUN"}`);
  console.log(`Expected prices: ${STRIPE_PRICE_SPECS.length}`);
  console.log(`Already correct: ${STRIPE_PRICE_SPECS.length - missingPrices.length}`);
  console.log(`Products to create: ${createProducts.length}`);
  console.log(`Managed products to update: ${updateProducts.length}`);
  console.log(`Prices to create: ${missingPrices.length}`);

  for (const spec of createProducts) console.log(`[create product] ${spec.productId}`);
  for (const spec of updateProducts) {
    console.log(
      `[update product] ${spec.productId}: ${productUpdates.get(spec.planKey)?.join(", ")}`,
    );
  }
  for (const spec of missingPrices) {
    const cadence = spec.recurringInterval ?? "one_time";
    console.log(
      `[create price] ${spec.lookupKey}: ${spec.unitAmount} ${spec.currency} / ${cadence}`,
    );
  }

  if (!APPLY) {
    console.log(
      missingPrices.length === 0 && updateProducts.length === 0
        ? "Catalog already matches the TransitionForward contract."
        : "Dry run complete. Re-run with --apply to make these sandbox-only changes.",
    );
    return;
  }

  for (const spec of createProducts) {
    const product = await stripe.products.create(
      {
        id: spec.productId,
        active: true,
        name: spec.productName,
        description: spec.description,
        metadata: { managed_by: MANAGED_BY, plan_key: spec.planKey, environment: "staging" },
      },
      { idempotencyKey: `tf-staging-product-v1-${spec.planKey}` },
    );
    products.set(spec.planKey, product);
  }

  for (const spec of updateProducts) {
    const product = await stripe.products.update(spec.productId, {
      active: true,
      name: spec.productName,
      description: spec.description,
    });
    products.set(spec.planKey, product);
  }

  for (const spec of missingPrices) {
    await stripe.prices.create(
      {
        active: true,
        currency: spec.currency,
        unit_amount: spec.unitAmount,
        lookup_key: spec.lookupKey,
        nickname: spec.nickname,
        product: spec.productId,
        recurring: spec.recurringInterval
          ? { interval: spec.recurringInterval, interval_count: 1 }
          : undefined,
        metadata: { managed_by: MANAGED_BY, plan_key: spec.planKey, environment: "staging" },
      },
      { idempotencyKey: `tf-staging-price-v1-${spec.lookupKey}` },
    );
  }

  const verifiedPrices = await listActivePrices(stripe);
  const verifiedByLookupKey = new Map(
    verifiedPrices.filter((price) => price.lookup_key).map((price) => [price.lookup_key!, price]),
  );
  for (const spec of STRIPE_PRICE_SPECS) {
    const price = verifiedByLookupKey.get(spec.lookupKey);
    if (!price) fail(`Post-apply verification could not find ${spec.lookupKey}.`);
    const mismatches = stripePriceMismatches(price, spec);
    if (mismatches.length > 0) {
      fail(`Post-apply verification failed for ${spec.lookupKey}: ${mismatches.join(", ")}.`);
    }
  }

  console.log(`Provisioning complete: all ${STRIPE_PRICE_SPECS.length} sandbox prices match.`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Stripe catalog provisioning failed: ${message}`);
  process.exitCode = 1;
});
