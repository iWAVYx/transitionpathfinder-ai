# Release-Readiness Ledger — Slice 0

Columns: **ID**, **Requirement** (from program brief), **Level** (A =
Waitlist, B = Controlled Beta, C = Real Student Data), **Status**,
**Severity**, **Evidence**, **Fix implemented in Slice 0**, **Remaining
action**, **Owner**, **Retest instructions**.

Legend for Status: `PASS`, `FAIL`, `BLOCKED` (external dependency),
`MANUAL REVIEW` (requires human judgement outside this codebase),
`NOT APPLICABLE`.

Levels apply per row — an item can PASS for A and BLOCK for C.

## 1. Waitlist & account entry

| ID    | Requirement                                                                 | Level | Status  | Sev | Evidence                                                                                                                                | Fix in Slice 0 | Remaining action | Owner        | Retest |
| ----- | --------------------------------------------------------------------------- | ----- | ------- | --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------- | ------------ | ------ |
| W-01  | Waitlist form validates and never grants platform access                    | A/B/C | PASS    | P0  | `src/lib/waitlist.functions.ts` uses anon-client insert with Zod + DB CHECKs; RLS grants SELECT/UPDATE/DELETE to platform admins only (migrations `20260527121937`, `20260527171832`, `20260603221955`) | None (already correct) | Slice 1: click-through the form and confirm confirmation state + duplicate handling behavior | Engineering | Slice 1 Playwright: submit twice, confirm no account is created |
| W-02  | Protected CTAs explain sign-in before redirecting                           | A/B   | MANUAL REVIEW | P2 | RoleGuard toasts explain "That page is for X" on cross-audience redirects (`src/components/RoleGuard.tsx`); signed-out CTA copy for individual buttons was not re-audited in Slice 0 | None            | Slice 1: sweep signed-out CTAs (`get-started.*`, `hubs.*`, `programs.transitionforward`, `partners`) | Engineering | Slice 1 UI audit |
| W-03  | Waitlist confirmation, duplicate handling, consent recording                | A/B/C | MANUAL REVIEW | P1 | Form and RPC exist; email confirmation path traverses `lovable/email/queue/process`; consent copy present in route text | None            | Slice 1: run the flow end-to-end in Playwright, confirm consent row and dedupe   | Engineering + Founder | Slice 1 e2e |

## 2. Invitations, licensing, and onboarding

| ID    | Requirement                                                                 | Level | Status  | Sev | Evidence                                                                                                                                | Fix in Slice 0 | Remaining action | Owner        | Retest |
| ----- | --------------------------------------------------------------------------- | ----- | ------- | --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------- | ------------ | ------ |
| I-01  | Unique, expiring invitations with reuse prevention                          | B/C   | PASS    | P0  | `accept_invitation_by_token` enforces `status='pending'`, `expires_at > now()`, email match; sets `status='accepted'` atomically         | None            | Slice 2: RLS matrix already in `tests/cross-district-invite-rls.test.mjs` — re-run | Engineering | Slice 2 test run |
| I-02  | Access-code redemption idempotent, capacity/expiry enforced                 | B/C   | PASS    | P0  | `redeem_access_code` uses `FOR UPDATE`, checks revoked/expired/capacity, returns `already_redeemed` on dedupe; verified in `tests/access-code-redemption.test.mjs` | None | Slice 2: re-run test | Engineering | `bun test tests/access-code-redemption.test.mjs` |
| I-03  | Individual auditable accounts (no shared credentials)                       | B/C   | PASS    | P0  | Auth flow uses Supabase Auth per user; `access_codes` are role-scoped but generate individual `organization_memberships` rows           | None            | Slice 2 confirmation | Engineering  | Slice 2 e2e |
| I-04  | Role revocation propagates immediately                                      | B/C   | MANUAL REVIEW | P0 | `user_roles` UPDATE is not permitted (memory rule); revocation is DELETE → RLS denies next read. No cached client-side role escalation path found. | None | Slice 2: add explicit revocation test | Engineering | Slice 2 |
| I-05  | Editable account profiles, prefs, professional-focus, notification prefs    | B/C   | PASS    | P2  | `src/routes/_authenticated/settings.tsx`, `src/lib/profile-editable.functions.ts`, `user_preferences`, `notification_prefs`             | None            | None            | Engineering  | Manual  |

