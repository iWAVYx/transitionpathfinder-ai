
# Demo Workspace Revamp + Role Dashboard Clarification

This is a large scope. Confirming the plan before I start editing files, since it touches the demo surface, signed-in dashboards, and role routing.

## 1. New Demo Workspace shape (signed-out, sample data only)

Replace the current `/demo/workspace/$stage` stage-machine as the primary demo entry with a **role-based preview hub**:

```text
/demo                        → landing: 6 role cards + "How it works" + CTAs
/demo/student                → Student preview
/demo/family                 → Parent/Guardian preview
/demo/educator               → Educator/Case Manager preview
/demo/school-admin           → School Admin preview
/demo/district-admin         → District Admin preview
/demo/partner                → Partner preview
/demo/workspace/$stage       → KEPT (deeper guided planning demo, linked from student/family/educator)
/demo/report                 → KEPT (Pathway Report demo, linked from all three)
```

Each role preview page uses one shared fictional student (**Jordan Rivera**, already in `src/lib/demo-data.ts`) and renders:
- sample dashboard mock for that role
- key tools & actions
- what outputs they receive
- how it connects to Pathway Report / Workspace
- role-specific CTA (waitlist, request pilot, request demo)
- "not visible to this role" callouts where relevant (esp. Partner)

Shared components under `src/components/demo/role-preview/`:
- `RolePreviewShell` (hero, role badge, "sample data" banner, value bullets, CTA rail)
- `DashboardMock` (renders a role's dashboard-at-a-glance panel tiles)
- `RoleValueBullets`, `RoleActionsList`, `RoleOutputsList`
- `PartnerBoundaryNotice` (explicit "partners never see …" panel)

## 2. Demo landing (`/demo`)

- 6 role cards in a grid with icon, role name, one-line value, "Preview →" link
- Shared-student callout: "Follow Jordan Rivera through Student, Family, and Educator views" → deep links to the three previews + `/demo/workspace/start` + `/demo/report`
- Waitlist / Request pilot CTAs at the bottom
- Platform Admin intentionally excluded from public preview (small footnote linking to `/owner/demo` for signed-in admins)

## 3. Role preview content (sample only, no real data)

**Student** — My Pathway snapshot, Student Voice card, strengths/interests/goals, action items, saved resources, meeting prep, calendar, Pathway Report student-view teaser.

**Family** — Connected student, Pathway Report family view, documents area, family action items, calendar, meeting prep, sharing/consent, recommended resources.

**Educator/CM** — Caseload strip (3 sample students), readiness overview, Pathway Reports list, educator input, notes, action items, meeting prep, calendar.

**School Admin** — School overview tiles, planning status by grade, team activity, report completion %, readiness trend chart, support needs, resource usage.

**District Admin** — District overview, connected schools table, school-by-school progress, district readiness trend, implementation status, service gaps, district reports.

**Partner** — Partner profile, opportunity list (3 samples), submitted programs, deadlines calendar, PartnerForward incentives strip, partner resources. **Prominent boundary notice** listing what partners cannot see.

## 4. Signed-in dashboards vs Workspace vs Report

Enforce the three-layer separation the user described.

- **Dashboard = overview/command center.** Ensure each role's `/dashboard` (or role-specific route) renders summary tiles, status, next actions, alerts, recent activity, and links deeper — not the Workspace stage machine.
- **Transition Workspace = deeper guided planning** (`/workspace/$stage`) — unchanged behavior.
- **Pathway Report = synthesized output** (`/report`, `/pathways/$pathwayId`) — unchanged.
- **Platform Owner = Admin Hub** (`/owner/*`) — remains as-is, no "dashboard" reskin.

Audit and adjust:
- `src/routes/_authenticated/dashboard.tsx` — student/parent/educator overview (route by role)
- `src/routes/_authenticated/school/*`, `district/*`, `partner/*` dashboards — confirm they are overview-style, not Workspace-style; add missing tiles where the demo promises features that are absent.
- Where a dashboard is currently just embedding Workspace UI, replace with an overview composed of existing widgets (`NextBestAction`, calendar preview, readiness card, etc.).

Where a demo feature has no signed-in counterpart, I will either (a) add a minimal real widget or (b) drop it from the demo — per the "signed-in product alignment" rule. I'll keep this list small and pragmatic; not a full dashboard rebuild.

## 5. Navigation & CTAs

- New top-level demo nav: role selector chips (Student · Family · Educator · School · District · Partner) sticky on demo routes
- Each preview ends with: **Join waitlist** / **Request pilot** / **Sign in** CTAs, plus a "Continue the tour" link to the next role
- Update `/demo/workspace/$stage` header to link back to `/demo` role hub

## 6. Visual direction

- Reuse existing tokens (`bg-gradient-hero`, `shadow-soft`, `rounded-3xl` panels) already established
- Each role gets an accent tint (student=primary, family=warm sand, educator=sage, school=ocean, district=navy, partner=ember) via CSS variable, no new palette
- Charted section separators (thin rules + section numbering) consistent with recent Pathway Report pass
- Distinct backgrounds between hero / dashboard mock / actions / CTA bands

## 7. Files (approximate)

**New**
- `src/routes/demo.index.tsx` (replaces current `/demo` content with role hub)
- `src/routes/demo_.student.tsx`
- `src/routes/demo_.family.tsx`
- `src/routes/demo_.educator.tsx`
- `src/routes/demo_.school-admin.tsx`
- `src/routes/demo_.district-admin.tsx`
- `src/routes/demo_.partner.tsx`
- `src/components/demo/role-preview/{RolePreviewShell,DashboardMock,PartnerBoundaryNotice,RoleNavChips}.tsx`
- `src/lib/demo/role-previews.ts` (per-role sample content pulling from existing demo fixtures)

**Edit (minimal)**
- `src/routes/demo.tsx` — becomes layout/redirect to `/demo` index
- `src/routes/demo_.workspace.$stage.tsx` — add breadcrumb back to `/demo`
- Role dashboard route files, only where they currently embed Workspace UI instead of overview
- `src/routes/__root.tsx` / demo header — role nav chips on demo routes

**Kept unchanged**
- All auth, RLS, server functions, permission logic
- `/workspace/$stage`, `/report`, all admin/owner routes, all tests

## 8. Verification

- `bun run build` (SSR)
- `bunx vitest run tests/unit/demo-feature-map.test.ts tests/unit/student-dashboard-render-contract.test.ts tests/unit/no-toplevel-admin-import.test.ts`
- Playwright: `demo-signed-out.spec.ts`, `demo-layout.spec.ts`, `demo-contrast.spec.ts`
- Manual walk of each `/demo/<role>` route via preview to confirm sample-data-only rendering and working CTAs

## Acceptance
- `/demo` presents 6 role previews with sample data only
- Student/Family/Educator previews share Jordan Rivera and link into `/demo/workspace/start` + `/demo/report`
- Partner preview shows opportunity mgmt + PartnerForward, with explicit "cannot access" boundary
- Signed-in dashboards remain overview-style; Workspace and Report stay as distinct deeper layers
- No private data exposed on demo routes; existing tests pass

---

**Please confirm** before I start implementing. In particular:
1. OK to make `/demo` the role hub (current `/demo` content moves into `/demo/student` + `/demo/workspace/start`)?
2. Any role dashboards you already know are Workspace-shaped rather than overview-shaped that I should prioritize fixing?
3. Should I keep the current `/demo/workspace/$stage` stage machine as the "deeper tour" or retire it entirely?
