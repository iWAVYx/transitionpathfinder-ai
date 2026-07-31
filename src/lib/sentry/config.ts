/**
 * Sentry runtime configuration — browser-safe.
 *
 * Sentry DSNs are PUBLIC browser configuration (they only permit event
 * ingestion, never reads). They are intentionally checked into the repo
 * rather than stored as secrets.
 *
 * SENTRY_AUTH_TOKEN is a DIFFERENT thing: it is private, is only used by the
 * build to upload source maps, and MUST NEVER appear in this file or any
 * other client-reachable module.
 */

export type SentryEnvironment = "production" | "staging";

/**
 * Paste the two DSNs from Sentry → Settings → Projects → <project> →
 * Client Keys (DSN). They look like:
 *   https://<publicKey>@o<orgId>.ingest.us.sentry.io/<projectId>
 */
export const SENTRY_DSN_PRODUCTION =
  "https://658e3929fc14f35f8ec663e471a78d15@o4511808437223425.ingest.us.sentry.io/4511810778038272";
export const SENTRY_DSN_STAGING =
  "https://4869709386a8b9a9800ea84ce8a1845a@o4511808437223425.ingest.us.sentry.io/4511810780921857";

/** Hostnames that are allowed to report into the production Sentry project. */
const PRODUCTION_HOSTS = new Set(["transitionforwardct.com", "www.transitionforwardct.com"]);

/**
 * Resolve the Sentry environment from a hostname.
 *
 * Fail-safe rule: ONLY the exact production hostnames map to "production".
 * Everything else — staging, localhost, Lovable previews, and any unknown
 * host — maps to "staging" so stray traffic can never pollute the
 * production project.
 */
export function resolveSentryEnvironment(hostname: string | undefined | null): SentryEnvironment {
  if (!hostname) return "staging";
  return PRODUCTION_HOSTS.has(hostname.toLowerCase()) ? "production" : "staging";
}

export function resolveSentryDsn(hostname: string | undefined | null): string {
  return resolveSentryEnvironment(hostname) === "production"
    ? SENTRY_DSN_PRODUCTION
    : SENTRY_DSN_STAGING;
}

export interface ResolvedSentryConfig {
  dsn: string;
  environment: SentryEnvironment;
  enabled: boolean;
}

export function resolveSentryConfig(hostname: string | undefined | null): ResolvedSentryConfig {
  const environment = resolveSentryEnvironment(hostname);
  const dsn = environment === "production" ? SENTRY_DSN_PRODUCTION : SENTRY_DSN_STAGING;
  return { dsn, environment, enabled: dsn.length > 0 };
}
