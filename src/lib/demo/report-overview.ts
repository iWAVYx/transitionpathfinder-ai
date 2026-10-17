import type { EnrichedNextStep } from "./pathway-engine";

const TIMEFRAMES = { this_month: "This Month", this_semester: "This Semester", this_year: "This Year" };
const ROLE_LABELS = { student: "For the Student", family: "For the Family", educator: "For the School Team" };

/** Preview this audience's recorded actions, then shared actions; never borrow another role's work. */
export function demoReportNextStepPreview(steps: EnrichedNextStep[], audience: "student" | "family" | "educator") {
  const owner = audience === "educator" ? "school_team" : audience;
  const own = steps.filter(step => step.owner === owner);
  const selected = own.length ? own : steps.filter(step => step.owner === "shared");
  return {
    label: own.length ? ROLE_LABELS[audience] : selected.length ? "Shared Next Steps" : "Recorded Next Steps",
    items: selected.slice(0, 3).map(step => `${step.title} — ${TIMEFRAMES[step.timeframe]} · Review in ${step.reviewByMonths} ${step.reviewByMonths === 1 ? "Month" : "Months"}`),
  };
}
