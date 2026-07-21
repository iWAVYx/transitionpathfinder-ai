# External Services & Subprocessors (reachable from code)

Every external network dependency the code can call. This is the
programmatic subprocessor list. It is **not** a legal DPA list — that
review is a Founder / Legal responsibility (see `blockers.md`).

| Service                          | Purpose                                              | Data classes sent                     | Configuration surface                                    | Notes |
| -------------------------------- | ---------------------------------------------------- | ------------------------------------- | -------------------------------------------------------- | ----- |
| Supabase (managed via Lovable Cloud) | Postgres, Auth, Storage, Realtime, pg_cron, pg_net | Everything user-facing                | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWKS`, `SUPABASE_DB_URL` (secrets) | Primary data store. RLS is the perimeter. |
| Lovable AI Gateway               | AI generation (pathway drafts, summaries)           | Prompt payloads composed from student data (Beta+ only); public inputs (marketing) | `LOVABLE_API_KEY` secret; `src/lib/ai-gateway.server.ts` | Never called from browser. Only server functions and edge jobs. |
| Lovable Cloud Email (via `net.http_post` from pg_cron) | Auth transactional email + queue dispatch | Recipient email + subject/preheader; body assembled server-side | `email_queue_service_role_key` vault secret; `email_queue_dispatch()` / `email_queue_wake()` | Runs inside Postgres → HTTP to `project--<id>.lovable.app/lovable/email/queue/process`. |
| Lovable Auth broker              | Google OAuth flow (`lovable.auth.signInWithOAuth`)   | Email, name from provider              | Configured via Lovable Cloud; no local secret            | Providers other than email/password + Google not enabled. |
| Google Search Console             | SEO reporting (Owner Hub only)                       | Site-level metrics                     | Managed connector `GOOGLE_SEARCH_CONSOLE_API_KEY`        | Read-only; no user data sent. |
| Analytics                         | None wired in code                                   | N/A                                    | N/A                                                      | If a vendor is later added it must be reviewed here. |
| Payment processors                | None wired in code                                   | N/A                                    | Stripe/Paddle namespace exposed as deferred tools but not enabled | Pricing page is informational only. |
| Malware / AV scanning             | None wired in code                                   | N/A                                    | N/A                                                      | BLOCKER for Level C. See `blockers.md` B-01. |
| External error monitoring         | None wired in code                                   | N/A                                    | N/A                                                      | `obs_events` table exists as in-house telemetry. External Sentry-style APM is not configured. Ledger R-14. |
| DKIM/SPF/DMARC on sending domain  | Configured outside code                              | Deliverability metadata                | Registrar / Lovable Cloud                                | Verification is manual (Founder). See `blockers.md` B-02. |

## Categories not present

- Twilio / SMS provider — no SMS sends found.
- Push notifications — no service worker push registration configured.
- Third-party OAuth beyond Google — none enabled in the code path.
- CDN / image processing service — none. Assets are static in `public/`.
- Third-party analytics (Segment/Mixpanel/GA) — none.
