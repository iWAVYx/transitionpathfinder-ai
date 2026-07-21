# Server Functions, Data Model, and Sensitive-Data Flow

## Server surface counts

- `.functions.ts` modules (RPC): **110**
- Files calling `createServerFn`: **109**
- Files applying `requireSupabaseAuth` middleware: **107** — 97% of RPC modules gate on auth
- Files importing `@/integrations/supabase/client.server` (service-role): **30** — every one is either `.server.ts` or loads it inside the handler per the platform playbook (spot-checked; full audit is ledger item S-05)
- Public read publishable-key clients: enumerated by `rg "createClient<Database>" src` — used sparingly for public partner directory and blog fetches; no user-scoped reads

Bearer-token attachment for RPC is registered in `src/start.ts` per
`src/integrations/supabase/auth-attacher.ts`.

## Storage buckets (all private)

| Bucket                | Contents                                     | Access                                                                 |
| --------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| `student-documents`   | IEPs, evaluations, uploaded family docs      | Signed URLs only. Path enforced by `tg_documents_enforce_storage_path` (must start with `<student_id>/`). Read gated by `storage_can_read_student_doc(user, path)` |
| `site-media`          | CMS media for blog/marketing                 | Signed URLs. Writes restricted to platform admins.                     |
| `channel-attachments` | Transition Channel uploads                   | Signed URLs. Read = channel member; write = channel member.            |

## Scheduled jobs

See `inventory-scheduled-jobs.md`.

## RLS anchor helpers (SECURITY DEFINER, `search_path = public`)

| Helper                                | Guards                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `can_access_student(user, student)`   | Owner OR accepted collaborator OR approved relationship OR `admin`                           |
| `can_edit_student(user, student)`     | Owner OR editor-collaborator OR relationship with `collaborate`/`manage_*` OR `admin`        |
| `can_view_document(user, document)`   | `can_access_student` on the document's student OR explicit `document_permissions` row        |
| `storage_can_read_student_doc(user,path)` | Rejects `is_partner_only`; validates folder-uuid = declared `student_id`; layered on top |
| `has_recent_admin_doc_access(user,doc)` | Platform admin with time-boxed `admin_doc_access_grants` row                               |
| `is_platform_admin(user)`             | Row in `admin_roles` with `platform_owner` or `platform_admin`                               |
| `is_org_admin(user, org)`             | Active `organization_memberships` with `admin`/`owner`/`school_admin`/`district_admin`, or `admin` |
| `is_channel_member(user, channel)`    | Row in `channel_members` with `left_at IS NULL`                                              |
| `is_channel_admin(user, channel)`     | Owner/admin channel role, or platform admin                                                  |
| `has_role(user, app_role)` / `has_audience(user, aud)` | Row in `user_roles`                                                         |
| `is_partner_only(user)`               | Only role is `partner` — blocks student-record access                                        |
| `partner_tier_allows(user, cap)`      | Entitlement-tier feature gating for partner capabilities                                     |
| `authorize(user, action, type, id)`   | Central switch used by RPCs. Short-circuits platform admin; routes to the helpers above.     |

Escalation guards enforced by triggers:

- `enforce_student_collaborator_accept` / `enforce_student_collaborators_self_accept` — accepting an invite cannot rewrite `role`, `student_id`, `invited_by`, `user_id`.
- `enforce_student_relationship_self_update` / `enforce_student_relationships_self_approve` — related user cannot escalate `permission_level`, change scope, or set `consent_status` to anything other than `approved` on self-update.
- `tg_channel_messages_enforce_legal_hold` / `tg_channels_enforce_legal_hold` — legal hold blocks deletes and archive.
- `tg_documents_enforce_storage_path` — storage path first segment must equal `student_id`.

## Sensitive-data flow (Beta / Level C)

| Data class                             | Store                                        | Owner-write path                              | Read-authorization                          |
| -------------------------------------- | -------------------------------------------- | --------------------------------------------- | ------------------------------------------- |
| Student profile / intake               | `students`, `student_intakes`, `student_strengths_needs`, `student_voice_responses`, `readiness_scores` | `requireSupabaseAuth` fn asserting `can_edit_student` | RLS via `can_access_student`                |
| Family / guardian linkage              | `student_guardians`, `student_relationships` | RPC + `accept_invitation_by_token`            | RLS via `can_access_student`                |
| Educator caseload / team               | `student_collaborators`, `student_team_members` | RPC checks + trigger guards                | RLS via `can_access_student`                |
| Uploaded documents / IEPs              | `documents`, `document_permissions`, `document_pipeline_runs`, `document_extractions`, `document_summaries`, `document_access_log` | Signed upload URLs, path-locked; server fn writes row | RLS via `can_view_document`; storage via `storage_can_read_student_doc` |
| Pathway report + audit                 | `pathway_reports`, `pathway_report_versions`, `pathway_recommendations`, `report_evidence_links`, `evidence_items`, `evidence_edges` | RPC with `requireSupabaseAuth`             | RLS scoped to student; share via `share_tokens` (revocable) |
| Meetings / PPT                         | `meetings`, `meeting_action_items`, `meeting_agenda_items`, `meeting_prep_items`, `meeting_questions`, `ppt_meeting_preps`, `calendar_events` | RPC; RLS `can_access_student`             | RLS `can_access_student`                    |
| Channel messages / attachments         | `channels`, `channel_members`, `channel_messages`, `channel_attachments`, `channel_message_edits`, `channel_message_reads`, `channel_mentions`, `channel_bookmarks`, `channel_actions`, `channel_reports`, `channel_audit_events`, `channel_member_prefs` | RPC + trigger-enforced legal hold        | RLS via `is_channel_member` / `is_channel_admin` |
| Consent / audit                        | `consent_records`, `audit_log`, `security_events`, `admin_activity_logs`, `admin_audit_reviews`, `admin_doc_access_grants`, `iep_access_alerts`, `channel_audit_events`, `license_lifecycle_events` | RPC + triggers                          | Platform admins only                        |
| Access provisioning                    | `access_codes`, `access_code_redemptions`, `access_entitlements`, `admin_invitations`, `invitations`, `organizations`, `organization_memberships`, `org_license_requests`, `org_access_audit` | `redeem_access_code`, `accept_invitation_by_token`, org RPCs | RLS on invited email + `is_org_admin` / platform admin |
| Waitlist                               | `waitlist`, `waitlist_admin_notes`           | anon INSERT via `submitWaitlist` (validated by CHECK constraints and Zod) | SELECT/UPDATE/DELETE = `is_platform_admin` only |
| Partner network                        | `partner_organizations`, `partner_opportunities`, `partner_network_opportunities`, `partner_submissions`, `partner_outreach_log`, `partner_impact_events`, `partner_badges`, `partner_incentive_resources`, `student_partner_connections`, `student_saved_partners`, `student_opportunity_matches` | Partner RPCs; contact email hidden behind SECURITY DEFINER `get_partner_network_opportunity_contact_email` (admin only) | Public-safe columns projected; contact info admin-only |

## Notes for later slices

- **Never present in logs / analytics / URLs**: student PII, IEP filenames, message bodies, tokens. Slice 2 will grep `console.log`/`console.error`/analytics events for violations.
- **Contact-email leakage**: audited — `get_partner_network_opportunity_contact_email` returns rows only when `is_platform_admin`. Confirmed in migration text; no additional path spotted.
- **AI outputs never mutate official records silently** — the pathway diff/shadow pipeline writes to `pathway_shadow_run_log` and requires `writePathwayReport` (server-owned) for `pathway_reports`. Slice 5 will retrace end-to-end.
