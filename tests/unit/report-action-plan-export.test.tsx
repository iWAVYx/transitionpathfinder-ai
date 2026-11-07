// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { richerSharedFixture } from "../fixtures/shared-report";
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

for (const audience of ["student", "family", "educator"] as const) for (const demo of [false, true]) {
  it(`${audience}/${demo ? "demo" : "live"} summary uses the source-defined role plan and avoids empty stages`, () => {
    const base = DEMO_STUDENTS.maya.report;
    const report = { ...base, family_action_plan: undefined, educator_action_plan: undefined,
      student_action_plan: { horizons: { thirty_day: ["Recorded student next step"] } },
      family_action_plan_v2: { horizons: { thirty_day: ["Recorded family next step"] } },
      educator_action_plan_v2: { horizons: { thirty_day: ["Recorded educator next step"] } },
    };
    const { container } = render(<ReportView name="Maya" report={report} demo={demo} hasV2 initialAudience={audience} />);
    const summary = container.querySelector(".exec-summary")!;
    expect(summary.textContent).toContain(`Recorded ${audience} next step`);
    for (const other of ["student", "family", "educator"].filter(role => role !== audience)) expect(summary.textContent).not.toContain(`Recorded ${other} next step`);
    expect(summary.textContent).toContain("Next 30 Days");
    expect(summary.textContent).not.toContain("Start Here This Week");
    expect(container.querySelector('[data-report-section="family_action_plan"]')).toBeNull();
  });
}

for (const audience of ["student", "family", "educator"] as const) for (const demo of [false, true]) {
  it(`${audience}/${demo ? "demo" : "live"} opener reports only recorded sources`, () => {
    const base = { ...DEMO_STUDENTS.maya.report, inputs_used: undefined, inputs_used_summary: undefined };
    const { container, rerender } = render(<ReportView name="Maya" report={base} demo={demo} initialAudience={audience} />);
    const opener = () => container.querySelector("[data-report-source-opener]")!.textContent!;
    expect(opener()).toContain("The source list was not recorded");
    expect(opener()).not.toContain("Uploaded documents");
    expect(opener()).not.toContain("Readiness scores");
    rerender(<ReportView name="Maya" report={{ ...base, inputs_used_summary: { intake: true, goal_count: 2 } } as typeof base} demo={demo} initialAudience={audience} />);
    expect(opener()).toContain("Pathway Builder Responses · Transition Goals");
    expect(opener()).not.toContain("Student Voice");
    expect(opener()).not.toContain("IEP Documents");
    expect(mocks.server).not.toHaveBeenCalled();
  });
}

for (const audience of ["student", "family", "educator"] as const) for (const demo of [false, true]) {
  it(`${audience}/${demo ? "demo" : "live"} newer contents reach only rendered audience sections`, () => {
    const report = richerSharedFixture();
    const { container } = render(<ReportView name="Maya" report={report as unknown as Parameters<typeof ReportView>[0]["report"]} hasV2 demo={demo} initialAudience={audience} />);
    const contents = screen.getByRole("navigation", { name: "Table of contents" });
    const links = Array.from(contents.querySelectorAll('a[href^="#v2-"]'));
    expect(links.length).toBeGreaterThan(5);
    for (const link of links) expect(container.querySelectorAll(link.getAttribute("href")!)).toHaveLength(1);
    for (const id of ["v2-iep-summary", "v2-emp", "v2-resources", "v2-partners", "v2-family-plan", "v2-inputs-used"]) expect(contents.querySelector(`a[href="#${id}"]`)).not.toBeNull();
    expect(!!contents.querySelector('a[href="#v2-student-plan"]')).toBe(audience !== "educator");
    expect(!!contents.querySelector('a[href="#v2-edu-plan"]')).toBe(audience === "educator");
    expect(!!contents.querySelector('a[href="#v2-meeting-qs"]')).toBe(audience !== "student");
    if (audience === "student") expect(container.querySelector("#v2-meeting-qs")).toBeNull();
    expect(contents.querySelector('a[href="#v2-edu"]')).toBeNull();
    expect(mocks.server).not.toHaveBeenCalled();
  });
}

it("links every supplied newer section to one real reader destination", () => {
  const base = richerSharedFixture();
  const recs = base.employment_pathway_recs;
  const report = { ...base,
    spin: { strengths: ["Recorded strength"], preferences: [], interests: [], needs: [] },
    readiness_indicators: [{ domain: "School", level: "developing", note: "Recorded observation" }],
    needs_review_flags: [{ section: "Plan", reason: "Check with the team" }],
    confidence: { overall: "medium", rationale: "Some information needs review" },
    postsecondary_education_recs: recs, independent_living_recs: recs, community_participation_recs: recs,
    missing_information_v2: [{ topic: "Current observation", why_it_matters: "Use current information", how_to_collect: "Ask the team", owner_role: "family" }],
    cross_cutting_horizons: { thirty_day: ["Recorded step"], ninety_day: [], six_month: [], one_year: [] },
  };
  const { container } = render(<ReportView name="Maya" report={report as unknown as Parameters<typeof ReportView>[0]["report"]} hasV2 demo initialAudience="educator" />);
  const contents = screen.getByRole("navigation", { name: "Table of contents" });
  for (const section of container.querySelectorAll('[id^="v2-"]')) {
    if (section.id === "v2-inputs-used-body") continue;
    expect(contents.querySelectorAll(`a[href="#${section.id}"]`)).toHaveLength(1);
  }
  for (const link of contents.querySelectorAll('a[href^="#v2-"]')) expect(container.querySelectorAll(link.getAttribute("href")!)).toHaveLength(1);
});
