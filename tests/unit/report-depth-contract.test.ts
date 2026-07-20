import { describe, it, expect } from "vitest";
import { generatePathwayReport } from "@/lib/demo/pathway-engine";
import { DEMO_PROFILES } from "@/lib/demo/demo-profiles";

/**
 * Workstream 2 — Pathway Report depth contract.
 *
 * Every rendered section must be populated OR carry a structured
 * missing/uncertain marker. Generic filler is forbidden. Every
 * recommendation must ship a review-by horizon.
 */
describe("pathway report depth contract", () => {
  const profiles = Object.values(DEMO_PROFILES);

  it("every emitted block has body/bullets OR an explicit missing marker", () => {
    for (const p of profiles) {
      const r = generatePathwayReport(p);
      for (const block of r.blocks) {
        const hasContent =
          (block.body && block.body.trim().length > 0) ||
          (block.bullets && block.bullets.length > 0);
        const hasMissing =
          block.missing &&
          block.missing.reason.length > 0 &&
          block.missing.needed.length > 0;
        expect(
          hasContent || hasMissing,
          `${p.id}:${block.section} must have content or structured missing marker`,
        ).toBe(true);
      }
    }
  });

  it("every next step ships a review-by horizon in months", () => {
    for (const p of profiles) {
      const r = generatePathwayReport(p);
      expect(r.nextSteps.length).toBeGreaterThan(0);
      for (const step of r.nextSteps) {
        expect(step.reviewByMonths).toBeGreaterThan(0);
        expect(step.reviewByMonths).toBeLessThanOrEqual(12);
      }
    }
  });

  it("age band routing follows CT CSDE (transition eligibility at 14)", () => {
    const bands = Object.fromEntries(
      profiles.map((p) => [p.id, generatePathwayReport(p)] as const),
    );
    expect(bands.sam.ageBand).toBe("grade_7_8");
    expect(bands.sam.ctTransitionEligible).toBe(false);
    expect(bands.riley.ageBand).toBe("grade_9_10");
    expect(bands.riley.ctTransitionEligible).toBe(true);
    expect(bands.jordan.ageBand).toBe("grade_11_12");
    expect(bands.jordan.ctTransitionEligible).toBe(true);
  });

  it("Sam / Riley / Jordan reports differ meaningfully (no shared filler)", () => {
    const [sam, riley, jordan] = ["sam", "riley", "jordan"].map((id) =>
      generatePathwayReport(DEMO_PROFILES[id as keyof typeof DEMO_PROFILES]),
    );
    const themeSet = (r: ReturnType<typeof generatePathwayReport>) =>
      new Set(r.pathwayOptions.map((o) => o.themeTag));
    const [s, r, j] = [themeSet(sam), themeSet(riley), themeSet(jordan)];

    // No two profiles share any pathway themes.
    for (const t of s) expect(r.has(t) || j.has(t)).toBe(false);
    for (const t of r) expect(s.has(t) || j.has(t)).toBe(false);

    // Alternatives and conflicts differ by age band.
    expect(sam.alternativePathways.map((a) => a.id)).not.toEqual(
      jordan.alternativePathways.map((a) => a.id),
    );
    expect(jordan.conflicts.length).toBeGreaterThan(0);
    expect(sam.conflicts.length).toBe(0);
  });
});
