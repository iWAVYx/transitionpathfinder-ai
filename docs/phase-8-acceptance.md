# Phase 8 — Persistence + Mobile/Responsive QA

Final acceptance checklist for the operational readiness pass. Run end-to-end
before any demo or pitch.

## 1. Automated persistence smoke

Run against a project with the QA parent account provisioned:

```bash
node --test tests/persistence-smoke.test.mjs
```

Covers save → fresh-session re-read for:
- `students`
- `goals`
- `action_items`
- `calendar_events`
- `saved_resources`

Each test signs in, inserts a row, then opens a brand-new Supabase client
(no persisted session), signs in again, and re-reads by id. A pass proves
the row survived both a network roundtrip and a full re-auth.

## 2. Mobile responsive smoke (Playwright)

```bash
npx playwright test tests/e2e/mobile-responsive.spec.ts
```

Hits the 10 main public routes at 375 / 414 / 768 / 1024 and fails on
horizontal overflow or missing primary heading.

## 3. Manual signed-in QA matrix

Sign in as each demo account (`/owner/demo`) at 375 / 768 / 1024 and walk:

| Surface                         | What to verify                                  |
| ------------------------------- | ----------------------------------------------- |
| Demo banner                     | Visible on every page, sticky, dismiss-safe     |
| Dashboard (per role)            | Onboarding checklist, NextBestAction render     |
| System Health (`/owner/health`) | Table collapses to cards under 768              |
| Testing Scripts                 | Accordion usable, notes save                    |
| Pathway Report                  | Tabs scrollable, sticky CTAs not clipped        |
| Calendar                        | Falls back to agenda list on <768               |
| Resource Library                | Filters drawer opens, cards reflow              |
| Partner Network                 | Filter sidebar collapses, cards stack           |
| Admin Hub sidebar               | Collapses into hamburger on <1024               |
| Forms / Modals                  | Inputs not zoomed, dialogs scroll inside        |
| Sharing / Consent dialogs       | TrustNote variants legible, buttons reachable   |

## 4. Final acceptance run

Re-run the role-by-role testing scripts (`/owner/testing`) end-to-end and
mark every step `passed` with a note. Export the markdown report and attach
to the release.
