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
    const report = { ...richerSharedFixture(), meeting_prep_questions: [], meeting_prep_toolkit: undefined, family_questions_for_ppt: ["Legacy-only question?"] };
    const { container } = render(<ReportView name="Maya" report={report} hasV2 demo initialAudience={audience} />);
    const text = container.querySelector("[data-report-team-questions]")!.textContent ?? "";
    expect(text).toContain("No meeting questions are recorded for this report view.");
    expect(container.textContent).not.toContain("Legacy-only question?");
    expect(container.querySelector('[data-report-team-questions] a[href="#v2-meeting-qs"]')).toBeNull();
  });
}

for (const audience of ["student", "family", "educator"] as const) {
  it(`${audience} newer report without a toolkit renders only its newer meeting questions`, () => {
    const report = { ...richerSharedFixture(), meeting_prep_toolkit: undefined, family_questions_for_ppt: ["Legacy-only question?"], meeting_prep_questions: questions };
    const { container } = render(<ReportView name="Maya" report={report} hasV2 demo initialAudience={audience} />);
    expect(container.textContent).not.toContain("Legacy-only question?");
    expect(container.querySelector("#v2-meeting-qs")!.textContent).toContain("Recorded team question 10?");
    expect(mocks.server).not.toHaveBeenCalled();
  });
}

it("collapses only spacing-only recorded repeats and preserves distinct requests without mutation", () => {
  const report = {
    family_questions_for_ppt: ["  Who records progress?  ", "Can travel training start this spring?"],
    meeting_prep_toolkit: { questions_to_ask: ["Who  records\nprogress?", "When can travel training begin?", "Who records progress each week?"] },
  };
  const before = structuredClone(report);
  expect(reportTeamQuestions(report, "family", false)).toEqual([
    "  Who records progress?  ", "Can travel training start this spring?", "When can travel training begin?", "Who records progress each week?",
  ]);
  expect(report).toEqual(before);
  expect(reportTeamQuestions({meeting_prep_questions:[
    {question:"Whose observations should we bring?",for_audience:"team"},
    {question:"Whose  observations should we bring?",for_audience:"team"},
    {question:"Which dated observations should we bring?",for_audience:"student"},
    {question:"Educator-only question?",for_audience:"educator"},
  ]},"student",true)).toEqual(["Whose observations should we bring?","Which dated observations should we bring?"]);
});

for (const audience of ["student", "family", "educator"] as const) {
  for (const mode of ["demo", "saved", ...(audience === "student" ? [] : ["shared"])] as const) {
    it(`${audience} ${mode} legacy report keeps the complete question list in one meeting-prep destination`, () => {
      let report = structuredClone(DEMO_STUDENTS.maya.report);
      const family = Array.from({length:mode==="shared" ? 6 : 10},(_,i)=>`Unique recorded family request ${i+1}?`);
      report.family_questions_for_ppt=family;
      report.meeting_prep_toolkit!.questions_to_ask=[family[0],family[1],"Unique recorded educator request?"];
      if (mode==="shared" && audience!=="student") {
        const projected=projectSharedReport(report,audience);
        expect(projected).not.toBeNull();
        report=projected!;
      }
      const {container}=render(<ReportView name="Maya" report={report} demo={mode==="demo"} readOnly={mode==="shared"} fixedAudience={mode==="shared" ? audience : undefined} initialAudience={audience}/>);
      const destination=container.querySelector("#sec-meeting-prep")!;
      for (const question of [...family,"Unique recorded educator request?"]) {
        expect(destination.textContent).toContain(question);
        expect(screen.getAllByText(question,{exact:true})).toHaveLength(1);
      }
      const summary=container.querySelector("[data-report-team-questions]")!;
      expect(summary.querySelector('a[href="#sec-meeting-prep"]')).not.toBeNull();
      expect(summary.textContent).not.toContain(family[0]);
      expect(mocks.server).not.toHaveBeenCalled();
    });
  }
}
it("a legacy report without a toolkit still has a complete reachable meeting-question destination", () => {
  const report={...DEMO_STUDENTS.maya.report, meeting_prep_toolkit:undefined,family_questions_for_ppt:["Recorded family question?"]};
  const {container}=render(<ReportView name="Maya" report={report} demo initialAudience="family"/>);
  expect(container.querySelector("#sec-meeting-prep")?.textContent).toContain("Recorded family question?");
  expect(container.querySelector('[data-report-team-questions] a[href="#sec-meeting-prep"]')).not.toBeNull();
  expect(screen.getAllByText("Recorded family question?",{exact:true})).toHaveLength(1);
});


for (const id of ["maya","jordan"] as const) {
  it(`${id} fictional report uses a single consistent set without dropping specific planning details`, () => {
    const report=DEMO_STUDENTS[id].report;
    const questions=reportTeamQuestions(report,"family",false);
    expect(questions).toEqual(report.family_questions_for_ppt);
    expect(questions).toEqual(report.meeting_prep_toolkit!.questions_to_ask);
    expect(questions).toHaveLength(id==="maya" ? 5 : 6);
    if (id==="maya") {
      expect(questions.join(" ")).toContain("this spring tied to a real volunteer site");
      expect(questions.join(" ")).toContain("before Maya turns 18");
    } else {
      expect(questions.join(" ")).toContain("executive-function supports");
      expect(questions.join(" ")).toContain("transportation-independence goal to the spring IEP");
      expect(questions.join(" ")).toContain("weekly across all classes");
    }
  });
}
