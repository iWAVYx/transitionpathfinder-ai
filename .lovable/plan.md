# Feature-Depth Audit & Strengthening

The `DemoFeatureShell` pipeline and one baseline audit test already exist. What's missing is a rigorous pass across every entry (46 features across 6 roles + Owner), plus stricter enforcement so filler cannot creep back in. This plan does that pass and locks it down.

## What Gets Strengthened, Per Role

For each entry in every `feature-details.ts`, revise `summary`, `what`, `rows`, `stats`, `connectsTo`, `emptyHeadline/Body`, `primaryAction`, and add a new `secondaryAction`, `nextStep`, `permissionNote`, and `feedsInto` field so every page shows:

- **Real product value** — a concrete decision, input, review, prep step, or next action.
- **Ecosystem ties** — visible `connectsTo` + `feedsInto` (e.g. Documents → Pathway Report; Voice → Goals; Action Items → Report readiness gaps).
- **Role-specific framing** — Student (encouraging + action-oriented), Family (next steps, consent, meeting prep), Educator (readiness gaps, IEP alignment, caseload), School Admin (school completion, blockers), District Admin (aggregate trends, implementation), Partner (posting/managing programs, deadlines, fit — no PII).
- **Collaboration hooks** — copy that names the other role that acts next (e.g. "Family marks read → Educator sees confirmation on caseload").
- **Pathway-Report centrality** — every feature explicitly states whether it feeds into, is generated from, reviews, acts on, or tracks progress after the Pathway Report.

## Owner / Admin Hub

Owner has no `/demo/feature/*` mirror today. Add a `src/lib/demo/owner/feature-details.ts` covering the real Owner Hub sections (Testing, Diagnostics, Roles, Content, Demo Hub, Audit, Analytics), wire it into `feature-routes.ts` and the audit — sample data only, gated behind Platform Admin on the signed-in side.

## Shell Enhancements

`DemoFeatureShell.tsx` gets three additive slots so the new data actually renders:

- **"Feeds Into" pipeline chips** — reuse the existing Workflow section, driven by `feedsInto`.
- **"Next Recommended Step"** — small card under stats using `nextStep`.
- **Secondary action** — second button in header + footer using `secondaryAction`.

## Verification (Automated)

Expand `tests/unit/demo-feature-details-audit.test.ts` to enforce:

- `nextStep`, `permissionNote`, `feedsInto`, `secondaryAction` present and non-trivial.
- Role-specific vocabulary probes (e.g. Student summaries avoid clinical jargon; Educator summaries mention readiness/IEP/caseload at least once across their set; District summaries mention aggregate/trend/implementation).
- Every Pathway-Report-related tile declares one of `feeds`, `generated from`, `review`, `act on`, `track` in `what`.
- Partner PII invariant extended to `nextStep` and `permissionNote`.

Extend `tests/e2e/demo-feature-parity.spec.ts` (from the previous turn) to also assert the new Next-Step card, Feeds-Into chips, and secondary action button render on every page.

Add `tests/unit/feature-inventory-audit.test.ts` that emits the required matrix (role, featureId, destination, purpose, connectsTo, primaryAction, permission) as a snapshot — the reviewable checklist the user asked for.

## Test Runs

After the pass:

```
bun run test:unit
bunx playwright test --project=anon tests/e2e/demo-feature-parity.spec.ts
bunx playwright test --project=dashboard-setup
bunx playwright test --project=dashboard-regression
bunx playwright test --project=role-access
```

The `dashboard-setup`/`dashboard-regression`/`role-access` projects need seeded role credentials in env; without them the specs auto-skip (documented in `tests/e2e/helpers/roles.ts`). I will report which ran vs. skipped.

## Scope Boundaries

- No changes to real signed-in DB queries or RLS.
- Copy + fixture data + shell slots + tests only.
- Owner demo pages use sample data; the real Owner Hub routes are unchanged.

## Deliverables

- Updated `src/lib/demo/{student,parent,educator,school-admin,district-admin,partner}/feature-details.ts`
- New `src/lib/demo/owner/feature-details.ts` + registry wiring in `src/lib/demo/feature-routes.ts`
- Updated `src/components/demo/DemoFeatureShell.tsx` (additive slots)
- Expanded `tests/unit/demo-feature-details-audit.test.ts`
- New `tests/unit/feature-inventory-audit.test.ts` (snapshot matrix)
- Expanded `tests/e2e/demo-feature-parity.spec.ts`

## Estimated Change Size

~7 registry files rewritten in place, 1 new registry, 1 shell edit, 2 test files touched, 1 new test. Roughly 1.5–2K net LOC across data + tests.

Approve to proceed, or tell me to narrow scope (e.g. skip Owner, or only stricten copy without adding new fields).
