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
import { projectSharedReport } from "../../src/lib/shared-report-projection";
import { reportTeamQuestions } from "../../src/lib/report-team-questions";
import { ReportView } from "../../src/components/pathway/ReportView";
beforeEach(() => { mocks.server.mockReset(); mocks.server.mockImplementation(() => { throw new Error("Reader fixture forbids server calls"); }); });
afterEach(cleanup);

it("retains all recorded legacy questions and only removes exact duplicates", () => {
  const report = { family_questions_for_ppt: Array.from({ length: 10 }, (_, i) => `Recorded question ${i + 1}?`), meeting_prep_toolkit: { questions_to_ask: ["Recorded question 1?", "  Preserve this question?  "] } };
  const before = structuredClone(report);
  expect(reportTeamQuestions(report, "student", false)).toEqual([...report.family_questions_for_ppt, "  Preserve this question?  "]);
  expect(report).toEqual(before);
  expect(reportTeamQuestions(null, "family", true)).toEqual([]);
  expect(reportTeamQuestions({ meeting_prep_questions: [null, {}, { question: "Hidden?", for_audience: "owner" }] }, "family", true)).toEqual([]);
});
const questions = [
  ...Array.from({ length: 10 }, (_, i) => ({ question: `Recorded team question ${i + 1}?`, for_audience: "team" })),
  { question: "Recorded student question?", for_audience: "student" },
  { question: "Recorded family question?", for_audience: "family" },
  { question: "Recorded educator question?", for_audience: "educator" },
];
for (const audience of ["student", "family", "educator"] as const) for (const demo of [true, false]) {
  it(`${audience} ${demo ? "demo" : "live"} team checklist includes later recorded questions with existing audience visibility`, () => {
    const report = { ...richerSharedFixture(), meeting_prep_questions: questions };
    const { container } = render(<ReportView name="Maya" report={report} hasV2 demo={demo} initialAudience={audience} />);
    const section = container.querySelector("[data-report-team-questions]")!;
    expect(section.querySelector('a[href="#v2-meeting-qs"]')).not.toBeNull();
    expect(section.textContent).not.toContain("Recorded team question 10?");
    const text = container.querySelector("#v2-meeting-qs")!.textContent ?? "";
    expect(text).toContain("Recorded team question 10?");
    expect(text).toContain("Recorded student question?");
    expect(text.includes("Recorded family question?")).toBe(audience !== "student");
    expect(text.includes("Recorded educator question?")).toBe(audience === "educator");
    expect(text).not.toContain("every open question");
    expect(mocks.server).not.toHaveBeenCalled();
  });
}
for (const audience of ["family", "educator"] as const) {
  it(`${audience} shared team checklist retains all permitted recorded questions`, () => {
    const report = projectSharedReport({ ...richerSharedFixture(), meeting_prep_questions: questions }, audience)!;
    const { container } = render(<ReportView name="this student" report={report} hasV2 readOnly fixedAudience={audience} initialAudience={audience} />);
    expect(container.querySelector('[data-report-team-questions] a[href="#v2-meeting-qs"]')).not.toBeNull();
    const text = container.querySelector("#v2-meeting-qs")!.textContent ?? "";
    expect(text).toContain("Recorded team question 10?");
    expect(text).toContain("Recorded family question?");
    expect(text.includes("Recorded educator question?")).toBe(audience === "educator");
    expect(mocks.server).not.toHaveBeenCalled();
  });
}

for (const audience of ["student", "family", "educator"] as const) {
  it(`${audience} reports an empty newer question list without falling back to legacy questions`, () => {
    const report = { ...richerSharedFixture(), meeting_prep_questions: [], family_questions_for_ppt: ["Legacy-only question?"] };
    const { container } = render(<ReportView name="Maya" report={report} hasV2 demo initialAudience={audience} />);
    const text = container.querySelector("[data-report-team-questions]")!.textContent ?? "";
    expect(text).toContain("No meeting questions are recorded for this report view.");
    expect(text).not.toContain("Legacy-only question?");
    expect(container.querySelector('[data-report-team-questions] a[href="#v2-meeting-qs"]')).toBeNull();
  });
}
