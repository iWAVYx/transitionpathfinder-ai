type Audience = "student" | "family" | "educator";
type Overview = {
  summary: string;
  strengths: string[];
  direction?: { label: string; title: string; explanation: string };
};
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;
const strengths = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((item): item is string => !!text(item)).slice(0, 3) : [];

/** Newer generation retains legacy fields. Never present those as its current overview. */
export function reportOverviewContent(content: unknown, audience: Audience, hasV2: boolean): Overview {
  const r = record(content);
  if (hasV2) {
    const summaries = audience === "educator"
      ? [r.professional_summary, r.plain_language_summary]
      : [r.plain_language_summary, r.professional_summary];
    // The newer schema records pillar recommendations, not a ranked best-fit direction.
    return {
      summary: summaries.map(text).find(Boolean) ?? "An updated overview is not available. Review the detailed sections with your team.",
      strengths: strengths(record(r.spin).strengths),
    };
  }
  const pathways = Array.isArray(r.recommended_pathways) ? r.recommended_pathways.map(record) : [];
  const bestFit = pathways.find(p => p.type === "best-fit") ?? pathways[0];
  return {
    summary: text(r.summary) ?? "A summary is not recorded. Review the detailed sections with your team.",
    strengths: strengths(r.strengths_snapshot),
    direction: bestFit && text(bestFit.title) ? {
      label: "Best-Fit Direction", title: bestFit.title as string, explanation: text(bestFit.why_it_fits) ?? "",
    } : undefined,
  };
}
