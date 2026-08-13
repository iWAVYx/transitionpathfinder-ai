import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { test } from "node:test";

const AUDIT_PATH = "docs/production-readiness/audit-state.json";
const audit = JSON.parse(readFileSync(AUDIT_PATH, "utf8"));

function read(path) {
  return readFileSync(path, "utf8");
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

  if (audit.status === "go") {
    assert.equal(audit.production.githubEnvironmentProvisioned, true);
    assert.equal(audit.production.deploymentWorkflowProvisioned, true);
    assert.equal(audit.production.migrationBaselineVerified, true);
  } else {
    assert.equal(audit.status, "no-go");
    assert.ok(
      [
        audit.production.githubEnvironmentProvisioned,
        audit.production.deploymentWorkflowProvisioned,
        audit.production.migrationBaselineVerified,
      ].includes(false),
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

test("PWA worker is generated into and required from the deployed asset directory", () => {
  const viteConfig = read("vite.config.ts");
  const stagingDeploy = read(".github/workflows/deploy-staging.yml");

  assert.match(viteConfig, /VitePWA\(\{[\s\S]*?outDir:\s*["']\.output\/public["']/);
  assert.match(stagingDeploy, /\[ ! -f "\$assets\/sw\.js" \]/);
  assert.match(stagingDeploy, /workbox-\*\.js/);
  assert.match(stagingDeploy, /Verify deployed PWA assets/);
  assert.match(stagingDeploy, /"\$STAGING_ORIGIN\/sw\.js"/);
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

  const auditReport = read("docs/production-readiness/audit-2026-08-13.md");
  const migrationPlan = read("docs/production-readiness/migration-and-rollback-plan.md");
  const checklist = read("docs/production-readiness/release-checklist.md");
  assert.match(auditReport, /NO-GO/);
  assert.match(auditReport, /Do not deploy or migrate production/);
  assert.match(migrationPlan, /restore drill/i);
  assert.match(migrationPlan, /forward-only/i);
  assert.match(migrationPlan, /lrqcntqyekucamifpffs/);
  assert.match(migrationPlan, /qgrertkqbwanerqqemph/);
  assert.match(checklist, /Exact-SHA acceptance/);
  assert.match(checklist, /rollback/i);
});
