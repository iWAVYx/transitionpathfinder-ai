export function reportHistoryAcceptanceTarget(env: Record<string, string | undefined>) {
  if (env.RUN_REPORT_HISTORY_STAGING_QA !== "true" || env.REPORT_HISTORY_FIXTURE_CONFIRMATION !== "disposable-report-history") throw new Error("Explicit disposable report-history authorization is required");
  if (!/^\d+-\d+$/.test(env.REPORT_HISTORY_QA_RUN_ID ?? "")) throw new Error("Unique protected run ID required");
  const app = new URL(env.PLAYWRIGHT_BASE_URL ?? "");
  const backend = new URL(env.STAGING_SUPABASE_URL ?? "");
  if (app.href !== "https://transitionforward-staging.caysi101.workers.dev/" || backend.href !== "https://qgrertkqbwanerqqemph.supabase.co/") throw new Error("Refusing non-isolated targets");
  const key = env.STAGING_SUPABASE_PUBLISHABLE_KEY ?? "";
  let publicKey = key.startsWith("sb_publishable_");
  if (!publicKey) { try { publicKey = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role === "anon"; } catch {} }
  if (!publicKey || env.STAGING_SUPABASE_SERVICE_ROLE_KEY) throw new Error("Only caller-RLS public-key clients allowed");
  if (!/^[a-f0-9]{40}$/.test(env.E2E_EXPECTED_BUILD_SHA ?? "") || !/^[a-f0-9]{64}$/.test(env.EXPECTED_RUNTIME_SOURCE_FINGERPRINT ?? "")) throw new Error("Verified deployment identity required");
  return { origin: app.origin, backend: backend.origin, publicKey: key, runId: env.REPORT_HISTORY_QA_RUN_ID! };
}
