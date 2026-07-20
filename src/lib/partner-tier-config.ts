// Partner Network — tier configuration (Workstream C).
// Central source of truth for free-vs-premium caps and confidence-band
// thresholds used by both server enforcement and UI meters.

export const FREE_TIER_OPPORTUNITY_CAP = 3;

export type PartnerTier = "free" | "premium";

/**
 * Derive tier from an active `partner_tier_allows` capability set.
 * Any premium capability implies premium; otherwise free.
 */
export function derivePartnerTier(caps: {
  publish_unlimited_opportunities?: boolean;
  view_analytics?: boolean;
  featured_placement?: boolean;
}): PartnerTier {
  return caps.publish_unlimited_opportunities ||
    caps.view_analytics ||
    caps.featured_placement
    ? "premium"
    : "free";
}

export function opportunityCapFor(tier: PartnerTier): number | null {
  return tier === "premium" ? null : FREE_TIER_OPPORTUNITY_CAP;
}

export function isAtOrOverCap(tier: PartnerTier, publishedCount: number): boolean {
  const cap = opportunityCapFor(tier);
  return cap !== null && publishedCount >= cap;
}

// Confidence bands over a normalized 0–1 match score.
export type ConfidenceBand = "low" | "medium" | "high";

export function confidenceBand(normalizedScore: number): ConfidenceBand {
  if (normalizedScore >= 0.75) return "high";
  if (normalizedScore >= 0.4) return "medium";
  return "low";
}

/**
 * Map raw heuristic scores (partner-matching engine emits ~0–60) to a
 * normalized 0–1 confidence value. Saturates at 60.
 */
export function normalizePartnerMatchScore(rawScore: number): number {
  if (rawScore <= 0) return 0;
  return Math.min(1, rawScore / 60);
}
