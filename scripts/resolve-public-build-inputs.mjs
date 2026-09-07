function firstNonEmpty(...values) {
  return (
    values.find((value) => typeof value === "string" && value.trim().length > 0) ?? ""
  );
}

/**
 * Resolve the public values that Vite embeds into the browser and SSR bundles.
 *
 * Lovable Cloud does not persist VITE-prefixed names in its runtime secret
 * store. Its explicitly configured non-VITE compatibility inputs are therefore
 * accepted only when the hosted Lovable build has been positively identified.
 * Standard VITE variables and the selected mode's tracked public env file keep
 * priority everywhere.
 */
export function resolvePublicBuildInputs({
  runtimeEnv = {},
  publicBuildEnv = {},
  allowLovableCompatibility = false,
} = {}) {
  const lovableAppEnv = allowLovableCompatibility
    ? runtimeEnv.TRANSITIONFORWARD_BUILD_APP_ENV
    : undefined;
  const lovablePaymentsClientToken = allowLovableCompatibility
    ? runtimeEnv.PAYMENTS_CLIENT_TOKEN
    : undefined;

  return {
    viteAppEnv: firstNonEmpty(
      runtimeEnv.VITE_APP_ENV,
      publicBuildEnv.VITE_APP_ENV,
      lovableAppEnv,
    ),
    paymentsClientToken: firstNonEmpty(
      runtimeEnv.VITE_PAYMENTS_CLIENT_TOKEN,
      publicBuildEnv.VITE_PAYMENTS_CLIENT_TOKEN,
      lovablePaymentsClientToken,
    ),
  };
}
