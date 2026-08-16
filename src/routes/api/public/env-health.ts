/**
 * Non-sensitive deployment identity health check.
 *
 * Returns only: app environment, deployment hostname, Supabase project ref,
 * Stripe mode, git commit SHA, and the isolation verdict. It never returns
 * keys, secrets, database URLs, or webhook secrets.
 *
 * Staging and production deployments are both validated strictly. Any missing,
 * unknown, cross-environment, or unauditable identity value returns 503.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  PRODUCTION_PROJECT_REF,
  PRODUCTION_HOSTNAMES,
  STAGING_PROJECT_REF,
  evaluateProductionIdentity,
  evaluateStagingIdentity,
  isStagingHostname,
  projectRefFrom,
  resolveDeploymentEnvLabels,
  stripeModeFromToken,
} from "@/lib/env-identity";

/** Production-only variables that must not exist in the staging Worker. */
const FORBIDDEN_IN_STAGING = ["STRIPE_LIVE_API_KEY", "PAYMENTS_LIVE_WEBHOOK_SECRET"];

/** Staging-only variables that must not exist in the production Worker. */
const FORBIDDEN_IN_PRODUCTION = [
  "STAGING_E2E_PASSWORD",
  "STAGING_STRIPE_API_KEY",
  "STAGING_SUPABASE_SERVICE_ROLE_KEY",
  "STAGING_SUPABASE_URL",
];

export const Route = createFileRoute("/api/public/env-health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const hostname = new URL(request.url).hostname;
        const { appEnv: app_env, viteAppEnv: vite_app_env } = resolveDeploymentEnvLabels({
          runtimeAppEnv: process.env["APP_ENV"],
          runtimeViteAppEnv: process.env["VITE_APP_ENV"],
          buildAppEnv: import.meta.env["APP_ENV"] as string | undefined,
          buildViteAppEnv: import.meta.env["VITE_APP_ENV"] as string | undefined,
        });
        const supabase_project_ref = projectRefFrom(process.env["SUPABASE_URL"]);
        const stripe_mode = stripeModeFromToken(
          process.env["VITE_PAYMENTS_CLIENT_TOKEN"] ??
            process.env["PAYMENTS_CLIENT_TOKEN"] ??
            process.env["STRIPE_SANDBOX_API_KEY"],
        );
        const git_commit_sha =
          process.env["GIT_COMMIT_SHA"] ??
          process.env["CF_PAGES_COMMIT_SHA"] ??
          (import.meta.env["VITE_APP_BUILD_SHA"] as string | undefined) ??
          (import.meta.env["VITE_GIT_COMMIT_SHA"] as string | undefined) ??
          "unknown";

        // Any deployment that either claims staging or is served from a
        // staging hostname must satisfy the strict identity check.
        const stagingTarget =
          isStagingHostname(hostname) ||
          app_env === "staging" ||
          vite_app_env === "staging" ||
          supabase_project_ref === STAGING_PROJECT_REF;

        const productionTarget =
          !stagingTarget &&
          (PRODUCTION_HOSTNAMES.includes(hostname.toLowerCase()) ||
            app_env === "production" ||
            vite_app_env === "production" ||
            supabase_project_ref === PRODUCTION_PROJECT_REF);

        let isolation: { ok: boolean; errors: string[] } = {
          ok: true,
          errors: [],
        };

        if (stagingTarget) {
          isolation = evaluateStagingIdentity({
            appEnv: app_env,
            viteAppEnv: vite_app_env,
            hostname,
            supabaseProjectRef: supabase_project_ref,
            stripeMode: stripe_mode,
            gitCommitSha: git_commit_sha,
            productionSecretsPresent: FORBIDDEN_IN_STAGING.filter((name) => !!process.env[name]),
          });
        } else if (productionTarget) {
          isolation = evaluateProductionIdentity({
            appEnv: app_env,
            viteAppEnv: vite_app_env,
            hostname,
            supabaseProjectRef: supabase_project_ref,
            stripeMode: stripe_mode,
            gitCommitSha: git_commit_sha,
            stagingSecretsPresent: FORBIDDEN_IN_PRODUCTION.filter((name) => !!process.env[name]),
          });
        }

        return Response.json(
          {
            app_env: app_env ?? "unknown",
            vite_app_env: vite_app_env ?? "unknown",
            hostname,
            supabase_project_ref,
            is_production_project: supabase_project_ref === PRODUCTION_PROJECT_REF,
            is_production_hostname: PRODUCTION_HOSTNAMES.includes(hostname),
            is_staging_target: stagingTarget,
            is_production_target: productionTarget,
            stripe_mode,
            stripe_livemode: stripe_mode === "unknown" ? null : stripe_mode === "live",
            git_commit_sha,
            isolation,
          },
          { status: isolation.ok ? 200 : 503 },
        );
      },
    },
  },
});
