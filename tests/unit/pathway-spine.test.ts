import { describe, it, expect } from "vitest";
import {
  PATHWAY_SPINE,
  DEMO_CHAPTER_TO_MILESTONE,
  REPORT_SECTION_TO_MILESTONE,
  milestoneIndex,
} from "@/lib/publication/chapters";
import { MAGAZINE_PAGES } from "@/components/site/MagazineReader";

describe("Pathway Spine registry", () => {
  it("has exactly 8 ordered milestones", () => {
    expect(PATHWAY_SPINE).toHaveLength(8);
    expect(PATHWAY_SPINE.map((m) => m.id)).toEqual([
      "intake","voice","family","educator","documents","readiness","pathway","plan",
    ]);
  });

  it("milestone index is monotonic and within range", () => {
    PATHWAY_SPINE.forEach((m, i) => {
      expect(milestoneIndex(m.id)).toBe(i);
    });
  });

  it("every demo chapter maps to a real milestone", () => {
    for (const page of MAGAZINE_PAGES) {
      const milestone = DEMO_CHAPTER_TO_MILESTONE[page.id];
      expect(milestone, `demo chapter ${page.id} must map to a milestone`).toBeDefined();
      expect(PATHWAY_SPINE.some((m) => m.id === milestone)).toBe(true);
    }
  });

  it("every report section maps to a real milestone", () => {
    for (const milestone of Object.values(REPORT_SECTION_TO_MILESTONE)) {
      expect(PATHWAY_SPINE.some((m) => m.id === milestone)).toBe(true);
    }
  });

  it("milestone labels are Title Case single words", () => {
    for (const m of PATHWAY_SPINE) {
      expect(m.label[0]).toBe(m.label[0].toUpperCase());
      expect(m.contribution.length).toBeGreaterThan(8);
    }
  });
});
