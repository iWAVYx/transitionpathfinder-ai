/**
 * Environment identity + production-safety guard.
 *
 * Browser-safe: reads only `import.meta.env` VITE_* values. Never reads or
 * returns a service-role key, Stripe secret, database URL, or webhook secret.
 */

export const PRODUCTION_PROJECT_REF = "lrqcntqyekucamifpffs";
export const PRODUCTION_HOSTNAMES = [
  "transitionpathfinder-ai.lovable.app",
  "transitionforwardct.com",
  "www.transitionforwardct.com",
];

export type AppEnv = "production" | "staging" | "development";

export interface EnvIdentity {
  app_env: AppEnv;
  hostname: string;
  supabase_project_ref: string;
  stripe_livemode: boolean | null;
  git_commit_sha: string;
}

export function projectRefFrom(url: string | undefined): string {
  if (!url) return "unknown";
  const match = /https?:\/\/([a-z0-9-]+)\.supabase\.(co|in)/i.exec(url);
  return match?.[1] ?? "unknown";
}

export function appEnv(): AppEnv {
  const raw = import.meta.env['VITE_APP_ENV'] as string | undefined;
  if (raw === "staging" || raw === "production" || raw === "development") return raw;
  return import.meta.env.DEV ? "development" : "production";
}

/**
 * Throws when a build labelled `staging` is wired to anything production.
 * Call at startup on the staging deployment; a thrown error fails the boot
 * rather than letting test traffic reach production data.
 */
export function assertStagingIsolation(input: {
  appEnv: string;
  hostname: string;
  supabaseProjectRef: string;
  stripeLivemode: boolean | null;
}): void {
  if (input.appEnv !== "staging") {
    throw new Error(
      `Staging isolation check failed: APP_ENV is "${input.appEnv}", expected "staging".`,
    );
  }
  if (input.supabaseProjectRef === PRODUCTION_PROJECT_REF) {
    throw new Error(
      "Staging isolation check failed: build points at the production Supabase project.",
    );
  }
  if (PRODUCTION_HOSTNAMES.includes(input.hostname)) {
    throw new Error(
      `Staging isolation check failed: "${input.hostname}" is a production hostname.`,
    );
  }
  if (input.stripeLivemode === true) {
    throw new Error("Staging isolation check failed: Stripe reports livemode:true.");
  }
}
