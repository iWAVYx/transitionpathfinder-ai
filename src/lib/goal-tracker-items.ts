import { PathwayReportV2 } from "./pathway-v2";

export type GoalTrackerItem = { id: string; group: string; label: string };

/** Content identity prevents a reordered/rewritten step inheriting an index's progress.
 * Old position-only statuses cannot be matched safely without their original text.
 */
export async function goalTrackerItems(content: unknown): Promise<GoalTrackerItem[]> {
  if (!content || typeof content !== "object" || Array.isArray(content)) throw new Error("Report steps are unavailable.");
  const report = content as Record<string, unknown>;
  const entries: { context: unknown[]; group: string; label: string }[] = [];
  if (report.schema_version === 2) {
    const current = PathwayReportV2.parse(report);
    const pillars = [
      ["Education & training", current.postsecondary_education_recs],
      ["Employment pathways", current.employment_pathway_recs],
      ["Independent living", current.independent_living_recs],
      ["Community participation", current.community_participation_recs],
    ] as const;
    for (const [group, recommendations] of pillars) {
      for (const recommendation of recommendations ?? []) {
        entries.push({ context: ["current recommendation", group, recommendation.title, recommendation.owner_role, recommendation.timeframe ?? null],
          group: `${group}: ${recommendation.title}`, label: recommendation.next_action });
      }
    }
    const periods = [["thirty_day", "Next 30 days"], ["ninety_day", "Next 90 days"],
      ["six_month", "Next 6 months"], ["one_year", "Next year"]] as const;
    for (const [period, group] of periods) {
      for (const label of current.cross_cutting_horizons?.[period] ?? []) entries.push({ context: ["shared horizon", period], group, label });
    }
  } else {
    function strings(value: unknown): string[] {
      if (value === undefined) return [];
      if (!Array.isArray(value) || value.some(item => typeof item !== "string")) throw new Error("Report steps are unavailable.");
      return value as string[];
    }
    strings(report.life_skills_focus).forEach(label => entries.push({ context: ["life"], group: "Life skills", label }));
    strings(report.education_training_options).forEach(label => entries.push({ context: ["education"], group: "Education & training", label }));
    if (report.career_pathways !== undefined) {
      if (!Array.isArray(report.career_pathways)) throw new Error("Report steps are unavailable.");
      for (const pathway of report.career_pathways) {
        if (!pathway || typeof pathway !== "object" || typeof pathway.title !== "string") throw new Error("Report steps are unavailable.");
        strings(pathway.first_steps).forEach(label => entries.push({ context: ["career", pathway.title], group: `Pathway: ${pathway.title}`, label }));
      }
    }
    if (report.thirty_day_plan !== undefined) {
      if (!Array.isArray(report.thirty_day_plan)) throw new Error("Report steps are unavailable.");
      for (const step of report.thirty_day_plan) {
        if (!step || typeof step !== "object" || typeof step.week !== "number" || typeof step.action !== "string") throw new Error("Report steps are unavailable.");
        entries.push({ context: ["30-day", step.week], group: "30-day plan", label: `Week ${step.week}: ${step.action}` });
      }
    }
  }
  const occurrences = new Map<string, number>();
  return Promise.all(entries.map(async entry => {
    const identity = JSON.stringify([...entry.context, entry.label]);
    const occurrence = occurrences.get(identity) ?? 0;
    occurrences.set(identity, occurrence + 1);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    return { id: `step-v1:${hash}:${occurrence}`, group: entry.group, label: entry.label };
  }));
}
