export const NEWER_CONFIDENCE_LABELS = {
  low: "Low Confidence", medium: "Medium Confidence", high: "High Confidence",
} as const;
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Cover/snapshot confidence belongs to this report format, never another retained field. */
export function reportConfidenceLabel(content: unknown, hasV2: boolean): string | null {
  const r = record(content);
  if (hasV2) {
    const level = record(r.confidence).overall;
    return level === "low" || level === "medium" || level === "high" ? NEWER_CONFIDENCE_LABELS[level] : null;
  }
  switch (r.confidence_level) {
    case "high": return "High Confidence";
    case "moderate": return "Moderate Confidence";
    case "low": return "Lower Confidence";
    default: return null;
  }
}
