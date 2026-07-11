
# Demo Navigation & Back/Forward Cleanup

Focused pass on the public demo. Keeps the current Transition Workspace / Workspace Tour direction. Only touches navigation state, back targets, expanded-sample state, and cross-links. No visual redesign, no backend, no auth changes.

## Problems Observed

1. **Role context is dropped.** Entering the Workspace Tour or the Pathway Report from a role preview (e.g. `/demo/student`) navigates to `/demo/workspace/start`. `Back to Demo Overview` then returns to `/demo`, not `/demo/student`, losing the visitor's chosen lens.
2. **Expanded sample state is not in the URL.** `StageSamplePanel` uses local `useState`. `?expand=true` opens the panel on load but the URL doesn't update on toggle, so browser back can't close the expanded view and deep links only ever open the initial stage's sample.
3. **Legacy redirects always default to a fixed stage** with no role carry-over. `/demo/report` → `/demo/workspace/roadmap?expand=true` regardless of the role the visitor was in.
4. **`WorkspaceShell.backTo` is hardcoded per route.** Demo workspace passes `{ to: "/demo", label: "Back to Demo Overview" }` even when the user arrived from `/demo/student`. `SmartBackLink` prefers `history.back()`, which usually works — but a direct link (`?role=student` deep-link, external nav) breaks the fallback.
5. **Role preview CTAs** (`View Pathway Report`, `Walk the Workspace`) don't pass role context forward.
6. **Owner-only `/demo/hub`** legacy route redirects fine, but the family Demo Mode page (`/demo-mode`) still has hardcoded links unrelated to the tour — out of scope, left as-is.

## Navigation Model (Single Source Of Truth)

Introduce `src/lib/demo/nav.ts` — one shared helper exporting:

- `type DemoRoleId` re-exported from `role-previews`.
- `type DemoWorkspaceSearch = { role?: DemoRoleId; expand?: boolean }`.
- `workspaceStageHref(stage, { role?, expand? })` — builds `/demo/workspace/$stage` link options with optional search.
- `rolePreviewHref(role)` — canonical `/demo/{role}` link options.
- `demoOverviewHref({ role? })` — `/demo` link options; role encoded as `?role=X` so overview can scroll/highlight later (structural only for now; overview doesn't need to read it yet, but reserved so back always has a valid target).
- `backTargetFromWorkspace(search)` — returns `{ to, label, params?, search? }`. If `search.role` is present → back to that role preview with `Back to {Role} preview`; otherwise → `/demo` with `Back to Demo Overview`.

All demo → workspace, workspace → report, workspace → role, and legacy redirects go through these helpers.

## Changes

### 1. `demo_.workspace.$stage.tsx`
- Extend `searchSchema` with `role: z.enum(DEMO_ROLE_ORDER).optional()` and change `expand` to a plain boolean that round-trips (coerce `"true"`/`"1"` on parse).
- Pass `search.role` through to `WorkspaceShell` via `backTo = backTargetFromWorkspace(search)`.
- Wire `<StageBody expandInPlace defaultExpanded={autoExpand} expanded={search.expand} onExpandChange={...}>` — new controlled mode (see #3).
- Update `hrefForDemoStage` to preserve `role` and `expand=false` when navigating between stages.

### 2. Legacy `demo_.*` redirect files
For each redirect file (`demo_.intake`, `demo_.voice`, `demo_.family`, `demo_.meeting`, `demo_.documents`, `demo_.plan`, `demo_.next`, `demo_.opportunities`, `demo_.calendar`, `demo_.resources`, `demo_.report`, `demo_.hub`):
- Preserve any incoming `?role=…` from `location.search` and forward it into the redirect target so a shared/bookmarked legacy link that includes a role still lands on the workspace with that role.
- No URL-shape changes; just adds `search` to the `redirect(...)` call built via `workspaceStageHref`.

### 3. `StageSamplePanel` — controlled expansion + URL state
- Accept optional `expanded?: boolean` + `onExpandChange?: (next: boolean) => void`. When both provided, become controlled. Fall back to current uncontrolled behavior otherwise (used by any signed-in caller).
- `StageBody` gains matching pass-through props.
- In `demo_.workspace.$stage.tsx`, wire `onExpandChange` to `navigate({ to: '.', search: prev => ({ ...prev, expand: next ? true : undefined }), replace: false })` so:
  - Toggle open pushes a history entry → browser back closes the panel.
  - Toggle closed removes the param → shareable URL is clean.
  - Deep links with `?expand=true` render the panel open (already working).

### 4. Role preview → workspace / report links (`RolePreviewShell.tsx` and role-specific `demo_.{role}.tsx` extras)
- Any `Link to="/demo/workspace/$stage" params={{ stage: "roadmap" }}` in role previews adds `search: { role: role.id, expand: true }` for the Pathway Report shortcut, and `search: { role: role.id }` for the plain "Walk the workspace" CTA.
- `role.ctaPrimary` / `ctaSecondary` typed link targets untouched (already role-specific).

### 5. Demo Overview (`demo.tsx`)
- Role grid link cards: change `<Link to={role.path}>` unchanged (already correct).
- Hero + shared-student CTAs continue to link into `stage: "start"` / `stage: "roadmap"`. No role param at this level (no role picked yet).
- Add lightweight `id="workspace-tour"` anchor to the "How the platform layers fit together" section so `/demo#workspace-tour` from external links scrolls cleanly (referenced in requirements #2).

### 6. WorkspaceShell
- No API change. It already accepts `backTo`. The demo route computes the correct value via `backTargetFromWorkspace`.

### 7. Continue-the-tour link in `RolePreviewShell`
- Preserve `role` context: `next.path` already switches role, so no change. Kept as-is.

### 8. Cleanup / audit
- Grep for any hardcoded `to: "/demo_/hub"`, `to: "/demo/pathway-studio"`, etc. — none expected; confirm and remove any stragglers.
- No route deletions; existing legacy redirects stay (safe fall-through for old external links).

## Tests

Add `tests/unit/demo-nav.test.ts`:
- `workspaceStageHref` returns expected `to` / `params` / `search`.
- `backTargetFromWorkspace({ role: 'student' })` → `/demo/student` with label `Back to Student preview`.
- `backTargetFromWorkspace({})` → `/demo` with label `Back to Demo Overview`.
- Legacy redirect target for `/demo_/report?role=parent` produces `/demo/workspace/roadmap?role=parent&expand=true`.

Existing playwright suites (`demo-signed-out`, `demo-layout`, `demo-contrast`, `demo-roles`) are not modified. Verify none regress.

## Verification

- `bunx vitest run` (unit) — expect green including new `demo-nav.test.ts`.
- `bunx playwright test tests/e2e/demo-signed-out.spec.ts` if touched.
- Manual sanity: open `/demo/student` → Read Pathway Report → browser back → land back on `/demo/student`. Toggle "Open Full Sample Screen" → browser back → panel closes without leaving stage.

## Out Of Scope

- Redesigning Demo Overview, role previews, Pathway Report layout, or any visual polish beyond wiring.
- Auth, RLS, dashboards, tests unrelated to demo nav.
- The signed-in `/workspace/$stage` surface (uses `expandInPlace={false}` → controlled expansion path is opt-in, so unaffected).
