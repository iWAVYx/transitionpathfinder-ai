import { PathwayReportV2 } from "@/lib/pathway-v2";

/** Authored fictional section fixture, not uploaded, extracted or generated data. */
export const OPTIONAL_REPORT_EXAMPLE = PathwayReportV2.parse({
  schema_version: 2,
  student_snapshot: { display_name: "Maya — Fictional Example", grade: "12", plan_type: "Fictional transition plan", last_updated: "2026-10-01" },
  plain_language_summary: "This example shows how a report can organize plan details, review questions and an explanation of confidence. It is not a real student's plan.",
  professional_summary: "Fictional section example for reviewing plan wording, recorded supports and missing evidence with a student and family. No document has been uploaded or assessed.",
  change_summary: "Sample update: added a request for dated observations. This illustrates an update summary, not a live record history.",
  iep_plan_summary: {
    source_doc_ids: [],
    present_levels: "In this fictional example, Maya follows written directions during familiar classroom activities. The team still needs dated observations from a new setting before comparing how independently she asks for support.",
    transition_goals: [{ area: "Self-Advocacy", goal_text: "In this fictional goal example, Maya will independently request written directions in four of five observed opportunities.", plain_language: "Maya practices asking for written directions when she needs them. The team records each opportunity and whether she asked without a reminder.", related_services: ["Fictional example: case-manager check-ins"] }],
    accommodations: ["Fictional example: written directions"],
    services: ["Fictional example: self-advocacy practice"],
    caveats: "Fictional plan example only. No IEP was uploaded, extracted or reviewed. This is not an agreed goal, service recommendation or compliance determination.",
  },
  confidence: { overall: "medium", rationale: "This fictional example has a goal and a described support, but no dated observation log. That missing evidence limits what a team could conclude.", caveats: ["Example confidence is not a test score or a completed assessment.", "Compare the wording with the current source plan and dated progress records."] },
  needs_review_flags: [{ section: "Dated Progress Evidence", reason: "In this example, ask who records each opportunity, what counts as an independent request and when the team will review the observations.", owner_role: "school_team" }],
});
