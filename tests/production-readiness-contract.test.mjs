import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const AUDIT_PATH = "docs/production-readiness/audit-state.json";
const audit = JSON.parse(readFileSync(AUDIT_PATH, "utf8"));

const productionGoControls = [
  "githubEnvironmentProvisioned",
  "releaseProcedureDocumented",
  "migrationBaselineVerified",
  "exactDeploymentIdentityVerified",
  "hostingControlPlaneVerified",
  "backupInventoryVerified",
  "restoreDrillVerified",
  "stripeLiveReadinessVerified",
  "secretIsolationVerified",
  "securityFindingsClosed",
  "malwareScanningVerified",
];

function read(path) {
  return readFileSync(path, "utf8");
}

function filesUnder(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? filesUnder(child) : [child];
  });
}

function envEntries(path) {
  return read(path)
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/))
    .filter(Boolean)
    .map((match) => ({ name: match[1], value: match[2].trim().replace(/^["']|["']$/g, "") }));
}

test("audit is fail-closed until every production control is proven", () => {
  const verifiedStagingSha = "c3abb18795914b30253c598efd27fb1db0eb3987";

  assert.equal(audit.schemaVersion, 2);
  assert.match(audit.auditedMainSha, /^[a-f0-9]{40}$/);
  assert.equal(audit.auditedMainSha, verifiedStagingSha);
  assert.equal(audit.staging.exactDeploymentSha, verifiedStagingSha);
  assert.equal(audit.staging.deploymentRun, 32865396727);
  assert.equal(audit.staging.releaseReadinessRun, 32902198754);
  assert.equal(audit.staging.releaseReadinessVerified, true);
  assert.notEqual(
    audit.production.supabaseProjectRef,
    audit.staging.supabaseProjectRef,
    "production and staging must never share a Supabase project",
  );
  assert.notEqual(
    new URL(audit.production.canonicalOrigin).hostname,
    new URL(audit.staging.workerOrigin).hostname,
    "production and staging must never share a deployment hostname",
  );
  assert.equal(audit.staging.stripeMode, "sandbox");
  assert.equal(audit.production.stripeModeRequired, "live");
  assert.equal(audit.production.hostingProvider, "lovable-cloud");
  assert.equal(audit.production.privilegedRuntime, "lovable-cloud");
  assert.equal(audit.production.edgeProvider, "cloudflare");
  assert.equal(audit.production.cloudflareWorkerDeploymentAuthorized, false);
  for (const control of productionGoControls) {
    assert.equal(
      typeof audit.production[control],
      "boolean",
      `production.${control} must be an explicit boolean`,
    );
  }

  if (audit.status === "go") {
    for (const control of productionGoControls) {
      assert.equal(audit.production[control], true, `production.${control} must pass for GO`);
    }
  } else {
    assert.equal(audit.status, "no-go");
    assert.ok(
      productionGoControls.some((control) => audit.production[control] === false),
      "a NO-GO audit must retain at least one explicit blocking control",
    );
  }
});

test("machine-readable migration inventory matches the canonical directory", () => {
  const migrations = readdirSync("supabase/migrations")
    .filter((name) => name.endsWith(".sql"))
    .sort();
  assert.equal(migrations.length, audit.migrations.canonicalCount);
  assert.equal(migrations.at(-1), audit.migrations.latestCanonicalFile);
  for (const migration of migrations) {
    assert.match(migration, /^\d{14}_[A-Za-z0-9_-]+\.sql$/);
  }
});

test("production migration baseline tooling is read-only and fail-closed", () => {
  const sql = read("docs/production-readiness/production-migration-baseline.sql");
  const executableSql = sql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  assert.match(executableSql, /^\s*select\b/i);
  assert.doesNotMatch(
    executableSql,
    /\b(insert|update|delete|merge|alter|drop|create|truncate|grant|revoke|call|do)\b/i,
  );
  assert.match(executableSql, /statements_md5/);
  assert.match(executableSql, /code_md5/);

  const comparator = read("scripts/compare-production-migration-history.mjs");
  assert.match(comparator, /empty-production-history/);
  assert.match(comparator, /unresolved-production-history/);
  assert.match(comparator, /invalid-alignment-policy/);
  assert.match(comparator, /pending-production-migration/);
  assert.doesNotMatch(comparator, /SUPABASE_(SERVICE_ROLE|ACCESS_TOKEN|DB_PASSWORD)/);

  const policy = JSON.parse(read("docs/production-readiness/production-migration-policy.json"));
  assert.equal(policy.target, "lovable-production");
  assert.equal(policy.historicalVariants.length, 3);
  assert.equal(policy.supersededCanonicalFiles.length, 6);
  assert.deepEqual(policy.excludedCanonicalFiles, [
    {
      file: "20260621153500_e2e_role_dashboard_readiness.sql",
      productionForbidden: true,
      reason:
        "This migration creates synthetic E2E roles, demo students, and E2E organizations for isolated staging; it must never run in production.",
    },
  ]);

  const comparison = spawnSync(
    process.execPath,
    [
      "scripts/compare-production-migration-history.mjs",
      "docs/production-readiness/evidence/production-migration-history-2026-08-23.csv",
      "--json",
    ],
    { encoding: "utf8" },
  );
  assert.equal(comparison.status, 2, comparison.stderr);
  const report = JSON.parse(comparison.stdout);
  assert.equal(report.status, "blocked");
  assert.deepEqual(report.blockers, ["pending-production-migration"]);
  assert.equal(report.appliedCount, 181);
  assert.equal(report.canonicalCount, 191);
  assert.equal(report.directCoverageCount, 181);
  assert.equal(report.supersededCount, 6);
  assert.equal(report.excludedCount, 1);
  assert.equal(report.pendingCount, 3);
  assert.deepEqual(report.pending, [
    "20260821230000_security_remediation_hardening.sql",
    "20260825041500_restore_admin_helper_grants_and_public_cms_reads.sql",
    "20260825050000_scope_public_cms_admin_policies.sql",
  ]);
  assert.equal(audit.production.migrationBaselineVerified, false);
});

test("tracked environment files contain only reviewed public variables", () => {
  const allowlists = {
    ".env": new Set([
      "SUPABASE_PROJECT_ID",
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_URL",
      "VITE_SUPABASE_PROJECT_ID",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "VITE_SUPABASE_URL",
    ]),
    ".env.development": new Set(["VITE_PAYMENTS_CLIENT_TOKEN"]),
    ".env.production": new Set(["VITE_APP_ENV", "VITE_PAYMENTS_CLIENT_TOKEN"]),
  };
  const tracked = execFileSync(
    "git",
    ["-c", `safe.directory=${process.cwd()}`, "ls-files", ".env*"],
    { encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  assert.deepEqual(tracked.sort(), Object.keys(allowlists).sort());
  for (const path of tracked) {
    for (const { name, value } of envEntries(path)) {
      assert.ok(allowlists[path].has(name), `${path} contains unreviewed variable ${name}`);
      assert.doesNotMatch(name, /(SERVICE_ROLE|SECRET|PRIVATE|PASSWORD|API_KEY)/);
      assert.doesNotMatch(value, /^(sk_|rk_|whsec_)/, `${path}:${name} looks server-secret-like`);
    }
  }

  const devPayment = envEntries(".env.development").find(
    ({ name }) => name === "VITE_PAYMENTS_CLIENT_TOKEN",
  );
  const prodPayment = envEntries(".env.production").find(
    ({ name }) => name === "VITE_PAYMENTS_CLIENT_TOKEN",
  );
  const prodAppEnv = envEntries(".env.production").find(({ name }) => name === "VITE_APP_ENV");
  assert.match(devPayment?.value ?? "", /^pk_(test|sandbox)_/);
  assert.match(prodPayment?.value ?? "", /^pk_live_/);
  assert.equal(prodAppEnv?.value, "production");

  const ignore = read(".gitignore");
  assert.match(ignore, /^\.env\*$/m);
});

test("PR production audit is credential-free", () => {
  const workflow = read(".github/workflows/production-readiness-audit.yml");
  assert.match(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./);
  assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(workflow, /STRIPE_LIVE_API_KEY/);
});

test("no workflow references a generic service-role secret", () => {
  for (const name of readdirSync(".github/workflows").filter((file) => /\.ya?ml$/.test(file))) {
    const source = read(join(".github/workflows", name));
    assert.doesNotMatch(
      source,
      /secrets\.SUPABASE_SERVICE_ROLE_KEY/,
      `${name} must use an environment-scoped STAGING_* secret in a protected job`,
    );
  }

  for (const name of [
    "calendar-rls-qa.yml",
    "cross-district-rls-qa.yml",
    "permission-regression-qa.yml",
  ]) {
    const source = read(join(".github/workflows", name));
    assert.match(source, /environment:\s*staging/);
    assert.match(source, /github\.event_name == 'push'/);
    assert.match(source, /secrets\.STAGING_SUPABASE_/);
    assert.doesNotMatch(source, /secrets\.(VITE_)?SUPABASE_/);
  }
});

test("protected staging RLS workflows use a deterministic supported runtime", () => {
  for (const name of [
    "calendar-rls-qa.yml",
    "cross-district-rls-qa.yml",
    "permission-regression-qa.yml",
  ]) {
    const source = read(join(".github/workflows", name));
    assert.match(source, /node-version:\s*"22"/);
    assert.match(source, /@supabase\/supabase-js@2\.106\.2/);
    assert.doesNotMatch(source, /@supabase\/supabase-js@\^2/);
  }
});

test("staging SQL RLS checks fail closed on the isolated database identity", () => {
  const workflow = read(".github/workflows/calendar-rls-qa.yml");
  assert.match(workflow, /PGHOST:\s*aws-0-ca-central-1\.pooler\.supabase\.com/);
  assert.match(workflow, /PGUSER:\s*postgres\.qgrertkqbwanerqqemph/);
  assert.match(workflow, /PGPASSWORD:\s*\$\{\{ secrets\.STAGING_DB_PASSWORD \}\}/);
  assert.match(workflow, /PGSSLMODE:\s*require/);
  assert.doesNotMatch(workflow, /STAGING_DB_URL/);
  assert.doesNotMatch(workflow, /lrqcntqyekucamifpffs/);
});

test("fixed staging identities consume only the protected synthetic password", () => {
  for (const name of [
    "calendar-rls-qa.yml",
    "cross-district-rls-qa.yml",
    "permission-regression-qa.yml",
  ]) {
    const source = read(join(".github/workflows", name));
    assert.match(source, /STAGING_E2E_PASSWORD:\s*\$\{\{ secrets\.STAGING_E2E_PASSWORD \}\}/);
  }

  for (const name of [
    "cross-district-rls.test.mjs",
    "district-school-hijack-rls.test.mjs",
    "student-relationships-consent-rls.test.mjs",
    "rls-demo-isolation.test.mjs",
  ]) {
    const source = read(join("tests", name));
    assert.match(source, /process\.env\.STAGING_E2E_PASSWORD/);
    assert.doesNotMatch(source, /TestPass!2026/);
  }
});

test("staging identity reconciliation rotates existing synthetic users and fails closed", () => {
  const seed = read("scripts/seed-staging-identities.mjs");
  assert.match(seed, /const password = process\.env\.STAGING_E2E_PASSWORD;/);
  assert.match(seed, /updateUserById\(existing\.id, \{[\s\S]*?password/);
  assert.match(seed, /required fixed staging QA identity is missing/);
  assert.doesNotMatch(seed, /Staging-E2E-Passw0rd!/);

  for (const email of [
    "qa.districtadmin@transitionforward.test",
    "qa.schooladmin@transitionforward.test",
    "qa.partner@transitionforward.test",
    "qa.parent@transitionforward.test",
    "qa.educator@transitionforward.test",
  ]) {
    assert.match(seed, new RegExp(email.replaceAll(".", "\\.")));
  }
});

test("legacy QA identity bootstrap is manual, protected, and staging-only", () => {
  const script = read("scripts/bootstrap-staging-qa-identities.mjs");
  const workflow = read(".github/workflows/bootstrap-staging-qa-identities.yml");

  assert.match(script, /const STAGING_PROJECT_REF = "qgrertkqbwanerqqemph"/);
  assert.match(script, /const PRODUCTION_PROJECT_REF = "lrqcntqyekucamifpffs"/);
  assert.match(script, /REFUSING: target is the production Supabase project/);
  assert.match(script, /admin\.auth\.admin\.createUser\(\{[\s\S]*?id: identity\.id/);
  assert.match(script, /const password = process\.env\.STAGING_E2E_PASSWORD/);
  assert.doesNotMatch(script, /TestPass!2026|Staging-E2E-Passw0rd!/);

  for (const [email, id] of [
    ["qa.districtadmin@transitionforward.test", "b4aec3a7-daa5-453d-9481-a45bac781437"],
    ["qa.schooladmin@transitionforward.test", "97c6e8b7-faa9-4bd0-a044-012c55122ddd"],
    ["qa.parent@transitionforward.test", "038f92be-916f-4dc9-84e4-b36f9645f5c2"],
    ["qa.educator@transitionforward.test", "44444444-4444-4444-8444-444444444444"],
    ["qa.partner@transitionforward.test", "55555555-5555-4555-8555-555555555555"],
  ]) {
    assert.match(script, new RegExp(email.replaceAll(".", "\\.")));
    assert.match(script, new RegExp(id));
  }

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s+(?:pull_request|push):/m);
  assert.match(
    workflow,
    /if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/,
  );
  assert.match(workflow, /environment:\s*staging/);
  assert.match(workflow, /bootstrap-staging-qa/);
  assert.match(workflow, /secrets\.STAGING_SUPABASE_URL/);
  assert.match(workflow, /secrets\.STAGING_SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(workflow, /secrets\.STAGING_E2E_PASSWORD/);
  assert.doesNotMatch(workflow, /lrqcntqyekucamifpffs/);
});

test("RLS policy snapshots can only be captured manually from protected staging", () => {
  const workflow = read(".github/workflows/capture-staging-calendar-rls-snapshot.yml");
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s+(?:pull_request|push):/m);
  assert.match(
    workflow,
    /if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/,
  );
  assert.match(workflow, /environment:\s*staging/);
  assert.match(workflow, /PGHOST:\s*aws-0-ca-central-1\.pooler\.supabase\.com/);
  assert.match(workflow, /PGUSER:\s*postgres\.qgrertkqbwanerqqemph/);
  assert.match(workflow, /PGPASSWORD:\s*\$\{\{ secrets\.STAGING_DB_PASSWORD \}\}/);
  assert.match(workflow, /UPDATE_SNAPSHOTS:\s*"1"/);
  assert.match(workflow, /staging-snapshot/);
  assert.match(workflow, /node --test tests\/calendar-rls\.test\.mjs/);
  assert.match(workflow, /node --test tests\/documents-rls\.test\.mjs/);
  assert.match(workflow, /tests\/__snapshots__\/documents-rls-policies\.snap\.json/);
  assert.match(workflow, /tests\/__snapshots__\/documents-rls-matrix\.snap\.json/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.doesNotMatch(workflow, /lrqcntqyekucamifpffs/);
});

test("nightly release evidence is fixed to isolated staging and exact SHA", () => {
  const workflow = read(".github/workflows/release-readiness.yml");
  assert.match(workflow, /environment:\s*staging/);
  assert.match(
    workflow,
    /PLAYWRIGHT_BASE_URL:\s*https:\/\/transitionforward-staging\.caysi101\.workers\.dev/,
  );
  assert.match(workflow, /E2E_EXPECTED_BUILD_SHA:\s*\$\{\{ github\.sha \}\}/);
  assert.match(workflow, /REQUIRE_ALL_ROLES:\s*"true"/);
  assert.match(workflow, /ALLOW_STAGING_OWNER_WITHOUT_TOTP:\s*"true"/);
  assert.match(workflow, /secrets\.STAGING_E2E_PASSWORD/);
  assert.doesNotMatch(workflow, /secrets\.E2E_/);
  assert.doesNotMatch(workflow, /base_url:/);
  assert.doesNotMatch(workflow, /transitionforwardct\.com/);
});

test("primary release fonts are bundled instead of fetched from Google", () => {
  const packageJson = read("package.json");
  const styles = read("src/styles.css");
  const root = read("src/routes/__root.tsx");
  const visualRegression = read("tests/e2e/release-readiness/visual-regression.spec.ts");

  assert.match(packageJson, /@fontsource-variable\/cormorant-garamond/);
  assert.match(packageJson, /@fontsource-variable\/karla/);
  assert.match(styles, /cormorant-garamond-latin-ext-wght-normal\.woff2/);
  assert.match(styles, /cormorant-garamond-latin-wght-normal\.woff2/);
  assert.match(styles, /cormorant-garamond-latin-ext-wght-italic\.woff2/);
  assert.match(styles, /cormorant-garamond-latin-wght-italic\.woff2/);
  assert.match(styles, /karla-latin-ext-wght-normal\.woff2/);
  assert.match(styles, /karla-latin-wght-normal\.woff2/);
  assert.doesNotMatch(styles, /@import "@fontsource-variable\/cormorant-garamond/);
  assert.doesNotMatch(styles, /@import "@fontsource-variable\/karla/);
  assert.doesNotMatch(root, /family=Cormorant\+Garamond/);
  assert.doesNotMatch(root, /family=Karla/);
  assert.match(visualRegression, /Cormorant Garamond Variable/);
  assert.match(visualRegression, /Karla Variable/);
});

test("hosted Worker builds omit unused email formatting dependencies", () => {
  const viteConfig = read("vite.config.ts");
  const renderer = read("src/lib/email-render.server.ts");
  const emailRoutes = [
    "src/routes/api/public/channel-digest-tick.ts",
    "src/routes/lovable/email/auth/preview.ts",
    "src/routes/lovable/email/auth/webhook.ts",
    "src/routes/lovable/email/transactional/preview.ts",
    "src/routes/lovable/email/transactional/send.ts",
  ];

  assert.match(viteConfig, /reportCompressedSize:\s*false/);
  assert.match(renderer, /react-dom\/server\.edge/);
  assert.match(renderer, /from ["']html-to-text["']/);
  assert.doesNotMatch(renderer, /(?:from|import\()\s*["']prettier/);

  for (const path of emailRoutes) {
    const source = read(path);
    assert.match(source, /email-render\.server/);
    assert.doesNotMatch(
      source,
      /import\s*\{[^}]*\brender\b[^}]*\}\s*from\s*["']@react-email\/components["']/,
      `${path} must not restore React Email's Prettier-backed renderer`,
    );
  }
});

test("hosted builds stay within Lovable memory limits without duplicate PWA work", () => {
  const packageJson = read("package.json");
  const viteConfig = read("vite.config.ts");
  const buildApp = read("scripts/build-app.mjs");
  const buildEnvironment = read("scripts/build-environment.mjs");
  const buildSha = read("scripts/resolve-build-sha.mjs");

  assert.match(
    packageJson,
    /--max-semi-space-size=4 --max-old-space-size=3072 --expose-gc' node scripts\/build-app\.mjs/,
  );
  assert.match(
    packageJson,
    /--max-semi-space-size=4 --max-old-space-size=3072 --expose-gc' node scripts\/build-app\.mjs --mode development/,
  );
  assert.match(buildApp, /spawn\(process\.execPath/);
  assert.match(buildApp, /VITE_APP_BUILD_TIME:\s*buildTime/);
  assert.match(buildApp, /createBuilder/);
  assert.match(buildApp, /plugins:\s*\[splitHeavyBuildEnvironmentsPlugin\]/);
  assert.match(buildApp, /runNodeScript\(environmentBuilder, \["client", mode\]\)/);
  assert.match(buildApp, /client\.isBuilt\s*=\s*true/);
  assert.match(buildApp, /runNodeScript\(environmentBuilder, \["ssr", mode\]\)/);
  assert.match(buildApp, /ssr\.isBuilt\s*=\s*true/);
  assert.match(buildApp, /builder\.buildApp\(\)/);
  assert.match(buildApp, /builder\.environments\.client\?\.config\.build\.outDir/);
  assert.match(buildApp, /runNodeScript\(serviceWorkerBuilder, \[clientOutputDirectory\]\)/);
  assert.match(buildApp, /generate-service-worker\.mjs/);
  assert.match(buildEnvironment, /createBuilder/);
  assert.match(buildEnvironment, /builder\.build\(environment\)/);
  assert.match(buildEnvironment, /plugins:\s*environmentName === "ssr"/);
  assert.match(buildEnvironment, /transitionforward:split-client-virtual-modules/);
  assert.match(buildEnvironment, /tanstack-start-manifest:v/);
  assert.match(buildEnvironment, /readCapturedVirtualModule\(startManifestFile, startManifestId\)/);
  assert.match(buildEnvironment, /#tanstack-start-server-fn-resolver/);
  assert.match(
    buildEnvironment,
    /readCapturedVirtualModule\(serverFnResolverFile, serverFnResolverId\)/,
  );
  assert.match(buildEnvironment, /tanstack-start:start-manifest-plugin/);
  assert.match(buildEnvironment, /tanstack-start-core:server-fn-resolver/);
  assert.match(buildEnvironment, /moduleSource\.length < 1_000/);
  assert.match(viteConfig, /sourcemap:\s*false/);
  assert.match(viteConfig, /reportCompressedSize:\s*false/);
  assert.match(viteConfig, /maxParallelFileOps:\s*2/);
  assert.match(viteConfig, /resolveBuildSha\(\)/);
  assert.match(buildSha, /git["'],\s*\[["']rev-parse["'],\s*["']HEAD["']\]/);
  assert.match(buildSha, /\^\[a-f0-9\]\{40\}\$/);
  assert.match(buildSha, /return normalizeBuildSha\(checkoutSha\) \?\? ["']dev["']/);
  assert.match(viteConfig, /function buildEnvironmentGarbageCollector\(\): Plugin/);
  assert.match(viteConfig, /closeBundle:\s*\{[\s\S]*?global\.gc\?\.\(\)/);
  assert.match(
    viteConfig,
    /plugins:\s*\[\s*serverAuthenticatedRouteStubs\(\),\s*buildEnvironmentGarbageCollector\(\)/,
  );
  assert.doesNotMatch(viteConfig, /VitePWA/);
});

test("build verification has a credential-free exact-main recovery trigger", () => {
  const workflow = read(".github/workflows/build-ssr-verify.yml");

  assert.match(workflow, /push:\s*[\s\S]*?branches:\s*\[['"]\*\*['"]\]/);
  assert.match(workflow, /pull_request:\s*[\s\S]*?branches:\s*\[['"]\*\*['"]\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /environment:\s*(?:staging|production)/);
  assert.doesNotMatch(workflow, /secrets\./);
});

test("SSR stubs only the authenticated client-only route subtree", () => {
  const viteConfig = read("vite.config.ts");
  const authenticatedRoute = read("src/routes/_authenticated.tsx");

  assert.match(
    authenticatedRoute,
    /createFileRoute\(["']\/_authenticated["']\)[\s\S]*?ssr:\s*false/,
  );
  assert.match(viteConfig, /function serverAuthenticatedRouteStubs\(\): Plugin/);
  assert.match(
    viteConfig,
    /applyToEnvironment:\s*\(environment\)\s*=>\s*environment\.name\s*!==\s*["']client["']/,
  );
  assert.match(viteConfig, /normalizedId\.endsWith\(["']\/src\/routes\/_authenticated\.tsx["']\)/);
  assert.match(viteConfig, /normalizedId\.includes\(["']\/src\/routes\/_authenticated\/["']\)/);
  assert.match(
    viteConfig,
    /create\(\?:ServerFn\|ServerOnlyFn\|Middleware\|ServerFileRoute\)/,
    "the build must fail closed if an authenticated route gains an inline server primitive",
  );
  assert.match(viteConfig, /plugins:\s*\[\s*serverAuthenticatedRouteStubs\(\)/);
});

test("protected staging builds use dedicated CI memory headroom", () => {
  const packageJson = read("package.json");
  const deployStaging = read(".github/workflows/deploy-staging.yml");

  assert.match(
    packageJson,
    /"build:staging":\s*"NODE_OPTIONS=--max-old-space-size=4096 vite build && node scripts\/generate-service-worker\.mjs"/,
  );
  assert.match(deployStaging, /- run:\s*bun run build:staging/);
  assert.doesNotMatch(deployStaging, /- run:\s*bun run build\s*$/m);
});

test("hosted builds use the supported server validator API", () => {
  const deprecatedValidatorCalls = filesUnder("src")
    .filter((path) => /\.[cm]?[jt]sx?$/.test(path))
    .filter((path) => /\.inputValidator\s*\(/.test(read(path)));

  assert.deepEqual(
    deprecatedValidatorCalls,
    [],
    "deprecated inputValidator calls multiply warnings across client, SSR, and Worker builds",
  );
});

test("pull request refs cannot request protected staging browser credentials", () => {
  const workflow = read(".github/workflows/dashboard-regression.yml");
  assert.match(workflow, /pull_request:/);
  assert.match(
    workflow,
    /e2e:\s*\n\s+if: github\.event_name != 'pull_request'[\s\S]*?environment:\s*staging/,
  );
  assert.match(workflow, /secrets\.STAGING_E2E_PASSWORD/);
});

test("role-guard browser CI uses the bounded standardized Playwright installer", () => {
  const workflow = read(".github/workflows/role-guard-qa.yml");
  assert.match(
    workflow,
    /role-leak-signedin:[\s\S]*?runs-on:\s*ubuntu-latest[\s\S]*?timeout-minutes:\s*30/,
  );
  assert.match(
    workflow,
    /name:\s*Install Playwright browsers\s*\n\s*timeout-minutes:\s*10\s*\n\s*run:\s*bun run playwright:install/,
  );
  assert.doesNotMatch(workflow, /bunx playwright install/);
});

test("accessibility CI uses the bounded standardized Playwright installer", () => {
  const workflow = read(".github/workflows/report-a11y.yml");
  assert.match(
    workflow,
    /report-a11y:\s*\n\s+runs-on:\s*ubuntu-latest\s*\n\s+timeout-minutes:\s*15/,
  );
  assert.match(
    workflow,
    /name:\s*Install Playwright browsers\s*\n\s*timeout-minutes:\s*10\s*\n\s*run:\s*bun run playwright:install/,
  );
  assert.doesNotMatch(workflow, /bunx playwright install/);
});

test("PWA worker is generated into and required from the deployed asset directory", () => {
  const serviceWorkerBuild = read("scripts/generate-service-worker.mjs");
  const stagingDeploy = read(".github/workflows/deploy-staging.yml");
  const privacyCleanup = read("public/sw-privacy-cleanup.js");

  assert.match(serviceWorkerBuild, /vite-plugin-pwa\/package\.json/);
  assert.match(serviceWorkerBuild, /vitePwaRequire\(["']workbox-build["']\)/);
  assert.match(serviceWorkerBuild, /process\.argv\[2\]/);
  assert.match(serviceWorkerBuild, /join\(publicDirectory, ["']sw\.js["']\)/);
  assert.match(serviceWorkerBuild, /importScripts:\s*\[["']\/sw-privacy-cleanup\.js["']\]/);
  assert.match(
    serviceWorkerBuild,
    /request\.mode\s*===\s*["']navigate["'][\s\S]*?handler:\s*["']NetworkOnly["'][\s\S]*?fallbackURL:\s*["']\/offline\.html["']/,
  );
  assert.doesNotMatch(serviceWorkerBuild, /cacheName:\s*["']tf-pages["']/);
  assert.doesNotMatch(serviceWorkerBuild, /navigateFallback:/);
  assert.match(privacyCleanup, /caches\.delete\(["']tf-pages["']\)/);
  assert.match(stagingDeploy, /\[ ! -f "\$assets\/sw\.js" \]/);
  assert.match(stagingDeploy, /workbox-\*\.js/);
  assert.match(stagingDeploy, /Verify deployed PWA assets/);
  assert.match(stagingDeploy, /Verify exact staging deployment identity/);
  assert.match(stagingDeploy, /health_sha=.*git_commit_sha/);
  assert.match(stagingDeploy, /\$health_sha" = "\$GITHUB_SHA/);
  assert.match(stagingDeploy, /"\$STAGING_ORIGIN\/sw\.js"/);
  assert.match(stagingDeploy, /grep -q 'sw-privacy-cleanup\.js'/);
  assert.match(stagingDeploy, /Workbox propagation attempt/);
});

test("deployable source owns every referenced marketing image", () => {
  const sourceFiles = filesUnder("src").filter((path) => /\.(?:ts|tsx)$/.test(path));
  for (const path of sourceFiles) {
    const source = read(path);
    assert.doesNotMatch(
      source,
      /\.asset\.json/,
      `${path} depends on a Lovable-only asset manifest`,
    );
    assert.doesNotMatch(
      source,
      /\/__l5e\/assets-v1\//,
      `${path} depends on a Lovable-only asset route`,
    );
  }

  const bundled = readdirSync("src/assets/bundled").filter((name) => name.endsWith(".webp"));
  assert.equal(
    bundled.length,
    31,
    "all referenced Lovable images must have optimized local copies",
  );
  for (const name of bundled) {
    assert.ok(
      statSync(join("src/assets/bundled", name)).size <= 400 * 1024,
      `${name} is too large for the deployable marketing bundle`,
    );
  }
});

test("Lovable keeps the privileged production runtime and Cloudflare stays edge-only", () => {
  assert.equal(audit.production.hostingProvider, "lovable-cloud");
  assert.equal(audit.production.privilegedRuntime, "lovable-cloud");
  assert.equal(audit.production.edgeProvider, "cloudflare");
  assert.equal(audit.production.cloudflareWorkerDeploymentAuthorized, false);
  assert.equal(audit.production.releaseProcedureDocumented, true);
  assert.equal(audit.production.hostingControlPlaneVerified, false);
  assert.equal(audit.status, "no-go");

  const workflows = readdirSync(".github/workflows").filter((name) => /\.ya?ml$/.test(name));
  assert.equal(workflows.includes("deploy-production.yml"), false);
  assert.equal(workflows.includes("provision-production-worker-secrets.yml"), false);
  assert.equal(readdirSync(".").includes("wrangler.production.toml"), false);

  for (const name of workflows) {
    const source = read(join(".github/workflows", name));
    assert.doesNotMatch(source, /wrangler\.production\.toml/);
    assert.doesNotMatch(source, /transitionforward-production/);
    assert.doesNotMatch(source, /PRODUCTION_SUPABASE_SERVICE_ROLE_KEY/);
  }

  const publicCmsClient = read("src/integrations/supabase/public.server.ts");
  const cmsFunctions = read("src/lib/cms/cms.functions.ts");
  const publicCmsReads = [
    "getPageSection",
    "getPublishedFaqs",
    "getPublishedBlogPosts",
    "getBlogPostBySlug",
  ];

  assert.doesNotMatch(publicCmsClient, /SERVICE_ROLE/);
  assert.match(publicCmsClient, /SUPABASE_PUBLISHABLE_KEY/);
  assert.match(publicCmsClient, /persistSession:\s*false/);
  for (const exportName of publicCmsReads) {
    const start = cmsFunctions.indexOf(`export const ${exportName}`);
    const end = cmsFunctions.indexOf("\nexport const ", start + 1);
    assert.notEqual(start, -1, `${exportName} must remain present`);
    assert.notEqual(end, -1, `${exportName} must remain independently auditable`);
    const handler = cmsFunctions.slice(start, end);
    assert.match(handler, /@\/integrations\/supabase\/public\.server/);
    assert.doesNotMatch(handler, /client\.server|supabaseAdmin/);
  }

  const alignment = read("docs/production-readiness/alignment-2026-08-21.md");
  const retiredPath = read("docs/production-readiness/production-worker-secret-provisioning.md");
  const superseded = read("docs/production-readiness/alignment-2026-08-20.md");

  assert.match(alignment, /Lovable Cloud remains the production application origin/i);
  assert.match(alignment, /Cloudflare is limited to the[\s\S]*custom domain and edge protections/i);
  assert.match(alignment, /does not display, export, forward, or copy/i);
  assert.match(alignment, /Do not attach a Worker route/i);
  assert.match(alignment, /Build unsuccessful/);
  assert.match(alignment, /Preview is out of date/);
  assert.match(alignment, /production remains NO-GO/i);
  assert.match(retiredPath, /retired and non-runnable/i);
  assert.match(retiredPath, /No GitHub workflow may deploy or provision/i);
  assert.match(retiredPath, /workers\.dev.*disabled/i);
  assert.match(retiredPath, /no custom domain, route, or[\s\S]*application secrets/i);
  assert.match(superseded, /Superseded on 2026-08-21/i);
});

test("production identity fails closed and operator documents are complete", () => {
  const identity = read("src/lib/env-identity.ts");
  const health = read("src/routes/api/public/env-health.ts");
  assert.match(identity, /evaluateProductionIdentity/);
  assert.match(identity, /Stripe mode must be live/);
  assert.match(identity, /exact 40-character Git commit SHA/);
  assert.match(health, /FORBIDDEN_IN_PRODUCTION/);
  assert.match(health, /is_production_target/);
  assert.match(
    health,
    /process\.env\["GIT_COMMIT_SHA"\][\s\S]*?import\.meta\.env\["VITE_APP_BUILD_SHA"\]/,
  );
  assert.match(health, /evaluateStagingIdentity\(\{[\s\S]*?gitCommitSha: git_commit_sha/);

  const auditReport = read("docs/production-readiness/audit-2026-08-13.md");
  const currentAlignment = read("docs/production-readiness/alignment-2026-08-16.md");
  const hostingAlignment = read("docs/production-readiness/alignment-2026-08-21.md");
  const recoveryGate = read("docs/production-readiness/recovery-gate-2026-08-23.md");
  const restoreDrillPlan = read(
    "docs/production-readiness/isolated-restore-drill-plan-2026-08-25.md",
  );
  const latestPreflight = read("docs/production-readiness/preflight-2026-08-25.md");
  const migrationPlan = read("docs/production-readiness/migration-and-rollback-plan.md");
  const checklist = read("docs/production-readiness/release-checklist.md");
  assert.match(auditReport, /NO-GO/);
  assert.match(auditReport, /Do not deploy or migrate production/);
  assert.match(currentAlignment, /Lovable Cloud/);
  assert.match(currentAlignment, /Production remains \*\*NO-GO\*\*/);
  assert.match(currentAlignment, /staging credentials/i);
  assert.match(hostingAlignment, /Lovable Cloud remains/i);
  assert.match(hostingAlignment, /Cloudflare[\s\S]*edge protections/i);
  assert.match(hostingAlignment, /separate explicit authorization/i);
  assert.match(recoveryGate, /BLOCKED \/ NO-GO/);
  assert.match(recoveryGate, /support request is not proof that recovery works/i);
  assert.match(recoveryGate, /do not publish, migrate, pause, reset/i);
  assert.match(recoveryGate, /15 daily recovery points/i);
  assert.match(recoveryGate, /Aug 25, 2026, 10:14:51 AM UTC/);
  assert.match(recoveryGate, /student-documents/);
  assert.match(recoveryGate, /site-media/);
  assert.match(recoveryGate, /channel-attachments/);
  assert.match(recoveryGate, /0\.0 KB for 0 files/i);
  assert.match(recoveryGate, /Export data was not selected/i);
  assert.match(restoreDrillPlan, /PLANNED \/ NOT YET RUN/);
  assert.match(restoreDrillPlan, /lrqcntqyekucamifpffs/);
  assert.match(restoreDrillPlan, /qgrertkqbwanerqqemph/);
  assert.match(restoreDrillPlan, /must never be/i);
  assert.match(restoreDrillPlan, /exact price/i);
  assert.match(restoreDrillPlan, /outbound integrations disabled/i);
  assert.match(restoreDrillPlan, /SHA-256 checksum/i);
  assert.match(restoreDrillPlan, /RPO and RTO are measured/i);
  assert.match(restoreDrillPlan, /restoreDrillVerified` remains `false/);
  assert.match(latestPreflight, /NO-GO/);
  assert.match(latestPreflight, /c3abb18795914b30253c598efd27fb1db0eb3987/);
  assert.match(latestPreflight, /32865396727/);
  assert.match(latestPreflight, /32902198754/);
  assert.match(latestPreflight, /exactly 3 pending production migrations/i);
  assert.match(latestPreflight, /20260821230000_security_remediation_hardening\.sql/);
  assert.match(
    latestPreflight,
    /20260825041500_restore_admin_helper_grants_and_public_cms_reads\.sql/,
  );
  assert.match(latestPreflight, /20260825050000_scope_public_cms_admin_policies\.sql/);
  assert.match(latestPreflight, /did not[\s\S]*modify production data or schema/i);
  assert.equal(audit.production.restoreDrillVerified, false);
  assert.match(migrationPlan, /restore drill/i);
  assert.match(migrationPlan, /forward-only/i);
  assert.match(migrationPlan, /lrqcntqyekucamifpffs/);
  assert.match(migrationPlan, /qgrertkqbwanerqqemph/);
  assert.match(checklist, /Exact-SHA acceptance/);
  assert.match(checklist, /Domain uses Cloudflare/i);
  assert.match(checklist, /no Cloudflare Worker route/i);
  assert.match(checklist, /rollback/i);
});

test("password auth forms fail closed until client hydration", () => {
  const loginRoute = read("src/routes/login.index.tsx");
  const signInStart = loginRoute.indexOf("function SignInForm()");
  const signUpStart = loginRoute.indexOf("function SignUpForm()");
  const googleStart = loginRoute.indexOf("function GoogleButton()");

  assert.ok(signInStart > -1 && signUpStart > signInStart && googleStart > signUpStart);
  const signIn = loginRoute.slice(signInStart, signUpStart);
  const signUp = loginRoute.slice(signUpStart, googleStart);

  assert.match(
    loginRoute,
    /function useHydratedAuthForm\(\)[\s\S]*useState\(false\)[\s\S]*setHydrated\(true\)/,
  );
  for (const formSource of [signIn, signUp]) {
    assert.match(formSource, /const hydrated = useHydratedAuthForm\(\)/);
    assert.match(formSource, /<form[\s\S]*method="post"[\s\S]*action="\/login"/);
    assert.match(formSource, /data-auth-hydrated=\{hydrated \? "true" : "false"\}/);
    assert.match(formSource, /disabled=\{!hydrated \|\| submitting\}/);
  }
  assert.equal((signIn.match(/disabled=\{!hydrated\}/g) ?? []).length, 2);
  assert.equal((signUp.match(/disabled=\{!hydrated\}/g) ?? []).length, 3);

  const authSetup = read("tests/e2e/auth-roles.setup.ts");
  assert.match(authSetup, /login-form"\)\)\.toHaveAttribute\("method", "post"\)/);
  assert.match(authSetup, /data-auth-hydrated[\s\S]*"true"/);
  assert.match(authSetup, /login-submit"\)\)\.toBeEnabled\(\)/);

  const containment = read(
    "docs/production-readiness/staging-credential-containment-2026-08-23.md",
  );
  assert.match(containment, /CONTAINED; CODE FIX VERIFIED IN STAGING/);
  assert.match(containment, /7803a6486ad67357a523ce252f835ce2d0b53f30/);
  assert.match(containment, /32676016370/);
  assert.match(containment, /32677397120/);
  assert.match(containment, /does not change the production \*\*NO-GO\*\* decision/);
  assert.match(containment, /Production credentials[\s\S]*were not[\s\S]*involved or changed/i);
  assert.match(containment, /artifact `9501164856`[\s\S]*deleted/);
  assert.match(containment, /rotated all seven fixed synthetic staging users/);
  assert.match(containment, /No secret value belongs in this document/);
});
