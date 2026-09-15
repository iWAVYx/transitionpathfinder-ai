import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const viteConfig = read("vite.config.ts");
const health = read("src/routes/api/public/env-health.ts");
const stripeClient = read("src/lib/stripe.ts");
const declaration = read("src/types/virtual-public-build-inputs.d.ts");
const evidence = read(
  "docs/production-readiness/lovable-production-build-input-alignment-2026-09-15.md",
);

test("Lovable public build inputs are emitted through a literal virtual module", () => {
  assert.match(viteConfig, /virtual:transitionforward-public-build-inputs/);
  assert.match(viteConfig, /function publicBuildInputsModule\(/);
  assert.match(viteConfig, /resolveId\(source\)/);
  assert.match(viteConfig, /load\(id\)/);
  assert.match(viteConfig, /JSON\.stringify\(inputs\.viteAppEnv\)/);
  assert.match(viteConfig, /JSON\.stringify\(inputs\.paymentsClientToken\)/);
  assert.match(viteConfig, /JSON\.stringify\(inputs\.sandboxPaymentsClientToken\)/);
  assert.match(viteConfig, /JSON\.stringify\(inputs\.livePaymentsClientToken\)/);
  assert.match(viteConfig, /publicBuildInputsModule\(publicBuildInputs\)/);

  const moduleFactory = viteConfig.match(
    /function publicBuildInputsModule\([\s\S]*?\r?\n}\s*function useDirectLucideIconModules/,
  )?.[0];
  assert.ok(moduleFactory, "public build-input virtual module factory must remain identifiable");
  assert.doesNotMatch(
    moduleFactory,
    /STRIPE_(?:LIVE|SANDBOX)_API_KEY|SERVICE_ROLE|WEBHOOK_SECRET/,
  );
});

test("production health and Stripe client consume the same embedded public inputs", () => {
  for (const source of [health, stripeClient]) {
    assert.match(source, /virtual:transitionforward-public-build-inputs/);
  }

  assert.match(health, /buildViteAppEnv/);
  assert.match(health, /buildSandboxPaymentsClientToken/);
  assert.match(health, /buildLivePaymentsClientToken/);
  assert.match(health, /runtimeStripeLiveApiKey: process\.env\["STRIPE_LIVE_API_KEY"\]/);
  assert.doesNotMatch(health, /import\.meta\.env\.VITE_(?:APP_ENV|PAYMENTS)/);
  assert.doesNotMatch(stripeClient, /import\.meta\.env\.VITE_/);

  assert.match(declaration, /viteAppEnv: string/);
  assert.match(declaration, /sandboxPaymentsClientToken: string/);
  assert.match(declaration, /livePaymentsClientToken: string/);
});

test("evidence stays fail closed and does not authorize a production publish", () => {
  assert.match(evidence, /HTTP 503/);
  assert.match(evidence, /VITE_APP_ENV.*unknown/is);
  assert.match(evidence, /Stripe mode.*unknown/is);
  assert.match(evidence, /No private Stripe credential is embedded/i);
  assert.match(evidence, /PRODUCTION REMAINS NO-GO/i);
  assert.match(evidence, /does not authorize.*publish/is);
});
