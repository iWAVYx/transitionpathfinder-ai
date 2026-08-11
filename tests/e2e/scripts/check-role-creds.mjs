#!/usr/bin/env node
// CI readiness check for the role dashboard live verification suite.
//
// Usage:
//   node tests/e2e/scripts/check-role-creds.mjs           # report only
//   LIVE_VERIFICATION=1 node ... check-role-creds.mjs     # fail if all missing
//   REQUIRE_ALL_ROLES=1 node ... check-role-creds.mjs     # fail if any missing
//
// In LIVE mode, exits non-zero when zero roles have credentials so a
// workflow_dispatch run cannot silently claim success after skipping every
// test. In REQUIRE_ALL_ROLES mode, exits non-zero unless every role has
// both email + password.

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, "..", ".auth");

const ROLES = [
  "STUDENT",
  "PARENT",
  "EDUCATOR",
  "SCHOOL_ADMIN",
  "DISTRICT_ADMIN",
  "PARTNER",
  "OWNER",
];

const present = [];
const missing = [];
for (const r of ROLES) {
  const hasEmail = !!process.env[`E2E_${r}_EMAIL`];
  const hasPass = !!process.env[`E2E_${r}_PASSWORD`];
  const hasTotp = !!process.env[`E2E_${r}_TOTP_SECRET`];
  if (hasEmail && hasPass) {
    present.push({ role: r, totp: hasTotp });
  } else {
    missing.push({
      role: r,
      need: [hasEmail ? null : `E2E_${r}_EMAIL`, hasPass ? null : `E2E_${r}_PASSWORD`].filter(Boolean),
    });
  }
}

console.log("Role credential readiness");
console.log("=========================");

// Base URL sanity. Production (transitionforwardct.com without an e2e./staging.
// subdomain) sits behind Cloudflare's challenge and will block headless
// Playwright. CI must point at an exempt staging hostname.
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? process.env.E2E_BASE_URL ?? "";
let baseHost = "";
if (baseUrl) {
  try {
    const host = new URL(baseUrl).hostname;
    baseHost = host;
    const isProdRoot =
      /(^|\.)transitionforwardct\.com$/i.test(host) && !/^(e2e|staging)\./i.test(host);
    console.log(`  base URL: ${baseUrl}`);
    if (isProdRoot) {
      console.error(
        "::error::PLAYWRIGHT_BASE_URL points at production (transitionforwardct.com). " +
          "Cloudflare will block Playwright. Set E2E_BASE_URL to an exempt subdomain such as " +
          "https://e2e.transitionforwardct.com or https://staging.transitionforwardct.com.",
      );
      if (process.env.LIVE_VERIFICATION === "1" || process.env.LIVE_VERIFICATION === "true") {
        process.exit(4);
      }
    }
  } catch {
    console.warn(`  base URL: ${baseUrl} (could not parse)`);
  }
} else {
  console.log("  base URL: (not set — will use localhost dev server)");
}

for (const p of present) {
  console.log(`  ✓ ${p.role}${p.totp ? " (TOTP configured)" : ""}`);
}
for (const m of missing) {
  console.log(`  ✗ ${m.role} — missing: ${m.need.join(", ")}`);
}

// Explicit owner 2FA flag so CI logs show which auth path the owner setup
// will follow without ever exposing the secret value. The only permitted
// no-TOTP path is the synthetic owner on the isolated staging Worker; this
// mirrors auth-roles.setup.ts and keeps production owner verification strict.
const ownerTotpConfigured = Boolean(process.env.E2E_OWNER_TOTP_SECRET && process.env.E2E_OWNER_TOTP_SECRET.trim());
const stagingOwnerWithoutTotp =
  process.env.ALLOW_STAGING_OWNER_WITHOUT_TOTP === "true" &&
  process.env.E2E_OWNER_EMAIL === "e2e.owner@staging.transitionforwardct.test" &&
  baseHost === "transitionforward-staging.caysi101.workers.dev";
console.log(`\nOWNER_TOTP_CONFIGURED=${ownerTotpConfigured}`);
if (!ownerTotpConfigured && stagingOwnerWithoutTotp) {
  console.log("OWNER_TOTP_STAGING_EXCEPTION=true (synthetic staging owner only)");
} else if (!ownerTotpConfigured) {
  console.error("::error::E2E_OWNER_TOTP_SECRET is required for the strict owner 2FA dashboard setup path.");
  if (process.env.LIVE_VERIFICATION === "1" || process.env.LIVE_VERIFICATION === "true" || process.env.REQUIRE_ALL_ROLES === "1" || process.env.REQUIRE_ALL_ROLES === "true") {
    process.exit(5);
  }
}

let stateFiles = [];
if (existsSync(AUTH_DIR)) {
  stateFiles = readdirSync(AUTH_DIR).filter((f) => f.endsWith(".json"));
  console.log(`\nStorage states present: ${stateFiles.length ? stateFiles.join(", ") : "(none yet)"}`);
} else {
  console.log("\nStorage state dir does not exist yet (auth-roles.setup will create it).");
}

const live = process.env.LIVE_VERIFICATION === "1" || process.env.LIVE_VERIFICATION === "true";
const requireAll = process.env.REQUIRE_ALL_ROLES === "1" || process.env.REQUIRE_ALL_ROLES === "true";

if (requireAll && missing.length > 0) {
  console.error(`\n::error::REQUIRE_ALL_ROLES=1 but ${missing.length} role(s) missing credentials.`);
  process.exit(2);
}

if (live && present.length === 0) {
  console.error(
    "\n::error::LIVE_VERIFICATION=1 requested but no role credentials configured. " +
      "Add E2E_<ROLE>_EMAIL / E2E_<ROLE>_PASSWORD secrets and re-run.",
  );
  process.exit(1);
}

// After auth-roles.setup runs, a second invocation can verify state files
// were actually produced for every role that had creds.
if (live && process.env.CHECK_STORAGE_STATES === "1") {
  const produced = new Set(stateFiles.map((f) => f.replace(/\.json$/, "").toUpperCase()));
  const expectedRoles = present.map((p) => p.role);
  const missingStates = expectedRoles.filter((r) => !produced.has(r));
  if (missingStates.length) {
    console.error(
      `\n::error::Live verification requested but storageState missing for: ${missingStates.join(", ")}. ` +
        `Check auth-roles.setup logs (wrong password / 2FA secret / blocked sign-in).`,
    );
    process.exit(3);
  }
}

console.log("\nReadiness check OK.");
