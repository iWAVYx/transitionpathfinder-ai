// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { prepareReportTranslation } from "../../src/lib/report-translation-contract";
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
vi.mock("@/components/pathway/AiAssistPanel", () => ({ AiAssistPanel: ({ report, onTranslated, onReset }: any) => <>
  <button onClick={() => { const prepared = prepareReportTranslation(report); onTranslated(prepared.apply({ translations: prepared.texts.map(item => ({ id: item.id, text: `Translated: ${item.text}` })) }), "spanish"); }}>Apply Fixture Translation</button>
  <button onClick={onReset}>Reset Fixture Translation</button>
</> }));
import { ReportView } from "../../src/components/pathway/ReportView";
beforeEach(() => { mocks.server.mockReset(); mocks.server.mockImplementation(() => { throw new Error("Reader fixture forbids server calls"); }); });
afterEach(cleanup);
it.each(["student", "family", "educator"] as const)("shows the translated newer sections and restores the original for the %s audience", audience => {
  const report = { ...structuredClone(DEMO_STUDENTS.maya.report), schema_version: 2,
    student_snapshot: { display_name: "Maya Rivera", grade: "12", headline: "A recorded headline" },
    plain_language_summary: "A recorded plain-language summary", professional_summary: "A recorded professional summary",
    family_action_plan_v2: { intro: "A recorded family plan", horizons: { thirty_day: ["A recorded thirty-day action"], ninety_day: ["A recorded ninety-day action"], six_month: ["A recorded six-month action"], one_year: ["A recorded one-year action"] } },
  };
  render(<ReportView name="Maya" report={report as any} hasV2 initialAudience={audience} />);
  const summary = audience === "educator" ? report.professional_summary : report.plain_language_summary;
  expect(screen.getByText(summary)).toBeTruthy();
  fireEvent.click(screen.getByText("Apply Fixture Translation", { selector: "button" }));
  expect(screen.getByText(`Translated: ${summary}`)).toBeTruthy();
  expect(screen.queryByText(summary)).toBeNull();
  expect(screen.getByText("Translated: A recorded headline")).toBeTruthy();
  expect(screen.getByText("Translated: A recorded family plan")).toBeTruthy();
  expect(screen.getByText("Grade 12")).toBeTruthy();
  fireEvent.click(screen.getByText("Reset Fixture Translation", { selector: "button" }));
  expect(screen.getByText(summary)).toBeTruthy();
  expect(screen.queryByText(`Translated: ${summary}`)).toBeNull();
  expect(screen.getByText("A recorded family plan")).toBeTruthy();
  expect(mocks.server).not.toHaveBeenCalled();
});
