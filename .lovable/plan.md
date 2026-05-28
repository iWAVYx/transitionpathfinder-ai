
# TransitionForward — ParentSquare-Inspired Expansion

Positioning: *"Everything transition teams need to move every student forward."*

Delivered as one cohesive expansion, in two layers:

## Information Architecture (decided)

Top nav (auth area) becomes:

```text
Dashboard · Students · Feed · Messages · Meetings · Forms · Resources · More ▾
                                                                       └─ Goals, Documents,
                                                                          Opportunities, Admin
```

Mobile: same items collapse into the existing dropdown. The marketing site nav stays unchanged.

Each student page gets sub-tabs: Overview · Goals · Feed · Messages · Meetings · Forms · Documents — so every new module is reachable both globally (across all your students) and per-student.

---

## Phase 1 — Full-stack modules (real DB + RLS + server functions + UI)

### 1. Family Transition Feed (`/feed`, `/students/:id` Feed tab)
- New table `feed_events` (student_id, actor_id, kind, title, body, ref_table, ref_id, payload, created_at) with RLS via `can_access_student`.
- Event kinds: `report.generated`, `goal.added`, `goal.status_changed`, `reflection.added`, `progress_note.added`, `meeting.scheduled`, `meeting.summary_exported`, `form.completed`, `resource.matched`, `document.uploaded`, `message.posted`.
- Server-side helper `emitFeedEvent()` called from existing pathway / goals / docs / meeting / forms server fns so the feed populates automatically.
- UI: timeline with day grouping, kind icons/colors, filter chips (All, Goals, Meetings, Reports, Reflections, Messages), and "What does this mean?" inline explainers.

### 2. Communication Center (`/messages`)
- Tables `message_threads` (student_id, category, subject, created_by) and `messages` (thread_id, author_id, body, attachments jsonb) — RLS gated by `can_access_student` / `can_edit_student`.
- Categories: Goal updates · Meeting prep · Family questions · Student reflections · Resource questions · Follow-up actions.
- UI: two-pane inbox (threads list + thread view), category badges, "New thread" with required category, mark-resolved, link-to-student. Posting a message also writes a `message.posted` feed event.

### 3. Meeting Center (`/meetings`, `/meetings/:id`)
- Tables `meetings` (student_id, kind: PPT|IEP|transition|other, scheduled_at, location, status), `meeting_agenda_items`, `meeting_questions`, `meeting_action_items` (with assignee + due_date + status).
- Pulls existing student voice, family concerns, teacher progress notes, and linked documents into one prep view.
- Buttons: **Prepare for Meeting** (checklist wizard), **Add Family Question**, **Add Student Voice**, **Export Meeting Summary** (HTML→print/PDF using the existing ReportView print-CSS pattern).
- Reminders surface in Feed and Notifications.

### 4. Transition Forms Library (`/forms`, `/forms/:slug`)
- `form_templates` (seed-only, slug, title, audience, schema jsonb) + `form_responses` (student_id, template_slug, respondent_id, answers jsonb, status, completed_at).
- Seed templates: Student Interest Survey, Family Input, Teacher Input, Life Skills Checklist, Career Exploration Reflection, Postsecondary Goals Worksheet, Transportation Planning, Meeting Prep.
- Generic JSON-schema-driven renderer (text / textarea / single-select / multi-select / scale / checklist).
- Completed forms emit `form.completed` feed events and are surfaced to the next Pathway Report generation as additional context (passed into the existing AI report prompt).

---

## Phase 2 — Polished UI scaffolds (mock/derived data, ready to wire later)

5. **Notification Preferences** — extend existing `notification_prefs` UI with grouped sections (Channels: email/text/in-app · Cadence: instant/daily/weekly · Topics: meetings/reports/resources/messages). Toggles persist via existing server fn; SMS/in-app channels render as "Coming soon" with the preference saved.
6. **Plain Language + Translation** — new `<Term>` + extended `<InfoBox>` glossary component used throughout new modules; language preference dropdown in Settings (EN / ES / ZH / VI / AR placeholders) stored on profile; UI strings on family-facing pages wired through a small `t()` helper so future translation drops in.
7. **Student Hub enhancements** — `/students/:id` Overview becomes a card grid: My Goals · My Reflections · My Voice for My Meeting · My Next Step · My Progress · Careers I Want to Explore · Life Skills I'm Building. Cards pull from existing tables + new feed/forms data.
8. **Admin/District Engagement Insights** — `/admin/insights` (admin role only) with KPI tiles + simple bar/line summaries: completed Student Voice profiles, completed Family Input forms, generated Pathway Reports, meeting prep completion, top career interests, top life-skill needs, weekly family engagement. Powered by aggregate read-only server fns over existing + new tables.

---

## Cross-cutting

- Reuse design tokens in `src/styles.css`; new modules feel warm + trustworthy (same palette, soft shadows, generous whitespace).
- Every new page sets its own `head()` (title + description + og).
- All new tables created in a single migration with GRANTs, RLS, and `can_access_student` / `can_edit_student` reuse — no auth.users FKs.
- Realtime enabled for `messages` and `feed_events` so updates appear live.
- All title-casing utility + multi-line marketing pattern from previous turns is respected.

## Technical notes

- New server-fn files: `feed.functions.ts`, `messages.functions.ts`, `meetings.functions.ts`, `forms.functions.ts`, `insights.functions.ts`.
- One Supabase migration adds: `feed_events`, `message_threads`, `messages`, `meetings`, `meeting_agenda_items`, `meeting_questions`, `meeting_action_items`, `form_templates`, `form_responses`, plus indexes and RLS policies. Realtime publication updated for `messages` and `feed_events`. Seed insert for `form_templates` done via separate insert tool call after migration.
- Existing `pathway.functions.ts`, `goals` editor, `documents.functions.ts`, `ppt.functions.ts` gain a small `emitFeedEvent` call so existing flows feed the timeline without breaking changes.
- Header (`SiteHeader.tsx`) gets the new top-level items + "More" dropdown that already exists for overflow.

## Out of scope (call out for follow-ups)

- Actual SMS sending and push notifications (only preferences captured now).
- Real translation engine — language preference + `t()` plumbing only.
- PDF rendering server-side — meeting summary uses the existing print-to-PDF pattern.