## 3. Authorization & tenant isolation

| ID    | Requirement                                                                 | Level | Status  | Sev | Evidence                                                                                                                                | Fix in Slice 0 | Remaining action | Owner        | Retest |
| ----- | --------------------------------------------------------------------------- | ----- | ------- | --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------- | ------------ | ------ |
| A-01  | UI + router + RPC + RLS layered gates                                       | B/C   | PASS    | P0  | See `inventory-routes.md` Section "Gating layers in effect"                                                                              | None            | None            | Engineering  | Slice 2 |
| A-02  | Cross-student, cross-family, cross-school, cross-district isolation         | B/C   | PASS    | P0  | RLS anchored on `can_access_student`, `is_org_admin`, `effective_org_access`; tests: `tests/cross-district-rls.test.mjs`, `tests/rls-pii-access.test.mjs`, `tests/role-district-access-rls.test.mjs`, `tests/district-school-hijack-rls.test.mjs`, `docs/qa/phase-5-role-permissions-audit.md` | None | Slice 2: re-run all RLS suites | Engineering | Slice 2 |
| A-03  | Partners cannot access private student / IEP info                           | B/C   | PASS    | P0  | `is_partner_only` short-circuits `storage_can_read_student_doc`; `partners-manage_.*` routes gated to partner/admin only; contact email hidden behind admin-only SECURITY DEFINER | None | Slice 2: re-run `tests/partner-role-probe.test.mjs`, `tests/counselor-scope-rls.test.mjs` | Engineering | Slice 2 |
| A-04  | Role escalation via self-accept / self-approve blocked                      | B/C   | PASS    | P0  | Triggers `enforce_student_collaborators_self_accept`, `enforce_student_relationships_self_approve` (added in the prior slice); memory rule bans `UPDATE` on `user_roles` | None | Slice 2: re-run `tests/can-edit-student-boundaries.test.mjs`, `tests/parent-onboarding-rls.test.mjs` | Engineering | Slice 2 |
| A-05  | MFA for privileged admins, safe auth errors, rate limiting                  | B/C   | PARTIAL | P1  | MFA challenge routes present (`login.2fa.tsx`, `tests/e2e/reports-2fa-*.spec.ts`); rate limiting is Supabase Auth default; safe error messages present | None | Slice 2: enforce MFA-required on `admin_roles` server fns; verify `tests/e2e/reports-2fa-rate-limit.signedin.spec.ts` still passes | Engineering | Slice 2 |

## 4. Document & IEP handling

| ID    | Requirement                                                                 | Level | Status  | Sev | Evidence                                                                                                                                | Fix in Slice 0 | Remaining action | Owner        | Retest |
| ----- | --------------------------------------------------------------------------- | ----- | ------- | --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------- | ------------ | ------ |
| D-01  | Private bucket, path-locked, signed URLs                                    | B/C   | PASS    | P0  | `student-documents` private; `tg_documents_enforce_storage_path`; signed URLs in `documents.functions.ts`; tests: `tests/iep-upload-signed-url.test.mjs`, `tests/iep-signed-url-expiry.test.mjs`, `tests/iep-signed-url-revocation.test.mjs` | None | Slice 4: re-run | Engineering | Slice 4 |
| D-02  | File-type / size validation on upload                                       | B/C   | MANUAL REVIEW | P1 | Zod validators in `documents.functions.ts` set size and MIME whitelist; not re-run in Slice 0 | None | Slice 4: assert bounds against real bucket config | Engineering | Slice 4 |
| D-03  | Malware scanning on upload                                                  | C     | BLOCKED | P0  | Not present in code. See `blockers.md` B-01                                                                                              | None            | Choose a vendor, wire into upload pipeline | Engineering + Founder + Vendor | Slice 4 after vendor |
| D-04  | No leakage of filenames / content in logs / analytics / URLs                | B/C   | MANUAL REVIEW | P1 | Signed URLs contain object paths — path itself carries `student_id/…`. Server logs redact bodies but not paths. | None | Slice 4: grep for `console.log` around uploads; add redaction if needed | Engineering | Slice 4 |
| D-05  | Version history / replace / delete / export                                 | B/C   | PASS    | P2  | `document_pipeline_runs`, `document_extractions`, `document_summaries`, `admin_doc_access_grants` with `expires_at`; deletion soft-flag via `deleted_at` | None | Slice 4 confirmation | Engineering  | Slice 4 |

