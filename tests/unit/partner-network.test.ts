import { describe, it, expect } from "vitest";
import { matchOpportunitiesForProfile } from "@/lib/partner-network/matching";
import { DEMO_PARTNER_OPPORTUNITIES } from "@/lib/partner-network/demo-data";
import { getDemoProfile } from "@/lib/demo/demo-profiles";

describe("partner-network matching", () => {
  it("produces at least one explainable match for every seeded profile", () => {
    for (const id of ["jordan", "riley", "sam"] as const) {
      const profile = getDemoProfile(id);
      const matches = matchOpportunitiesForProfile(profile);
      expect(matches.length).toBeGreaterThan(0);
      for (const m of matches) {
        expect(m.reasons.length).toBeGreaterThan(0);
        for (const r of m.reasons) {
          expect(r.label).toBeTruthy();
          expect(r.detail).toBeTruthy();
        }
      }
    }
  });

  it("marks age-ineligible opportunities without hiding them entirely", () => {
    const sam = getDemoProfile("sam"); // grade 7, young
    const matches = matchOpportunitiesForProfile(sam);
    const anyLater = matches.some((m) => !m.eligible);
    // Sam is 12–13; several teen/adult opportunities should surface as later.
    expect(anyLater).toBe(true);
    for (const m of matches.filter((m) => !m.eligible)) {
      expect(m.ineligibleReason).toBeTruthy();
    }
  });

  it("respects disallowed themes from stage config", () => {
    const jordan = getDemoProfile("jordan");
    const matches = matchOpportunitiesForProfile(jordan);
    for (const m of matches) {
      for (const theme of m.opportunity.themes) {
        expect(jordan.stage.disallowedThemes).not.toContain(theme);
      }
    }
  });

  it("catalog is fully fictional and labeled as such", () => {
    for (const o of DEMO_PARTNER_OPPORTUNITIES) {
      expect(o.fictional).toBe(true);
    }
  });
});
