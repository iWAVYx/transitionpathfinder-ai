
# Demo Workspace Premium Polish Pass

Goal: refine the existing Demo Workspace (no restructure) so it reads as a polished, family-and-educator-facing product walkthrough — consistent Title Case, warm specific copy, no developer language, uniform cards/buttons/timelines, responsive across mobile/tablet/desktop.

Scope is the visible Demo Workspace only. Signed-in product routes, auth, RLS, server functions, and tests are not touched except to verify nothing regresses.

## Files In Scope

Demo chapters (user-facing copy + layout polish):
- `src/routes/demo.tsx` (Hub / masthead)
- `src/routes/demo_.intake.tsx`
- `src/routes/demo_.voice.tsx`
- `src/routes/demo_.documents.tsx`
- `src/routes/demo_.report.tsx` (intro band only)
- `src/routes/demo_.resources.tsx`
- `src/routes/demo_.opportunities.tsx`
- `src/routes/demo_.plan.tsx`
- `src/routes/demo_.meeting.tsx`
- `src/routes/demo_.calendar.tsx`
- `src/routes/demo_.hub.tsx`
- `src/routes/demo_.next.tsx`
- `src/components/site/DemoStepBar.tsx` (chapter labels, footer CTAs)
- `src/components/demo/FeatureFootnote.tsx` (rewrite as a warm "What This Reflects" caption — no route/component words)

Excluded from this pass:
- `src/routes/demo_.connection.tsx` — internal audit page, not part of the family-facing flow
- `src/components/pathway/ReportView.tsx` — the Pathway Report itself; touch only headings/labels that are clearly demo-shell chrome, not the report's own content structure
- Any signed-in route, hook, server function, migration, or test

## Work Plan

### 1. Title Case Pass
Apply `toTitleCase` (from `src/lib/title-case.ts`) or hand-cased strings to every visible heading, subheading, card title, tile title, tab label, button label, timeline label, badge label, and nav label across the in-scope files. Preserve: TransitionForward, BridgeForward, PartnerForward, Pathway Report, Student Voice, IEP, CT-SEDS, 504, 30/60/90. Body paragraphs stay sentence case.

### 2. Strip Developer Language
Remove from visible copy: route names (`/demo/...`), file names, "maps to", "feature flag", "seeded data", "test id", "regression", "component", "backend", "frontend", "database", "table", "auth flow", "endpoint". Rewrite the `FeatureFootnote` caption (currently exposes "lives at /route" and product slugs) as a single warm line such as *"Reflects the [Feature] experience in TransitionForward."*

### 3. Copy Strengthening
Rewrite generic or thin copy on each chapter so each one names the concrete TransitionForward value: Intake (what we gather and why), Student Voice (how answers shape recommendations), Documents (IEP + CT-SEDS + assessments, secure handling), Pathway Report (sections + role views), Readiness Insights, Questions For The Team, 30/60/90 Plan, Calendar follow-through, Resources, Opportunities, Meeting Prep, What's Next.

Keep paragraphs short, warm, and specific. No "Lorem"-style filler, no marketing puffery.

### 4. Visual Uniformity
Per chapter, normalize:
- Card grids → equal heights via `flex flex-col` + `mt-auto` CTAs (pattern already used in `demo_.next.tsx`)
- Padding: `p-6 sm:p-7` on cards, `rounded-3xl border bg-card shadow-soft`
- Section rhythm: `py-10 sm:py-14`, consistent max-width (`max-w-5xl` chapter, `max-w-[92rem]` report)
- Badge row pattern (Step N · Title + Fictional Student) consistent across every chapter intro
- Icon sizing: `h-5 w-5` in card heads, `h-3 w-3` in badges, `h-4 w-4` in inline accents
- Buttons: `size="sm"` in card CTAs, primary + outline pairing

### 5. Responsive QA
After edits, drive Playwright at 390×844, 820×1180, 1440×900 against each chapter route. Capture screenshots, check for horizontal overflow, wrapped timeline rows, mismatched card heights. Fix issues found.

### 6. Verification
- Build (auto)
- `bunx vitest run tests/unit/demo-feature-map.test.ts tests/unit/value-lens.test.ts`
- Spot-check Playwright on `/demo`, `/demo/report`, `/demo/plan` (the three densest pages)

Tests covering the demo flow (`demo-signed-out`, `demo-roles.signedin`, `demo-layout`, `demo-contrast`) target structure and contrast, not exact copy strings — they should pass unchanged. If any test asserts a specific old string, fix the underlying cause (revert that one string) rather than weaken the test.

## Out Of Scope (will not change)
- Route paths, search params, navigation order
- Auth, RLS, role gates, server functions, migrations
- Pathway Report content sections inside `ReportView.tsx`
- Signed-in product surfaces

## Risk
Largest risk is accidentally renaming a chapter step label that a test asserts on. Mitigation: keep the canonical step ids (`intake`, `voice`, `documents`, `report`, `resources`, `opportunities`, `plan`, `meeting`, `calendar`, `hub`, `next`) intact in `DemoStepBar`; only the human-readable display strings change.
