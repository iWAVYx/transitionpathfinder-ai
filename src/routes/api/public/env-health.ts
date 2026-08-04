/**
 * Non-sensitive environment identity health check.
 *
 * Returns only: app environment, deployment hostname, Supabase project ref,
 * Stripe livemode, git commit SHA, and whether the staging isolation guard
 * passes. It never returns keys, secrets, database URLs, or webhook secrets.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  PRODUCTION_PROJECT_REF,
  PRODUCTION_HOSTNAMES,
  projectRefFrom,
  assertStagingIsolation,
} from "@/lib/env-identity";

function stripeLivemode(): boolean | null {
  const token = process.env['VITE_PAYMENTS_CLIENT_TOKEN'] ?? process.env['PAYMENTS_CLIENT_TOKEN'];
  if (typeof token !== "string") return null;
  if (token.startsWith("pk_live_")) return true;
  if (token.startsWith("pk_test_")) return false;
  return null;
}

export const Route = createFileRoute("/api/public/env-health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const hostname = new URL(request.url).hostname;
        const app_env = process.env['APP_ENV'] ?? process.env['VITE_APP_ENV'] ?? "production";
        const supabase_project_ref = projectRefFrom(process.env['SUPABASE_URL']);
        const stripe_livemode = stripeLivemode();
        const git_commit_sha =
          process.env['GIT_COMMIT_SHA'] ?? process.env['CF_PAGES_COMMIT_SHA'] ?? "unknown";

        let isolation: { ok: boolean; error?: string } = { ok: true };
        if (app_env === "staging") {
          try {
            assertStagingIsolation({
              appEnv: app_env,
              hostname,
              supabaseProjectRef: supabase_project_ref,
              stripeLivemode: stripe_livemode,
            });
          } catch (e) {
            isolation = { ok: false, error: (e as Error).message };
          }
        }

        return Response.json(
          {
            app_env,
            hostname,
            supabase_project_ref,
            is_production_project: supabase_project_ref === PRODUCTION_PROJECT_REF,
            is_production_hostname: PRODUCTION_HOSTNAMES.includes(hostname),
            stripe_livemode,
            git_commit_sha,
            isolation,
          },
          { status: isolation.ok ? 200 : 503 },
        );
      },
    },
  },
});
