/**
 * Hosted-build identity check.
 *
 * This endpoint deliberately validates only immutable build inputs. It never
 * substitutes for /api/public/env-health, which must verify the externally
 * served hostname, payment mode, exact release identity, and full isolation
 * verdict before a deployment can be accepted.
 */
import { createFileRoute } from "@tanstack/react-router";
import { viteAppEnv as buildViteAppEnv } from "virtual:transitionforward-public-build-inputs";
import { evaluateHostedBuildIdentity } from "@/lib/build-validation";
import { projectRefFrom, resolveDeploymentEnvLabels } from "@/lib/env-identity";

const FORBIDDEN_IN_STAGING = ["STRIPE_LIVE_API_KEY", "PAYMENTS_LIVE_WEBHOOK_SECRET"];
const FORBIDDEN_IN_PRODUCTION = [
  "STAGING_E2E_PASSWORD",
  "STAGING_STRIPE_API_KEY",
  "STAGING_SUPABASE_SERVICE_ROLE_KEY",
  "STAGING_SUPABASE_URL",
];

export const Route = createFileRoute("/api/public/build-health")({
  server: {
    handlers: {
      GET: async () => {
        const { appEnv: app_env, viteAppEnv: vite_app_env } = resolveDeploymentEnvLabels({
          runtimeAppEnv: process.env["APP_ENV"],
          runtimeViteAppEnv: process.env["VITE_APP_ENV"],
          buildAppEnv: import.meta.env["APP_ENV"] as string | undefined,
          buildViteAppEnv,
        });
        const supabase_project_ref = projectRefFrom(process.env["SUPABASE_URL"]);
        const runtime_source_fingerprint =
          (import.meta.env["VITE_RUNTIME_SOURCE_FINGERPRINT"] as string | undefined) ?? "unknown";
        const runtime_source_fingerprint_schema =
          (import.meta.env["VITE_RUNTIME_SOURCE_FINGERPRINT_SCHEMA"] as string | undefined) ??
          "unknown";
        const rawRuntimeSourceFileCount = import.meta.env[
          "VITE_RUNTIME_SOURCE_FILE_COUNT"
        ] as unknown;
        const runtime_source_file_count =
          typeof rawRuntimeSourceFileCount === "number"
            ? rawRuntimeSourceFileCount
            : Number.parseInt(String(rawRuntimeSourceFileCount ?? ""), 10);
        const runtimeSourceIdentityOk =
          /^[a-f0-9]{64}$/.test(runtime_source_fingerprint) &&
          runtime_source_fingerprint_schema === "transitionforward-runtime-source-v1" &&
          Number.isSafeInteger(runtime_source_file_count) &&
          runtime_source_file_count > 0;

        const build_validation = evaluateHostedBuildIdentity({
          appEnv: app_env,
          viteAppEnv: vite_app_env,
          supabaseProjectRef: supabase_project_ref,
          runtimeSourceIdentityOk,
          productionSecretsPresent: FORBIDDEN_IN_STAGING.filter((name) => !!process.env[name]),
          stagingSecretsPresent: FORBIDDEN_IN_PRODUCTION.filter((name) => !!process.env[name]),
        });

        return Response.json(
          {
            validation_scope: "hosted-build-inputs-only",
            app_env: app_env ?? "unknown",
            vite_app_env: vite_app_env ?? "unknown",
            supabase_project_ref,
            runtime_source_fingerprint,
            runtime_source_fingerprint_schema,
            runtime_source_fingerprint_algorithm: "sha256",
            runtime_source_file_count: Number.isSafeInteger(runtime_source_file_count)
              ? runtime_source_file_count
              : null,
            build_validation,
            deployment_acceptance: {
              required: true,
              health_path: "/api/public/env-health",
              exact_source_comparison_required: true,
              hostname_verified: false,
              payment_mode_verified: false,
            },
          },
          { status: build_validation.ok ? 200 : 503 },
        );
      },
    },
  },
});
