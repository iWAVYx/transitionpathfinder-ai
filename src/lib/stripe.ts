import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { selectPaymentsClientConfig } from "../../scripts/resolve-public-build-inputs.mjs";

/** Mirrors StripeEnv in stripe.server.ts (kept local so this stays browser-safe). */
export type StripeEnv = "sandbox" | "live";

function paymentsClientConfig() {
  return selectPaymentsClientConfig({
    hostname: typeof window === "undefined" ? "" : window.location.hostname,
    fallbackAppEnv: import.meta.env.VITE_APP_ENV as string | undefined,
    sandboxPaymentsClientToken: import.meta.env
      .VITE_PAYMENTS_SANDBOX_CLIENT_TOKEN as string | undefined,
    livePaymentsClientToken: import.meta.env
      .VITE_PAYMENTS_LIVE_CLIENT_TOKEN as string | undefined,
  });
}

function paymentsEnvironment(): StripeEnv {
  const { environment, clientToken } = paymentsClientConfig();
  if (clientToken && (environment === "sandbox" || environment === "live")) {
    return environment;
  }
  throw new Error(
    "Payments are not configured for this environment. Complete payment go-live to enable production checkout.",
  );
}

const stripePromises = new Map<string, Promise<Stripe | null>>();

export function getStripe(): Promise<Stripe | null> {
  const { clientToken } = paymentsClientConfig();
  paymentsEnvironment();
  let stripePromise = stripePromises.get(clientToken);
  if (!stripePromise) {
    stripePromise = loadStripe(clientToken);
    stripePromises.set(clientToken, stripePromise);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}

export function isPaymentsConfigured(): boolean {
  return Boolean(paymentsClientConfig().clientToken);
}
