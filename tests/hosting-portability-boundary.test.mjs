import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, sep } from "node:path";
import { test } from "node:test";

const POLICY_PATH = "docs/production-readiness/hosting-portability-policy.json";
const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8"));

function read(path) {
  return readFileSync(path, "utf8");
}

function filesUnder(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? filesUnder(child) : [child];
  });
}

function normalize(path) {
  return path.split(sep).join("/");
}

function inventory() {
  const files = filesUnder("src").map(normalize).sort();
  const sourceFiles = files.filter((path) => /\.[cm]?[jt]sx?$/.test(path));
  const source = new Map(sourceFiles.map((path) => [path, read(path)]));
  const privilegedPattern = new RegExp(
    policy.sourceInventory.privilegedMarkers
      .map((marker) => marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|"),
  );

  return {
    publicTopLevelRoutes: files.filter((path) => /^src\/routes\/[^/]+\.tsx$/.test(path)),
    authenticatedRoutes: files.filter((path) =>
      /^src\/routes\/_authenticated\/.*\.tsx$/.test(path),
    ),
    serverFunctionFiles: sourceFiles.filter((path) => /\bcreateServerFn\b/.test(source.get(path))),
    privilegedRuntimeFiles: sourceFiles.filter((path) => privilegedPattern.test(source.get(path))),
    explicitEndpointFiles: files.filter((path) => /^src\/routes\/(api|lovable)\//.test(path)),
  };
}

function digest(paths) {
  return createHash("sha256").update(paths.join("\n")).digest("hex");
}

test("hosting portability remains fail-closed and does not authorize production", () => {
  assert.equal(policy.schemaVersion, 1);
  assert.match(policy.auditedMainSha, /^[a-f0-9]{40}$/);
  assert.equal(policy.status, "no-go");
  assert.equal(policy.currentArchitecture.applicationOrigin, "lovable-cloud");
  assert.equal(policy.currentArchitecture.privilegedRuntime, "lovable-cloud");
  assert.equal(policy.currentArchitecture.edgeProvider, "cloudflare");
  assert.equal(policy.currentArchitecture.cloudflareApplicationWorkerAuthorized, false);
  assert.equal(policy.currentArchitecture.productionPublishAuthorized, false);
  assert.equal(policy.externalProduction.authorized, false);
  assert.equal(policy.externalProduction.status, "blocked");
  assert.ok(policy.externalProduction.blockers.length >= 5);
  assert.ok(policy.externalProduction.forbiddenWithoutSeparateAuthorization.length >= 6);
});

test("source inventory changes require an explicit hosting-boundary review", () => {
  const actual = inventory();

  for (const [name, expected] of Object.entries(policy.sourceInventory.categories)) {
    assert.ok(actual[name], `unknown source inventory category ${name}`);
    assert.equal(actual[name].length, expected.count, `${name} count changed; review portability`);
    assert.equal(
      digest(actual[name]),
      expected.sha256,
      `${name} file set changed; review portability`,
    );
  }

  assert.ok(actual.serverFunctionFiles.length > 100, "full-stack server surface was undercounted");
  assert.ok(actual.privilegedRuntimeFiles.length > 40, "privileged runtime was undercounted");
});

test("external hosting policy protects server endpoints and secrets", () => {
  assert.deepEqual(policy.requestBoundary.protectedPrefixes, [
    "/_serverFn/",
    "/_server/",
    "/api/",
    "/lovable/",
    "/email/",
  ]);
  assert.ok(
    policy.requestBoundary.reviewedPublicBuildVariables.every((name) => name.startsWith("VITE_")),
  );

  for (const name of [
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_LIVE_API_KEY",
    "PAYMENTS_LIVE_WEBHOOK_SECRET",
    "LOVABLE_API_KEY",
  ]) {
    assert.ok(policy.requestBoundary.forbiddenClientSecrets.includes(name));
  }

  const adminClient = read("src/integrations/supabase/client.server.ts");
  assert.match(adminClient, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(adminClient, /bypasses RLS/);
  assert.doesNotMatch(adminClient, /import\.meta\.env\.VITE_.*SERVICE_ROLE/);

  const stripe = read("src/lib/stripe.server.ts");
  assert.match(stripe, /LOVABLE_API_KEY/);
  assert.match(stripe, /STRIPE_LIVE_API_KEY/);
  assert.match(stripe, /connector-gateway\.lovable\.dev/);

  const ai = read("src/lib/ai-gateway.server.ts");
  assert.match(ai, /ai\.gateway\.lovable\.dev/);
});

test("Cloudflare production application deployment remains retired", () => {
  assert.equal(existsSync("wrangler.production.toml"), false);
  assert.equal(existsSync(".github/workflows/deploy-production.yml"), false);

  const staging = read(".github/workflows/deploy-staging.yml");
  assert.match(staging, /Manual only/);
  assert.match(staging, /environment:\s*staging/);
  assert.match(staging, /transitionforward-staging/);
  assert.doesNotMatch(staging, /transitionforward-production/);

  const retired = read("docs/production-readiness/production-worker-secret-provisioning.md");
  assert.match(retired, /Retired production Worker secret path/);
  assert.match(retired, /No GitHub workflow may deploy or provision/);
});

test("Lovable development remains separate from preview and publish acceptance", () => {
  assert.equal(policy.lovableDevelopment.codeEditingAvailable, true);
  assert.equal(policy.lovableDevelopment.gitIngestObserved, true);
  assert.equal(policy.lovableDevelopment.hostedPreviewCurrent, false);
  assert.equal(policy.lovableDevelopment.hostedPreviewStatus, "build-unsuccessful");
  assert.ok(
    policy.lovableDevelopment.safeWorkflow.includes(
      "review the GitHub diff and open a pull request",
    ),
  );
  assert.ok(policy.cutoverAcceptance.some((item) => item.includes("exact-SHA")));
  assert.ok(policy.cutoverAcceptance.some((item) => item.includes("separately authorizes")));
});

test("local build evidence distinguishes portability from Lovable root cause", () => {
  assert.equal(policy.localVerification.constrainedBuildOldSpaceMiB, 1216);
  assert.match(policy.localVerification.constrainedBuildResult, /heap-out-of-memory/);
  assert.equal(policy.localVerification.productionStyleBuildOldSpaceMiB, 4096);
  assert.equal(policy.localVerification.productionStyleBuildResult, "passed");
  assert.equal(policy.localVerification.serverEntryPresent, true);
  assert.equal(policy.localVerification.serviceWorkerPresent, true);
  assert.equal(policy.localVerification.workboxRuntimeCount, 1);
  assert.equal(policy.localVerification.lovableRootCauseProven, false);
});
