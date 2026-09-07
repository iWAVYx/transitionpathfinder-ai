function firstNonEmpty(...values) {
  const value = values.find(
    (candidate) => typeof candidate === "string" && candidate.trim().length > 0,
  );
  return typeof value === "string" ? value.trim() : "";
}

export function paymentsClientTokenMode(token) {
  if (typeof token !== "string") return "unknown";
  if (token.startsWith("pk_test_")) return "sandbox";
  if (token.startsWith("pk_live_")) return "live";
  return "unknown";
}

/**
 * Resolve the public values that Vite embeds into the browser and SSR bundles.
 *
 * Lovable Test and Live share application code, so the build carries both
 * public Stripe publishable tokens. Browser code chooses between them from the
 * running hostname; the server independently enforces the requested mode.
 * Secret or non-VITE compatibility aliases are deliberately not accepted.
 */
export function resolvePublicBuildInputs({
  runtimeEnv = {},
  publicBuildEnv = {},
  sandboxPublicBuildEnv = {},
  livePublicBuildEnv = {},
} = {}) {
  const runtimePaymentsClientToken = firstNonEmpty(
    runtimeEnv.VITE_PAYMENTS_CLIENT_TOKEN,
  );
  const runtimePaymentsMode = paymentsClientTokenMode(runtimePaymentsClientToken);
  const selectedPaymentsClientToken = firstNonEmpty(
    runtimePaymentsClientToken,
    publicBuildEnv.VITE_PAYMENTS_CLIENT_TOKEN,
  );

  return {
    viteAppEnv: firstNonEmpty(
      runtimeEnv.VITE_APP_ENV,
      publicBuildEnv.VITE_APP_ENV,
    ),
    paymentsClientToken: selectedPaymentsClientToken,
    sandboxPaymentsClientToken: firstNonEmpty(
      runtimeEnv.VITE_PAYMENTS_SANDBOX_CLIENT_TOKEN,
      runtimePaymentsMode === "sandbox" ? runtimePaymentsClientToken : undefined,
      sandboxPublicBuildEnv.VITE_PAYMENTS_CLIENT_TOKEN,
    ),
    livePaymentsClientToken: firstNonEmpty(
      runtimeEnv.VITE_PAYMENTS_LIVE_CLIENT_TOKEN,
      runtimePaymentsMode === "live" ? runtimePaymentsClientToken : undefined,
      livePublicBuildEnv.VITE_PAYMENTS_CLIENT_TOKEN,
    ),
  };
}

export function paymentsEnvironmentForHostname(hostname, fallbackAppEnv = "") {
  const host = typeof hostname === "string" ? hostname.trim().toLowerCase() : "";
  const hostWithoutPort = host.replace(/:\d+$/, "");

  if (
    hostWithoutPort === "localhost" ||
    hostWithoutPort === "127.0.0.1" ||
    hostWithoutPort === "::1" ||
    hostWithoutPort.startsWith("preview--") ||
    hostWithoutPort.includes("-dev.lovable.app") ||
    hostWithoutPort.includes("staging") ||
    hostWithoutPort.startsWith("e2e.")
  ) {
    return "sandbox";
  }

  if (
    hostWithoutPort === "transitionforwardct.com" ||
    hostWithoutPort === "www.transitionforwardct.com" ||
    hostWithoutPort.endsWith(".lovable.app")
  ) {
    return "live";
  }

  if (fallbackAppEnv === "staging") return "sandbox";
  if (fallbackAppEnv === "production") return "live";
  return "unknown";
}

export function selectPaymentsClientConfig({
  hostname = "",
  fallbackAppEnv = "",
  sandboxPaymentsClientToken = "",
  livePaymentsClientToken = "",
} = {}) {
  const environment = paymentsEnvironmentForHostname(hostname, fallbackAppEnv);
  const clientToken =
    environment === "sandbox"
      ? firstNonEmpty(sandboxPaymentsClientToken)
      : environment === "live"
        ? firstNonEmpty(livePaymentsClientToken)
        : "";

  if (paymentsClientTokenMode(clientToken) !== environment) {
    return { environment, clientToken: "" };
  }
  return { environment, clientToken };
}
