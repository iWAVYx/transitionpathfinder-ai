
# Pathway Report — Per-Section Rewrite by Stage

## Goal
The Pathway Report currently renders 20+ `Block` sections in ad-hoc order under `ReportView`. The workspace, dashboards, and spine already speak in the nine-stage model (`src/lib/workspace/stages.ts`). This slice aligns the report body itself — grouped, ordered, and titled by stage — so the report visually reads as "the same nine-stage journey, now as a document."

## Non-goals
- Rewriting the content of each Block (the inner data views stay as-is this slice).
- Changing report data fetching, print CSS, or the v2 IssueShell threading.
- Removing `sec-*` legacy ids (the alias layer in `PathwayReportLayout` continues to work).

## Approach: thin orchestrator, not a 2704-line rewrite

1. Extract each existing `Block` in `ReportView.tsx` into a named render function
   (`renderStudentSnapshot(props)`, `renderStudentVoice(props)`, …) inside
   `src/components/pathway/report/sections/`. Purely mechanical — cut the JSX
   for each `<Block id="sec-…">…</Block>` and its supporting locals into a
   file that exports one function taking the same props ReportView already has
   in scope (report, student, meta).
2. Create `src/components/pathway/report/PathwayReportBody.tsx`. It:
   - Iterates `WORKSPACE_STAGES` in order.
   - For each stage, renders a stage header (order, label, title,
     description) with an anchor id `stage-<id>`.
   - For each `stage.reportSections`, calls the matching renderer from step 1
     (via a `Record<PathwayReportSectionId, Renderer>` map).
   - Skips sections whose renderer returns `null` (missing data), so the TOC
     and body agree on what's present.
3. `ReportView.tsx` keeps its current top-of-report scaffolding (header,
   watermark, exec summary, print controls) and swaps the middle block soup
   for `<PathwayReportBody report={report} student={student} … />`. Trailing
   non-stage blocks (Timeline, Human Review, appendix) move below the stage
   body under a clearly-labeled "Appendix" heading — they aren't in the stage
   model and stay that way.
4. `PathwayReportLayout` stays as-is. Because renderers keep their existing
   `id="sec-…"` on the outer `Block`, the alias-anchor injection and
   scroll-spy keep working unchanged. Add `id="stage-<id>"` on each new stage
   header so the spine can also target stages directly.
5. Add `sections/index.ts` mapping every `PathwayReportSectionId` →
   renderer, and a unit test that asserts:
   - Every id in `WORKSPACE_STAGES[i].reportSections` has a renderer.
   - Every renderer key is a valid `PathwayReportSectionId`.
   - Rendering the body with fixture data emits sections in stage order.

## File plan

```text
src/components/pathway/report/
  sections/
    StudentSnapshot.tsx          # sec-snapshot
    StudentVoice.tsx             # sec-student-voice + sec-your-voice
    StrengthsPreferencesInterestsNeeds.tsx  # sec-spin + sec-strengths
    FamilyActionPlan.tsx         # sec-family-plan
    MeetingPrepQuestions.tsx     # sec-meeting-prep
    EducatorActionPlan.tsx       # (new — thin wrapper on existing content)
    IepTransitionTranslator.tsx  # sec-iep-translator
    DataGaps.tsx                 # sec-data-gaps
    ReadinessScorecard.tsx       # sec-readiness
    PostsecondaryGoals.tsx       # sec-goals
    RecommendedPathways.tsx      # sec-pathways + sec-education
    CareerLifeMatches.tsx        # sec-careers
    NextSteps30_90_180_365.tsx   # sec-thirty-day + sec-life-skills + sec-role-next-steps
    RecommendedResources.tsx     # sec-opportunities
    PartnerMatches.tsx           # sec-partner-suggestions
    index.ts                     # PathwayReportSectionId -> renderer map
  PathwayReportBody.tsx          # stage-grouped orchestrator
  PathwayReportLayout.tsx        # unchanged
  PathwayReportSpine.tsx         # unchanged (already stage-aware)

src/components/pathway/
  ReportView.tsx                 # header/appendix retained; middle body -> PathwayReportBody

tests/unit/
  pathway-report-body.test.tsx   # renderer map + stage-order coverage
```

## Verification
- `bunx tsgo --noEmit` clean for changed files.
- New unit test + existing `pathway-report-spine`, `workspace-stages`,
  `stage-journey-card`, `public-journey-strip` tests all pass.
- Manual visual check on `/demo/report`: sections appear grouped under nine
  stage headers, TOC/spine highlight tracks scroll.

## Rollout note
Because this is a large mechanical refactor, if any single section's extraction
turns out to depend on locals hoisted deep inside `ReportView`, that renderer
is temporarily left inline in `ReportView` and pulled through
`PathwayReportBody` via a `renderInlineFallback` slot — the stage grouping
still applies. The follow-up slice extracts the remaining inline sections.
