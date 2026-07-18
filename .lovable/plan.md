
## Why a plan first

This correction requires touching sample data used by ~15 demo surfaces (workspace stages, intake, voice, documents, plan, meeting, calendar, opportunities, next actions, Pathway Report, activity). Today the workspace, calendar, opportunities, and stage samples are hard-coded to Jordan and do NOT consume the selected profile at all — switching the header changes the tiles but leaves the underlying sample data unchanged. Doing this correctly is ~10 files of nontrivial edits, so I want to confirm scope before touching all of it.

## Scope this delivers

### 1. Centralized per-profile bundle
Extend `src/lib/demo/demo-profiles.ts` with a new `sample` field on every `DemoProfile`:

```
sample: {
  intake,          // completion state + category answers
  familyInput,     // priorities, concerns, logistics
  educatorInput,   // observations, planning gaps
  documents,       // fictional filenames + extraction chips (age-appropriate)
  assessments,     // scores + observations
  opportunities,   // 3–5 opportunities with age/grade-appropriate eligibility
  matches,         // explainable match reasons keyed to that profile's interests
  calendar,        // profile-specific events (school visits for Sam, PPT for Riley, agency intake for Jordan)
  nextActions,     // 30/60/90 tasks derived from that profile's goals
  activity,        // recent-activity feed
  report: { id, version, executiveSummary, snapshotSentence },
  workspaceProgress // per-stage completion %
}
```

Jordan keeps his existing narrative; Sam and Riley get age-appropriate content (no adult employment for Sam, no rights-transfer for Riley, no HS-choice for Jordan).

### 2. Consuming surfaces
Rewire these to read the selected profile's `sample.*`:

- `src/lib/workspace/stage-samples.ts` → export a `getStageSample(stageId, profile)` and update `StageBody` consumers to pass the profile. Replaces hard-coded "Jordan Rivera" / "Age 17" / "Something Jordan enjoys" strings.
- `src/routes/demo_.workspace.$stage.tsx` → pass `profile` into `StageBody`.
- `src/routes/demo_.opportunities.tsx` and `OpportunityMatches` → source from `profile.sample.opportunities` + `profile.sample.matches`.
- `src/routes/demo_.calendar.tsx` → merge `profile.sample.calendar` on top of the generic template.
- `src/routes/demo_.intake.tsx`, `demo_.voice.tsx`, `demo_.documents.tsx`, `demo_.plan.tsx`, `demo_.meeting.tsx`, `demo_.next.tsx`, `demo_.report.tsx` → each reads `useDemoStudent().profile.sample.*` and renders profile-specific content.
- `src/components/pathway/PathwayReportDeepPreview.tsx` → accepts a profile prop; snapshot sentence, evidence chips, and recommendations come from that profile's bundle.

### 3. Per-profile session state
Add `src/lib/demo/use-profile-session.ts`: a `sessionStorage`-backed store keyed by `profileId` for demo-only edits (intake toggles, saved opportunities, action-item checks). Switching profiles preserves each profile's independent state and restores it on return. Existing `useDemoMeetingEdits` migrates onto this store.

### 4. Empty states, not fallbacks
Where a profile intentionally has no data (e.g. Sam has no adult employment opportunities), render the profile-appropriate empty state ("No Postsecondary Application Started Yet") instead of Jordan's content.

### 5. Transition safety
`useDemoStudent().setProfile()` gets a small unmount/remount key so the previous student's content does not flash under the new name during navigation.

### 6. Tests
`tests/unit/demo-profile-sample-fingerprints.test.ts` — asserts that each profile bundle contains a unique fingerprint token (e.g. Sam includes "arts magnet tour", Riley includes "robotics club", Jordan includes "veterinary clinic") and that no bundle contains another profile's fingerprint.

## Technical notes

- No schema, RLS, or authenticated product changes. Signed-in product continues to enforce real permissions.
- No new dashboard cards, no numbered sections, no new nav.
- Layout counts (`tilesForProfile` invariants) stay green.
- Existing tests (`tests/unit/demo-profile-switch.test.ts`, `tests/unit/pathway-engine.test.ts`, `tests/unit/demo-feature-map.test.ts`, `tests/rls-pii-access.test.mjs`) stay green.

## What I'd like to confirm before I start

1. **Depth per surface**: is the plan above the right cut, or do you want richer content per profile (e.g. 8–10 documents per student instead of 3)?
2. **Legacy `demo-extras.ts` (`maya`/`jordan` keys)**: keep as-is for signed-in `_authenticated/demo-mode`, or fold into the new profile bundle?
3. **`PathwayReportDeepPreview`**: swap all sections per profile, or keep the fixed structure and only swap snapshot + evidence + recommendations?
