# Editable Account Profiles + Transition Channel — Release Plan

Sequenced per your answers: **Workstream 1 (Profiles) ships first and verified, then Workstream 2 (Transition Channel)**. Existing tables (`profiles`, `notification_prefs`, `messages`, `message_threads`, `/settings`) are extended, not replaced.

---

## Workstream 1 — Editable Account Profiles, Preferences, Security

### 1A. Schema (single migration)

Extend `public.profiles`:
- `preferred_name text`, `pronouns text`, `time_zone text default 'America/New_York'`
- `communication_preference text check in ('email','in_app','both')`
- `profile_visibility text check in ('team_only','org','private') default 'team_only'`
- `bio text` (500 char), `title text` (professional/administrative title)

New `public.user_preferences` (accessibility + UX):
- `user_id pk fk auth.users`, `reduced_motion bool`, `high_contrast bool`, `dyslexia_friendly bool`, `reading_level text ('plain','standard')`, `calendar_view text ('list','week','month')`, `updated_at`

Extend `public.notification_prefs`:
- `quiet_hours_start time`, `quiet_hours_end time`, `quiet_hours_tz text`

New `public.security_events` (audit trail for security-sensitive changes):
- `user_id`, `event_type` (password_change, mfa_enroll, mfa_disable, email_change_requested, session_revoked, profile_field_change), `metadata jsonb`, `ip inet`, `user_agent text`, `created_at`

Update `handle_new_user()` trigger to also insert default `user_preferences` and `notification_prefs` rows transactionally.

Backfill: seed default `user_preferences` + `notification_prefs` for every existing profile — never overwrite existing prefs.

**Protection**: `profiles` UPDATE policy stays scoped to `auth.uid() = id`. Server-side allow-list explicitly rejects writes to `primary_role`, `organization_id`, `account_status`, `is_demo`, `selected_plan`, `email`. Role/org changes remain admin-only via existing `user_roles` / `organization_memberships` flows.

### 1B. Server functions (`src/lib/profile.functions.ts` extended)
- `updateProfile({ preferred_name, pronouns, time_zone, communication_preference, profile_visibility, bio, title, avatar_url })` — server-side allow-list, logs `security_events` for sensitive changes.
- `updateUserPreferences(...)` — accessibility prefs.
- `updateQuietHours({ start, end, tz })`.
- `requestEmailChange({ new_email })` — triggers Supabase `updateUser({ email })` reverification flow, logs event.
- `listSecurityEvents()` — user's own recent events.
- `listActiveSessions()` / `revokeSession(id)` — via `supabase.auth.admin` inside `requireSupabaseAuth` admin-loaded handler.

### 1C. Routes (canonical settings surface)
Split existing `/_authenticated/settings.tsx` into a tabbed shell with sub-routes:
- `/settings/profile` — common + role-specific editable fields (student, parent, educator/counselor, school admin, district admin, partner). Role-specific sections gated by `getMyRoles()`.
- `/settings/preferences` — language, timezone, accessibility, calendar view.
- `/settings/notifications` — existing prefs card + quiet hours + channel-notification section (populated by W2).
- `/settings/privacy` — profile visibility, consent records viewer (read-only from existing `consent_records`).
- `/settings/security` — password reset, MFA (existing `/security` merges here), active sessions, recent security activity.

Existing `/settings` becomes redirect → `/settings/profile`. Account menu entry unchanged. **No dashboard tile added.**

### 1D. Tests (Workstream 1)
- Contract: profile create trigger inserts `profiles + notification_prefs + user_preferences` atomically.
- Contract: backfill idempotent; existing prefs preserved.
- Contract: `updateProfile` rejects protected fields (unit).
- Contract: role-specific field visibility matches role.
- RLS: user cannot UPDATE another user's profile / prefs / security_events.
- E2E signed-in: edit each editable field per role, reload, value persists.
- Regression: existing dashboard/role-guard/security suites remain green.

---

## Workstream 2 — Transition Channel v1

Full scope you selected: **all channel types, core messaging + attachments + realtime, full compliance surface.**

### 2A. Schema
New tables (single migration, all with GRANTs + RLS + policies + updated_at triggers):

