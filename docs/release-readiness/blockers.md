# External / Manual Blockers

Items that cannot be verified or resolved from this codebase alone.
Each is annotated with what evidence would flip it to PASS. Nothing in
this file has been simulated, worked around, or marked complete.

| ID   | Blocker                                                            | Level | Sev | Owner                        | Evidence needed to close                                                                                     |
| ---- | ------------------------------------------------------------------ | ----- | --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| B-01 | Malware / AV scanning on document and Channel uploads              | C     | P0  | Engineering + Founder + Vendor | Both protected synthetic staging paths are now proven without retry: `channel-attachments` at exact SHA `193bed60f8d3d4233aab7cc043709e52cb388790` (run `35521640583`) and `student-documents` at exact SHA `848af3ef0220a31df8d5c3b65937b328898f8082` (run `35810041318`). Closing this blocker still requires an effective Cloudmersive DPA and accepted education-data/privacy, region, subprocessor, retention, file-size, rate-limit, support, and availability terms, plus separately authorized production configuration and migrations. |
| B-02 | Email sending domain DKIM/SPF/DMARC alignment                      | A/B/C | P1  | Founder + Vendor             | DNS records for the sending domain published; DMARC report + Postmark/Resend/etc. deliverability report attached to a Slice 11 note. |
| B-03 | Backup restore drill + incident-response playbook                   | C     | P0  | Founder + Vendor             | Documented restore-from-backup exercise (< RPO / RTO target), IR runbook stored in a durable location, on-call rotation identified. |
| B-04 | Legal review of subprocessors + DPAs (Supabase, Lovable AI, Google) | B/C  | P1  | Founder + Legal              | Signed DPAs on file, subprocessor list published, FERPA directory-information posture documented.            |
| B-05 | Formal WCAG 2.2 AA conformance claim (if desired for marketing)     | Public | P2 | Founder + Third-party audit | Third-party audit report. Automated axe passing is not sufficient — matches memory rule. |
| B-06 | External APM / error monitoring (Sentry, Datadog, etc.)             | C     | P2  | Engineering + Founder        | Vendor selected, DSN configured server-only, redaction rules in place for PII.                               |
| ~~B-07~~ | ~~MFA-required enforcement for `admin_roles`~~ — **CLOSED 2026-07-21**: `acceptAdminInvitation` now calls `requireAal2`; grant/revoke/invite already gated (Slice 3). Regression locked by `tests/unit/admin-roles-mfa-gated.test.ts`. | C | P1 | Engineering | — |

## How to close a blocker

1. Complete the external work (procure vendor, publish DNS record, sign DPA, etc.).
2. Add the evidence artifact to `docs/release-readiness/` or link to a secure store from `readiness-ledger.md`.
3. Update the ledger row status from `BLOCKED` / `MANUAL REVIEW` to `PASS`.
4. Where applicable, add a test that would fail if the control regressed.
