import type { PathwayReportV2 } from "./pathway-v2";

/** Supplied text is a recorded perspective, not an independently verified statement. */
export function intakeHasStudentVoice(intake: Record<string, unknown> | null): boolean {
  return typeof intake?.student_voice === "string" && !!intake.student_voice.trim();
}

const absentVoice =
  /(?:no student voice|student voice (?:responses? |entries? )?(?:ha(?:s|ve)(?:n't| not) been|(?:is|are) (?:missing|absent|not)|not (?:recorded|captured)|missing)|without (?:the )?student(?:'s)? (?:voice|perspective))/i;
const recordedVoiceNote =
  "A student perspective was supplied in Pathway Builder. Review it with the student and add separate Student Voice responses if useful.";

/** Correct only blanket absence claims; preserve specific requests to clarify or update voice. */
export function reconcileIntakeVoiceWarnings(
  report: PathwayReportV2,
  intakeVoice: boolean,
): PathwayReportV2 {
  if (!intakeVoice) return report;
  return {
    ...report,
    missing_information_v2: report.missing_information_v2?.map((gap) =>
      gap.blocks_section === "student_voice" &&
      absentVoice.test(gap.topic + " " + gap.why_it_matters)
        ? {
            ...gap,
            topic: "Review the Student Perspective",
            why_it_matters: recordedVoiceNote,
            how_to_collect:
              "Review the Pathway Builder response with the student before adding or updating their perspective.",
          }
        : gap,
    ),
    confidence: report.confidence
      ? {
          ...report.confidence,
          caveats: report.confidence.caveats?.map((note) =>
            absentVoice.test(note) ? recordedVoiceNote : note,
          ),
        }
      : undefined,
    needs_review_flags: report.needs_review_flags?.map((flag) =>
      flag.section === "student_voice" && absentVoice.test(flag.reason)
        ? { ...flag, reason: recordedVoiceNote }
        : flag,
    ),
  };
}
