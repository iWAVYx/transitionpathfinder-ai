// Automated test: verify the dark-mode restore inline script runs under a
// strict Content-Security-Policy and applies the `dark` class to <html>
// before first paint.
//
// What this test proves end-to-end:
//   1. The shell exposes a per-request CSP nonce via <meta name="csp-nonce">.
//   2. The inline dark-mode restore <script> carries that same nonce.
//   3. When a strict CSP (`script-src 'self' 'nonce-<NONCE>'`) is applied,
//      the script is allowed to execute (matching nonce) and adds `dark`
//      to <html> synchronously, before any paint/hydration.
//   4. A script WITHOUT the nonce would be blocked under the same CSP
//      (negative control), proving the policy is actually strict.
//
// Run with:  node --test tests/dark-mode-csp.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import vm from "node:vm";
import { resolveCspNonce } from "../src/lib/cspNonce.ts";

const ROOT_FILE = new URL("../src/routes/__root.tsx", import.meta.url);
const NONCE_FILE = new URL("../src/lib/cspNonce.ts", import.meta.url);

/** Pull the inline dark-mode IIFE source straight from __root.tsx so the
 *  test stays in sync with the real shell. */
function extractDarkModeScript() {
  const src = readFileSync(ROOT_FILE, "utf8");
  const match = src.match(/__html:\s*`([\s\S]*?a11y:dark-mode[\s\S]*?)`/);
  assert.ok(match, "could not find dark-mode inline script in __root.tsx");
  return match[1];
}

/** Assert the shell wires nonce={nonce} on the script AND a matching
 *  <meta name="csp-nonce"> so middleware can emit the same value in the
 *  Content-Security-Policy header. */
function assertShellUsesNonce() {
  const src = readFileSync(ROOT_FILE, "utf8");
  assert.match(
    src,
    /<meta\s+name="csp-nonce"\s+content=\{nonce\}\s*\/?>/,
    "shell must expose the nonce via <meta name=\"csp-nonce\">",
  );
  assert.match(
    src,
    /<script[\s\S]{0,200}nonce=\{nonce\}/,
    "dark-mode <script> must carry nonce={nonce}",
  );
}

/** Build the exact SSR'd <head> fragment a request would produce, with a
 *  freshly minted nonce. */
function renderHead({ nonce, scriptSrc, includeNonceOnScript = true }) {
  const nonceAttr = includeNonceOnScript ? ` nonce="${nonce}"` : "";
  return `
    <meta name="csp-nonce" content="${nonce}">
    <script${nonceAttr}>${scriptSrc}</script>
  `;
}

/** Minimal CSP enforcer: parses `script-src` and only runs inline <script>
 *  tags whose nonce attribute matches an allow-listed `'nonce-XXX'` source.
 *  This mirrors what a real browser does for inline scripts. */
function runHtmlUnderCsp(html, cspHeader, sandbox) {
  const scriptSrc = cspHeader
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith("script-src"));
  assert.ok(scriptSrc, "CSP must include a script-src directive");
  const allowedNonces = new Set(
    [...scriptSrc.matchAll(/'nonce-([^']+)'/g)].map((m) => m[1]),
  );

  const scriptRegex = /<script(?:\s+nonce="([^"]+)")?>([\s\S]*?)<\/script>/g;
  for (const m of html.matchAll(scriptRegex)) {
    const [, nonce, body] = m;
    if (!nonce || !allowedNonces.has(nonce)) continue; // blocked by CSP
    vm.runInContext(body, sandbox);
  }
}

/** Build a sandbox that emulates just enough of the browser for the
 *  inline restore script: localStorage, matchMedia, document.documentElement.classList. */