- `channels(id, type, scope_ref jsonb, organization_id, student_id nullable, partner_org_id nullable, name, purpose, owner_id, retention_days, archived_at, created_at, updated_at)`
  - `type` check in `('student_team','student_family','school_team','district_impl','partner_relationship','opportunity_referral','partner_internal','platform_support')`
- `channel_members(channel_id, user_id, role in ('owner','admin','member','viewer'), joined_at, muted_until, left_at)` — pk (channel_id,user_id)
- `channel_messages(id, channel_id, author_id, parent_message_id nullable, body, kind in ('message','decision','feedback','system'), created_at, updated_at, deleted_at)`
- `channel_message_revisions(id, message_id, previous_body, edited_by, edited_at)`
- `channel_message_attachments(id, message_id, storage_path, filename, mime, size_bytes, scan_status, scanned_at)`
- `channel_message_reads(channel_id, user_id, last_read_message_id, last_read_at)`
- `channel_message_reactions(message_id, user_id, emoji)` — optional, mention-only if we defer
- `channel_mentions(message_id, mentioned_user_id, created_at)`
- `channel_connection_requests(id, from_org_id, from_user_id, target_partner_org_id, purpose, opportunity_id nullable, message, status, created_channel_id, created_at, decided_at, decided_by)` — **privacy-safe fields only, no student identity pre-acceptance**
- `channel_actions(id, message_id, kind in ('next_action','calendar_event','meeting_agenda','opportunity_followup','referral_task','feedback','evidence_candidate'), target_id, promoted_by, promoted_at)`
- `channel_reports(id, channel_id, message_id, reporter_id, reason, status, resolved_by, resolved_at, notes)`
- `channel_audit_events(id, channel_id, actor_id, event_type, target_id, metadata, created_at)`
- `channel_retention_policies(scope_type, scope_id, retention_days, legal_hold_until, updated_by, updated_at)` — org/district configurable

New storage bucket `channel-attachments` (private), signed-URL access only, path prefix `<channel_id>/<message_id>/`.

### 2B. RLS (security-definer functions, no policy recursion)
- `can_view_channel(_user, _channel)` — active membership OR platform admin.
- `can_post_channel(_user, _channel)` — active member, not viewer, not left, channel not archived.
- `can_admin_channel(_user, _channel)` — owner/admin/org admin.
- Row visibility on `channel_messages`, `_reads`, `_mentions`, `_attachments`, `_reports` all key off `can_view_channel`.
- Attachment storage RLS mirrors: user must satisfy `can_view_channel` for the message's channel; `scan_status='clean'` required for non-admins.
- Connection requests: sender org admin OR target partner org admin can view.

**Removed-member enforcement**: `channel_members.left_at IS NOT NULL` revokes view + realtime; a nightly job also removes members whose underlying relationship (student collaborator, org membership) was revoked.

### 2C. Server functions (`src/lib/channels/*.functions.ts`)
- `listMyChannels()`, `getChannel(id)`, `listMessages(channel_id, before?)`, `sendMessage({channel_id, body, parent_message_id?, client_dedup_key})`
- `createStudentTeamChannel({student_id})` — auto-adds owner, family, assigned educators.
- `createPartnerConnectionRequest({...})` — privacy-safe schema (no student identity).
- `acceptConnectionRequest(id)` — creates partner_relationship channel + audit event.
- `addChannelMember`, `removeChannelMember`, `archiveChannel`, `updateChannelRetention` — capability-checked.
- `markRead(channel_id, message_id)`, `mentionSearch(channel_id, q)`.
- `promoteMessageTo({message_id, kind, ...})` — explicit workflow promotion, records `channel_actions`, applies destination permissions.
- `reportMessage`, `muteChannel`, `leaveChannel`.
- `getAttachmentSignedUrl(message_id, attachment_id)` — scan_status gated.
- `uploadAttachment` — enqueues scan job (`channel_attachment_scan` queue), stores as `scan_status='pending'`.

Idempotent send: `client_dedup_key` unique per author, 24h window.

### 2D. Realtime
Postgres `alter publication supabase_realtime add table channel_messages, channel_message_reads, channel_members;`

Client subscribes only after `listMyChannels()` returns membership; filter to `channel_id IN (my ids)`. RLS still enforces server-side. Subscriptions live in a single `useTransitionChannelRealtime()` hook (mount-once pattern per knowledge).

