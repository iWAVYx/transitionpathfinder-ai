// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ReportIepSummary } from "@/components/documents/ReportIepSummary";
import { OPTIONAL_REPORT_EXAMPLE } from "@/lib/demo/optional-report-example";
afterEach(cleanup);
it.each(["student", "family", "educator"] as const)("%s IEP goals have a subordinate heading and retain complete role-appropriate wording", audience => {
  const goal = { area: "education and IEP planning", goal_text: "Exact recorded draft goal wording. ".repeat(10), plain_language: "Exact recorded plain-language explanation.", related_services: ["Recorded service"] };
  const iep = { ...OPTIONAL_REPORT_EXAMPLE.iep_plan_summary!, transition_goals: [goal] };
  const { container } = render(<ReportIepSummary iep={iep} audience={audience} />);
  expect(screen.getByRole("heading", { level: 2, name: "IEP / Transition Plan Summary" })).toBeTruthy();
  expect(screen.getByRole("heading", { level: 3, name: "Transition Goals" })).toBeTruthy();
  expect(screen.getByRole("heading", { level: 4, name: "Education and IEP Planning" })).toBeTruthy();
  expect(container.querySelector("[data-report-recorded-goal-title]")?.textContent?.trim()).toBe(goal.goal_text.trim());
  expect(container.textContent).toContain("Recorded service");
  expect(container.textContent?.includes(goal.plain_language)).toBe(audience !== "educator");
  expect(screen.queryByText("In Plain Language") !== null).toBe(audience !== "educator");
  expect(screen.queryByText(/Approved|Baseline|Assessment score/)).toBeNull();
});
it("absent optional plan fields and related services do not add invented details", () => {
  const iep = { source_doc_ids: [], transition_goals: [{ area: "Recorded area", goal_text: "Recorded goal", plain_language: "Recorded plain-language explanation" }], accommodations: [], services: [] };
  render(<ReportIepSummary iep={iep} audience="educator" />);
  expect(screen.queryByText("In Plain Language")).toBeNull();
  expect(screen.queryByRole("heading", { name: "Accommodations" })).toBeNull();
  expect(screen.queryByRole("heading", { name: "Services" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Recorded Area", level: 4 })).toBeTruthy();
});
