/**
 * Authentication and deployment isolation for privileged scheduled hooks.
 *
 * The public Supabase key is intentionally not accepted here. Scheduled
 * callers must use a dedicated, per-environment bearer secret, and the
 * request is rejected unless the app labels, Supabase project, and exact
 * request origin all identify the same deployment.
 */
import {
  PRODUCTION_HOSTNAMES,
  PRODUCTION_PROJECT_REF,
  STAGING_PROJECT_REF,
  isStagingHostname,
  projectRefFrom,
  resolveDeploymentEnvLabels,
} from "@/lib/env-identity";

const MIN_SECRET_LENGTH = 32;
const PRODUCTION_CRON_HOSTNAMES = [
  ...PRODUCTION_HOSTNAMES,
  "project--a4a5068b-10df-4e31-8d22-73186657d452.lovable.app",
];

export interface ScheduledHookConfig {
  appEnv?: string | null;
  viteAppEnv?: string | null;
  supabaseUrl?: string | null;
  expectedOrigin?: string | null;
  secret?: string | null;
}

export interface ScheduledHookIdentityInput {
  appEnv?: string | null;
  viteAppEnv?: string | null;
  supabaseUrl?: string | null;
  expectedOrigin?: string | null;
  requestUrl: string;
}

export type ScheduledHookAuthorization =
  | { ok: true; environment: "staging" | "production" }
  | { ok: false; status: 401 | 503; error: "unauthorized" | "misconfigured" };

export function evaluateScheduledHookIdentity(input: ScheduledHookIdentityInput): {
  ok: boolean;
  environment: "staging" | "production" | null;
  errors: string[];
} {
  const errors: string[] = [];
  const environment =
    input.appEnv === "staging" || input.appEnv === "production" ? input.appEnv : null;

  if (!environment) {
    errors.push('APP_ENV must be exactly "staging" or "production".');
  }
  if (input.viteAppEnv !== environment) {
    errors.push("APP_ENV and VITE_APP_ENV must identify the same deployment.");
  }

  const projectRef = projectRefFrom(input.supabaseUrl);
  const requiredProjectRef =
    environment === "staging"
      ? STAGING_PROJECT_REF
      : environment === "production"
        ? PRODUCTION_PROJECT_REF
        : null;
  if (!requiredProjectRef || projectRef !== requiredProjectRef) {
    errors.push("Supabase project identity does not match the deployment environment.");
  }

  let expectedUrl: URL | null = null;
  let requestUrl: URL | null = null;
  try {
    expectedUrl = new URL(input.expectedOrigin ?? "");
  } catch {
    errors.push("CRON_EXPECTED_ORIGIN must be an absolute HTTPS origin.");
  }
  try {
    requestUrl = new URL(input.requestUrl);
  } catch {
    errors.push("The scheduled request URL is invalid.");
  }

  if (expectedUrl) {
    const isOriginOnly =
      expectedUrl.protocol === "https:" &&
      expectedUrl.username === "" &&
      expectedUrl.password === "" &&
      expectedUrl.pathname === "/" &&
      expectedUrl.search === "" &&
      expectedUrl.hash === "" &&
      input.expectedOrigin === expectedUrl.origin;
    if (!isOriginOnly) {
      errors.push("CRON_EXPECTED_ORIGIN must be an exact HTTPS origin without a path.");
    }

    const hostname = expectedUrl.hostname.toLowerCase();
    if (environment === "staging" && !isStagingHostname(hostname)) {
      errors.push("The expected origin is not an allowed staging hostname.");
    }
    if (environment === "production" && !PRODUCTION_CRON_HOSTNAMES.includes(hostname)) {
      errors.push("The expected origin is not an allowed production hostname.");
    }
    if (requestUrl && requestUrl.origin !== expectedUrl.origin) {
      errors.push("The request origin does not match CRON_EXPECTED_ORIGIN.");
    }
  }

  return { ok: errors.length === 0, environment, errors };
}

export async function authorizeScheduledHook(
  request: Request,
  config: ScheduledHookConfig = runtimeScheduledHookConfig(),
): Promise<ScheduledHookAuthorization> {
  const identity = evaluateScheduledHookIdentity({
    ...config,
    requestUrl: request.url,
  });
  if (
    !identity.ok ||
    !identity.environment ||
    !config.secret ||
    config.secret.length < MIN_SECRET_LENGTH
  ) {
    return { ok: false, status: 503, error: "misconfigured" };
  }

  const candidate = bearerToken(request.headers.get("authorization"));
  if (!candidate || !(await secretsMatch(candidate, config.secret))) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  return { ok: true, environment: identity.environment };
}

function runtimeScheduledHookConfig(): ScheduledHookConfig {
  const { appEnv, viteAppEnv } = resolveDeploymentEnvLabels({
    runtimeAppEnv: process.env["APP_ENV"],
    runtimeViteAppEnv: process.env["VITE_APP_ENV"],
    buildAppEnv: import.meta.env["APP_ENV"] as string | undefined,
    buildViteAppEnv: import.meta.env["VITE_APP_ENV"] as string | undefined,
  });
  return {
    appEnv,
    viteAppEnv,
    supabaseUrl: process.env["SUPABASE_URL"],
    expectedOrigin: process.env["CRON_EXPECTED_ORIGIN"],
    secret: process.env["CRON_WEBHOOK_SECRET"],
  };
}

function bearerToken(value: string | null): string | null {
  const match = /^Bearer ([^\s]+)$/.exec(value ?? "");
  return match?.[1] ?? null;
}

async function secretsMatch(candidate: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [candidateHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(candidateHash);
  const right = new Uint8Array(expectedHash);
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}