## 5. Pathway engine & report

| ID    | Requirement                                                                 | Level | Status  | Sev | Evidence                                                                                                                                | Fix in Slice 0 | Remaining action | Owner        | Retest |
| ----- | --------------------------------------------------------------------------- | ----- | ------- | --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------- | ------------ | ------ |
| P-01  | One canonical report, multi-lens                                            | B/C   | PASS    | P1  | `pathway.tsx` + `pathway.family.tsx` + `pathway.student.tsx` render from the same `pathway_reports` row; audience-scoped via `share_tokens.audience` | None | None | Engineering  | Slice 5 |
| P-02  | Every recommendation attributes source + uncertainty                        | B/C   | PASS    | P0  | `RecommendationV1` Zod contract with evidence linkage; `report_evidence_links`; verified in `tests/evidence-report-provenance-coverage.test.mjs`, `tests/evidence-verification-gate.test.mjs` | None | Slice 5: re-run suite | Engineering | Slice 5 |
| P-03  | Version tracking for reports / prompts / rules / models                     | B/C   | PASS    | P1  | `pathway_report_versions`, `pathway_rules_versions`, `pathway_shadow_run_log`, `pathway_shadow_run_orchestrator.server.ts`               | None | None            | Engineering  | Slice 5 |
| P-04  | AI never silently alters an official record                                 | B/C   | PASS    | P0  | Writes gated through `writePathwayReport`; shadow runs are DORMANT and write only to `pathway_shadow_run_log` when explicitly enabled per Slice D13/D15 | None | None | Engineering | Slice 5 |
| P-05  | Eval fixture set covering age bands, sparse/conflicting/malicious inputs    | B/C   | PARTIAL | P1  | Fixtures under `tests/unit/pathway-*.test.ts` cover multiple age bands and evidence isolation; adversarial upload prompt fixtures not enumerated | None | Slice 5: add fixture pack — prompt injection, unrealistic goals, outdated docs | Engineering | Slice 5 |

## 6. Transition Channel

| ID    | Requirement                                                                 | Level | Status  | Sev | Evidence                                                                                                                                | Fix in Slice 0 | Remaining action | Owner        | Retest |
| ----- | --------------------------------------------------------------------------- | ----- | ------- | --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------- | ------------ | ------ |
| T-01  | One entry point per role dashboard, none on Owner Hub                       | B/C   | PASS    | P2  | `TransitionChannelTile` in `DashboardWidgets` (non-owner); Owner Hub does not import it                                                  | None | None            | Engineering  | Slice 6 |
| T-02  | Membership + RLS + legal-hold enforced                                       | B/C   | PASS    | P0  | `is_channel_member` / `is_channel_admin` RLS; triggers `tg_channel_messages_enforce_legal_hold`, `tg_channels_enforce_legal_hold`      | None | None            | Engineering  | Slice 6 |
| T-03  | Retention purge honours legal hold                                          | B/C   | PASS    | P0  | `channel_retention_purge()` skips `legal_hold IS TRUE` and pinned messages                                                              | None | None            | Engineering  | Slice 6 |
| T-04  | No sensitive content in email/push previews                                 | B/C   | MANUAL REVIEW | P1 | Digest template exists (`channel-activity-digest.tsx`) — content review not re-done in Slice 0 | None | Slice 6: audit template output | Engineering | Slice 6 |
| T-05  | Removed participants lose access, restricted student-to-partner DMs         | B/C   | PASS    | P0  | `channel_members.left_at` gates `is_channel_member`; channel `purpose` types constrain who can start student-to-partner conversations   | None | Slice 6: add explicit test | Engineering | Slice 6 |

