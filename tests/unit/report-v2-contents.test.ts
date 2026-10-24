import { expect, it } from "vitest";
import { reportV2Contents, reportMeetingQuestions } from "../../src/lib/report-v2-contents";
it("does not invent newer destinations without versioned recorded sections", () => {
  for (const report of [null, {}, { schema_version: 1, student_action_plan: {} }, { schema_version: 2 }]) {
    expect(reportV2Contents(report, "family")).toEqual([]);
  }
});
it("filters meeting questions before deciding whether an audience destination exists", () => {
  const questions = [{ question: "Teacher question", for_audience: "educator" }, { question: "Student question", for_audience: "student" }, { question: "Team question", for_audience: "team" }];
  expect(reportMeetingQuestions(questions, "student")).toEqual(questions.slice(1));
  expect(reportMeetingQuestions(questions, "family")).toEqual(questions.slice(1));
  expect(reportMeetingQuestions(questions, "educator")).toEqual(questions);
  expect(questions).toHaveLength(3);
  const report = { schema_version: 2, meeting_prep_questions: questions.slice(0, 1) };
  expect(reportV2Contents(report, "student")).toEqual([]);
  expect(reportV2Contents(report, "family")).toEqual([]);
  expect(reportV2Contents(report, "educator")).toEqual([{ id: "v2-meeting-qs", label: "Meeting Prep Questions" }]);
});
