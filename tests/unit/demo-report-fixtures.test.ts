import { describe, expect, it } from "vitest";
import {
  DEMO_EVIDENCE_LINKS,
  DEMO_EVIDENCE_USED_SUMMARY,
  DEMO_REPORT_BODY,
  DEMO_REPORT_SECTION_IDS,
} from "@/lib/report-evidence/fixtures";
import { REPORT_SECTIONS } from "@/lib/report-evidence/types";

describe("demo report fixtures (Slice E contract)", () => {
  it("evidence links reference only canonical report sections", () => {
    for (const link of DEMO_EVIDENCE_LINKS) {
      expect(REPORT_SECTIONS).toContain(link.reportSection);
    }
  });

  it("report body sections reference only canonical sections", () => {
    for (const s of DEMO_REPORT_SECTION_IDS) {
      expect(REPORT_SECTIONS).toContain(s);
    }
  });

  it("each generated section has plain + professional summaries with real content", () => {
    for (const s of DEMO_REPORT_BODY.sections) {
      expect(s.family_plain.length).toBeGreaterThanOrEqual(60);
      expect(s.professional.length).toBeGreaterThanOrEqual(60);
      expect(Array.isArray(s.missing_evidence)).toBe(true);
      expect(Array.isArray(s.follow_up_questions)).toBe(true);
    }
  });

  it("evidence_used summary matches the fixture evidence links", () => {
    expect(DEMO_EVIDENCE_USED_SUMMARY.total).toBe(DEMO_EVIDENCE_LINKS.length);
    const coveredFromLinks = new Set(DEMO_EVIDENCE_LINKS.map((l) => l.reportSection));
    for (const s of DEMO_EVIDENCE_USED_SUMMARY.covered_sections) {
      expect(coveredFromLinks.has(s as (typeof REPORT_SECTIONS)[number])).toBe(true);
    }
  });

  it("does not raise the weak-summary flag", () => {
    expect(DEMO_REPORT_BODY.weak_summary_flag).toBe(false);
  });
});
