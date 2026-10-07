// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DEMO_STUDENTS } from "../../src/lib/demo-data";
const mocks = vi.hoisted(() => ({ server: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => mocks.server }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/ui-prefs.functions", () => ({ getReportViewerPrefs: {}, updateReportViewerPrefs: {} }));
vi.mock("@/lib/student-voice.functions", () => ({ getStudentVoiceResponses: {} }));
vi.mock("@/components/pathway/ConnectToPlan", () => ({ ConnectToPlan: () => null }));
vi.mock("@/components/pathway/ReportPartnerSuggestions", () => ({ ReportPartnerSuggestions: () => null }));
vi.mock("@/components/pathway/ReportPhase4Sections", () => ({ ReportPhase4Sections: () => null, getPhase4TocItems: () => [] }));
vi.mock("@/components/opportunities/OpportunityPipelineSummary", () => ({ OpportunityPipelineSummary: () => null }));
vi.mock("@/components/pathway/AiAssistPanel", () => ({ AiAssistPanel: () => null }));
import { ReportView } from "../../src/components/pathway/ReportView";
beforeEach(() => { mocks.server.mockReset(); mocks.server.mockImplementation(() => { throw new Error("Reader fixture forbids server calls"); }); });
afterEach(cleanup);
it("retains a complete unchanged export when the on-screen period is changed", () => {
  const step = (week: number, action: string) => ({ week, focus: "Recorded step", action, owner: "Student", time: "20 minutes", details: [action], outcome: action });
  const first = step(1, "First month action"), second = step(5, "Second month action"), third = step(9, "Third month action");
  const plans = { thirty: [first], sixty: [first, second], ninety: [first, second, third] };
  const { container } = render(<ReportView name="Maya" report={DEMO_STUDENTS.maya.report} demo extendedPlans={plans} />);
  const exported = container.querySelector("[data-report-complete-plan]")!;
  const before = exported.innerHTML;
  const section = container.querySelector("#sec-thirty-day")!;
  const selected = section.querySelector("ol.print\\:hidden")!;
  expect(selected.querySelectorAll("[data-report-plan-step]")).toHaveLength(1);
  fireEvent.click(screen.getByText("90 Days", { selector: "span" }));
  expect(section.querySelector("ol.print\\:hidden")!.querySelectorAll("[data-report-plan-step]")).toHaveLength(3);
  expect(exported.innerHTML).toBe(before);
  expect(exported.querySelectorAll("[data-report-plan-step]")).toHaveLength(3);
  expect(mocks.server).not.toHaveBeenCalled();
});

for (const audience of ["student", "family", "educator"] as const) for (const demo of [false, true]) {
  it(`${audience}/${demo ? "demo" : "live"} presents only recorded steps without invented assignments or later periods`, () => {
    const report = { ...DEMO_STUDENTS.maya.report, thirty_day_plan: [
      { week: 1, action: "Discuss the recorded interest with the team." },
      { week: 4, action: "Review the recorded progress together." },
    ] };
    const { container } = render(<ReportView name="Maya" report={report} demo={demo} initialAudience={audience} />);
    const section = container.querySelector("#sec-thirty-day")!;
    const screenSteps = section.querySelector("ol.print\\:hidden")!;
    const exported = section.querySelector("[data-report-complete-plan]")!;
    for (const content of [screenSteps, exported]) {
      expect(content.querySelectorAll("[data-report-plan-step]")).toHaveLength(2);
      expect(content.textContent).toContain(report.thirty_day_plan[0].action);
      expect(content.textContent).toContain(report.thirty_day_plan[1].action);
      expect(content.querySelector("[data-report-plan-meta]")).toBeNull();
      expect(content.querySelector("[data-report-plan-actions]")).toBeNull();
      expect(content.querySelector("[data-report-plan-readiness]")).toBeNull();
      expect(content.querySelector("[data-report-plan-details]")).toBeNull();
    }
    expect(section.querySelector('[data-report-export-period="sixty"]')).toBeNull();
    expect(section.querySelector('[data-report-export-period="ninety"]')).toBeNull();
    expect(section.querySelector('[aria-label="Action Plan Timeframe"]')).toBeNull();
  });
}
it("shows an honest empty plan instead of creating fallback actions", () => {
  const { container } = render(<ReportView name="Maya" report={{ ...DEMO_STUDENTS.maya.report, thirty_day_plan: [] }} demo />);
  const section = container.querySelector("#sec-thirty-day")!;
  expect(section.querySelectorAll("[data-report-plan-step]")).toHaveLength(0);
  expect(section.textContent).toContain("No steps are recorded for this period.");
});

it("resets the selected horizon when a different report replaces a detailed plan", () => {
  const step = { week: 9, focus: "Supplied", action: "Previous report action", owner: "Team", time: "15 minutes", details: [], outcome: "Recorded outcome" };
  const plans = { thirty: [], sixty: [], ninety: [step] };
  const { container, rerender } = render(<ReportView name="Maya" report={DEMO_STUDENTS.maya.report} demo extendedPlans={plans} />);
  fireEvent.click(screen.getByText("90 Days", { selector: "span" }));
  rerender(<ReportView name="Maya" report={{ ...DEMO_STUDENTS.maya.report, thirty_day_plan: [{ week: 1, action: "New report action" }] }} demo />);
  const section = container.querySelector("#sec-thirty-day")!;
  expect(section.querySelector("ol.print\\:hidden")!.textContent).toContain("New report action");
  expect(section.textContent).not.toContain("Previous report action");
});
