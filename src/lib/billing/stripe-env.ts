/**
 * Server-owned Stripe environment resolution.
 *
 * Pure logic (no SDK, no I/O) so it can be unit-tested directly and reused by
 * both the billing server functions and the webhook route.
 *
 * The client never decides sandbox vs live: the deployment's APP_ENV does.
 */

export type StripeEnv = "sandbox" | "live";

export type StripeKeyKind = "gateway" | "direct_test" | "direct_live" | "unknown";

/**
 * Maps a deployment environment label to the Stripe environment it may use.
 * Anything other than production/staging fails closed.
 */
export function stripeEnvForAppEnv(appEnv: string | undefined | null): StripeEnv {
  if (appEnv === "production") return "live";
  if (appEnv === "staging") return "sandbox";
  throw new Error(
    `Cannot resolve Stripe environment: APP_ENV is ${JSON.stringify(appEnv ?? null)}. Expected "production" or "staging".`,
  );
}

/** Resolves the Stripe environment from the running deployment's APP_ENV. */
export function resolveServerStripeEnv(): StripeEnv {
  return stripeEnvForAppEnv(
    process.env["APP_ENV"] ?? process.env["VITE_APP_ENV"] ?? null,
  );
}

/**
 * Rejects a client-supplied environment that disagrees with the server's.
 * Callers pass whatever the browser sent; the server value always wins.
 */
export function assertRequestedStripeEnv(
  supplied: string | undefined | null,
  serverEnv: StripeEnv = resolveServerStripeEnv(),
): StripeEnv {
  if (supplied != null && supplied !== serverEnv) {
    throw new Error("Requested billing environment is not allowed.");
  }
  return serverEnv;
}

/** Classifies a Stripe credential without ever logging or returning it. */
export function classifyStripeKey(key: string | undefined | null): StripeKeyKind {
  if (typeof key !== "string" || key.length === 0) return "unknown";
  if (key.startsWith("mk_")) return "gateway";
  if (/^(sk|rk)_(test|sandbox)_/.test(key)) return "direct_test";
  if (/^(sk|rk)_live_/.test(key)) return "direct_live";
  return "unknown";
}

/**
 * Decides whether a webhook `?env=` parameter may be processed by this
 * deployment. Staging accepts only sandbox; production only live.
 */
export function webhookEnvAllowed(
  requested: string | null | undefined,
  serverEnv: StripeEnv,
): boolean {
  return requested === serverEnv;
}
