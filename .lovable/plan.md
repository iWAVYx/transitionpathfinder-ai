# Transition Channel Feature-Parity & Depth Pass

This is a multi-week program spanning backend schema, server functions, RLS, realtime, UI shells, demo mirroring, notifications, accessibility, and a full regression matrix. To ship it responsibly (and to avoid a mega-PR that breaks the dashboards you already have), I want to split it into sequenced, independently shippable slices and confirm scope before I start.

## What's already in place (source of truth)

- Tables: `channels`, `channel_members`, `channel_messages`, `channel_connection_requests`, `channel_reports`, `channel_audit_events`, `channel_attachments`, `channel_message_reads`, `channel_actions`.
- Server fns: `listMyChannels`, `listChannelMessages`, `sendChannelMessage`, `markChannelRead`, connection-request fns, moderation fns.
- Route: `/_authenticated/transition-channel` (two-pane, realtime).
- Dashboard tile: `TransitionChannelTile` (live) + `DemoTransitionChannelTile` (demo, with preview drawer).
- Demo data: `transition-channel-data.ts` + `use-demo-channels.ts`.
- Moderation tab in `/admin/orgs`.

## What's missing vs. the spec

Signed-in:
1. Role-appropriate tile depth (mentions, assigned actions, pending decisions, deadlines) — today only unread + last activity.
2. Feature-page tabs: Inbox, My Channels, Mentions, Assigned To Me, Decisions, Feedback, Connections, Archived — with role-filtered visibility + persisted filters.
3. Structured records from messages: Action Item, Decision, Question, Feedback, Meeting Item, Opportunity/Referral follow-up. (`channel_actions` exists; other kinds + convert-message UI do not.)
4. Message-level: threads/replies, mentions w/ member scope, pin, bookmark, edit history, delete/withdraw rules, attachments upload+preview, search, per-channel mute, notification prefs, draft persistence, pagination.
5. Communication→action integration (calendar, next actions, meeting prep, opportunity, referral, workspace, evidence) with provenance.
6. Transition Channel Brief (on-demand, member-scoped, non-auto-published).
7. Notifications: in-app + email, digests, quiet hours, per-channel mute, mention/reply/assignment/deadline events; safe subjects.
8. `Back To Dashboard` that returns to the role's canonical dashboard + preserves filter/channel state.

Demo mirror:
9. Role/context-reactive demo bundles (Jordan/Riley/Sam, School, District, Partner plan) driving preview + full page from the same records.
10. Demo full-page parity: tabs, structured records, brief, connection actions — all isolated in-memory.

Cross-cutting:
11. Feature-contract tests, RLS adversarial tests, a11y checks, regression suites.

## Proposed sequencing (each slice ships independently)

**Slice A — Data model + role-aware tile depth** (signed-in)
- Migrations: add `channel_messages.parent_message_id`, `edited_at`, `deleted_at`, `pinned_at`; add `channel_message_edits` (history); add `channel_bookmarks`; extend `channel_actions` with `kind` (`action|decision|question|feedback|meeting_item|opportunity_followup|referral_followup`), `due_at`, `priority`, `status`, `assignee_user_id`, `source_message_id`; add `channel_mentions`; add `channel_member_prefs` (mute, notify level). All with GRANTs + RLS scoped by `is_channel_member`/`is_channel_admin`.
- Server fn: `getChannelTileSummary` returning role-shaped counts (unread, mentions, assigned actions, decisions pending, deadlines, connection requests).
- Update `TransitionChannelTile` to render role-appropriate stats using that summary.

**Slice B — Feature page shell + tabs + filters** (signed-in)
- Refactor `/_authenticated/transition-channel` onto the shared feature-page shell used by other mature features (identify which — likely `FeatureShell`/`WorkspaceShell`).
- Tabs by role: Inbox / My Channels / Mentions / Assigned / Decisions / Feedback / Connections / Archived.
- URL-persisted filters (unread, student, type, org, opportunity, assignee, due, status, archived); Back-to-dashboard button routed to role's canonical dashboard.

**Slice C — Message capabilities**
- Threads/replies, mentions (member-scoped autocomplete), pin, bookmark, edit + history, delete/withdraw, attachments (Supabase Storage bucket w/ RLS + signed URLs + preview), search, pagination, draft persistence, per-channel mute.

**Slice D — Structured records + convert-from-message + integrations**
- UI + server fns to convert a message into Action / Decision / Question / Feedback / Meeting Item / Opportunity or Referral follow-up.
- Links to Calendar, Next Actions, Meeting Prep, Opportunity, Referral, Workspace, Pathway Evidence — with provenance (source msg, channel, actor, date, scope). Never auto-classify.

**Slice E — Transition Channel Brief**
- On-demand, member-scoped summary of recent updates / decisions / open questions / assigned actions / deadlines with links back to sources. Never auto-published to Pathway Report.

**Slice F — Notifications**
- Wire to `notification_prefs`: in-app + email digests, quiet hours, per-channel mute, mention/reply/assignment/deadline events. Safe email subjects.

**Slice G — Demo mirror parity**
- Extend `transition-channel-data.ts` + `use-demo-channels.ts` with structured records, mentions, assigned items, decisions, brief. Rebuild `/demo/transition-channel` on the same feature-page shell as signed-in, driven by role + context (student/school/district/plan). Preview drawer + full page share bundle.

**Slice H — Tests + a11y + regression**
- Feature-contract matrix entry for Transition Channel across every applicable role.
- RLS adversarial suite (cross-student/school/district, partner→student DM, manipulated IDs, attachment URL reuse, removed member).
- A11y: keyboard, SR announcements, focus mgmt, non-color indicators, reduced motion.
- Extend existing regression suites; run full dashboard/role-access/security/a11y/demo-navigation matrix.

## Non-goals (unchanged per spec)

- No new dashboard tiles beyond the one Transition Channel tile per applicable role.
- No dashboard rearrangement.
- No Platform Owner dashboard — moderation stays in Admin Hub.
- No auto-classification of messages into evidence/records/calendar.
- No demo writes hitting live tables.

## Questions before I start Slice A

1. **Ship order** — start with Slice A (data model + role-aware tile), then B (feature-page tabs), then C (messages), or a different order?
2. **Attachments** — reuse `student-documents` bucket with a `channels/` prefix + new policies, or provision a dedicated `channel-attachments` bucket?
3. **Convert-to-evidence** — must the message→evidence link require a specialist review step (matching the specialist-reviewed pattern already used elsewhere), or is any authorized channel member sufficient?
4. **Email** — use the existing `enqueue_email` / `notification_prefs` pipeline for digests + quiet hours, or defer email until after in-app notifications land?

Once you confirm, I'll open Slice A as a single migration + tile-summary server fn + tile update, and we iterate slice-by-slice with review between each.
