import { describe, expect, it } from "vitest";
import { getDemoProfile } from "@/lib/demo/demo-profiles";
import {
  DEMO_OPPORTUNITIES,
  matchOpportunities,
} from "@/lib/demo/opportunity-matcher";

describe("opportunity-matcher age safeguards", () => {
  it("filters out adult employment for Sam (Grade 7)", () => {
    const sam = getDemoProfile("sam");
    const results = matchOpportunities(sam);
    const animal = results.find((m) => m.opportunity.id === "op-animal-care")!;
    expect(animal.band).toBe("filtered_out");
    expect(animal.safeguardReasons.join(" ")).toMatch(/Grade|Product|Age-safeguard/i);
  });

  it("filters out high-school-choice content for Jordan (Grade 11)", () => {
    const jordan = getDemoProfile("jordan");
    const results = matchOpportunities(jordan);
    const visit = results.find((m) => m.opportunity.id === "op-hs-arts-visit")!;
    expect(visit.band).toBe("filtered_out");
  });

  it("gives Jordan at least one strong postsecondary/work match", () => {
    const jordan = getDemoProfile("jordan");
    const strong = matchOpportunities(jordan).filter((m) => m.band === "strong");
    expect(strong.length).toBeGreaterThan(0);
  });

  it("gives Sam a middle-school-enrichment or school-visit match", () => {
    const sam = getDemoProfile("sam");
    const visible = matchOpportunities(sam).filter((m) => m.band !== "filtered_out");
    expect(
      visible.some((m) => m.opportunity.kind === "enrichment" || m.opportunity.kind === "school_visit"),
    ).toBe(true);
  });

  it("every opportunity is fictional", () => {
    for (const op of DEMO_OPPORTUNITIES) {
      expect(op.fictional).toBe(true);
    }
  });
});