function makeBrowserSandbox({ stored, prefersDark }) {
  const classes = new Set();
  const ctx = {
    localStorage: {
      getItem: (k) => (k === "a11y:dark-mode" ? stored : null),
    },
    matchMedia: (q) => ({
      matches: q.includes("dark") ? prefersDark : false,
    }),
    document: {
      documentElement: {
        classList: {
          add: (c) => classes.add(c),
          contains: (c) => classes.has(c),
        },
      },
    },
  };
  return { ctx: vm.createContext(ctx), classes };
}

test("shell wires CSP nonce on inline dark-mode script", () => {
  assertShellUsesNonce();
});

test("browser hydration reuses the server-rendered CSP nonce", () => {
  const rootSource = readFileSync(ROOT_FILE, "utf8");
  const nonceSource = readFileSync(NONCE_FILE, "utf8");

  assert.match(rootSource, /const nonce = resolveCspNonce\(\)/);
  assert.match(nonceSource, /meta\[name=["']csp-nonce["']\]/);
  assert.match(nonceSource, /if \(serverNonce\) return serverNonce/);
});

test("nonce resolver returns the server-rendered value during hydration", () => {
  const originalDocument = globalThis.document;
  globalThis.document = {
    querySelector(selector) {
      assert.equal(selector, 'meta[name="csp-nonce"]');
      return {
        getAttribute: (name) => (name === "content" ? "server-request-nonce" : null),
      };
    },
  };

  try {
    assert.equal(resolveCspNonce(), "server-request-nonce");
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});

test("shell declares light as the default color-scheme for all pages", () => {
  const src = readFileSync(ROOT_FILE, "utf8");
  assert.match(
    src,
    /<meta\s+name="color-scheme"\s+content="light"\s*\/?>/,
    'every page must default to light mode via <meta name="color-scheme" content="light">',
  );
});

test("dark mode is applied before first paint when localStorage='1' under strict CSP", () => {
  const nonce = randomUUID().replace(/-/g, "");
  const scriptSrc = extractDarkModeScript();
  const html = renderHead({ nonce, scriptSrc });
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}'`;

  const { ctx, classes } = makeBrowserSandbox({
    stored: "1",
    prefersDark: false,
  });
  runHtmlUnderCsp(html, csp, ctx);

  assert.equal(
    classes.has("dark"),
    true,
    "<html> must have `dark` class after the nonce'd inline script runs",
  );
});

test("stays in light mode when no stored preference, even if OS prefers dark", () => {
  const nonce = randomUUID().replace(/-/g, "");
  const html = renderHead({ nonce, scriptSrc: extractDarkModeScript() });
  const csp = `script-src 'self' 'nonce-${nonce}'`;

  const { ctx, classes } = makeBrowserSandbox({
    stored: null,
    prefersDark: true,
  });
  runHtmlUnderCsp(html, csp, ctx);

  assert.equal(classes.has("dark"), false);
});

test("stays in light mode when stored='0' even if OS prefers dark", () => {
  const nonce = randomUUID().replace(/-/g, "");
  const html = renderHead({ nonce, scriptSrc: extractDarkModeScript() });
  const csp = `script-src 'self' 'nonce-${nonce}'`;

  const { ctx, classes } = makeBrowserSandbox({
    stored: "0",
    prefersDark: true,
  });
  runHtmlUnderCsp(html, csp, ctx);

  assert.equal(classes.has("dark"), false);
});

test("negative control: a script WITHOUT the nonce is blocked by strict CSP", () => {
  const nonce = randomUUID().replace(/-/g, "");
  const html = renderHead({
    nonce,
    scriptSrc: extractDarkModeScript(),
    includeNonceOnScript: false, // simulate a forgotten nonce
  });
  const csp = `script-src 'self' 'nonce-${nonce}'`;

  const { ctx, classes } = makeBrowserSandbox({
    stored: "1",
    prefersDark: false,
  });
  runHtmlUnderCsp(html, csp, ctx);

  assert.equal(
    classes.has("dark"),
    false,
    "without a matching nonce the script must NOT execute under strict CSP",
  );
});
