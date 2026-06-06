## Resource Library v2 — Plan

Additive only. Existing `resources` table, `/resources` page, `/owner/resources` admin, recommender, and roles stay in place. New work layers on top.

### 1. Database (one migration)

**New table `resource_sources`** (the "trusted source library" concept):
- `id`, `source_name`, `source_url`, `organization_name`
- `source_type` (library | government | nonprofit | professional_association | research_center | curriculum | tools | media | local_resource)
- `audience_focus[]`, `topic_focus[]` (text arrays)
- `location_scope` (national | connecticut | local | online)
- `update_frequency` (ongoing | monthly | quarterly | yearly | unknown)
- `review_status` (needs_review | approved | featured | archived)
- `last_reviewed_at`, `next_review_due_at`, `notes`
- `created_by_user_id`, `created_at`, `updated_at`
- RLS: anyone signed-in can SELECT approved/featured; only admin can INSERT/UPDATE/DELETE.

**Extend `resources`** (additive columns, no breaking changes):
- `source_id uuid REFERENCES resource_sources`
- `original_resource_url text`
- `reviewed_by_user_id uuid`, `reviewed_at timestamptz`, `review_notes text`
- `copyright_notes text`, `accessibility_notes text`, `age_appropriateness text`
- `role_relevance text[]`, `pathway_relevance text[]`
- `published_status text` (draft | needs_review | approved | published | featured | archived) — defaults `published` for back-compat; existing `verified_status` is left in place and mirrored
- `featured boolean default false`
- `link_status text` (unknown | ok | broken), `link_checked_at timestamptz`

Existing CHECK on `audience` is widened to add `district_admin` (currently missing).

### 2. Server functions

`src/lib/resource-sources.functions.ts` (admin-gated via `has_role(admin)`):
- `listSources({ filters })`, `getSource(id)`, `upsertSource(payload)`, `archiveSource(id)`, `featureSource(id)`, `markSourceReviewed(id, next_due, notes)`
- `listSourcesNeedingReview()`, `listSourcesPublic()` (for the user-facing "Browse by Source Library")

`src/lib/owner/owner.functions.ts` — extend `ownerSaveResource` to accept the new fields; add `ownerPublishResource`, `ownerFeatureResource`, `ownerArchiveResource`, `ownerListNeedsReview`, `ownerMarkLinkChecked`.

`src/lib/resources-db.functions.ts` — extend `listVerifiedResources` to also return new fields (source, featured, published_status) and add `listResourcesBySource(sourceId)`, `listFeaturedResources()`.

### 3. Seed data (committed as a migration via `INSERT … ON CONFLICT DO NOTHING`)

Insert 4 source libraries (CEC Improving Your Practice, CEC Professional Resources, Do2Learn, CT SDE — both URLs as one source with two URL entries, NCLD Research and Insights) plus the ~30 source-specific resource cards listed in the brief, all marked `published_status='published'`, with `source_id` wired up and `source_name`/`url` mirrored for the existing UI. Descriptions are short (no copyrighted content); each card links out to the original.

### 4. Admin Hub — Resource Source Manager

New route `src/routes/_authenticated/owner.resource-sources.tsx` (admin-only via existing `OwnerShell`):
- Table of sources with filters (Source Type / Audience / Topic / Location / Review Status / Update Frequency / Needs Review)
- Add/Edit drawer with all fields
- Per-row actions: Approve, Feature, Archive, Mark Reviewed (sets `last_reviewed_at = now()`, prompts next-due date + notes), View Resources From Source
- Dashboard card on `owner.index.tsx`: "Sources Needing Review (n)" + "Resources Needing Review (n)" + "Broken Links to Check (n)"

Extend existing `owner.resources.tsx`:
- New columns: Source, Published Status, Featured
- New filters: Source, Published Status
- Per-row actions: Publish, Feature, Archive
- "Add Resource From Source" button on each source row links here pre-filled

### 5. Public Resource Library UI (`/resources`)

Add new sections above the existing grid, sourced from the DB:
- **Featured Resources** (where `featured = true`)
- **Browse by Source Library** — 4 cards (CEC, Do2Learn, CT SDE, NCLD) showing source name, description, audience/topic focus chips, resource count, last reviewed date, "View resources" link → `/resources?source=<id>`
- **Recommended for You** (existing recommender, kept)
- Audience / Topic / Format / Source / Location / Status filters extended with the brief's full vocabularies
- Every resource card gains an **"External Resource"** chip + clear **"Source: <name>"** attribution line

### 6. Recommender hook-up

Extend `resource-recommender.functions.ts` to factor in `role_relevance` and `pathway_relevance` arrays so pathway-report needs (employment, self-advocacy, IEP prep) map to the new seeded resources. Existing scoring stays; new fields are additive bonuses.

### 7. Out of scope (call out explicitly)

- No automated scraping of the source libraries. Resources are admin-curated. Adding a scraper is a follow-up.
- No file uploads of copyrighted PDFs — links only, per the copyright section of the brief.
- No changes to roles, dashboards, navigation, or auth.

### Sequencing

1. Migration (table + columns + widened audience check + RLS + grants)
2. Seed migration (sources + cards) — runs after step 1 is approved so types regenerate
3. Server functions (sources + extended resources/owner)
4. Admin Source Manager route + dashboard cards
5. Public `/resources` sections + filters + attribution
6. Recommender extension
7. QA: source list loads, filters work, admin can add/edit/feature/archive, save/recommend still works, external links open, attribution visible

### Notes for review

- The brief lists ~30 seed cards. I'll seed exactly those, with the source URLs you provided as the `original_resource_url`. Short admin-written descriptions only.
- "TransitionForward Curated" and "Partner Resource" will be added as two extra source rows (no URL on Curated) so the Source filter has the full vocabulary from the brief.
- This is ~1 migration + ~6–8 new files + edits to ~4 existing files. I'll deliver it in one pass after you approve.
