// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
import { recordGeneratedSections, recordSavedSections } from "../../src/lib/report-section-updates";
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


for (const audience of ["student", "family", "educator"] as const) for (const mode of audience === "student" ? ["demo", "live"] : ["demo", "live", "shared"]) {
  it(`${audience} ${mode} legacy readiness preserves full recorded details without percentage fallbacks or reset section numbers`, () => {
    const original = richerSharedFixture();
    const snapshot = structuredClone(original);
    const shared = mode === "shared";
    const report = shared ? projectSharedReport(original, audience)! : original;
    const { container } = render(<ReportView name="Maya" report={report} hasV2 demo={mode === "demo"} readOnly={shared} fixedAudience={shared ? audience : undefined} initialAudience={audience} />);
    const readiness = container.querySelector("#sec-readiness")!;
    expect(readiness.querySelector('[role="progressbar"]')).toBeNull();
    for (const row of original.readiness_scorecard) {
      for (const field of [row.evidence, row.what_it_means, row.growth_activity, row.suggested_goal]) expect(readiness.textContent).toContain(field);
    }
    expect(Array.from(container.querySelectorAll(".pub-page-kicker")).some(element => /^Section \d+$/.test(element.textContent ?? ""))).toBe(false);
    expect(container.querySelector("#v2-meeting-qs") !== null).toBe(audience !== "student");
    expect(original).toEqual(snapshot);
    expect(mocks.server).not.toHaveBeenCalled();
  });
}


for (const audience of ["student", "family", "educator"] as const) for (const shared of audience === "student" ? [false] : [false, true]) {
  it(`${audience}/${shared ? "shared" : "planning"} cover and snapshot use newer confidence without reclassifying retained pathways`, () => {
    const original = { ...richerSharedFixture(), confidence_level: "high", confidence: { overall: "low", rationale: "Current inputs need review." } };
    const report = shared ? projectSharedReport(original, audience as "family" | "educator")! : original;
    const { container } = render(<ReportView name="Maya" report={report as any} hasV2 readOnly={shared} initialAudience={audience} fixedAudience={shared ? audience : undefined} />);
    expect(container.querySelector('.print-cover-footer-tag')!.textContent).toBe("Low Confidence");
    expect(container.querySelector('.fb-cover')!.textContent).toContain("Low Confidence");
    expect(container.querySelector('section[aria-label="Student Snapshot"]')!.textContent).toContain("Low Confidence");
    expect(container.querySelector('#v2-confidence')!.textContent).toContain("Low Confidence");
    const pathways = container.querySelector('#sec-pathways')!;
    expect(pathways.textContent).not.toMatch(/High Confidence|Low Confidence/);
    for (const pathway of original.recommended_pathways) {
      expect(pathways.textContent).toContain(pathway.why_it_fits);
    }
    expect(mocks.server).not.toHaveBeenCalled();
  });
}
it("does not show an older cover confidence when the newer confidence is absent", () => {
  const report = { ...richerSharedFixture(), confidence_level: "high" };
  const { container } = render(<ReportView name="Maya" report={report as any} hasV2 initialAudience="family" />);
  expect(container.querySelector('.print-cover-footer-tag')).toBeNull();
  expect(container.querySelector('.fb-cover')!.textContent).not.toMatch(/High Confidence|Lower Confidence|Low Confidence/);
  expect(container.querySelector('section[aria-label="Student Snapshot"]')!.textContent).not.toContain("Confidence");
});

it("does not promote retained overall readiness into a newer summary or pathway badge", () => {
  const report = { ...richerSharedFixture(), student_snapshot: { ...DEMO_STUDENTS.maya.report.student_snapshot, readiness_level: "ready" },
    readiness_indicators: [{ domain: "Current recorded area", level: "emerging", note: "Current support is still needed." }] };
  const { container } = render(<ReportView name="Maya" report={report as any} hasV2 initialAudience="family" />);
  expect(container.querySelector('section[aria-label="Student Snapshot"]')!.textContent).not.toContain("Readiness");
  expect(container.querySelector('#sec-pathways')!.textContent).not.toContain("Readiness:");
  expect(container.querySelector('#sec-snapshot')!.textContent).toContain("Ready");
  expect(container.querySelector('#v2-readiness-indicators')!.textContent).toContain("Emerging");
  expect(container.querySelector('#v2-readiness-indicators')!.textContent).toContain("Current support is still needed.");
});