## 7. Partner Network

| ID    | Requirement                                                                 | Level | Status  | Sev | Evidence                                                                                                                                | Fix in Slice 0 | Remaining action | Owner        | Retest |
| ----- | --------------------------------------------------------------------------- | ----- | ------- | --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------- | ------------ | ------ |
| N-01  | Authenticated & permission-scoped                                           | B/C   | PASS    | P1  | `/partner-network` gated by `ROUTE_AUDIENCES`; partner-management surfaces gated to partner/admin                                       | None | None            | Engineering  | Slice 7 |
| N-02  | Contact email admin-only                                                    | B/C   | PASS    | P0  | `get_partner_network_opportunity_contact_email` gated on `is_platform_admin`                                                            | None | None            | Engineering  | Slice 7 |
| N-03  | Verified vs unverified partner distinction                                  | B/C   | MANUAL REVIEW | P2 | `partner_organizations` has verification fields; UI copy needs sweep to ensure no unverified org is implied to be an official partner | None | Slice 7: copy sweep | Engineering + Founder | Slice 7 |

## 8. Routing & feature contracts

| ID    | Requirement                                                                 | Level | Status  | Sev | Evidence                                                                                                                                | Fix in Slice 0 | Remaining action | Owner        | Retest |
| ----- | --------------------------------------------------------------------------- | ----- | ------- | --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------- | ------------ | ------ |
| R-08  | Tile → preview → feature page → back                                        | B/C   | PARTIAL | P1  | `tests/e2e/dashboard-tile-navigation.signedin.spec.ts` + `dashboard-regression.yml` cover it — not re-run in Slice 0                    | None | Slice 8: re-run workflow | Engineering  | Slice 8 |
| R-11  | `/api/public/*` handlers verify caller                                      | B/C   | MANUAL REVIEW | P1 | Three handlers exist; per-handler review deferred                                                                                       | None | Slice 2: read each handler | Engineering | Slice 2 |
| R-12  | Signed-out access, expired session, browser back                            | B/C   | MANUAL REVIEW | P2 | `tests/unit/auth-redirect-reason.test.ts`, `tests/e2e/reports-session-lifecycle.signedin.spec.ts`                                        | None | Slice 8: re-run | Engineering | Slice 8 |

## 9. Accessibility & usability

| ID    | Requirement                                                                 | Level | Status  | Sev | Evidence                                                                                                                                | Fix in Slice 0 | Remaining action | Owner        | Retest |
| ----- | --------------------------------------------------------------------------- | ----- | ------- | --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------- | ------------ | ------ |
| X-01  | Automated axe + Playwright keyboard journeys                                | A/B/C | PARTIAL | P1  | `tests/e2e/public-a11y.spec.ts`, `report-a11y.spec.ts`, `a11y-forms-modals.spec.ts`, `a11y-reflow-320.spec.ts`, `docs/a11y/manual-verification-2026-07.md` | None | Slice 9: re-run and refresh manual doc | Engineering | Slice 9 |
| X-02  | No WCAG conformance claim on automated results alone                        | A/B/C | PASS    | P0  | Wording in `trust-and-safety.tsx` reviewed against memory rule; ledger flags MANUAL for full conformance | None | Legal-review copy in Slice 9 | Founder + Legal | Slice 9 |

## 10. Reliability & failure handling

