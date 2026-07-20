// Partner Network — explainable-match contract (Workstream B).
// Wire-format schema shared by server matcher, UI panel, and contract tests.

import { z } from "zod";
import {
  confidenceBand,
  normalizePartnerMatchScore,
  type ConfidenceBand,
} from "./partner-tier-config";

export const partnerMatchExplanationSchema = z.object({
  reasons: z.array(z.string().min(1).max(240)).max(10),
  evidenceIds: z.array(z.string()).max(20),
  confidence: z.enum(["low", "medium", "high"]),
  conflicts: z.array(z.string().min(1).max(240)).max(10),
});

export type PartnerMatchExplanation = z.infer<typeof partnerMatchExplanationSchema>;

/**
 * Deterministic builder consumed by `matchPartnersForStudent`. Given the
 * raw heuristic output the engine already computes, produce a validated
 * explanation DTO with a confidence band and any surfaced conflicts.
 *
 * Conflicts encode "why this might NOT be a match" — e.g. age boundary
 * mismatches or verification warnings — so the UI can flag caveats.
 */
export function buildMatchExplanation(input: {
  rawScore: number;
  reasons: string[];
  evidenceIds?: string[];
  ageOutOfRange?: { studentAge: number | null; partnerRange: string | null } | null;
  verificationStatus?: string | null;
}): PartnerMatchExplanation {
  const conflicts: string[] = [];

  if (input.ageOutOfRange && input.ageOutOfRange.studentAge != null) {
    conflicts.push(
      `Student age ${input.ageOutOfRange.studentAge} is outside stated range (${input.ageOutOfRange.partnerRange ?? "unspecified"}) — verify eligibility.`,
    );
  }
  if (input.verificationStatus === "needs_review") {
    conflicts.push("Partner listing has not been reviewed yet — confirm details before sharing.");
  }
  if (input.verificationStatus === "outdated") {
    conflicts.push("Partner listing is marked outdated — information may no longer be current.");
  }

  const dto: PartnerMatchExplanation = {
    reasons: dedupeShort(input.reasons ?? []),
    evidenceIds: (input.evidenceIds ?? []).slice(0, 20),
    confidence: confidenceBand(normalizePartnerMatchScore(input.rawScore)) as ConfidenceBand,
    conflicts: dedupeShort(conflicts),
  };

  return partnerMatchExplanationSchema.parse(dto);
}

function dedupeShort(xs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of xs) {
    const s = (raw ?? "").toString().trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s.length > 240 ? s.slice(0, 237) + "..." : s);
    if (out.length >= 10) break;
  }
  return out;
}

// UI helper — visual tone for a confidence band.
export function confidenceBandLabel(band: ConfidenceBand): string {
  return band === "high" ? "High confidence" : band === "medium" ? "Medium confidence" : "Low confidence";
}
