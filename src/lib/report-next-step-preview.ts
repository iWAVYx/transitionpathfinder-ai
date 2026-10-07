type ReportAudience = "student" | "family" | "educator";
type Preview = { label: string; items: string[] };
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const items = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 3) : [];

/** A brief source-defined preview; never assign another role's plan or invent timing. */
export function reportNextStepPreview(content: unknown, audience: ReportAudience, hasV2: boolean): Preview {
  const r = record(content);
  if (hasV2) {
    const field = audience === "student" ? "student_action_plan" : audience === "family" ? "family_action_plan_v2" : "educator_action_plan_v2";
    const own = items(record(record(r[field]).horizons).thirty_day);
    if (own.length) return { label: "Your Next Steps · Next 30 Days", items: own };
    const shared = items(record(r.cross_cutting_horizons).thirty_day);
    return { label: shared.length ? "Shared Next Steps · Next 30 Days" : "Recorded Next Steps", items: shared };
  }
  if (audience === "family") {
    const own = items(record(r.family_action_plan).this_week);
    if (own.length) return { label: "For the Family · This Week", items: own };
  }
  if (audience === "educator") {
    const own = items(r.teacher_next_steps);
    if (own.length) return { label: "For the School Team", items: own };
  }
  const pathways = Array.isArray(r.recommended_pathways) ? r.recommended_pathways.map(record) : [];
  const bestFit = pathways.find(pathway => pathway.type === "best-fit") ?? pathways[0];
  const pathwaySteps = items(record(record(bestFit).action_steps).thirty_day);
  const shared = pathwaySteps.length ? pathwaySteps : items(Array.isArray(r.thirty_day_plan) ? r.thirty_day_plan.map(step => record(step).action) : []);
  return { label: shared.length ? "Shared Next Steps · Next 30 Days" : "Recorded Next Steps", items: shared };
}
