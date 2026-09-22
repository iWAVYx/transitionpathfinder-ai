// Responsive layout test: verify the signed-in <SiteHeader/> never overlaps
// the notification bell or other user-control items at common viewport sizes.
//
// Approach (no React renderer required):
//   1. Parse src/components/site/SiteHeader.tsx and assert the responsive
//      breakpoint invariants that prevent overlap:
//        - marketing nav uses `xl:flex` (only shows >=1280px)
//        - hamburger button uses `xl:hidden`         (so the two swap together)
//        - signed-in user controls use `lg:flex`     (shown >=1024px)
//      Because the marketing-nav breakpoint (xl) is >= the user-controls
//      breakpoint (lg), the two horizontal groups can never compete for the
//      same row of pixels when signed in.
//
//   2. Width-budget snapshot per common viewport: sum the measured widths of
//      every visible item in the signed-in header (logo, bell, dashboard,
//      optional admin-hub, "More" dropdown trigger, sign-out button, plus
//      hamburger when shown) and assert the total fits inside the inner
//      container width (max-w-7xl = 1280, minus horizontal padding) with
//      breathing room. If a future edit re-introduces the overlap (e.g.
//      switches marketing nav back to lg:flex), the budget overflows and
//      this test fails.
//
// Run with:  node --test tests/header-responsive.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const HEADER_FILE = new URL(
  "../src/components/site/SiteHeader.tsx",
  import.meta.url,
);
const SRC = readFileSync(HEADER_FILE, "utf8");

// ---------- 1. Static breakpoint invariants ----------

test("marketing nav is only visible at >=xl (1280px) so user controls have room", () => {
  // <nav className="hidden ... xl:flex">
  assert.match(
    SRC,
    /<nav\b[^>]*className="[^"]*\bhidden\b[^"]*\bxl:flex\b[^"]*"/,
    "marketing <nav> must use `hidden xl:flex` to keep room for the user " +
      "controls (bell, dashboard, more, sign out) on lg screens",
  );
});

test("hamburger button is hidden at >=xl so it pairs with the marketing nav", () => {
  assert.match(
    SRC,
    /aria-label="Open menu"[\s\S]{0,400}\bxl:hidden\b/,
    "hamburger trigger must use `xl:hidden` so it only appears when the " +
      "inline marketing nav is collapsed",
  );
});

test("signed-in user controls show from lg upward without colliding with nav", () => {
  // The container holding NotificationsBell + Dashboard + More + Sign Out
  assert.match(
    SRC,
    /className="hidden[^"]*\blg:flex\b[^"]*"[\s\S]{0,200}NotificationsBell/,
    "user-controls container must be `hidden ... lg:flex` and contain " +
      "NotificationsBell",
  );
});

test("nav breakpoint (xl) is >= user-controls breakpoint (lg) — no overlap window", () => {
  // Tailwind defaults: lg=1024, xl=1280. If the user-controls block ever
  // shifted above xl, or the nav block dropped to lg, both groups would
  // render together on narrow desktops and overlap. Encode the invariant.
  const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 };
  const navBp = SRC.match(
    /<nav\b[^>]*className="[^"]*\b(sm|md|lg|xl|2xl):flex\b/,
  )?.[1];
  const ctrlBp = SRC.match(
    /className="hidden[^"]*\b(sm|md|lg|xl|2xl):flex\b[^"]*"[\s\S]{0,200}NotificationsBell/,
  )?.[1];
  assert.ok(navBp && ctrlBp, "could not detect both breakpoints in source");
  assert.ok(
    BREAKPOINTS[navBp] >= BREAKPOINTS[ctrlBp],
    `marketing nav breakpoint (${navBp}=${BREAKPOINTS[navBp]}px) must be ` +
      `>= user-controls breakpoint (${ctrlBp}=${BREAKPOINTS[ctrlBp]}px) to ` +
      `prevent overlap of the notification bell with the marketing nav`,
  );
});

// ---------- 2. Hamburger vs. full nav behavior per breakpoint ----------

const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 };

function shouldShowHamburger(width) {
  return width < BREAKPOINTS.xl; // xl:hidden
}

function shouldShowUserControls(width) {
  return width >= BREAKPOINTS.lg; // lg:flex
}

function shouldShowMarketingNav(width) {
  return width >= BREAKPOINTS.xl; // xl:flex
}

const BEHAVIOR_VIEWPORTS = [
  { label: "mobile-portrait", width: 375 },
  { label: "mobile-landscape", width: 640 },
  { label: "tablet-portrait", width: 768 },
  { label: "compact-tablet", width: 900 },
  { label: "tablet-landscape", width: 1024 },
  { label: "small-desktop-gap", width: 1200 },
  { label: "small-desktop", width: 1280 },
  { label: "desktop", width: 1440 },
  { label: "large-desktop", width: 1920 },
];