for (const audience of ["student", "family", "educator"] as const) for (const shared of audience === "student" ? [false] : [false, true]) {
  it(`${audience}/${shared ? "shared" : "planning"} reader history contains only applicable recorded sections`, () => {
    const generated = recordGeneratedSections(undefined, richerSharedFixture(), "2026-10-01T12:00:00.000Z");
    const source = recordSavedSections(generated, { ...generated, postsecondary_goals: richerSharedFixture().postsecondary_goals!.map((goal, index) => index === 0 ? { ...goal, current_status: "Saved planning wording" } : goal) }, "2026-10-12T18:00:00.000Z");
    const report = shared ? projectSharedReport(source, audience as "family" | "educator")! : source;
    const { container } = render(<ReportView name="Maya" report={report as any} hasV2 readOnly={shared} initialAudience={audience} fixedAudience={shared ? audience : undefined} />);
    const history = container.querySelector('[data-report-section-updates]')!;
    fireEvent.click(within(history as HTMLElement).getByRole("button", { name: "Show Update Details" }));
    expect(history.querySelector('[data-report-update-field="postsecondary_goals"]')!.textContent).toContain("Saved · Oct 12, 2026");
    expect(!!history.querySelector('[data-report-update-field="educator_action_plan_v2"]')).toBe(audience === "educator");
    expect(!!history.querySelector('[data-report-update-field="student_action_plan"]')).toBe(audience !== "educator");
    expect(history.textContent).not.toMatch(/write_id|private-answer|a1111111|Saved planning wording/);
    expect(history.querySelectorAll('time').length).toBeGreaterThan(5);
    expect(mocks.server).not.toHaveBeenCalled();
  });
}

for (const audience of ["student", "family", "educator"] as const) for (const shared of audience === "student" ? [false] : [false, true]) {
  it(`${audience} ${shared ? "shared" : "saved"} readers identify recorded earlier sections without removing their content`, () => {
    const earlier = recordGeneratedSections(undefined, richerSharedFixture(), "2026-10-01T12:00:00.000Z");
    const current = recordGeneratedSections(earlier, { inputs_used: { generated_at: "2026-10-12T18:00:00.000Z" }, plain_language_summary: "Current family summary", professional_summary: "Current educator summary" }, "2026-10-12T18:00:00.000Z");
    const report = shared ? projectSharedReport(current, audience as "family" | "educator")! : current;
    const { container } = render(<ReportView name="Maya" report={report as any} hasV2 readOnly={shared} fixedAudience={shared ? audience as "family" | "educator" : undefined} initialAudience={audience} />);
    expect(container.querySelector('[data-report-retained-sections]')!.textContent).toContain("kept from an earlier version");
    expect(container.querySelector('[data-report-retained-sections] a')!.getAttribute("href")).toBe("#report-section-update-history");
    expect(container.querySelector('#report-section-update-history')).not.toBeNull();
    expect(container.querySelector('#sec-goals')).not.toBeNull();
    expect(container.textContent).not.toMatch(/write_id|private-answer/);
    expect(mocks.server).not.toHaveBeenCalled();
  });
}
it("does not invent saved history for demo samples", () => {
  const earlier = recordGeneratedSections(undefined, richerSharedFixture(), "2026-10-01T12:00:00.000Z");
  const current = recordGeneratedSections(earlier, { inputs_used: { generated_at: "2026-10-12T18:00:00.000Z" } }, "2026-10-12T18:00:00.000Z");
  const { container } = render(<ReportView name="Maya" report={current as any} hasV2 demo />);
  expect(container.querySelector('[data-report-retained-sections]')).toBeNull();
  expect(container.textContent).toContain("This sample has no saved section update history.");
});
