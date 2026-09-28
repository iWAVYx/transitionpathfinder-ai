import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const migration = read(
  "supabase/migrations/20260927210000_narrow_catalog_and_site_media_reads.sql",
);
const jurisdiction = read("src/lib/jurisdiction/jurisdiction.functions.ts");
const forms = read("src/lib/forms.functions.ts");
const cms = read("src/lib/cms/cms.functions.ts");
const buildHealth = read("src/routes/api/public/build-health.ts");
const deploymentHealth = read("src/routes/api/public/env-health.ts");
const evidence = read(
  "docs/production-readiness/isolated-lovable-publish-gate-alignment-2026-09-27.md",
);
const serverInventory = read("docs/release-readiness/inventory-server-and-data.md");
const replayWorkflow = read(".github/workflows/migration-replay.yml");

test("broad catalog reads are replaced by reviewed RPC surfaces", () => {
  for (const table of [
    "jurisdictions",
    "high_school_program_tags",
    "plan_capacities",
    "partnerforward_incentive_categories",
    "form_templates",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `REVOKE SELECT[\\s\\S]{0,300}?ON public\\.${table}[\\s\\S]{0,100}?anon, authenticated`,
      ),
      `${table} must lose direct client SELECT`,
    );
  }

  for (const routine of [
    "get_public_jurisdiction_pack",
    "list_public_high_school_program_tags",
    "list_public_partnerforward_incentive_categories",
    "list_public_plan_capacities",
  ]) {
    assert.match(migration, new RegExp(`FUNCTION public\\.${routine}`));
    assert.match(
      migration,
      new RegExp(
        `REVOKE ALL ON FUNCTION public\\.${routine}\\([^;]*?\\)[\\s\\S]{0,120}?FROM PUBLIC, anon, authenticated`,
      ),
    );
    assert.match(
      migration,
      new RegExp(
        `GRANT EXECUTE ON FUNCTION public\\.${routine}\\([^;]*?\\)[\\s\\S]{0,120}?TO anon, authenticated, service_role`,
      ),
    );
  }

  assert.match(jurisdiction, /\.rpc\("get_public_jurisdiction_pack"/);
  assert.doesNotMatch(jurisdiction, /\.from\("jurisdiction_(?:versions|agencies|sources)"\)/);
});

test("signed-in form templates use authenticated, column-limited RPCs", () => {
  assert.match(migration, /FUNCTION public\.list_available_form_templates\(\)/);
  assert.match(migration, /FUNCTION public\.get_available_form_template\(_slug text\)/);
  assert.match(migration, /WHERE auth\.uid\(\) IS NOT NULL/g);
  assert.doesNotMatch(
    migration.match(
      /GRANT EXECUTE ON FUNCTION public\.list_available_form_templates\(\)[\s\S]{0,100}/,
    )?.[0] ?? "",
    /\banon\b/,
  );
  assert.match(forms, /\.rpc\("list_available_form_templates"\)/);
  assert.equal((forms.match(/\.rpc\("get_available_form_template"/g) ?? []).length, 2);
  assert.doesNotMatch(forms, /\.from\("form_templates"\)/);
});

test("private site-media reads stay behind server-generated signed URLs", () => {
  assert.match(migration, /DROP POLICY IF EXISTS "Public can read site-media" ON storage\.objects/);
  assert.doesNotMatch(migration, /CREATE POLICY "Public can read site-media"/);
  assert.match(cms, /supabaseAdmin\.storage[\s\S]*?\.createSignedUrl\(/);
  assert.doesNotMatch(cms, /\.getPublicUrl\(/);
  assert.match(serverInventory, /`site-media`[\s\S]*?Signed URLs/);
});

test("hosted build validation cannot masquerade as deployment acceptance", () => {
  assert.match(buildHealth, /validation_scope: "hosted-build-inputs-only"/);
  assert.match(buildHealth, /deployment_acceptance:[\s\S]*?required: true/);
  assert.match(buildHealth, /health_path: "\/api\/public\/env-health"/);
  assert.match(buildHealth, /exact_source_comparison_required: true/);
  assert.match(buildHealth, /hostname_verified: false/);
  assert.match(buildHealth, /payment_mode_verified: false/);
  assert.doesNotMatch(buildHealth, /evaluateStagingIdentity|evaluateProductionIdentity/);
  assert.doesNotMatch(buildHealth, /stripe_mode|resolveDeploymentStripeProof/);

  assert.match(deploymentHealth, /evaluateStagingIdentity/);
  assert.match(deploymentHealth, /evaluateProductionIdentity/);
  assert.match(deploymentHealth, /resolveDeploymentStripeProof/);
  assert.match(deploymentHealth, /new URL\(request\.url\)\.hostname/);
});

test("evidence remains draft-only and preserves the production no-go", () => {
  assert.match(evidence, /DRAFT — NOT APPLIED/);
  assert.match(evidence, /Production remains \*\*NO-GO\*\*/);
  assert.match(evidence, /does not authorize[\s\S]*migration/i);
  assert.match(evidence, /does not authorize[\s\S]*publishing Lovable/i);
  assert.match(evidence, /exact source\s+fingerprint/i);
});

test("disposable migration replay proves the narrowed access boundary", () => {
  assert.match(
    replayWorkflow,
    /not has_any_column_privilege\([\s\S]*?'authenticated',[\s\S]*?'public\.form_templates',[\s\S]*?'SELECT'/,
  );
  assert.match(
    replayWorkflow,
    /has_function_privilege\([\s\S]*?'authenticated',[\s\S]*?'public\.list_available_form_templates\(\)'/,
  );
  assert.match(
    replayWorkflow,
    /has_function_privilege\([\s\S]*?'anon',[\s\S]*?'public\.get_public_jurisdiction_pack\(text\)'/,
  );
  assert.match(replayWorkflow, /policyname = 'Public can read site-media'/);
});
