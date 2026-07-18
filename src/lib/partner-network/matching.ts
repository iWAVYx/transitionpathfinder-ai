import {
  DEMO_PARTNER_OPPORTUNITIES,
  type PartnerOpportunity,
} from "./demo-data";
import type { DemoProfile } from "@/lib/demo/demo-profiles";

export type MatchReasonKind = "interest" | "theme" | "age" | "support";

export type MatchReason = {
  kind: MatchReasonKind;
  label: string;
  detail: string;
};

export type OpportunityMatch = {
  opportunity: PartnerOpportunity;
  score: number; // 0..100
  reasons: MatchReason[];
  eligible: boolean;
  ineligibleReason?: string;
};

const norm = (s: string) => s.toLowerCase().trim();

/**
 * Pure, explainable matching engine. Every match carries at least one
 * concrete `reason` derived from the profile's own data — never a black
 * box score. Age eligibility is a hard gate; below-minimum or above-max
 * opportunities are surfaced separately as `eligible: false`.
 */
export function matchOpportunitiesForProfile(
  profile: DemoProfile,
  pool: PartnerOpportunity[] = DEMO_PARTNER_OPPORTUNITIES,
): OpportunityMatch[] {
  const interests = new Set(profile.learning.interests.map(norm));
  const emphasized = new Set(profile.stage.emphasizedThemes);
  const disallowed = new Set(profile.stage.disallowedThemes);
  const supportNeeds = new Set(profile.learning.supportNeeds.map(norm));
  const age = profile.demographics.age;

  return pool
    .filter((o) => !o.themes.some((t) => disallowed.has(t)))
    .map((o) => {
      const reasons: MatchReason[] = [];
      let score = 0;

      const interestHits = o.interests.filter((i) =>
        Array.from(interests).some(
          (pi) => pi.includes(norm(i)) || norm(i).includes(pi),
        ),
      );
      if (interestHits.length > 0) {
        score += Math.min(50, interestHits.length * 25);
        reasons.push({
          kind: "interest",
          label: "Matches student interests",
          detail: `Aligns with: ${interestHits.slice(0, 2).join(", ")}`,
        });
      }

      const themeHits = o.themes.filter((t) => emphasized.has(t));
      if (themeHits.length > 0) {
        score += Math.min(30, themeHits.length * 15);
        reasons.push({
          kind: "theme",
          label: "Fits current pathway focus",
          detail: `Advances: ${themeHits.slice(0, 2).join(", ").replaceAll("_", " ")}`,
        });
      }

      const supportHits = o.supports.filter((s) =>
        Array.from(supportNeeds).some(
          (sn) => sn.includes(s.replaceAll("_", " ")) || s.replaceAll("_", " ").includes(sn),
        ),
      );
      if (supportHits.length > 0) {
        score += 10;
        reasons.push({
          kind: "support",
          label: "Provides needed supports",
          detail: `Includes: ${supportHits.slice(0, 2).join(", ").replaceAll("_", " ")}`,
        });
      }

      const eligible = age >= o.minAge && age <= o.maxAge;
      if (eligible) {
        score += 10;
        reasons.push({
          kind: "age",
          label: "Age-appropriate",
          detail: `Serves ages ${o.minAge}–${o.maxAge}; ${profile.shortName} is ${age}`,
        });
      }

      return {
        opportunity: o,
        score: Math.min(100, score),
        reasons,
        eligible,
        ineligibleReason: eligible
          ? undefined
          : age < o.minAge
            ? `Opens at age ${o.minAge}`
            : `Serves through age ${o.maxAge}`,
      };
    })
    .filter((m) => m.reasons.length > 0)
    .sort((a, b) => (Number(b.eligible) - Number(a.eligible)) || b.score - a.score);
}
