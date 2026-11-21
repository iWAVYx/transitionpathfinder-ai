# Action Item Value Compatibility — Review Only

The canonical action table accepts `complete` and `teacher`, while current application writers send `completed`, `educator` and `team`. This draft widens only the two named CHECK constraints, preserving all existing values and records. It does not change policies, routine permissions, table grants or application authorization.

Installation requires the exact validated old definitions and an exclusive table lock, with bounded lock/statement timeouts. A changed or already-installed baseline stops for review. This is not an idempotent migration and must not be blindly rerun. The draft remains outside canonical migrations and hosted ledgers.

Verified November 19: 44 local and 44 native cases; complete 225-canonical + 41-prior-control + ten-separate-draft installation; 35 authenticated status/category combinations in a rolled-back fictional transaction. All 56 inherited stage scripts/logs and 297 original SQL identities were independently checked. Existing rows, policies, routines, grants, columns, indexes and triggers are unchanged. [Scoped evidence](../../production-readiness/evidence/planning-goals-actions-verified-2026-11-19.json).

The application separately confirms exact save/delete receipts and makes unavailable reads visible. Those REST checks do not hold authority across transactions. Raw/cached/trusted writers, competing writes, access-removal races, atomic completion effects, remaining consumers, profile handlers and BridgeForward remain open in P1. No staging or production operation is authorized by this evidence.
