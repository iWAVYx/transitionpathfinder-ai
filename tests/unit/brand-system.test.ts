import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * Phase 1 brand-system guard: the official TransitionForward palette lives in
 * one central token block, the reusable logo component keeps its accessible
 * name and required variants, and app identity/manifest icons point at the
 * approved app icon.
 */

const ROOT = path.resolve(__dirname, "../..");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

const CSS = read("src/styles.css");
const LOGO = read("src/components/brand/BrandLogo.tsx");
const MANIFEST = JSON.parse(read("public/manifest.webmanifest"));
const ROOT_ROUTE = read("src/routes/__root.tsx");

describe("central brand tokens", () => {
  const palette: Array<[string, string]> = [
    ["--brand-royal-purple", "#5B2A86"],
    ["--brand-teal", "#19B7AE"],
    ["--brand-forward-gold", "#F2B84B"],
    ["--brand-charcoal", "#242A33"],
    ["--brand-mist-gray", "#F5F6F8"],
    ["--brand-white", "#FFFFFF"],
  ];

  it.each(palette)("defines %s as %s exactly once", (token, hex) => {
    const matches = CSS.match(new RegExp(`${token}:\\s*${hex};`, "g")) ?? [];
    expect(matches).toHaveLength(1);
  });

  it("exposes semantic surface, border, focus, typography and status tokens", () => {
    for (const token of [
      "--brand-surface",
      "--brand-surface-muted",
      "--brand-surface-inverse",
      "--brand-border",
      "--brand-on-surface",
      "--brand-on-brand",
      "--brand-font-sans",
      "--brand-focus-ring",
      "--brand-status-info",
      "--brand-status-success",
      "--brand-status-warning",
      "--brand-status-danger",
    ]) {
      expect(CSS).toContain(`${token}:`);
    }
  });

  it("uses Inter as the primary brand typeface", () => {
    expect(CSS).toMatch(/--brand-font-sans:\s*"Inter"/);
  });

  it("keeps a visible keyboard focus treatment for brand surfaces", () => {
    expect(CSS).toContain(".brand-focus-ring:focus-visible");
  });
});

describe("BrandLogo component", () => {
  it("supports the three required variants", () => {
    for (const variant of ["lockup", "icon", "dark"]) {
      expect(LOGO).toContain(`"${variant}"`);
    }
  });

  it("exposes the accessible name TransitionForward", () => {
    expect(LOGO).toContain('const BRAND_NAME = "TransitionForward"');
    expect(LOGO).toContain('"aria-label": BRAND_NAME');
  });

  it("points at the approved brand assets", () => {
    expect(LOGO).toContain("/brand/transitionforward-app-icon.svg");
    expect(LOGO).toContain("/brand/transitionforward-wordmark.png");
    expect(existsSync(path.join(ROOT, "public/brand/transitionforward-app-icon.svg"))).toBe(true);
    expect(existsSync(path.join(ROOT, "public/brand/transitionforward-wordmark.png"))).toBe(true);
  });
});

describe("app identity icons", () => {
  it("ships every icon file referenced by the manifest and root route", () => {
    for (const file of [
      "public/favicon.svg",
      "public/favicon.png",
      "public/apple-touch-icon.png",
      "public/icon-192.png",
      "public/icon-512.png",
    ]) {
      expect(existsSync(path.join(ROOT, file))).toBe(true);
    }
  });

  it("keeps manifest icons and brand theme color", () => {
    expect(MANIFEST.icons.map((i: { src: string }) => i.src)).toContain("/icon-192.png");
    expect(MANIFEST.theme_color).toBe("#5B2A86");
  });

  it("links the favicon and apple touch icon from the root route", () => {
    expect(ROOT_ROUTE).toContain('href: "/favicon.svg"');
    expect(ROOT_ROUTE).toContain('href: "/apple-touch-icon.png"');
  });

  it("preserves the authoritative app icon geometry", () => {
    const svg = read("public/brand/transitionforward-app-icon.svg");
    expect(svg).toContain('viewBox="0 0 1000 1000"');
    expect(svg).toContain("#5B2A86");
    expect(svg).toContain("#19B7AE");
    expect(svg).toContain("#F2B84B");
  });
});

describe("shared brand surfaces", () => {
  it.each([
    "src/components/site/SiteHeader.tsx",
    "src/components/site/SiteFooter.tsx",
    "src/routes/login.index.tsx",
    "src/components/owner/OwnerShell.tsx",
  ])("%s renders the shared BrandLogo", (file) => {
    expect(read(file)).toContain("<BrandLogo");
  });
});
