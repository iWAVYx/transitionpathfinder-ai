import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { test } from "node:test";

const AUDIT_PATH = "docs/production-readiness/audit-state.json";
const audit = JSON.parse(readFileSync(AUDIT_PATH, "utf8"));

const productionGoControls = [
  "githubEnvironmentProvisioned",
  "deploymentWorkflowProvisioned",
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
  assert.equal(audit.schemaVersion, 1);
  assert.match(audit.auditedMainSha, /^[a-f0-9]{40}$/);
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
  assert.ok(
    ["lovable-cloud", "cloudflare-workers"].includes(audit.production.hostingProvider),
    "the production hosting control plane must be explicit",
  );
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
  assert.equal(policy.historicalVariants.length, 2);
  assert.equal(policy.supersededCanonicalFiles.length, 6);
  assert.deepEqual(policy.excludedCanonicalFiles, [
    {
      file: "20260621153500_e2e_role_dashboard_readiness.sql",
      productionForbidden: true,
      reason:
        "This migration creates synthetic E2E roles, demo students, and E2E organizations for isolated staging; it must never run in production.",
    },
  ]);

  const report = JSON.parse(
    execFileSync(
      process.execPath,
      [
        "scripts/compare-production-migration-history.mjs",
        "docs/production-readiness/evidence/production-migration-history-2026-08-17.csv",
        "--json",
      ],
      { encoding: "utf8" },
    ),
  );
  assert.equal(report.status, "aligned");
  assert.equal(report.appliedCount, 180);
  assert.equal(report.canonicalCount, 187);
  assert.equal(report.directCoverageCount, 180);
  assert.equal(report.supersededCount, 6);
  assert.equal(report.excludedCount, 1);
  assert.equal(report.pendingCount, 0);
  assert.equal(audit.production.migrationBaselineVerified, true);
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
    ".env.production": new Set(["VITE_PAYMENTS_CLIENT_TOKEN"]),
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
  assert.match(devPayment?.value ?? "", /^pk_(test|sandbox)_/);
  assert.match(prodPayment?.value ?? "", /^pk_live_/);

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

  assert.match(packageJson, /--max-old-space-size=3072 vite build/);
  assert.match(packageJson, /--max-old-space-size=3072 vite build --mode development/);
  assert.match(viteConfig, /reportCompressedSize:\s*false/);
  assert.match(viteConfig, /maxParallelFileOps:\s*32/);
  assert.match(viteConfig, /function clientOnlyPlugins/);
  assert.match(
    viteConfig,
    /applyToEnvironment:\s*\(environment\)\s*=>\s*environment\.name\s*===\s*["']client["']/,
  );
  assert.match(viteConfig, /\.\.\.clientOnlyPlugins\(\s*VitePWA\(/);
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
  const viteConfig = read("vite.config.ts");
  const stagingDeploy = read(".github/workflows/deploy-staging.yml");
  const privacyCleanup = read("public/sw-privacy-cleanup.js");

  assert.match(viteConfig, /VitePWA\(\{[\s\S]*?outDir:\s*["']\.output\/public["']/);
  assert.match(viteConfig, /importScripts:\s*\[["']\/sw-privacy-cleanup\.js["']\]/);
  assert.match(
    viteConfig,
    /request\.mode\s*===\s*["']navigate["'][\s\S]*?handler:\s*["']NetworkOnly["'][\s\S]*?fallbackURL:\s*["']\/offline\.html["']/,
  );
  assert.doesNotMatch(viteConfig, /cacheName:\s*["']tf-pages["']/);
  assert.doesNotMatch(viteConfig, /navigateFallback:/);
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

test("no production deploy path exists while the audit says it is unprovisioned", () => {
  if (audit.production.deploymentWorkflowProvisioned) return;

  const workflowDir = ".github/workflows";
  for (const name of readdirSync(workflowDir).filter((file) => /\.ya?ml$/.test(file))) {
    const path = join(workflowDir, name);
    const source = read(path);
    if (basename(path) === "production-readiness-audit.yml") continue;
    assert.doesNotMatch(source, /environment:\s*production/);
    assert.doesNotMatch(source, /wrangler\.production\.toml/);
  }

  const rootFiles = readdirSync(".");
  assert.equal(rootFiles.includes("wrangler.production.toml"), false);
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
  const migrationPlan = read("docs/production-readiness/migration-and-rollback-plan.md");
  const checklist = read("docs/production-readiness/release-checklist.md");
  assert.match(auditReport, /NO-GO/);
  assert.match(auditReport, /Do not deploy or migrate production/);
  assert.match(currentAlignment, /Lovable Cloud/);
  assert.match(currentAlignment, /Production remains \*\*NO-GO\*\*/);
  assert.match(currentAlignment, /staging credentials/i);
  assert.match(migrationPlan, /restore drill/i);
  assert.match(migrationPlan, /forward-only/i);
  assert.match(migrationPlan, /lrqcntqyekucamifpffs/);
  assert.match(migrationPlan, /qgrertkqbwanerqqemph/);
  assert.match(checklist, /Exact-SHA acceptance/);
  assert.match(checklist, /rollback/i);
});