| ID    | Requirement                                                                 | Level | Status  | Sev | Evidence                                                                                                                                | Fix in Slice 0 | Remaining action | Owner        | Retest |
| ----- | --------------------------------------------------------------------------- | ----- | ------- | --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------- | ------------ | ------ |
| L-01  | Loading / empty / permission-denied / offline states                        | A/B/C | MANUAL REVIEW | P2 | `src/pwa/*`, `public/offline.html`, `errorComponent` shape enforced by knowledge — spot check deferred | None | Slice 10: crawl for missing `errorComponent`/`notFoundComponent` | Engineering | Slice 10 |
| L-02  | Idempotent submissions                                                      | A/B/C | PASS    | P1  | `redeem_access_code` uses unique redemption row; `sendChannelMessage` uses idempotency key; waitlist insert with DB dedupe             | None | None            | Engineering  | Slice 10 |
| L-03  | Errors observable without exposing private data                             | B/C   | PARTIAL | P1  | `obs_events` in-house; external APM not wired (see subprocessors)                                                                       | None | Slice 10: verify redaction | Engineering | Slice 10 |

## 11. Production safety

| ID    | Requirement                                                                 | Level | Status  | Sev | Evidence                                                                                                                                | Fix in Slice 0 | Remaining action | Owner        | Retest |
| ----- | --------------------------------------------------------------------------- | ----- | ------- | --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------- | ------------ | ------ |
| S-01  | Environment separation, secret handling                                     | A/B/C | PASS    | P0  | Secrets set in Lovable Cloud (see secrets list); `.env` never committed; all `process.env` access is server-side                       | None | None            | Engineering  | Manual |
| S-02  | Security headers, CORS, dependency scans                                    | B/C   | MANUAL REVIEW | P1 | `tests/dark-mode-csp.test.mjs`, workflow bundle; dependency scanning tool available but not run in Slice 0 | None | Slice 11: run dep scan | Engineering | Slice 11 |
| S-03  | Backups, restore drill, incident response                                   | C     | BLOCKED | P0  | Not verifiable from code                                                                                                                | None | See `blockers.md` B-03 | Founder + Vendor | Slice 11 |
| S-04  | Email domain authentication (DKIM/SPF/DMARC)                                | A/B/C | MANUAL REVIEW | P1 | Not verifiable from code                                                                                                                | None | See `blockers.md` B-02 | Founder + Vendor | Slice 11 |
| S-05  | `client.server` never imported at module scope of client-reachable files    | B/C   | PASS    | P0  | `tests/unit/no-toplevel-admin-import.test.ts` enforces it                                                                               | None | Re-run in Slice 11 | Engineering | `bunx vitest run tests/unit/no-toplevel-admin-import.test.ts` |

## Go / No-Go recommendation (Slice 0 provisional — subject to Slice 1–11 verification)

- **Level A — Waitlist collection**: **Provisional GO.** Waitlist RPC uses validated anon INSERT with narrow RLS; SELECT/UPDATE/DELETE gated to platform admins. Blockers B-02 (email authentication) should be resolved before broad public launch but do not prevent limited collection.
- **Level B — Controlled beta with fictional / redacted data**: **Provisional GO conditional on Slice 1–2 execution.** RLS surface, invitation lifecycle, and role-guard matrix already have tests; running them under this slice is the gating step. Malware scanning (B-01) is not required for fictional-data beta.
- **Level C — Real student and IEP records**: **NO-GO** until at minimum: B-01 (malware scanning), B-02 (email domain auth), B-03 (backup restore drill + incident response), P-05 (adversarial pathway fixtures), and legal review of subprocessors are all resolved. This is a policy statement, not a code defect list.

## Prioritized blockers (ranked)

1. **P0** — B-01 Malware scanning on uploads (Level C)
2. **P0** — B-03 Backup restore drill + incident response (Level C)
3. **P1** — B-02 Email domain authentication verification (Level A/B/C)
4. **P1** — B-04 Legal review of subprocessors and DPAs (Level B/C)
5. **P1** — P-05 Adversarial pathway fixtures (Level B/C)
6. **P1** — R-11 `/api/public/*` handler review (Level B/C)
7. **P1** — X-01 Refresh manual a11y verification doc (Level A/B/C)
