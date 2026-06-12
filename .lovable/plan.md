## Goal
Make the Pathway Report feel like the platform's primary deliverable: 21-section spine, every recommendation traceable to a source, three distinct rendered reports (Student / Family / Educator), and version history that preserves audit value across regenerations.

## Approach: additive-now, restructure-on-regenerate
- Extend the Zod schema in `src/lib/pathway.functions.ts` with new optional fields. Existing reports keep rendering through a back-compat shim in `ReportView.tsx`.
- Newly generated reports populate the full 21-section spine with rationale metadata.
- Snapshot the old `content` into `pathway_report_versions` before any overwrite (already wired by `updatePathwayReportContent`) so regeneration is non-destructive.

## Schema additions (`PathwayReport`)
- `iep_summary`: `{ source_doc_ids[], present_levels, transition_goals[], accommodations[], services[], plan_dates }`
- `recommendations` blocks split into four pillars:
  - `postsecondary_education` / `employment_pathway` / `independent_living` / `community_participation`
  - each item: `{ title, summary, why, sources[], next_action, owner_role, discuss_at_next_meeting, related_goal_id? }`
- `resource_matches[]`: `{ resource_id, title, url, why, sources[], action, owner_role }` — sourced from `saved_resources` + `student_resource_recommendations`
- `partner_matches[]`: same shape, sourced from `student_opportunity_matches` + `student_saved_partners`
- `missing_information[]`: `{ topic, why_it_matters, how_to_collect, owner_role, blocking_for_section }`
- `student_action_plan` (peer to family / educator plans), all three time-horizoned 30 / 90 / 6mo / 1yr
- `time_horizons`: `{ thirty_day[], ninety_day[], six_month[], one_year[] }` as a top-level cross-cutting block (in addition to per-plan horizons)
- `audience_messages`: `{ student: SectionCopy, family: SectionCopy, educator: SectionCopy }` — short audience-specific paragraph per section id
- `inputs_used`: `{ profile, student_voice_keys[], iep_doc_ids[], readiness_at, goal_ids[], action_item_ids[], meeting_prep_ids[], saved_resource_ids[], partner_match_ids[] }` — single source-of-truth manifest

Citation type:
```
Source = { kind: 'profile'|'student_voice'|'iep_doc'|'goal'|'readiness'|'action_item'|'meeting_prep'|'saved_resource'|'partner_match', id?: string, label: string }
```

## Generation pipeline (`generatePathwayReport`)
1. Fetch student profile, intake, transition_profile, strengths_needs, goals, readiness_scores, student_voice_responses, documents (latest IEP + extractions), saved_resources, student_resource_recommendations, student_opportunity_matches, student_saved_partners, action_items, ppt_meeting_preps.
2. Pass a structured `context` (not just free-text) to the LLM with explicit source IDs so the model returns citations.
3. Strict JSON validation; on partial failure, fall back to per-section retries instead of nuking the whole report.
4. Build `missing_information[]` deterministically from absent inputs (e.g., no IEP doc → "IEP not yet uploaded" gap).

## Three distinct rendered reports
- New route param: `/_authenticated/reports/$reportId?audience=student|family|educator` (already wired via `report-view-prefs`; promote from prefs to URL search param so links are shareable).
- `ReportView` reads `audience` and renders the matching section set + tone:
  - Student view: snapshot, Student Voice (first-person), strengths, four pillar recs (plain language), student action plan, meeting prep questions student can ask, 30/90/6mo/1yr addressed to "you".
  - Family view: all sections, family action plan emphasized, rights-status reminder.
  - Educator view: full clinical detail, IEP summary, readiness scorecard, planning gaps, educator action plan, citation chips visible by default.
- Share tokens (`share_tokens.audience`) already keyed by audience — extend `resolve_share_token` consumer to honor the new section set.

## UI changes (`ReportView.tsx`)
- Add `SourceChips` component that renders `sources[]` as inline pills with a tooltip ("Student Voice: 'I want to work with animals'"). Educator audience: open; Family: collapsed; Student: hidden.
- Add `RecommendationCard` with collapsible "Why / What informed this / Next action / Owner / Discuss at next meeting?" block.
- Add `PlanningGapsBlock` rendering `missing_information[]` with one-click "Add to next meeting prep" that writes to `meeting_prep_items`.
- Add `ResourceMatchesBlock` + `PartnerMatchesBlock` that read from report content (no extra fetch) but link out to live `/resources/$id` and partner pages.
- Update `buildReportToc` and `buildStudentToc` to emit the 21-section ordering; legacy reports get the legacy TOC.

## Version history
- `pathway_report_versions` already exists. Add: `change_summary` populated automatically from a diff of `inputs_used` (e.g., "Added IEP upload; 3 new readiness scores; Student Voice updated").
- Add a "Compare with previous version" affordance in `ReportVersionsPanel` — side-by-side section list with changed-section badges; full diff is out of scope.

## Files to change
- `src/lib/pathway.functions.ts` — schema, generation context, version diff
- `src/components/pathway/ReportView.tsx` — new blocks, audience routing, source chips
- `src/components/pathway/ReportVersionsPanel.tsx` — change_summary surfacing
- `src/routes/_authenticated/reports.$reportId.tsx` — `audience` search param + `validateSearch`
- `src/lib/report-view-prefs.ts` — keep as fallback, prefer URL param
- New: `src/components/pathway/RecommendationCard.tsx`, `SourceChips.tsx`, `PlanningGapsBlock.tsx`
- Migration: add `change_summary` text column to `pathway_report_versions` if not present; no other schema changes (everything else lives in `content jsonb`)

## Back-compat
- Every new schema field is `.optional()`.
- `ReportView` checks `report.schema_version ?? 1`. Legacy renders unchanged. New renders use the 21-section spine.
- Old share tokens keep working — audience already encoded.

## Out of scope
- No redesign of dashboards, navigation, or auth.
- No new tables besides the one optional column on `pathway_report_versions`.
- No edge functions; generation stays in `createServerFn` + Lovable AI Gateway.
- Full text diff between versions (only section-level changed badges + input manifest diff).

## Risks
- LLM JSON drift across 21 sections — mitigated by per-section retry and strict Zod.
- Larger `content` payloads — still well under Postgres jsonb limits; render is paginated by collapsibles.
- Old reports look thinner than new ones — surfaced via a "Regenerate to use latest format" CTA, never auto-overwrite.