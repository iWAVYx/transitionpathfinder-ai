## Slice 6: Public Marketing Surfaces For The End-To-End Story

The demo flow (profile → pathway → partner network) is fully wired inside `/demo/*`, but the public marketing pages (`/`, `/platform`, `/partners`) still describe the product generically. This slice makes the new end-to-end story visible to visitors who never open the demo.

### What to build

1. **Home page cohort teaser** (`src/routes/index.tsx`)
   - Add a compact "See it for three real students" strip showing Jordan (G11), Riley (G9), Sam (G7) with one-line taglines pulled from `demo-profiles.ts`.
   - Each card deep-links to `/demo/report?student=<id>` so visitors land directly in that student's pathway.

2. **Platform page: Partner Network section** (`src/routes/platform.tsx`)
   - Replace/augment the current opportunities copy with a mini `OpportunityMatches` preview (compact mode, limit 2) for the active profile, reusing the existing `StudentSwitcher` pattern.
   - Adds an "Age-safeguards active" chip so the explainability story is visible before entering the demo.

3. **Partners page: cohort fit preview** (`src/routes/partners.tsx`)
   - Add a "How your opportunity would match our demo cohort" panel driven by `opportunity-matcher.ts`, showing fit/filtered status across Jordan, Riley, Sam for 2-3 sample partner offerings.
   - Reinforces the partner-side value prop with the same explainable scoring used in the demo.

4. **Cross-links**
   - Add a single CTA on each of the three pages pointing to `/demo` with copy that names the end-to-end tour, so the marketing → demo handoff is obvious.

### Out of scope

- No new routes, no schema/RLS changes, no auth changes.
- No changes to `demo-profiles.ts`, `pathway-engine.ts`, or `opportunity-matcher.ts` — reuse as-is.
- No changes to `/demo/*` routes shipped in Slices 1-5.

### Technical notes

- Reuse existing components: `StudentSwitcher`, `OpportunityMatches` (compact mode already exists from Slice 2), and `useDemoStudent`.
- All marketing surfaces stay static-friendly; the switcher hydrates client-side as it does on `/demo`.
- No new tests required; matcher/engine are already covered by `tests/unit/*`.

Say **go** to implement, or tell me which of the three surfaces to skip or reorder.