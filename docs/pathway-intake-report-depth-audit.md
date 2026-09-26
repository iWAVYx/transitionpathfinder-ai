# Pathway Intake and Report Depth Audit

Updated: 2026-09-26

Baseline: `9d29875831c7bb93d46e4591f38a0629aadda665`

Implementation branch: `codex/link-pathway-intake-live-student`

## Plain-language result

The real Pathway intake already asks substantially more than a generic chatbot
prompt. The most important product gap was connection: a new intake could be
completed as free text without linking the resulting report to the authorized
student already visible in the signed-in dashboard.

This package connects those surfaces. A family, student, or educator chooses a
student they are authorized to edit, receives a fresh intake prefilled from
that student's live profile, reviews every answer, and generates a report that
is linked to the same student from the moment it is saved. Switching students
clears the draft so information cannot carry from one student into another.

## Input-to-output map

| Planning evidence                            | Live intake input                                                             | Pathway Report use                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Student identity and grade band              | Connected student, first name, grades 6–8 through post-secondary              | Student snapshot, age-appropriate recommendations, BridgeForward or TransitionForward framing |
| Strengths, preferences, interests, and needs | Strengths, interests, learning/decision preferences, disability-related needs | SPIN analysis, pathway fit, accessible next steps                                             |
| Student voice                                | Live profile statement plus reviewed intake response                          | Student snapshot, goals, prompts, and conflict resolution that centers the student            |
| Family perspective                           | Priorities, hopes, concerns, unresolved questions                             | Family action plan, meeting questions, missing-information work                               |
| Educator evidence                            | Observations, measurable readiness evidence, source labels and dates          | Readiness scorecard, educator action plan, confidence and review flags                        |
| Current plan                                 | IEP transition goals, services, accommodations, assistive technology          | IEP translator, service coordination, accessible pathway supports                             |
| Postsecondary direction                      | Employment, education/training, independent-living outcomes                   | Goal drafts, pathway options, 30/90/180/365-day actions                                       |
| Real-world access                            | Transportation, communication, community barriers                             | Feasibility checks, accommodations, support-needed pathways                                   |
| Deadlines                                    | PPTs, applications, service handoffs, review dates                            | Ordered meeting preparation and time-aware next actions                                       |
| Uncertainty                                  | Information the team still needs to verify                                    | Data gaps, human-review flags, assigned evidence collection                                   |

## Storage and migration boundary

No database migration is required for this package.

- `student_intakes.student_id` and `pathway_reports.student_id` already exist.
- The selected student id is stored on both records at creation time.
- New structured detail fields are labeled and folded into the existing
  bounded `supports`, `educator_input`, and `family_concerns_extended` inputs.
- The report-generation prompt already consumes those bounded fields.
- Report provenance is linked in shadow mode when that feature is enabled.

## Privacy and authorization boundary

- The student list and profile snapshot come through authenticated,
  RLS-protected server functions.
- The creation server function independently requires `edit` authorization for
  the selected student; a modified browser request cannot bypass this check.
- Only the student's first or preferred name reaches report generation.
- IEP text is redacted again on the server before extraction.
- Assistive technology, accommodations, services, readiness evidence, and
  source dates may be extracted only when explicitly present in the reviewed
  privacy-safe text; the model is instructed not to guess.
- No Partner role receives student intake or report access.

## Acceptance checklist

- [x] Connected students are loaded through the caller's existing RLS scope.
- [x] A selected student starts a fresh intake and cannot inherit another
      student's draft answers.
- [x] Middle-school students can use the real intake through the `6-8`
      BridgeForward grade band.
- [x] Assistive technology, accommodations, readiness evidence, source dates,
      and uncertain information are explicit intake questions.
- [x] The report and intake save with the same authorized `student_id`.
- [x] The server repeats the student authorization check before any write.
- [x] IEP-derived additions remain behind privacy review and server redaction.
- [ ] Review the exact implementation diff and automated checks in a draft PR.
- [ ] Merge only with separate authorization.
- [ ] Deploy the exact merge SHA to isolated staging.
- [ ] Test Family, Student, and Educator selection, generation, dashboard
      visibility, and role denial with synthetic data.
- [ ] Verify that a saved intake change appears after report regeneration and
      that source/uncertainty labels render clearly in the report.

## Remaining depth work

This package fixes linkage and the intake evidence surface; it does not declare
the Pathway Engine finished. Later packages must still:

1. show a section-by-section "information used" and "needs verification" view
   in every report audience;
2. prove with controlled fixtures that materially different inputs produce
   materially different recommendations;
3. connect reviewed document extractions, progress-monitoring evidence, and
   current policy sources to recommendation-level provenance;
4. complete the save → regenerate → refreshed dashboard-preview loop for each
   permitted role; and
5. keep all recommendations framed as planning support—not legal advice, a
   finalized IEP, or a substitute for the PPT/team process.
