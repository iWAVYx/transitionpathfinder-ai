import { describe, expect, it } from "vitest";
import {
  PUBLICATION_PAGES,
  REPORT_SECTIONS,
  pageIndex,
  prevPage,
  nextPage,
  firstPageForMilestone,
  pagesByPart,
  reportSectionsByPart,
  getPageByRoute,
} from "@/lib/publication/nav";
import { MAGAZINE_PAGES } from "@/components/site/MagazineReader";
import { DEMO_STEPS } from "@/components/site/DemoStepBar";
import { CHAPTER_META } from "@/lib/demo-chapters";
import {
  DEMO_CHAPTER_TO_MILESTONE,
  REPORT_SECTION_TO_MILESTONE,
  PATHWAY_SPINE,
} from "@/lib/publication/chapters";

describe("publication navigation — single source of truth", () => {
  it("MAGAZINE_PAGES derives from PUBLICATION_PAGES (same length and order)", () => {
    expect(MAGAZINE_PAGES).toHaveLength(PUBLICATION_PAGES.length);
    MAGAZINE_PAGES.forEach((p, i) => {
      expect(p.id).toBe(PUBLICATION_PAGES[i].id);
      expect(p.to).toBe(PUBLICATION_PAGES[i].route);
      expect(p.label).toBe(PUBLICATION_PAGES[i].label);
    });
  });

  it("DEMO_STEPS mirrors the chapter subset of PUBLICATION_PAGES", () => {
    const chapterRoutes = PUBLICATION_PAGES.filter((p) => p.id !== "cover").map((p) => p.route);
    expect(DEMO_STEPS.map((s) => s.to)).toEqual(chapterRoutes);
  });

  it("CHAPTER_META is in sync with PUBLICATION_PAGES", () => {
    for (const [id, meta] of Object.entries(CHAPTER_META)) {
      const page = PUBLICATION_PAGES.find((p) => p.id === id);
      expect(page, `missing publication page for ${id}`).toBeDefined();
      expect(meta.title).toBe(page!.title);
      expect(meta.kicker).toBe(page!.kicker);
      expect(meta.numeral).toBe(page!.numeral);
      expect(meta.page).toBe(String(page!.folio).padStart(2, "0"));
    }
  });

  it("prev/next is symmetric and covers every page", () => {
    PUBLICATION_PAGES.forEach((p, i) => {
      const n = nextPage(p.id);
      const pr = prevPage(p.id);
      if (i < PUBLICATION_PAGES.length - 1) {
        expect(n?.id).toBe(PUBLICATION_PAGES[i + 1].id);
        expect(prevPage(n!.id)?.id).toBe(p.id);
      } else {
        expect(n).toBeUndefined();
      }
      if (i > 0) {
        expect(pr?.id).toBe(PUBLICATION_PAGES[i - 1].id);
        expect(nextPage(pr!.id)?.id).toBe(p.id);
      } else {
        expect(pr).toBeUndefined();
      }
    });
  });

  it("every milestone has at least one first-page mapping", () => {
    for (const m of PATHWAY_SPINE) {
      // family / educator do not currently have dedicated demo pages —
      // they live as voices inside the intake chapter. Skip those for the
      // demo workspace lookup but assert they map in the report.
      if (m.id === "family" || m.id === "educator") {
        const reportTarget = REPORT_SECTIONS.find((s) => s.milestone === m.id);
        expect(reportTarget, `report missing milestone ${m.id}`).toBeDefined();
        continue;
      }
      const first = firstPageForMilestone(m.id);
      expect(first, `demo missing milestone ${m.id}`).toBeDefined();
    }
  });

  it("DEMO_CHAPTER_TO_MILESTONE and REPORT_SECTION_TO_MILESTONE derive from nav", () => {
    for (const p of PUBLICATION_PAGES) {
      expect(DEMO_CHAPTER_TO_MILESTONE[p.id]).toBe(p.milestone);
    }
    for (const s of REPORT_SECTIONS) {
      expect(REPORT_SECTION_TO_MILESTONE[s.id]).toBe(s.milestone);
    }
  });

  it("getPageByRoute round-trips every page", () => {
    for (const p of PUBLICATION_PAGES) {
      expect(getPageByRoute(p.route)?.id).toBe(p.id);
    }
  });

  it("pagesByPart and reportSectionsByPart partition cleanly", () => {
    const totalPages = pagesByPart().reduce((n, g) => n + g.pages.length, 0);
    expect(totalPages).toBe(PUBLICATION_PAGES.length);
    const totalSections = reportSectionsByPart().reduce((n, g) => n + g.sections.length, 0);
    expect(totalSections).toBe(REPORT_SECTIONS.length);
  });

  it("folio numbers are strictly increasing across the publication", () => {
    for (let i = 1; i < PUBLICATION_PAGES.length; i++) {
      expect(PUBLICATION_PAGES[i].folio).toBeGreaterThan(PUBLICATION_PAGES[i - 1].folio);
    }
  });

  it("page indexes match array order", () => {
    PUBLICATION_PAGES.forEach((p, i) => expect(pageIndex(p.id)).toBe(i));
  });
});
