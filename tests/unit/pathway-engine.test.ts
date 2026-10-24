import { describe, it, expect } from "vitest";
import { generatePathwayReport, _internals } from "@/lib/demo/pathway-engine";
import { DEMO_PROFILES } from "@/lib/demo/demo-profiles";

describe("pathway engine age-aware safeguards", () => {
  it("Grade 7 (Sam) never surfaces adult employment or agency referrals", () => {
    const r = generatePathwayReport(DEMO_PROFILES.sam);
    expect(r.pathwayOptions.length).toBeGreaterThan(0);
    for (const opt of r.pathwayOptions) {
      expect(opt.ageBand).toBe("grade_7_8");
      expect(["adult_employment", "agency_referrals", "rights_transfer", "postsecondary_applications"])
        .not.toContain(opt.themeTag);
    }
  });

  it("Grade 9 (Riley) never surfaces rights transfer or postsecondary applications", () => {
    const r = generatePathwayReport(DEMO_PROFILES.riley);
    expect(r.pathwayOptions.length).toBeGreaterThan(0);
    for (const opt of r.pathwayOptions) {
      expect(opt.ageBand).toBe("grade_9_10");
      expect(["rights_transfer", "postsecondary_applications", "agency_referrals"])
        .not.toContain(opt.themeTag);
    }
  });

  it("Grade 11 (Jordan) surfaces postsecondary + agency + rights transfer content", () => {
    const r = generatePathwayReport(DEMO_PROFILES.jordan);
    const themes = r.pathwayOptions.map((o) => o.themeTag);
    expect(themes).toContain("postsecondary_options");
    expect(themes).toContain("agency_connections");
    expect(themes).toContain("rights_transfer");
    for (const opt of r.pathwayOptions) {
      expect(opt.ageBand).toBe("grade_11_12");
    }
  });

  it("every profile produces all seven explanation sections", () => {
    const expected = [
      "what_we_know",
      "evidence",
      "unknowns",
      "why_it_fits",
      "what_to_do_next",
      "ahead_beside_behind",
      "when_to_revisit",
    ];
    for (const profile of Object.values(DEMO_PROFILES)) {
      const r = generatePathwayReport(profile);
      expect(r.blocks.map((b) => b.section)).toEqual(expected);
    }
  });

  it.each([
    ["sam", 8], ["riley", 10], ["jordan", 12],
  ] as const)("fit explanation uses the selected %s profile grade %i without unverified promises", (id, gradeNumber) => {
    const original = DEMO_PROFILES[id];
    const profile = { ...original, demographics: { ...original.demographics, gradeNumber, gradeLabel: `Grade ${gradeNumber}` } };
    const report = generatePathwayReport(profile);
    const fit = report.blocks.find(block => block.section === "why_it_fits")!;
    expect(fit.body).toContain(profile.shortName);
    expect(fit.body).toContain(profile.demographics.gradeLabel);
    expect(fit.body).toContain("sample options");
    expect(fit.body).not.toMatch(/rights transferring next year|strongest predictor|formally begins|actually works/);
    expect(fit.body).toMatch(/review|confirm/i);
    expect(fit.bullets?.[0]).toContain(profile.demographics.gradeLabel);
    expect(report.pathwayOptions.every(option => option.fitSummary && !option.fitSummary.includes("strongest predictor"))).toBe(true);
    expect(DEMO_PROFILES[id]).toBe(original);
    expect(original.demographics.gradeNumber).not.toBe(gradeNumber);
  });

  it("catalog has options across all three age bands", () => {
    const bands = new Set(_internals.PATHWAY_CATALOG.map((o) => o.ageBand));
    expect(bands.has("grade_7_8")).toBe(true);
    expect(bands.has("grade_9_10")).toBe(true);
    expect(bands.has("grade_11_12")).toBe(true);
  });
});
