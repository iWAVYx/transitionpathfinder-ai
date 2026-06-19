#!/usr/bin/env node
// Preflight reachability check for the E2E base URL. Runs before Playwright
// so a misconfigured host fails the workflow with a clear error instead of
// surfacing as "chrome-error://chromewebdata/" inside the Playwright report.
//
// Checks:
//   1. PLAYWRIGHT_BASE_URL / E2E_BASE_URL is set and starts with https://
//   2. Hostname resolves via DNS
//   3. Base URL responds with an HTTP status (any 2xx/3xx/4xx is fine; we
//      only fail on network/TLS/DNS errors or 5xx).
//   4. /login responds with an HTTP status.
//   5. Optionally: detects Cloudflare interstitial body and warns.
//
// Exit codes:
//   0 = reachable
//   10 = base URL env var not set
//   11 = not https://
//   12 = DNS resolution failed
//   13 = base URL fetch failed (network/TLS) or 5xx
//   14 = /login fetch failed or 5xx

import { lookup } from "node:dns/promises";

const baseUrl = (process.env.PLAYWRIGHT_BASE_URL || process.env.E2E_BASE_URL || "").trim();

function fail(code, msg) {
  console.error(`::error::${msg}`);
  process.exit(code);
}

console.log("E2E base URL preflight");
console.log("======================");

if (!baseUrl) {
  fail(
    10,
    "PLAYWRIGHT_BASE_URL / E2E_BASE_URL is not set. Configure the E2E_BASE_URL secret " +
      "to an exempt staging hostname such as https://e2e.transitionforwardct.com.",
  );
}

let parsed;
try {
  parsed = new URL(baseUrl);
} catch {
  fail(11, `E2E_BASE_URL is not a valid URL: ${baseUrl}`);
}

console.log(`  base URL : ${parsed.origin}`);
console.log(`  hostname : ${parsed.hostname}`);
console.log(`  protocol : ${parsed.protocol}`);

if (parsed.protocol !== "https:") {
  fail(11, `E2E_BASE_URL must start with https:// (got ${parsed.protocol}).`);
}

// DNS
try {
  const { address, family } = await lookup(parsed.hostname);
  console.log(`  dns      : ${address} (IPv${family})`);
} catch (e) {
  fail(
    12,
    `DNS lookup failed for ${parsed.hostname}: ${(e instanceof Error ? e.message : String(e))}. ` +
      `Confirm the DNS record exists at your registrar / Cloudflare.`,
  );
}

async function probe(path) {
  const url = new URL(path, parsed.origin).toString();
  const started = Date.now();
  try {
    // Follow redirects so we can detect host changes (e2e.* → apex).
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": "lovable-e2e-preflight/1.0" },
    });
    const ms = Date.now() - started;
    const body = await res.text().catch(() => "");
    const looksCf =
      /just a moment/i.test(body) || /cf-chl-|challenge-platform|cf-browser-verification/i.test(body);
    const finalUrl = res.url || url;
    const finalHost = (() => {
      try { return new URL(finalUrl).hostname.toLowerCase(); } catch { return ""; }
    })();
    console.log(
      `  GET ${url} → ${res.status} ${res.statusText} (${ms}ms)${
        finalUrl !== url ? ` [→ ${finalUrl}]` : ""
      }${looksCf ? " [CLOUDFLARE CHALLENGE]" : ""}`,
    );
    return { ok: res.status < 500, status: res.status, looksCf, finalUrl, finalHost };
  } catch (e) {
    const ms = Date.now() - started;
    console.error(`  GET ${url} → FAILED after ${ms}ms: ${(e instanceof Error ? e.message : String(e))}`);
    return { ok: false, error: e };
  }
}


const root = await probe("/");
if (!root.ok) {
  fail(
    13,
    `E2E base URL is unreachable from CI (${parsed.origin}). ` +
      `Verify hosting provider recognizes the custom domain, SSL is active, ` +
      `and the subdomain points at the deployed app.`,
  );
}

const login = await probe("/login");
if (!login.ok) {
  fail(
    14,
    `E2E base URL /login is unreachable (${parsed.origin}/login). The host responds but the ` +
      `login route does not — check that the deployment is current.`,
  );
}

if (root.looksCf || login.looksCf) {
  console.error(
    "::error::Cloudflare challenge body detected at the base URL. Playwright cannot solve " +
      `"Just a moment...". Use a staging subdomain with the challenge disabled (e.g. ` +
      "https://e2e.transitionforwardct.com or https://staging.transitionforwardct.com).",
  );
  process.exit(13);
}

console.log("\nBase URL preflight OK.");
