import { expect, it } from "vitest";
import {
  computeDeterministicGaps,
  InputsUsed,
  hasRecordedStudentVoice,
  PathwayReportV2,
} from "../../src/lib/pathway-v2";
import {
  intakeHasStudentVoice,
  reconcileIntakeVoiceWarnings,
} from "../../src/lib/pathway-voice-coverage";
import { summarizeReportInputs, reportSourceLabels } from "../../src/lib/report-source-summary";
import { projectSharedReport } from "../../src/lib/shared-report-projection";
import { richerSharedFixture } from "../fixtures/shared-report";

it.each([null, {}, { student_voice: null }, { student_voice: 3 }, { student_voice: "   " }])(
  "does not count absent or malformed intake voice %#",
  (intake) => {
    expect(intakeHasStudentVoice(intake)).toBe(false);
  },
);
it("keeps builder perspective separate from structured response IDs", () => {
  const inputs = InputsUsed.parse({
    intake: true,
    intake_student_voice: true,
    student_voice_keys: [],
  });
  expect(hasRecordedStudentVoice(inputs)).toBe(true);
  expect(computeDeterministicGaps(inputs).some((g) => g.blocks_section === "student_voice")).toBe(
    false,
  );
  expect(inputs.student_voice_keys).toEqual([]);
  expect(summarizeReportInputs(inputs)).toMatchObject({
    student_voice_count: 0,
    intake_student_voice: true,
  });
  expect(reportSourceLabels({ inputs_used: inputs })).toContain("Student Voice (Pathway Builder)");
});
it("does not promote an unsupported flag when no intake was used", () => {
  expect(
    hasRecordedStudentVoice({
      intake: false,
      intake_student_voice: true,
      student_voice_keys: [" "],
    }),
  ).toBe(false);
  expect(
    reportSourceLabels({ inputs_used_summary: { intake: false, intake_student_voice: true } }),
  ).not.toContain("Student Voice (Pathway Builder)");
});
it("retains the voice gap when neither source has a response and accepts real structured keys", () => {
  expect(computeDeterministicGaps({}).some((g) => g.blocks_section === "student_voice")).toBe(true);
  expect(hasRecordedStudentVoice({ student_voice_keys: ["future_work"] })).toBe(true);
});
it("reconciles blanket absence claims without erasing specific follow-up needs or unrelated caveats", () => {
  const report = PathwayReportV2.parse({
    schema_version: 2,
    missing_information_v2: [
      {
        topic: "Student voice responses haven't been captured yet",
        blocks_section: "student_voice",
        why_it_matters: "Without student voice, the plan reflects assumptions.",
        how_to_collect: "Ask the student.",
        owner_role: "student",
      },
      {
        topic: "Update the student's travel preferences",
        blocks_section: "student_voice",
        why_it_matters: "Their preferred route may change.",
        how_to_collect: "Review options.",
        owner_role: "student",
      },
    ],
    confidence: {
      overall: "low",
      rationale: "No uploaded records.",
      caveats: ["No student voice responses on file.", "No IEP was supplied."],
    },
    needs_review_flags: [
      {
        section: "student_voice",
        reason: "No Student Voice responses on file — capture before meeting.",
      },
    ],
  });
  const result = reconcileIntakeVoiceWarnings(report, true);
  expect(result.missing_information_v2?.[0].topic).toBe("Review the Student Perspective");
  expect(result.missing_information_v2?.[1]).toEqual(report.missing_information_v2?.[1]);
  expect(result.confidence?.caveats?.[0]).toContain("supplied in Pathway Builder");
  expect(result.confidence?.caveats?.[1]).toBe("No IEP was supplied.");
  expect(result.needs_review_flags?.[0].reason).toContain("Review it with the student");
  expect(report.confidence?.caveats?.[0]).toBe("No student voice responses on file.");
  expect(reconcileIntakeVoiceWarnings(report, false)).toBe(report);
});
it.each(["family", "educator"] as const)(
  "preserves only safe voice coverage in the fixed %s projection",
  (audience) => {
    const raw = {
      ...richerSharedFixture(),
      inputs_used: { intake: true, intake_student_voice: true, student_voice_keys: [] },
    };
    const shared = projectSharedReport(raw, audience) as any;
    expect(shared.inputs_used).toBeUndefined();
    expect(shared.inputs_used_summary).toMatchObject({
      intake_student_voice: true,
      student_voice_count: 0,
    });
    expect(reportSourceLabels(shared)).toContain("Student Voice (Pathway Builder)");
  },
);
