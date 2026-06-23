#!/usr/bin/env node
/**
 * Ensures the Playwright Chromium browser binary is installed before
 * running any Playwright-driven tests (e.g. dashboard-regression).
 *
 * Safe to run repeatedly: Playwright skips download if the matching
 * browser revision is already present in its cache.
 *
 * Honors:
 *   - SKIP_PLAYWRIGHT_INSTALL=1  → no-op (useful in sandboxed CI stages
 *     where browsers were pre-baked into the image).
 *   - CI=true                    → also installs OS deps (--with-deps).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

if (process.env.SKIP_PLAYWRIGHT_INSTALL === "1") {
  console.log("[playwright] SKIP_PLAYWRIGHT_INSTALL=1 → skipping browser install.");
  process.exit(0);
}

const require = createRequire(import.meta.url);

// If @playwright/test isn't installed we have nothing to do (unit-only checkout).
try {
  require.resolve("@playwright/test/package.json");
} catch {
  console.log("[playwright] @playwright/test not installed → skipping.");
  process.exit(0);
}

const withDeps = process.env.CI === "true" || process.env.CI === "1";
const args = ["playwright", "install", ...(withDeps ? ["--with-deps"] : []), "chromium"];

// Prefer bunx when available (matches the rest of this repo), fall back to npx.
const runner = existsSync("/usr/local/bin/bun") || process.env.BUN_INSTALL ? "bunx" : "npx";

console.log(`[playwright] ${runner} ${args.join(" ")}`);
const result = spawnSync(runner, args, { stdio: "inherit" });
process.exit(result.status ?? 1);
