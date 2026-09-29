# Chat history when removing a member

Status: local integration on `codex/channel-history-removal-choice`, based on
current main `e0312315`, including PR #193's source at `14d38bad` and the history
choice. The production-readiness inventory conflicts are reconciled against
main, preserving both pending migrations. No live database or GitHub branch has
been changed; the remote PR remains a draft until publication is authorized.

The authorized person removing a collaborator, guardian, or team member must
choose one of the following. The same choice is required when changing a team
member to pending/inactive or revoking a student relationship through the server API.

- **Remove all chat access:** no live channel access or retained history.
- **Keep past history read-only:** a frozen copy of previously accessible messages,
  author labels, channel title, and clean, available attachment references appears
  under Transition Channel → Archived → Retained chat history. New messages,
  later edits, notifications, posting, and access to other student records are not
  granted by this choice. Attachments added later are excluded.

Neither option deletes messages for remaining members. The removal, snapshot,
membership closure, notification shutdown, and audit entry are one transaction.
An unauthorized or failed removal rolls everything back. Existing collaborator
removals remain owner-only; other removals retain the existing student-editor
permission requirement. Removing a decorative team/guardian record does not
silently delete other independent student permissions.

Direct API deletions and deactivations close chat access without creating a
history grant. A former member cannot restore their own membership, promote
their role, or grant themselves a history copy. Student chat eligibility is
checked at read/write time, not just at conversation creation. Existing elevated
platform administration is unchanged.

The conversation picker and atomic start RPC share the same revocation-aware
eligibility rule. A remaining independent student relationship cannot make a
removed person selectable or let them start another thread. Conversation start
and membership removal lock the student record before checking eligibility.
Starting a conversation writes the channel, both memberships, first message,
and audit event together. The form preserves drafts on error and disables edits
and duplicate submissions while sending.

Snapshots follow source-message hard deletion and soft deletion, including
retention/moderation deletion; attachments follow message/attachment deletion.
Downloads require the original storage object identity/version and its current
clean scan verdict. A replaced file at the same path is not downloadable through
the retained history grant. New signed URLs expire after 60 seconds. Previously
issued links and files already downloaded cannot be recalled by this change.

Removal records deliberately prevent other old links or a reinserted membership
from reopening student chat. Reinstatement is not automatic: a reviewed explicit
reinstatement flow is needed before restoring chat to a removed person. No such
flow is added in this change.

## Local verification

The combined change passes TypeScript, all 1,099 unit tests across 100 files,
11 embedded PostgreSQL scenarios and 55 channel-start, production-readiness,
attachment and execute-grant contracts. The production build and service-worker
generation pass locally.
Full canonical replay and signed-in staging acceptance remain outstanding.

The database tests use an in-memory PostgreSQL engine, actual channel foundation
migrations and both pending migrations, with a minimal student/auth fixture. They use
no credentials, network database, staging project, or production data. They do
not replace full canonical migration replay or signed-in staging acceptance.

Install `@electric-sql/pglite@0.5.8` in a temporary directory, then run:

```sh
CHANNEL_HISTORY_PGLITE_MODULE=/absolute/temp/node_modules/@electric-sql/pglite/dist/index.js \
  node --test tests/database/channel-history-removal.test.mjs
npx vitest run tests/unit/remove-member-dialog.test.tsx tests/unit/channel-membership-gates.test.ts
npx tsc --noEmit
node --test tests/production-readiness-contract.test.mjs tests/channel-attachment-malware-gate.test.mjs tests/security-definer-routine-grants.test.mjs
```

The prepared migrations are `20260928040000_atomic_student_channel_start.sql`
and `20260929010000_student_channel_removal_history.sql`. Both inventory entries
are pending. Live migration, deployment, PR publication and production changes
require separate authorization.

Local dependencies now use the repository's frozen Bun lockfile. The existing
global `entities@4.5.0` override was incompatible with jsdom's parse5 dependency;
removing that override lets parse5 use entities 8.1.0 while htmlparser2 and
dom-serializer retain 4.5.0. The fast-uri override is patched from 3.1.6 to
3.1.7 to resolve two high-severity audit findings. The high-severity audit gate
passes; the complete audit still reports three moderate and two low findings
in existing dependencies. No other dependency versions were changed.
