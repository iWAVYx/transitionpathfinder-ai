# Placeholders, Mock Behavior, and Environment Dependencies

## Demo mode (intentional, isolated)

- All `demo_.*` routes and `src/lib/demo/**` use an in-memory
  `useSyncExternalStore` store. Never writes to Supabase.
- Demo profiles are fictional (Jordan Rivera G11, Riley Chen G9, Sam
  Alvarez G7). Verified via `tests/unit/demo-*.test.ts` (kept intact).
- Demo Transition Channel data lives in
  `src/lib/demo/transition-channel-data.ts` — no production channel
  rows ever cross this boundary.

## Owner Hub redirects (intentional)

- `owner.partner-network-status.tsx`, `owner.partner-outreach.tsx`,
  `owner.testing-scripts.tsx` are redirect-only route files kept in
  place for backward compatibility of bookmarks/deep links. Not
  placeholders.

## Environment / configuration dependencies (must be set before Level B or C)

| Item                          | Currently set? | Level required | Owner                    |
| ----------------------------- | -------------- | -------------- | ------------------------ |
| `SUPABASE_*` core secrets     | Yes            | A/B/C          | Engineering (managed)    |
| `LOVABLE_API_KEY`             | Yes            | A/B/C          | Engineering              |
| `SUPABASE_SERVICE_ROLE_KEY`   | Yes            | A/B/C          | Engineering              |
| `SUPABASE_JWKS`               | Yes            | B/C            | Engineering              |
| `E2E_BASE_URL`                | Yes            | Test infra     | Engineering              |
| `EVIDENCE_GRAPH_WRITES`       | Yes            | B/C            | Engineering              |
| Google OAuth provider enabled | Requires Lovable Cloud dashboard confirmation | B/C | Founder + Engineering    |
| Email sending domain (DKIM/SPF/DMARC) | Not verifiable from code | A (recommended) / B (required) / C (required) | Founder + Vendor       |
| Malware scanning on upload    | Not present in code | C (required) | Engineering + Vendor     |
| External APM (error monitoring) | Not present in code | C (recommended) | Engineering            |
| Backup restore drill          | Not verifiable from code | C (required) | Founder + Vendor        |
| Legal review of subprocessors | Not verifiable from code | B / C          | Founder + Legal          |
| DPA / FERPA-directory-info disclosure | Not verifiable from code | C          | Founder + Legal          |

## Content / marketing placeholders identified

- No lorem-ipsum or "TODO" strings surfaced in the top-level public
  routes on a quick scan; a full pass is deferred to Slice 1 with the
  waitlist review.
- `demo` role-preview pages intentionally use fictional data — this is
  a feature, not a placeholder.

## Test items to re-verify in later slices (not weakened)

- Every workflow in `.github/workflows/*.yml` is expected to pass in
  Slice 10. Slice 0 did not execute them.
- No test file was modified or skipped in Slice 0.
