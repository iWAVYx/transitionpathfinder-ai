/**
 * Shared harness for the billing / licensing / sponsored-access verification
 * suite.
 *
 * Everything here is parameterized by environment variables so the suite can
 * run against ANY staging backend (a remixed Lovable project, or an external
 * Supabase project you own) without code changes.
 *
 * Required (all of them, or every test in the suite skips):
 *   STAGING_SUPABASE_URL
 *   STAGING_SUPABASE_PUBLISHABLE_KEY
 *   STAGING_SUPABASE_SERVICE_ROLE_KEY
 *   STAGING_STRIPE_API_KEY          (must be a sandbox/test key)
 *
 * Optional:
 *   STAGING_BASE_URL                (app URL for Playwright journeys)
 *   STAGING_DB_URL                  (direct Postgres URL, for pgTAP)
 *
 * Hard safety rails — the harness throws, it does not skip, when:
 *   * the Supabase URL resolves to the production project ref, or
 *   * the Stripe key is a live key, or
 *   * a production Stripe/Supabase variable is used as a fallback.
 */
import { createClient } from "@supabase/supabase-js";

/** The production project ref. The suite must never write to it. */
export const PRODUCTION_PROJECT_REF = "lrqcntqyekucamifpffs";

export const STAGING = {
  supabaseUrl: process.env.STAGING_SUPABASE_URL,
  publishableKey: process.env.STAGING_SUPABASE_PUBLISHABLE_KEY,
  serviceRoleKey: process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY,
  stripeKey: process.env.STAGING_STRIPE_API_KEY,
  baseUrl: process.env.STAGING_BASE_URL ?? null,
  dbUrl: process.env.STAGING_DB_URL ?? null,
};

/** True when the suite has no staging target and should skip rather than fail. */
export const SKIP =
  !STAGING.supabaseUrl ||
  !STAGING.publishableKey ||
  !STAGING.serviceRoleKey ||
  !STAGING.stripeKey;

export function projectRefFrom(url) {
  try {
    const host = new URL(url).hostname;
    return host.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Fail-fast guard. Called by every test file before it touches anything.
 * Throws (never skips) when the configuration points at production.
 */
export function assertStagingSafe() {
  if (SKIP) return;

  const ref = projectRefFrom(STAGING.supabaseUrl);
  if (!ref) {
    throw new Error(`STAGING_SUPABASE_URL is not a valid URL: ${STAGING.supabaseUrl}`);
  }
  if (ref === PRODUCTION_PROJECT_REF) {
    throw new Error(
      "REFUSING TO RUN: STAGING_SUPABASE_URL points at the production project. " +
        "Provision a separate backend and set STAGING_SUPABASE_URL to it.",
    );
  }

  const key = STAGING.stripeKey;
  const isTestKey =
    key.startsWith("sk_test_") ||
    key.startsWith("rk_test_") ||
    key.startsWith("sk_sandbox_");
  // Lovable payments issues gateway *connection identifiers* (mk_…) rather
  // than raw Stripe secret keys. Those are only usable through the connector
  // gateway, and the sandbox/live split is decided by which connection is
  // used — so mode is asserted live in preflight via `livemode`.
  if (!isTestKey && !isGatewayKey(key)) {
    throw new Error(
      "REFUSING TO RUN: STAGING_STRIPE_API_KEY is not a sandbox/test key. " +
        "Expected an sk_test_ / rk_test_ / sk_sandbox_ prefix, or a Lovable " +
        "gateway connection key (mk_…).",
    );
  }
  if (isGatewayKey(key)) {
    if (key === process.env.STRIPE_LIVE_API_KEY) {
      throw new Error(
        "REFUSING TO RUN: STAGING_STRIPE_API_KEY is the live payments connection.",
      );
    }
    if (!process.env.LOVABLE_API_KEY) {
      throw new Error(
        "STAGING_STRIPE_API_KEY is a gateway connection key but LOVABLE_API_KEY is not set.",
      );
    }
  }

  // Never allow production credentials to leak in as fallbacks.
  for (const forbidden of [
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_LIVE_API_KEY",
    "PAYMENTS_LIVE_WEBHOOK_SECRET",
  ]) {
    const value = process.env[forbidden];
    if (!value) continue;
    if (
      value === STAGING.serviceRoleKey ||
      value === STAGING.stripeKey
    ) {
      throw new Error(
        `REFUSING TO RUN: STAGING_* credentials are identical to production ${forbidden}.`,
      );
    }
  }
}

/** Service-role client for the staging project (fixtures + teardown only). */
export function adminClient() {
  if (SKIP) return null;
  assertStagingSafe();
  return createClient(STAGING.supabaseUrl, STAGING.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Anonymous/publishable client — used to sign in as fixture users. */
export function userClient() {
  if (SKIP) return null;
  assertStagingSafe();
  return createClient(STAGING.supabaseUrl, STAGING.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** True for Lovable connector-gateway connection identifiers. */
export function isGatewayKey(key) {
  return typeof key === "string" && key.startsWith("mk_");
}

const GATEWAY_STRIPE_BASE = "https://connector-gateway.lovable.dev/stripe";

/**
 * Minimal Stripe REST call. Uses the raw Stripe API for `sk_test_` keys and
 * the Lovable connector gateway for `mk_` connection identifiers.
 */
export async function stripeGet(path, params = {}) {
  assertStagingSafe();
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((item) => query.append(`${k}[]`, item));
    else if (v !== undefined && v !== null) query.set(k, String(v));
  }
  const suffix = query.toString() ? `?${query}` : "";
  const gateway = isGatewayKey(STAGING.stripeKey);
  const base = gateway ? `${GATEWAY_STRIPE_BASE}/v1` : "https://api.stripe.com/v1";
  const headers = gateway
    ? {
        "X-Connection-Api-Key": STAGING.stripeKey,
        "Lovable-API-Key": process.env.LOVABLE_API_KEY,
      }
    : { Authorization: `Bearer ${STAGING.stripeKey}` };

  const res = await fetch(`${base}/${path}${suffix}`, { headers });
  if (!res.ok) {
    throw new Error(`Stripe GET ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/** Namespace applied to every fixture this suite creates. */
export const FIXTURE_TAG = `qa_billing_${Date.now()}`;
export const FIXTURE_PASSWORD = "StagingQA!2026";
export const fixtureEmail = (role) =>
  `${FIXTURE_TAG}.${role}@transitionforward.test`;
