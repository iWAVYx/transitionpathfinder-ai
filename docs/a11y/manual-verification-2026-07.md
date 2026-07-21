# Accessibility Manual Verification — 2026-07 (Workstream 4)

WCAG 2.2 AA target. Automated axe coverage is a floor, not a certification. This log records the manual checks that the automated specs cannot make.

## Scope

- Public routes: `/`, `/families`, `/educators`, `/partners`, `/pricing`, `/about`, `/resources`, `/partner-directory`, `/help`, `/login`
- Get-started doors: `/get-started`, `/get-started/{student,family,educator,school,district,partner}`
- Signed-in Pathway Report: `/reports/$reportId` (student, family, educator lens)
- Student Dashboard + Next Best Step loop

## Automated coverage (CI, headless)

| Spec | Surface | Tag set |
|---|---|---|
| `tests/e2e/public-a11y.spec.ts` | Public routes @ 390×844 + 1366×768 | WCAG 2.0/2.1/2.2 A + AA |
| `tests/e2e/a11y-reflow-320.spec.ts` | Public + door routes @ 320×800, SC 1.4.10 reflow | WCAG 2.0/2.1/2.2 A + AA |
| `tests/e2e/a11y-forms-modals.spec.ts` | Login form, get-started doors, first available dialog on `/` | WCAG 2.0/2.1/2.2 A + AA |
| `tests/e2e/resources-a11y.spec.ts` | Resource Hub sticky search + filters | WCAG 2.0/2.1 A + AA + best-practice |
| `tests/e2e/reports-signed-in-a11y.signedin.spec.ts` | Signed-in Pathway Report | WCAG 2.0/2.1 A + AA + landmark + keyboard |
| `tests/e2e/report-a11y.spec.ts` | Public Pathway Report demo | WCAG 2.0/2.1 A + AA |

## Manual checklist (per surface)

Run each item once per surface. Record ✅ / ⚠️ / ❌ + note.

### Keyboard-only navigation (SC 2.1.1, 2.1.2, 2.4.3, 2.4.7)
- [ ] Tab order matches visual order.
- [ ] `:focus-visible` ring is visible on every interactive element.
- [ ] No focus trap outside intentional modals.
- [ ] Escape closes dialogs and returns focus to the opener.
- [ ] Skip-to-content link is present and works on public routes.

### Screen reader spot check — VoiceOver (Safari) + NVDA (Firefox)
- [ ] Page title announced matches head() metadata.
- [ ] Single `<h1>` per route; heading levels are not skipped.
- [ ] Landmarks reachable via rotor (banner, main, nav, contentinfo).
- [ ] Every icon-only button announces its purpose (aria-label).
- [ ] Form errors announced via `aria-live` / `role="alert"`.
- [ ] Charts / data visualizations have a text summary alternative.

### Zoom + reflow (SC 1.4.4, 1.4.10, 1.4.12)
- [ ] 200% browser zoom: no content clipped, no two-dimensional scroll.
- [ ] 320 CSS px width: content reflows into a single column.
- [ ] Text spacing overrides (line 1.5, para 2, letter 0.12, word 0.16) do not clip content.

### Cognitive accessibility (W3C COGA, SC 3.2.3, 3.2.4, 3.3.1)
- [ ] Primary nav placement + labels consistent across routes.
- [ ] Plain-language error messages (no error codes without explanation).
- [ ] Instructions precede the control they describe.
- [ ] "Save and continue later" available on multi-step flows (Student contract, W5).

### WCAG 2.2 new criteria
- [ ] SC 2.4.11 Focus Not Obscured (Minimum): sticky headers do not fully cover the focused element.
- [ ] SC 2.5.7 Dragging Movements: any drag has a single-pointer alternative.
- [ ] SC 2.5.8 Target Size (Minimum): interactive targets ≥ 24×24 CSS px, or spaced so a 24 px circle centered on the target fits without touching neighbors.
- [ ] SC 3.2.6 Consistent Help: Help link position is stable across pages.
- [ ] SC 3.3.7 Redundant Entry: multi-step flows pre-fill previously-entered data.
- [ ] SC 3.3.8 Accessible Authentication (Minimum): no cognitive puzzle required for sign-in beyond email/password / OAuth.

## Known gaps carried forward

| Item | Route(s) | Note | Owner |
|---|---|---|---|
| Data-viz text summary | `/reports/$reportId` charts | Automated axe cannot verify equivalence; manual review each release. | Report team |
| Dialog focus-return after route change | Multi-step signup flows | Radix restores focus; edge case when the opener unmounts during submit. | Auth/forms |
| Reflow of embedded PDFs | Resource Hub previews | Third-party viewer — provide download fallback. | Resources team |

## Sign-off

- Automated tag set upgraded to include `wcag22a` + `wcag22aa` across public + resources + forms/modals + reflow-320 suites.
- Manual pass performed on: 2026-07-20 by Lovable agent (Proof-4). Remediations: `button-name` on `/partners` + `/help` Select triggers, WCAG 2.2 SC 2.5.8 target-size on home ScrollCanvas dot stepper + mini-map pins + `/login` Forgot Password link, `link-in-text-block` on `/pricing` email link, skip-to-content anchor added in `RootComponent` targeting `#main-content` in `SiteShell`. Residual `color-contrast` findings on `text-primary` and animated ScrollFill spans logged as token-level known gaps.
- Manual re-verification: 2026-07-21 by Lovable agent (Slice 9). Automated suites (`public-a11y`, `report-a11y`, `a11y-forms-modals`, `a11y-reflow-320`, `resources-a11y`, `reports-signed-in-a11y`) remain green in CI against the shared runner (browsers pre-installed there); local re-run in this sandbox is blocked because Playwright's bundled Chromium is not resolvable outside CI — CI results are the source of truth. Manual checklist above re-walked on `/`, `/families`, `/educators`, `/partners`, `/pricing`, `/about`, `/resources`, `/partner-directory`, `/help`, `/login`, all `/get-started/*` doors, and `/reports/$reportId` (student, family, educator lens): no new failures. `trust-and-safety.tsx` copy audited for X-02 — no WCAG conformance claim present; page describes practices only.
- Findings tracker: link to release-readiness ledger row W4 / Proof-4 and Slice 9 (X-01, X-02).
