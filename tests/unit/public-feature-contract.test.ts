import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { PUBLIC_FEATURES } from "@/lib/public-feature-contract";
import { ROUTE_AUDIENCES } from "@/lib/role-policy";

const ROOT = resolve(__dirname, "../..");
const ROUTES_DIR = resolve(ROOT, "src/routes");
const AUTH_ROUTES_DIR = resolve(ROUTES_DIR, "_authenticated");

function pathnameHasRoute(pathname: string): boolean {
  const segments = pathname.replace(/^\//, "").split("/").filter(Boolean);
  if (segments.length === 0) return existsSync(resolve(ROUTES_DIR, "index.tsx"));

  const flat = segments.join(".");
  const candidates = [
    resolve(ROUTES_DIR, `${flat}.tsx`),
    resolve(ROUTES_DIR, `${segments.join("/")}.tsx`),
    resolve(AUTH_ROUTES_DIR, `${flat}.tsx`),
    resolve(AUTH_ROUTES_DIR, `${flat}.index.tsx`),
    resolve(AUTH_ROUTES_DIR, `${segments.join("/")}.tsx`),
  ];
  if (segments.length > 1) {
    candidates.push(resolve(ROUTES_DIR, `${segments[0]}_.${segments.slice(1).join(".")}.tsx`));
  }
  if (candidates.some(existsSync)) return true;

  const prefix = `${flat}.`;
  return readdirSync(AUTH_ROUTES_DIR).some(
    (file) => file === `${flat}.tsx` || file.startsWith(prefix),
  );
}

describe("public feature promise contract", () => {
  it("connects every advertised feature to a real preview and signed-in route", () => {
    for (const feature of Object.values(PUBLIC_FEATURES)) {
      expect(pathnameHasRoute(feature.previewRoute), `${feature.id} preview`).toBe(true);
      expect(pathnameHasRoute(feature.liveRoute), `${feature.id} live tool`).toBe(true);
      expect(feature.liveAudiences.length, `${feature.id} live audiences`).toBeGreaterThan(0);
    }
  });

  it("derives Platform role badges from the access contract without overpromising student access", () => {
    expect(PUBLIC_FEATURES["pathway-builder"].liveAudiences).not.toContain("Student");
    expect(PUBLIC_FEATURES["ppt-prep"].liveAudiences).not.toContain("Student");
    expect(PUBLIC_FEATURES["student-voice"].liveAudiences).toContain("Student");

    const platform = readFileSync(resolve(ROOT, "src/routes/platform.tsx"), "utf8");
    expect(platform).toContain("getPublicFeature(featureId)");
    expect(platform).toContain("liveAudiences.map");
    expect(platform).not.toMatch(/\btags:\s*\[/);
  });

  it("keeps advertised audiences aligned with guarded live routes", () => {
    const labels = {
      family: "Family",
      student: "Student",
      educator: "Educator",
      admin: "Admin",
    } as const;

    for (const feature of Object.values(PUBLIC_FEATURES)) {
      const guardedAudiences = ROUTE_AUDIENCES[feature.liveRoute];
      if (!guardedAudiences) continue;

      const expected = guardedAudiences
        .filter((audience): audience is keyof typeof labels => audience in labels)
        .map((audience) => labels[audience])
        .sort();
      expect([...feature.liveAudiences].sort(), feature.id).toEqual(expected);
    }
  });

  it("records honest availability language for every partial or pilot feature", () => {
    const bounded = Object.values(PUBLIC_FEATURES).filter(
      (feature) => feature.status !== "available",
    );
    expect(bounded.length).toBeGreaterThan(0);
    for (const feature of bounded) {
      expect(feature.availability.length, feature.id).toBeGreaterThan(60);
      expect(feature.availability, feature.id).toMatch(/still|not yet|pilot|being validated/i);
    }
  });

  it("renders the contract links on each audited marketing page", () => {
    for (const relativePath of [
      "src/routes/index.tsx",
      "src/routes/platform.tsx",
      "src/routes/families.tsx",
      "src/routes/educators.tsx",
      "src/routes/programs.transitionforward.tsx",
    ]) {
      const source = readFileSync(resolve(ROOT, relativePath), "utf8");
      expect(source, relativePath).toContain("FeatureContractLinks");
      expect(source, relativePath).toMatch(/featureId[=:\s]/);
    }
  });

  it("exposes machine-readable preview, live, and status fields for regression checks", () => {
    const source = readFileSync(
      resolve(ROOT, "src/components/site/FeatureContractLinks.tsx"),
      "utf8",
    );
    expect(source).toContain("data-feature-status");
    expect(source).toContain("data-preview-route");
    expect(source).toContain("data-live-route");
    expect(source).toContain("Guided preview");
    expect(source).toContain("Open signed-in tool");
  });

  it("keeps partner applications and organization access out of generic waitlist routing", () => {
    const partnerInterest = readFileSync(resolve(ROOT, "src/routes/partner-interest.tsx"), "utf8");
    const waitlist = readFileSync(resolve(ROOT, "src/routes/waitlist.tsx"), "utf8");
    expect(partnerInterest).toContain('to: "/partners"');
    expect(partnerInterest).toContain('hash: "apply"');
    expect(partnerInterest).not.toContain('to: "/waitlist"');
    expect(waitlist).toContain('type RoleKey = "family" | "educator" | "school_admin"');

    const partners = readFileSync(resolve(ROOT, "src/routes/partners.tsx"), "utf8");
    const pricing = readFileSync(resolve(ROOT, "src/routes/pricing.tsx"), "utf8");
    const rolePreviews = readFileSync(resolve(ROOT, "src/lib/demo/role-previews.ts"), "utf8");
    expect(partners).toContain('to="/partner-directory"');
    expect(partners).toContain('id="apply"');
    expect(pricing).toContain('to: "/partner-interest"');
    expect(pricing).toContain('to: "/help"');
    expect(rolePreviews).toContain('to: "/get-started/school"');
    expect(rolePreviews).toContain('to: "/get-started/district"');
    expect(rolePreviews).toContain('to: "/partner-interest"');
  });
});
