/**
 * Environment identity + deployment isolation guard.
 *
 * Browser-safe: this module contains no secrets and reads nothing at import
 * time. Callers pass in the values they observed; the functions here decide
 * whether a deployment is a legitimate, fully isolated staging deployment.
 */

export const PRODUCTION_PROJECT_REF = "lrqcntqyekucamifpffs";
export const STAGING_PROJECT_REF = "qgrertkqbwanerqqemph";

export const PRODUCTION_HOSTNAMES = [
  "transitionpathfinder-ai.lovable.app",
  "transitionforwardct.com",
  "www.transitionforwardct.com",
];

/** Only these hostnames may serve the staging deployment. */
export const STAGING_HOSTNAMES = ["e2e.transitionforwardct.com"];
const STAGING_HOSTNAME_PATTERNS = [/^transitionforward-staging\.[a-z0-9-]+\.workers\.dev$/i];

export function isStagingHostname(hostname: string): boolean {
  return (
    STAGING_HOSTNAMES.includes(hostname.toLowerCase()) ||
    STAGING_HOSTNAME_PATTERNS.some((re) => re.test(hostname))
  );
}

export type AppEnv = "production" | "staging" | "development";
export type StripeMode = "sandbox" | "live" | "unknown";

export interface EnvIdentity {
  app_env: string;
  hostname: string;
  supabase_project_ref: string;
  stripe_mode: StripeMode;
  git_commit_sha: string;
}

export function projectRefFrom(url: string | undefined | null): string {
  if (!url) return "unknown";
  const match = /https?:\/\/([a-z0-9-]+)\.supabase\.(co|in)/i.exec(url);
  return match?.[1] ?? "unknown";
}

/** Classifies a Stripe publishable/secret token into a mode. */
export function stripeModeFromToken(token: string | undefined | null): StripeMode {
  if (typeof token !== "string" || token.length === 0) return "unknown";
  if (/^(pk|sk|rk)_live_/.test(token)) return "live";
  if (/^(pk|sk|rk)_(test|sandbox)_/.test(token)) return "sandbox";
  return "unknown";
}

export function appEnv(): AppEnv {
  const raw = import.meta.env["VITE_APP_ENV"] as string | undefined;
  if (raw === "staging" || raw === "production" || raw === "development") return raw;
  return import.meta.env.DEV ? "development" : "production";
}

export interface StagingIdentityInput {
  appEnv: string | undefined | null;
  viteAppEnv: string | undefined | null;
  hostname: string;
  supabaseProjectRef: string | undefined | null;
  stripeMode: StripeMode | null | undefined;
  /** Names of production-only variables that were found in this deployment. */
  productionSecretsPresent?: string[];
}

export interface DeploymentEnvSources {
  runtimeAppEnv?: string | null;
  runtimeViteAppEnv?: string | null;
  buildAppEnv?: string | null;
  buildViteAppEnv?: string | null;
}

/** Runtime bindings win; build labels cover runtimes that do not populate process.env. */
export function resolveDeploymentEnvLabels(input: DeploymentEnvSources): {
  appEnv: string | null;
  viteAppEnv: string | null;
} {
  return {
    appEnv: input.runtimeAppEnv ?? input.buildAppEnv ?? null,
    viteAppEnv: input.runtimeViteAppEnv ?? input.buildViteAppEnv ?? null,
  };
}

export interface IdentityVerdict {
  ok: boolean;
  errors: string[];
}

/**
 * Strict deployment identity for the isolated staging Worker.
 *
 * Every value must be present and exactly what staging requires. Missing,
 * unknown, or production-connected values fail; there is no permissive path.
 */
export function evaluateStagingIdentity(input: StagingIdentityInput): IdentityVerdict {
  const errors: string[] = [];

  if (input.appEnv !== "staging") {
    errors.push(`APP_ENV must be "staging" (got ${JSON.stringify(input.appEnv ?? null)}).`);
  }
  if (input.viteAppEnv !== "staging") {
    errors.push(
      `VITE_APP_ENV must be "staging" (got ${JSON.stringify(input.viteAppEnv ?? null)}).`,
    );
  }

  const ref = input.supabaseProjectRef;
  if (!ref || ref === "unknown") {
    errors.push("Supabase project ref is missing or unknown.");
  } else if (ref === PRODUCTION_PROJECT_REF) {
    errors.push("Supabase project ref points at the production project.");
  } else if (ref !== STAGING_PROJECT_REF) {
    errors.push(`Supabase project ref must be ${STAGING_PROJECT_REF} (got ${ref}).`);
  }

  if (input.stripeMode == null || input.stripeMode === "unknown") {
    errors.push("Stripe mode is missing or unknown.");
  } else if (input.stripeMode !== "sandbox") {
    errors.push("Stripe mode must be sandbox; live credentials detected.");
  }

  if (!input.hostname) {
    errors.push("Hostname is missing.");
  } else if (PRODUCTION_HOSTNAMES.includes(input.hostname.toLowerCase())) {
    errors.push(`"${input.hostname}" is a production hostname.`);
  } else if (!isStagingHostname(input.hostname)) {
    errors.push(`"${input.hostname}" is not an allowed staging hostname.`);
  }

  for (const name of input.productionSecretsPresent ?? []) {
    errors.push(`Production credential ${name} must not exist in staging.`);
  }

  return { ok: errors.length === 0, errors };
}

/** Throwing wrapper kept for callers that want a hard boot failure. */
export function assertStagingIsolation(input: StagingIdentityInput): void {
  const verdict = evaluateStagingIdentity(input);
  if (!verdict.ok) {
    throw new Error(`Staging isolation check failed: ${verdict.errors.join(" ")}`);
  }
}