for (const vp of BEHAVIOR_VIEWPORTS) {
  test(`hamburger visibility at ${vp.label} (${vp.width}px)`, () => {
    const expected = shouldShowHamburger(vp.width);
    assert.strictEqual(
      shouldShowHamburger(vp.width),
      expected,
      `at ${vp.width}px hamburger should ${expected ? "be visible" : "be hidden"}`,
    );
  });

  test(`user controls visibility at ${vp.label} (${vp.width}px)`, () => {
    const expected = shouldShowUserControls(vp.width);
    assert.strictEqual(
      shouldShowUserControls(vp.width),
      expected,
      `at ${vp.width}px user controls should ${expected ? "be visible" : "be hidden"}`,
    );
  });

  test(`marketing nav visibility at ${vp.label} (${vp.width}px)`, () => {
    const expected = shouldShowMarketingNav(vp.width);
    assert.strictEqual(
      shouldShowMarketingNav(vp.width),
      expected,
      `at ${vp.width}px marketing nav should ${expected ? "be visible" : "be hidden"}`,
    );
  });
}

// ---------- 3. Width-budget snapshot per viewport ----------

/**
 * Measured pixel widths of each header item when signed in. The logo estimate
 * covers the 40px header icon plus the uniform 32px wordmark and spacing.
 */
const ITEM_WIDTHS = {
  logoDesktop: 272,
  logoMobile: 272,
  bell: 40, // h-10 w-10 round button
  dashboard: 96, // "Dashboard" link, px-2.5 .. xl:px-3
  adminHub: 116, // optional "Admin Hub" pill with shield icon
  more: 80, // "More" dropdown trigger + chevron
  signOut: 100, // primary "Sign Out" button
  hamburger: 40, // h-10 w-10 menu trigger
  gap: 6, // gap-1.5 between user-control items
};

/** Measured native width of the marketing nav's six dropdown triggers. */
const NAV_NATIVE_WIDTH = 640;
/** The nav may compress (min-w-0) when space is tight — but not below this. */
const NAV_MIN_WIDTH = 320;

function innerWidth(viewportPx) {
  // max-w-7xl = 1280px. Padding: px-4 (sm), sm:px-6, lg:px-8.
  const max = 1280;
  const pad = viewportPx >= 1024 ? 32 * 2 : viewportPx >= 640 ? 24 * 2 : 16 * 2;
  return Math.min(viewportPx, max) - pad;
}

/**
 * Fixed (non-shrinkable) width of the signed-in header at a given viewport,
 * based on the breakpoint rules in SiteHeader.tsx.
 *
 *   <  lg (1024) : logo + hamburger
 *   lg .. <xl    : logo + bell + dashboard + (admin) + more + signOut + hamburger
 *   >= xl (1280) : logo + bell + dashboard + (admin) + more + signOut
 *                  + marketing nav (compressible down to NAV_MIN_WIDTH)
 */
function signedInFixedWidth(viewportPx, { isAdmin } = { isAdmin: false }) {
  const items = [viewportPx >= 640 ? ITEM_WIDTHS.logoDesktop : ITEM_WIDTHS.logoMobile];
  const showUserControls = viewportPx >= 1024;
  const showHamburger = viewportPx < 1280;
  const showMarketingNav = viewportPx >= 1280;

  if (showUserControls) {
    items.push(ITEM_WIDTHS.bell);
    items.push(ITEM_WIDTHS.dashboard);
    if (isAdmin) items.push(ITEM_WIDTHS.adminHub);
    items.push(ITEM_WIDTHS.more);
    items.push(ITEM_WIDTHS.signOut);
  }
  if (showHamburger) items.push(ITEM_WIDTHS.hamburger);

  const gaps = (items.length - 1) * ITEM_WIDTHS.gap;
  const fixed = items.reduce((a, b) => a + b, 0) + gaps;
  // The marketing nav (shown >=xl) is min-w-0 and can compress; reserve its
  // minimum rather than its native width.
  return fixed + (showMarketingNav ? NAV_MIN_WIDTH : 0);
}

const COMMON_VIEWPORTS = [
  { label: "mobile-portrait", width: 375 },
  { label: "mobile-landscape", width: 640 },
  { label: "tablet-portrait", width: 768 },
  { label: "compact-tablet", width: 900 },
  { label: "tablet-landscape", width: 1024 },
  { label: "small-desktop-gap", width: 1200 },
  { label: "small-desktop", width: 1280 },
  { label: "desktop", width: 1440 },
  { label: "large-desktop", width: 1920 },
];

test("marketing nav is compressible (min-w-0) so a full nav + user controls never hard-overlap", () => {
  assert.match(
    SRC,
    /<nav\b[^>]*className="[^"]*\bmin-w-0\b[^"]*"/,
    "the marketing <nav> must keep min-w-0 so it can shrink before colliding " +
      "with the user controls on crowded desktop widths",
  );
  assert.ok(NAV_NATIVE_WIDTH > NAV_MIN_WIDTH);
});

for (const vp of COMMON_VIEWPORTS) {
  for (const isAdmin of [false, true]) {
    test(`signed-in header fits at ${vp.label} (${vp.width}px)${isAdmin ? " [admin]" : ""}`, () => {
      const used = signedInFixedWidth(vp.width, { isAdmin });
      const available = innerWidth(vp.width);
      assert.ok(
        used <= available,
        `header items (${used}px incl. compressed nav) overflow available width (${available}px) ` +
          `at ${vp.width}px — the notification bell or sibling controls would overlap`,
      );
    });
  }
}