### 2E. Notifications
Extend existing email queue with `channel_message_notification` template.
- Immediate: mentions + direct thread replies + connection requests + action assignments.
- Digest: unread summaries follow `notification_cadence` + quiet hours.
- Email subject NEVER includes message body (`"New message in [Channel Name]"` only).
- Add prefs to `notification_prefs`: `channel_mentions`, `channel_replies`, `channel_digest`, `channel_connection_requests`.

### 2F. UI (existing design system, not Discord-like)
Tile in **existing Workspace/Tools & Features area** of each applicable role dashboard — exactly one:
- Student, Family, Educator/Case Manager/Counselor, School Admin, District Admin, Partner.
- **Owner: no tile, moderation surface goes to `/hubs/admin` → new "Channels" tab.**

Preview shows: unread count, most recent permitted channel name, one pending request, one CTA. Never message body when a shoulder-surfer could see it.

Feature route `/_authenticated/transition-channel[/$channelId]`:
- Two-pane layout on desktop (channel list + conversation), stacked on mobile.
- Uses `SiteShell` + `Breadcrumbs` with **Back to Dashboard** wired via `dashboardPathForRoles`.
- Sub-surfaces: message list, thread replies drawer, member panel, connection requests drawer, promote-to-workflow menu, report/mute/leave menu, retention policy editor (admins).

Demo integration: mirror tile on demo dashboards, feature page reads from `src/lib/demo/transition-channel-fixtures.ts` (per-profile isolated conversations). All demo actions are no-ops with toast confirmation — zero DB writes.

### 2G. Compliance surface (full)
- District-configurable retention via `channel_retention_policies`, nightly cron purges past retention unless legal hold.
- Legal hold table + admin UI to set/lift.
- Disclosure records via `channel_audit_events` (event_type `disclosure_recorded`).
- Amendment workflow: user requests amendment → admin approves → prior version preserved in `channel_message_revisions`, new message added referencing prior.
- Access/export requests: server fn produces a signed download of the user's own accessible messages.
- Admin Hub "Channels" tab: reports queue, retention policies, legal holds, moderation actions, audit log viewer.
- No blanket "FERPA/COPPA compliant" marketing copy — plain-English descriptions of controls.

### 2H. Tests (Workstream 2)
- Contract: RLS matrix for every channel type × role × action (view/post/invite/archive/read).
- Contract: unauthorized user cannot discover any channel via list or direct id.
- Contract: student + partner cannot open unrestricted DMs (server fn rejects).
- Contract: partner outreach request rejects student identity fields.
- Contract: consent/relationship removal → member `left_at` set → subsequent reads denied.
- Contract: attachment RLS gates by channel view + scan_status.
- Contract: realtime channel subscribe filter denies non-member payloads (integration test with two service clients).
- Contract: promoteMessageTo requires capability and records provenance.
- Contract: idempotent send dedupes on `client_dedup_key`.
- Contract: notification emails omit body from subject.
- Regression: exactly one Transition Channel tile per applicable dashboard (snapshot test); owner dashboards do NOT include the tile.
- E2E signed-in: full flow for each role (open tile → preview → feature page → send → thread → back to dashboard).
- E2E demo: demo tile isolated per selected profile; no DB writes recorded.
- A11y: keyboard nav, live regions on new messages, focus after send, reduced-motion path.

---

## Sequencing & Ship Gates

1. **W1 migration + backfill** → verify → **W1 routes + server fns** → verify → W1 tests green.
2. **W2 schema + RLS** → RLS matrix tests green → **W2 server fns + realtime + notifications** → **W2 UI + tile + demo** → **W2 compliance surface** → full test matrix green.
3. Ship W2 only when the security + privacy + retention tests all pass. AI channel summaries are out of scope for v1.

## Completion Report (delivered at end of W2)
Profile field matrix by role, editable vs protected list, backfill counts, channel type × role capability matrix, partner outreach workflow diagram, RLS/security test results, retention/consent behavior verification, notification delivery matrix, demo isolation verification, a11y results, and full test totals.

---

**Confirm to proceed and I'll begin with the W1 migration.**
