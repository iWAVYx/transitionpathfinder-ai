# Transition Channel Slices B–H — Confirmed Ship Order

Slice A is complete. The remaining slices build on each other and on the Slice A schema (threading, actions, mentions, bookmarks, mutes, edits). Recommended order preserves backend→frontend dependency, keeps demo mirroring after the signed-in source of truth, and defers the full regression pass until the feature is complete.

## Ship order

1. **Slice B — Feature page shell + tabs + filters**
   - Why first: every subsequent slice (messages, records, brief, notifications) needs a stable container with tabs, URL-persisted filters, and back-to-dashboard routing.
2. **Slice C — Message capabilities**
   - Depends on: Slice B shell (tabs + filter pane + pagination UI).
   - Includes: threads/replies, mentions, pin, bookmark, edit + history, delete/withdraw, attachments, search, pagination, draft persistence, per-channel mute.
3. **Slice D — Structured records + convert-from-message + integrations**
   - Depends on: Slice C message model (especially threads, edits, and per-message actions) and Slice A `channel_actions` table.
   - Includes: converting messages to Action/Decision/Question/Feedback/Meeting Item/Opportunity or Referral follow-up; provenance links to Calendar, Next Actions, Meeting Prep, Opportunity, Referral, Workspace, Pathway Evidence.
4. **Slice E — Transition Channel Brief**
   - Depends on: Slice C (messages + search) and Slice D (structured records/decisions/actions).
   - Includes: on-demand, member-scoped summary of recent updates, open decisions, assigned actions, and deadlines with links back to sources.
5. **Slice F — Notifications**
   - Depends on: Slice C (mentions/replies) and Slice D (assignments/deadlines).
   - Includes: in-app + email digests, quiet hours, per-channel mute, mention/reply/assignment/deadline events; safe email subjects.
6. **Slice G — Demo mirror parity**
   - Depends on: signed-in B, C, D, E implementation. Demo mirrors the same structure using in-memory fictional data.
   - Includes: role/context-reactive bundles, full-page tabs, structured records, brief, connection actions, preview drawer.
7. **Slice H — Tests + a11y + regression**
   - Depends on: all signed-in and demo slices.
   - Includes: feature-contract matrix, RLS adversarial tests, a11y checks, regression suites.

## Slice B acceptance criteria

### Schema / data already available from Slice A
- `channel_messages.parent_message_id`, `edited_at`, `deleted_at`, `pinned_at`
- `channel_message_edits`, `channel_bookmarks`, `channel_mentions`, `channel_member_prefs`
- `channel_actions` with `kind`, `due_at`, `priority`, `status`, `assignee_user_id`, `source_message_id`

### What Slice B will build

1. **Feature-page shell refactor**
   - Refactor `/_authenticated/transition-channel` to use the same shared feature-page shell as other mature features (to be identified from the codebase; likely `FeatureShell`/`WorkspaceShell` pattern).
   - Keep the existing two-pane layout as the "My Channels" tab content, not the entire page.

2. **Role-filtered tabs**
   - Tabs: **Inbox**, **My Channels**, **Mentions**, **Assigned To Me**, **Decisions**, **Feedback**, **Connections**, **Archived**.
   - Visibility is role-filtered: not every role sees every tab. Show only tabs that are relevant to the user's relationship to the data (e.g., a student may not see "Connections"; a partner sees different defaults than a district admin).

3. **URL-persisted filters**
   - Filter dimensions: unread, student, type, org, opportunity, assignee, due, status, archived.
   - Filters are persisted in the URL query string so refresh and back-to-dashboard return the same view state.

4. **Back-to-dashboard button**
   - Adds a "Back to Dashboard" button that routes to the role's canonical dashboard.
   - Preserves the current filter/channel state in the URL so returning to the feature page later restores the same view.

5. **No new dashboard tiles, no demo changes**
   - Exactly one Transition Channel tile remains per applicable role dashboard.
   - No demo changes in Slice B; demo mirror is Slice G.

### Out of scope for Slice B
- Message threads, mentions, attachments, search, pagination, edit/delete, structured records, brief, notifications, demo parity, or tests. Those come in later slices.

### Approval needed
- Confirm this order and the Slice B acceptance criteria above.
- Resolve the three open questions that affect later slices, but not Slice B directly:
  1. **Attachments** — reuse `student-documents` bucket with a `channels/` prefix, or create a dedicated `channel-attachments` bucket? (Slice C)
  2. **Convert-to-evidence** — does message→evidence require a specialist review step, or is any authorized channel member sufficient? (Slice D)
  3. **Email** — use the existing `enqueue_email` / `notification_prefs` pipeline for digests and quiet hours, or defer email until in-app notifications are landed? (Slice F)

Once you confirm the order, I will open Slice B with the shell refactor and tabs.
