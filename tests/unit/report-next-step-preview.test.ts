import { expect, it } from "vitest";
import { reportNextStepPreview } from "../../src/lib/report-next-step-preview";
it("uses only the chosen legacy role's supplied steps and original timing", () => {
  const r = { family_action_plan: { this_week: ["Family task"] }, teacher_next_steps: ["Educator task"], recommended_pathways: [{ type: "best-fit", action_steps: { thirty_day: ["Shared task"] } }] };
  expect(reportNextStepPreview(r, "family", false)).toEqual({ label: "For the Family · This Week", items: ["Family task"] });
  expect(reportNextStepPreview(r, "educator", false)).toEqual({ label: "For the School Team", items: ["Educator task"] });
  expect(reportNextStepPreview(r, "student", false)).toEqual({ label: "Shared Next Steps · Next 30 Days", items: ["Shared task"] });
});
it("labels shared v2 fallback explicitly without reusing another role's plan", () => {
  const r = { family_action_plan_v2: { horizons: { thirty_day: ["Family task"] } }, cross_cutting_horizons: { thirty_day: ["Shared task"] } };
  expect(reportNextStepPreview(r, "student", true)).toEqual({ label: "Shared Next Steps · Next 30 Days", items: ["Shared task"] });
  expect(reportNextStepPreview({ ...r, cross_cutting_horizons: undefined }, "educator", true)).toEqual({ label: "Recorded Next Steps", items: [] });
});
it("limits only the preview, preserves original wording and does not mutate the source", () => {
  const steps = ["  Original wording  ", "Second", "Third", "Fourth"];
  const r = { student_action_plan: { horizons: { thirty_day: steps } } };
  expect(reportNextStepPreview(r, "student", true).items).toEqual(steps.slice(0, 3));
  expect(r.student_action_plan.horizons.thirty_day).toHaveLength(4);
  expect(reportNextStepPreview(null, "student", true).items).toEqual([]);
});

it("uses a recorded legacy 30-day plan when no pathway-specific preview exists", () => {
  const r = { thirty_day_plan: [{ week: 2, action: "Recorded shared step" }] };
  expect(reportNextStepPreview(r, "student", false)).toEqual({ label: "Shared Next Steps · Next 30 Days", items: ["Recorded shared step"] });
});
