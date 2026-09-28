import { PRODUCTION_PROJECT_REF, STAGING_PROJECT_REF } from "@/lib/env-identity";

export type HostedBuildTarget = "staging" | "production" | "unknown";

export interface HostedBuildIdentityInput {
  appEnv: string | undefined | null;
  viteAppEnv: string | undefined | null;
  supabaseProjectRef: string | undefined | null;
  runtimeSourceIdentityOk: boolean;
  productionSecretsPresent?: string[];
  stagingSecretsPresent?: string[];
}

export interface HostedBuildIdentityVerdict {
  ok: boolean;
  target: HostedBuildTarget;
  errors: string[];
}

/**
 * Validate immutable hosted-build inputs without pretending to validate a
 * deployed origin. Hostname and payment readiness belong to /env-health,
 * where they are observed from the real externally served request.
 */
export function evaluateHostedBuildIdentity(
  input: HostedBuildIdentityInput,
): HostedBuildIdentityVerdict {
  const errors: string[] = [];
  const stagingMarker =
    input.appEnv === "staging" ||
    input.viteAppEnv === "staging" ||
    input.supabaseProjectRef === STAGING_PROJECT_REF;
  const productionMarker =
    input.appEnv === "production" ||
    input.viteAppEnv === "production" ||
    input.supabaseProjectRef === PRODUCTION_PROJECT_REF;

  const target: HostedBuildTarget =
    stagingMarker && !productionMarker
      ? "staging"
      : productionMarker && !stagingMarker
        ? "production"
        : "unknown";

  if (stagingMarker && productionMarker) {
    errors.push("Staging and production build markers conflict.");
  } else if (target === "unknown") {
    errors.push("Build target is missing or unknown.");
  }

  if (target === "staging") {
    if (input.appEnv !== "staging") {
      errors.push('APP_ENV must resolve to "staging" for a staging build.');
    }
    if (input.viteAppEnv !== "staging") {
      errors.push('VITE_APP_ENV must resolve to "staging" for a staging build.');
    }
    if (input.supabaseProjectRef !== STAGING_PROJECT_REF) {
      errors.push(`Staging build must target Supabase ${STAGING_PROJECT_REF}.`);
    }
    for (const name of input.productionSecretsPresent ?? []) {
      errors.push(`Production credential ${name} must not exist in staging.`);
    }
  }

  if (target === "production") {
    if (input.appEnv !== "production") {
      errors.push('APP_ENV must resolve to "production" for a production build.');
    }
    if (input.viteAppEnv !== "production") {
      errors.push('VITE_APP_ENV must resolve to "production" for a production build.');
    }
    if (input.supabaseProjectRef !== PRODUCTION_PROJECT_REF) {
      errors.push(`Production build must target Supabase ${PRODUCTION_PROJECT_REF}.`);
    }
    for (const name of input.stagingSecretsPresent ?? []) {
      errors.push(`Staging credential ${name} must not exist in production.`);
    }
  }

  if (!input.runtimeSourceIdentityOk) {
    errors.push("Runtime source fingerprint is unavailable or invalid.");
  }

  return { ok: errors.length === 0, target, errors };
}
