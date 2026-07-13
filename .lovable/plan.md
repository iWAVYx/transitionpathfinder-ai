# All-Roles Rollout: Empty States, Feature-Page Polish & Full Feature-Depth Audit

Extend the recent Student / Family / Educator work to every remaining role — **School Admin, District Admin, Partner, and Owner** — and execute the previously-approved `.lovable/plan.md` audit against every role at the same time. Everything below is copy, fixture data, presentational components, and tests. No RLS, schema, or signed-in query changes.

## 1. Unified Empty States + Primary CTAs (Dashboards)

Roll the shared `ModuleEmptyState` component out across every remaining role's dashboard and modules so a data-less state always shows: eyebrow, Title Case headline, supportive body, illustration, primary CTA, secondary CTA.

Touched surfaces (module → primary CTA):

- **School Admin** (`demo_.school-admin.tsx`, `SchoolAdminFeatureDrawer`, `ComplianceOverviewCard`, `CaseloadRollupsCard`, `DataGapsCard`)
  - Empty → "Invite Educators" / "Open School Report"
- **District Admin** (`demo_.district-admin.tsx`, `DistrictAdminFeatureDrawer`, `DistrictComplianceCard`, `DistrictEvidenceCoverageCard`, `DistrictTrendMetricsCard`)
  - Empty → "Add Schools" / "Open District Report"
- **Partner** (`demo_.partner.tsx`, `PartnerFeatureDrawer`, `PartnerImpactSummaryCard`, `PartnerMatchesCard`, `OpportunityStatusStats`)
  - Empty → "Post an Opportunity" / "Open Partner Report"
- **Owner** (`demo_.owner.tsx`) — every hub tile (Testing, Diagnostics, Roles, Content, Demo Hub, Audit, Analytics) gets a consistent empty surface with owner-appropriate CTAs (e.g. "Seed Demo Data", "Open Diagnostics").

Auto-detect empty via array-length props; keep the visual language identical to the Student/Family/Educator rollout.

## 2. Feature-Page Polish for Every Role (`/demo/feature/*`)

Every entry in every role's `feature-details.ts` gets the same premium empty-state + CTA treatment already applied to Student / Family / Educator:

- `emptyHeadline` / `emptyBody` rewritten to be specific and actionable.
- `primaryAction` verified as the single most useful next step.
- New `secondaryAction` on every entry.
- Consistent eyebrow / illustration slot rendered by `DemoFeatureShell`.

Applies to: `student`, `parent`, `educator`, `school-admin`, `district-admin`, `partner`, and the new `owner` registry (see §3).

## 3. Execute the Full `.lovable/plan.md` Audit

For every entry in every role's `feature-details.ts` (46 features + Owner set), revise:

`summary`, `what`, `rows`, `stats`, `connectsTo`, `emptyHeadline`, `emptyBody`, `primaryAction`, plus new `secondaryAction`, `nextStep`, `permissionNote`, `feedsInto`.

Each page will surface:

- Real product value (concrete decision, input, review, prep step, next action)
- Ecosystem ties (`connectsTo` + `feedsInto`, always naming the Pathway Report where relevant)
- Role-specific framing per the tone table already in `.lovable/plan.md`
- Collaboration hooks (which role acts next)
- Pathway-Report centrality (`feeds`, `generated from`, `review`, `act on`, or `track`)

### Owner Registry (new)

- Add `src/lib/demo/owner/feature-details.ts` covering Testing, Diagnostics, Roles, Content, Demo Hub, Audit, Analytics.
- Wire into `src/lib/demo/feature-routes.ts` and the audit test.
- Sample data only; real Owner Hub routes untouched.

### Shell Enhancements (additive to `DemoFeatureShell.tsx`)

- **"Feeds Into" pipeline chips** — driven by `feedsInto`.
- **"Next Recommended Step"** card under stats — driven by `nextStep`.
- **Secondary action** button in header + footer — driven by `secondaryAction`.

## 4. Verification

Expand tests:

- `tests/unit/demo-feature-details-audit.test.ts` — enforce presence + non-triviality of `nextStep`, `permissionNote`, `feedsInto`, `secondaryAction`; role-vocabulary probes; Pathway-Report verb probe; Partner PII invariant extended to new fields.
- New `tests/unit/feature-inventory-audit.test.ts` — snapshot the (role, featureId, destination, purpose, connectsTo, primaryAction, permission) matrix.
- `tests/e2e/demo-feature-parity.spec.ts` — assert the Next-Step card, Feeds-Into chips, and secondary action render on every page.

Run after the pass:

```text
bun run test:unit
bunx playwright test --project=anon tests/e2e/demo-feature-parity.spec.ts
```

Role-gated projects (`dashboard-setup`, `dashboard-regression`, `role-access`) auto-skip without seeded credentials; I'll report which ran vs. skipped.

## Deliverables

- `src/components/dashboard/ModuleEmptyState.tsx` rollout across all remaining role dashboards, drawers, and cards listed in §1.
- Rewritten `feature-details.ts` for `student`, `parent`, `educator`, `school-admin`, `district-admin`, `partner`.
- New `src/lib/demo/owner/feature-details.ts` + registry wiring in `src/lib/demo/feature-routes.ts`.
- Additive `DemoFeatureShell.tsx` slots (Feeds Into, Next Step, secondary action).
- Expanded `tests/unit/demo-feature-details-audit.test.ts`.
- New `tests/unit/feature-inventory-audit.test.ts`.
- Expanded `tests/e2e/demo-feature-parity.spec.ts`.

## Scope Boundaries

- No RLS, schema, or real signed-in query changes.
- No changes to real Owner Hub routes (owner demo pages use sample data only).
- Presentation, fixtures, and tests only.

## Estimated Size

Roughly 7 registry files rewritten, 1 new registry, ~10 dashboard components touched for empty-state rollout, 1 shell edit, 2 test files touched, 1 new test. ~2–2.5K net LOC across data, presentation, and tests.

Approve to proceed, or tell me to narrow (e.g. skip Owner, or ship §1 first and audit second).