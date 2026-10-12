// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
const state = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => children }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => state.navigate, Link: ({ to, search, children }: any) => <a href={`${to}?${new URLSearchParams(search)}`}>{children}</a> }));
import { DemoOptionalReportSections } from "@/components/demo/DemoOptionalReportSections";
import { OPTIONAL_REPORT_EXAMPLE } from "@/lib/demo/optional-report-example";
import { PathwayReportV2 } from "@/lib/pathway-v2";
afterEach(() => { cleanup(); state.navigate.mockReset(); });
it("validates fictional optional source fields without claiming uploaded document identity", () => {
  expect(PathwayReportV2.safeParse(OPTIONAL_REPORT_EXAMPLE).success).toBe(true);
  expect(OPTIONAL_REPORT_EXAMPLE.iep_plan_summary?.source_doc_ids).toEqual([]);
  expect(OPTIONAL_REPORT_EXAMPLE.iep_plan_summary?.caveats).toContain("No IEP was uploaded, extracted or reviewed");
  expect(OPTIONAL_REPORT_EXAMPLE.change_summary).toContain("not a live record history");
});
it.each(["student", "family", "educator"] as const)("%s preview uses actual sections and complete permitted source text", audience => {
  const source = OPTIONAL_REPORT_EXAMPLE;
  const { container } = render(<DemoOptionalReportSections audience={audience} builderRole="educator" />);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByRole("heading", { name: "IEP / Transition Plan Summary" })).toBeTruthy();
  for (const text of [source.iep_plan_summary!.present_levels!, source.iep_plan_summary!.caveats!, source.iep_plan_summary!.transition_goals[0].goal_text,
    ...source.iep_plan_summary!.accommodations, ...source.iep_plan_summary!.services, source.confidence!.rationale!, ...source.confidence!.caveats!, source.change_summary!, source.needs_review_flags![0].reason]) expect(container.textContent).toContain(text);
  const goal = source.iep_plan_summary!.transition_goals[0];
  expect(container.textContent?.includes(goal.plain_language)).toBe(audience !== "educator");
  expect(container.textContent).toContain("section preview, not a complete report");
  expect(container.querySelector('[data-document-watermark]')).toBeTruthy();
  expect(screen.getByRole("button", { name: "Print or save Pathway Report as PDF" })).toBeTruthy();
  expect(screen.getByRole("link", { name: /Back to Sample Pathway Report/ }).getAttribute("href")).toContain("role=educator");
  expect(container.querySelector('input[type="file"]')).toBeNull();
  expect(screen.queryByRole("button", { name: /Generate|Save to student|Refresh report/ })).toBeNull();
});
it("Student lens retains its eligible builder origin and other lens links preserve context", () => {
  render(<DemoOptionalReportSections audience="educator" builderRole="educator" />);
  fireEvent.click(screen.getByRole("button", { name: "Student", exact: true }));
  let navigation = state.navigate.mock.calls.at(-1)![0];
  expect(navigation.search({ example: "plan-details", role: "educator", retained: "context" })).toEqual({ example: "plan-details", role: "educator", view: "student", retained: "context" });
  expect(navigation.resetScroll).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Family", exact: true }));
  navigation = state.navigate.mock.calls.at(-1)![0];
  expect(navigation.search({ example: "plan-details", role: "educator" })).toMatchObject({ role: "family", view: "family" });
});
