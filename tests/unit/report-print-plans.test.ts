import { expect, it } from "vitest";
import { reportPrintPlans } from "../../src/lib/report-print-plans";
import type { RichPlanStep } from "../../src/lib/demo-extended-plans";
const step: RichPlanStep = { week: 1, focus: "Review", action: "Discuss the recorded goal", owner: "Student",
  time: "20 minutes", details: ["Record the student's response"], outcome: "A recorded decision",
  familyActions: ["Discuss transport"], teacherActions: ["Confirm supports"],
  readiness: { category: "Self-Advocacy", level: "developing", metric: "One independent request" },
};
it("prints each complete identical cumulative step once without changing the supplied plans", () => {
  const plans = { thirty: [step], sixty: [structuredClone(step)], ninety: [structuredClone(step)] };
  const before = structuredClone(plans);
  expect(reportPrintPlans(plans).map(period => period.steps.length)).toEqual([1, 0, 0]);
  expect(plans).toEqual(before);
});
it.each([
  { owner: "Family" }, { details: ["Different observation"] }, { outcome: "Different decision" },
  { familyActions: ["Confirm a different route"] }, { teacherActions: ["Review a different support"] },
  { readiness: { ...step.readiness!, metric: "Two independent requests" } }, { week: 2 }, { time: "40 minutes" },
])("retains steps with changed source fields: %j", change => {
  const changed = { ...step, ...change };
  const periods = reportPrintPlans({ thirty: [step], sixty: [changed], ninety: [structuredClone(changed)] });
  expect(periods[0].steps).toEqual([step]); expect(periods[1].steps).toEqual([changed]); expect(periods[2].steps).toEqual([]);
});
it("retains each empty period honestly without adding steps", () => {
  expect(reportPrintPlans({ thirty: [], sixty: [], ninety: [] }).map(period => period.steps)).toEqual([[], [], []]);
});
