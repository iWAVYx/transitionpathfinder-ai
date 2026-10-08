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


for (const audience of ["student", "family", "educator"] as const) for (const demo of [true, false]) {
  it(`${audience} ${demo ? "demo" : "live"} readiness/confidence stays faithful to qualitative recorded information`, () => {
    const report = { ...richerSharedFixture(),
      readiness_indicators: ["emerging", "developing", "progressing", "ready"].map(level => ({ domain: `Recorded ${level} area`, level, note: `Recorded ${level} observation` })),
      confidence: { overall: "high", rationale: "Recorded explanation based on an earlier observation.", caveats: ["A current team review is still needed."] },
    };
    const { container } = render(<ReportView name="Maya" report={report} hasV2 demo={demo} initialAudience={audience} />);
    const readiness = container.querySelector("#v2-readiness-indicators")!;
    for (const level of ["emerging", "developing", "progressing", "ready"]) {
      expect(readiness.textContent).toContain(`Recorded ${level} area`);
      expect(readiness.textContent).toContain(`Recorded ${level} observation`);
    }
    expect(readiness.querySelector('[style*="width"]')).toBeNull();
    const confidence = container.querySelector("#v2-confidence")!;
    expect(confidence.textContent).toContain("High Confidence");
    expect(confidence.textContent).toContain(report.confidence.rationale);
    expect(confidence.textContent).toContain(report.confidence.caveats[0]);
    expect(confidence.textContent).not.toMatch(/comprehensive and recent|Solid inputs/);
    expect(mocks.server).not.toHaveBeenCalled();
  });
}
for (const audience of ["family", "educator"] as const) {
  it(`${audience} shared confidence preserves recorded explanation and caveats`, () => {
    const original = { ...richerSharedFixture(), confidence: { overall: "high", rationale: "Older information needs review.", caveats: ["Confirm the source date."] } };
    const report = projectSharedReport(original, audience)!;
    const { container } = render(<ReportView name="this student" report={report} hasV2 readOnly fixedAudience={audience} initialAudience={audience} />);
    const text = container.querySelector("#v2-confidence")!.textContent ?? "";
    expect(text).toContain(original.confidence.rationale);
    expect(text).toContain(original.confidence.caveats[0]);
    expect(text).not.toContain("Inputs are comprehensive and recent");
  });
}
for (const overall of ["low", "medium", "high"]) {
  it(`${overall} confidence without supporting notes is explicitly incomplete`, () => {
    const report = { ...richerSharedFixture(), confidence: { overall } };
    const { container } = render(<ReportView name="Maya" report={report} hasV2 demo />);
    expect(container.querySelector("#v2-confidence")!.textContent).toContain("No explanation or review notes are recorded for this confidence level.");
  });
}
