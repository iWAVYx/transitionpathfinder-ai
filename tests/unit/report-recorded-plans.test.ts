import { expect, it } from "vitest";
import { recordedReportPlans } from "../../src/lib/report-recorded-plans";
it("preserves every recorded action and week without truncating or reassigning source fields", () => {
  const steps = Array.from({ length: 6 }, (_, index) => ({ week: index + 1, action: `Recorded action ${index}` }));
  const before = JSON.stringify(steps);
  const result = recordedReportPlans({ thirty_day_plan: steps });
  expect(result.thirty.map(({ week, action }) => ({ week, action }))).toEqual(steps);
  expect(result.sixty).toEqual([]);
  expect(result.ninety).toEqual([]);
  expect(JSON.stringify(steps)).toBe(before);
  for (const step of result.thirty) {
    expect(step.owner).toBe(""); expect(step.time).toBe(""); expect(step.outcome).toBe("");
    expect(step.details).toEqual([]);
    expect(step.familyActions).toBeUndefined(); expect(step.teacherActions).toBeUndefined(); expect(step.readiness).toBeUndefined();
  }
});
it("does not fabricate a plan when no actions are recorded", () => {
  expect(recordedReportPlans({})).toEqual({ thirty: [], sixty: [], ninety: [] });
});
