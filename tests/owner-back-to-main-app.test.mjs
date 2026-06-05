// E2E-style static test: verify the Admin Hub ("OwnerShell") exposes a
// working "Back to main app" exit on desktop, tablet, and mobile for
// platform admins.
//
// Why a static-source test (consistent with header-responsive.test.mjs):
// the rest of the suite doesn't boot a full React renderer; instead we
// parse the component source and assert the invariants that previously
// regressed:
//
//   1. There must be TWO exit links — one in the desktop sidebar
//      (lg+ only) and one in the mobile/tablet nav strip (<lg).
//   2. Both must navigate to "/" (root). They previously pointed to
//      "/dashboard", which redirected platform admins back into /owner
//      via fallbackPathFor() and trapped them in the Admin Hub.
//   3. The desktop link container must be lg-only; the mobile pill
//      container must be lg:hidden so the two never both show or both
//      hide for a given viewport.
//   4. Both links must be reachable for platform admins specifically
//      (OwnerShell only renders its chrome once status === "allowed",
//      which requires getMyAdminRoles().isPlatformAdmin).
//
// Run with:  node --test tests/owner-back-to-main-app.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SHELL_FILE = new URL(
  "../src/components/owner/OwnerShell.tsx",
  import.meta.url,
);
const SRC = readFileSync(SHELL_FILE, "utf8");

// ---------- helpers ----------

/** Extract every <Link ...>...</Link> block as a single string. */
function findLinks(src) {
  const out = [];
  const re = /<Link\b[\s\S]*?<\/Link>/g;
  let m;
  while ((m = re.exec(src)) !== null) out.push(m[0]);
  return out;
}

const links = findLinks(SRC);
const backLinks = links.filter((l) => /Back to main app|Main app/i.test(l));

// ---------- 1. Both exits exist ----------

test("OwnerShell renders two 'back to main app' links (desktop + mobile)", () => {
  assert.ok(
    backLinks.length >= 2,
    `expected at least 2 'back to main app' links, found ${backLinks.length}. ` +
      `Desktop sidebar and mobile/tablet nav must each have their own exit.`,
  );
});

// ---------- 2. Both point to "/" (not /dashboard) ----------

test("every back-to-main-app link navigates to '/' (root), not /dashboard", () => {
  for (const link of backLinks) {
    assert.match(
      link,
      /to="\/"/,
      "back-to-main-app link must use `to=\"/\"`. Pointing at /dashboard " +
        "trapped platform admins because dashboard.tsx redirects them via " +
        "fallbackPathFor() back into /admin → /owner.",
    );
    assert.doesNotMatch(
      link,
      /to="\/dashboard"/,
      "back-to-main-app link must NOT point at /dashboard (loop regression).",
    );
    assert.doesNotMatch(
      link,
      /to="\/owner/,
      "back-to-main-app link must NOT point back into the Admin Hub.",
    );
  }
});

// ---------- 3. Desktop sidebar exit (lg+) ----------

test("desktop sidebar contains a back-to-main-app link inside an lg:flex aside", () => {
  // The <aside> is `hidden ... lg:flex` (desktop only). Grab its body and
  // confirm the back link lives inside it.
  const aside = SRC.match(/<aside\b[\s\S]*?<\/aside>/)?.[0];
  assert.ok(aside, "OwnerShell must render an <aside> sidebar");
  assert.match(
    aside,
    /\blg:flex\b/,
    "desktop sidebar must be gated on `lg:flex` (desktop/large viewports)",
  );
  assert.match(
    aside,
    /\bhidden\b/,
    "desktop sidebar must be `hidden` below lg so it doesn't double up with mobile nav",
  );
  assert.match(
    aside,
    /to="\/"[\s\S]{0,200}(Back to main app|Main app)/,
    "desktop sidebar must contain a Link to=\"/\" labeled 'Back to main app'",
  );
});

// ---------- 4. Mobile/tablet nav exit (<lg) ----------

test("mobile/tablet nav strip contains a back-to-main-app link gated lg:hidden", () => {
  // Find the mobile nav container (marked `lg:hidden`) inside the header.
  const mobileNav = SRC.match(
    /<div[^>]*\blg:hidden\b[^>]*>[\s\S]*?<\/div>/,
  )?.[0];
  assert.ok(
    mobileNav,
    "OwnerShell must render a mobile/tablet nav container with `lg:hidden`",
  );
  assert.match(
    mobileNav,
    /to="\/"[\s\S]{0,200}Main app/,
    "mobile/tablet nav must contain a Link to=\"/\" labeled 'Main app' " +
      "so tablet and phone users can exit the Admin Hub",
  );
});

// ---------- 5. Viewport coverage is complete and non-overlapping ----------

test("desktop and mobile exit links cover all viewports without gaps", () => {
  // Tailwind defaults: lg = 1024px. Desktop link shows >=1024, mobile
  // link shows <1024. Together they cover every viewport (mobile, tablet,
  // desktop) exactly once.
  const aside = SRC.match(/<aside\b[^>]*>/)?.[0] ?? "";
  const mobileNavOpen = SRC.match(/<div[^>]*\blg:hidden\b[^>]*>/)?.[0] ?? "";

  assert.match(
    aside,
    /\bhidden\b[\s\S]*\blg:flex\b/,
    "desktop sidebar must be hidden by default and shown at lg+ " +
      "(complement of the mobile lg:hidden strip)",
  );
  assert.match(
    mobileNavOpen,
    /\blg:hidden\b/,
    "mobile/tablet strip must be lg:hidden (complement of the desktop lg:flex sidebar)",
  );
});

// ---------- 6. Platform-admin gating still in place ----------

test("OwnerShell only renders its chrome (and the exit links) for platform admins", () => {
  // The component early-returns the loader/denied state unless
  // status === "allowed", which is set only when getMyAdminRoles()
  // reports isPlatformAdmin. Don't let a refactor accidentally render
  // the sidebar (and its exit) for non-admins.
  assert.match(
    SRC,
    /isPlatformAdmin[\s\S]{0,80}setStatus\("allowed"\)/,
    "OwnerShell must gate `status = 'allowed'` on isPlatformAdmin",
  );
  assert.match(
    SRC,
    /status !== "allowed"[\s\S]{0,200}return\s*\(/,
    "OwnerShell must early-return the loader/denied state when not allowed, " +
      "so the back-to-main-app links never render for non-admins",
  );
});
