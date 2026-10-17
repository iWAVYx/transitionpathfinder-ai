import type { ExtendedPlans } from "./demo-extended-plans";

/** The legacy report records only week and action. Do not invent assignments,
 * durations, readiness links, outcomes, or later periods during presentation.
 * Separate role plans retain their own source-defined timing in the reader.
 */
export function recordedReportPlans(report: {
  thirty_day_plan?: readonly { week: number; action: string }[];
}): ExtendedPlans {
  return {
    thirty: (report.thirty_day_plan ?? []).map(step => ({
      week: step.week, action: step.action, focus: "Recorded Step",
      owner: "", time: "", details: [], outcome: "",
    })),
    sixty: [],
    ninety: [],
  };
}
