# Progress Access and Save Consistency — Review Only

This is the eighth separate review draft, following the six document-permission drafts and atomic rights-review draft. It is not a canonical migration or a ledger entry. No hosted installation, release, AI call or production change is authorized here.

The shared Transition Roadmap and personal report Goal Tracker serve different purposes. Shared milestone changes require current student editing proof; personal goal tracking requires current student reading proof and remains private to its author. Owner/admin accounts require explicit student access; Partner-only accounts receive neither capability. An approved read-only relationship can track personal goals without editing shared milestones.

The source change covers all 12 actual roadmap milestones, including IDs above the former API limit. Loads fail visibly instead of presenting an empty checklist. Reads and saves bind to the current account and student. Saves compare the loaded row identity and exact database timestamp, or require that the row is still absent. The database supplies attribution and increasing microsecond timestamps. An uncertain reply requires explicit refresh, with no automatic resubmission. Saving one note preserves other unsaved notes; departing account/student replies cannot update the current card.

The SQL adds restrictive boundaries alongside the original permissive goal policies. It locks current access proof through writes, prevents goal identity reassignment, fences raw shared-roadmap writes and revokes ordinary TRUNCATE. Personal goal deletion retains its original own-row policy; this draft does not introduce a new retention/deletion decision. Existing rows, legacy milestone IDs, report contents and report history remain unchanged. Unlinked own reports receive a controlled instruction to link a student before tracking goals. Complete personal totals are computed in one caller-RLS snapshot and do not truncate at the REST page limit or silently omit inaccessible requested reports.

Installation stops if the exact reviewed canonical access helpers, private authority helpers or role-change trigger differ. It introduces six functions, seven restrictive policies and two triggers, with no table/column/data rewrite. Only four caller-bound RPCs are executable by authenticated clients; trigger helpers remain private. Shared roadmap raw writes remain denied even if an older client retains a prepared statement or a later permissive policy is added.

Verification is deliberately separated:

- Local: server receipt/input failures, account/student component lifetimes, draft preservation and disposable SQL behavior.
- Native disposable PostgreSQL: both save/removal orderings and commit/rollback outcomes across seven role categories, competing row creation/update and a cached read after access loss.
- Full schema: preserve all 56 inherited installer stages, 225 canonical migrations, 41 prior control drafts and seven separate drafts; install this eighth draft, compare catalogs/data/ACLs and run an authenticated rollback-only smoke test using real tables and 1,205 personal goals.
- Hosted acceptance and canonical packaging remain open until separately authorized. Local/native source proof is not production readiness.

The dedicated workflow uses fake-credential loopback database services and no GitHub environment or deployment permissions. Its scripts reject hosted connection targets. Original dated evidence certificates and historical tests remain intact.
