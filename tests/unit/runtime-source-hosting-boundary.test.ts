import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fingerprintScript = readFileSync("scripts/runtime-source-fingerprint.mjs", "utf8");
const viteConfig = readFileSync("vite.config.ts", "utf8");
const envHealth = readFileSync("src/routes/api/public/env-health.ts", "utf8");
const rootRoute = readFileSync("src/routes/__root.tsx", "utf8");
const authSetup = readFileSync("tests/e2e/auth-roles.setup.ts", "utf8");
const workflow = readFileSync(".github/workflows/pathway-live-staging-qa.yml", "utf8");
const runbook = readFileSync("docs/pathway-live-staging-acceptance.md", "utf8");

describe("Lovable runtime-source hosting boundary", () => {
  it("fingerprints shipped application inputs without reading environments or infrastructure", () => {
    for (const shippedInput of [
      '"src"',
      '"public"',
      '"scripts"',
      '"package.json"',
      '"bun.lock"',
      '"vite.config.ts"',
    ]) {
      expect(fingerprintScript).toContain(shippedInput);
    }
    for (const excludedInput of ['".env"', '"supabase"', '".github"', '"docs"', '"tests"']) {
      expect(fingerprintScript).not.toMatch(
        new RegExp(
          `RUNTIME_SOURCE_ENTRIES[\\s\\S]*?${excludedInput.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        ),
      );
    }
    expect(fingerprintScript).toContain("createHash(RUNTIME_SOURCE_FINGERPRINT_ALGORITHM)");
    expect(fingerprintScript).toContain('"transitionforward-runtime-source-v1"');
    expect(fingerprintScript).toContain("Runtime fingerprint refuses symbolic links");
  });

  it("calculates the fingerprint from local files at build time rather than environment input", () => {
    expect(viteConfig).toContain("createRuntimeSourceFingerprint()");
    expect(viteConfig).toContain('"import.meta.env.VITE_RUNTIME_SOURCE_FINGERPRINT"');
    expect(viteConfig).toContain("runtimeSource.fingerprint");
    expect(viteConfig).toContain("runtimeSource.fileCount");
    expect(fingerprintScript).not.toContain("VITE_RUNTIME_SOURCE_FINGERPRINT");
    expect(fingerprintScript).not.toContain("process.env");
  });

  it("publishes only non-sensitive parity metadata and fails closed in staging or production", () => {
    for (const field of [
      "runtime_source_fingerprint",
      "runtime_source_fingerprint_schema",
      'runtime_source_fingerprint_algorithm: "sha256"',
      "runtime_source_file_count",
    ]) {
      expect(envHealth).toContain(field);
    }
    expect(envHealth).toContain("(stagingTarget || productionTarget) && !runtimeSourceIdentityOk");
    expect(envHealth).toContain("runtime source fingerprint is unavailable or invalid");
    expect(envHealth).not.toMatch(/runtime_source_(?:path|content|environment)/);
  });

  it("checks server health and the rendered browser marker before protected authentication", () => {
    expect(workflow).toContain("node scripts/runtime-source-fingerprint.mjs --fingerprint");
    expect(workflow).toContain("runtimeSourceParityErrors");
    expect(workflow).toContain("EXPECTED_RUNTIME_SOURCE_FINGERPRINT");
    expect(rootRoute).toContain('name: "app-runtime-source-fingerprint"');
    expect(rootRoute).toContain("data-app-runtime-source-fingerprint");
    expect(authSetup).toContain("deployed-runtime-source-fingerprint-mismatch");
    expect(authSetup).toContain("EXPECTED_RUNTIME_SOURCE_FINGERPRINT");
  });

  it("documents the same read-only proof for a future production preflight", () => {
    expect(runbook).toContain("isolated Lovable staging copy is not Git-connected");
    expect(runbook).toContain("future, separately authorized read-only production preflight");
    expect(runbook).toContain("exact release SHA when the production host is Git-connected");
    expect(runbook).toContain("fails before authentication or any AI request");
  });
});
