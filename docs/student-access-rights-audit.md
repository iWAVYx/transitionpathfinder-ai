# Student Access & Transfer-of-Rights Audit

Scope: confirm students are never excluded from their own transition planning,
and that rights-status + age-band prompts are wired end-to-end. No redesign.

## Student-facing access

| Surface | Component / Route | Status |
| --- | --- | --- |
| Student-friendly IEP summary | `MyIepSummaryCard` on `StudentDashboard`; `getStudentFriendlyDocumentSummary` filters to plain-language sections | ✅ working |
| Transition goals | `StudentDashboard` "Your goals" section + `/goals` route | ✅ working |
| Accommodations & supports (plain language) | `student-access.functions.ts` `STUDENT_SECTIONS` includes `supports`, `communication`, `transportation` | ✅ working |
| Student Voice responses | `StudentVoicePanel` on student profile; RLS via `can_access_student` | ✅ working |
| Student-facing Pathway Report | `StudentDashboard` "Your pathway report" links to `/reports/$reportId` | ✅ working |
| Action items | `StudentDashboard` "Things you can do" (assignee-filtered) | ✅ working |
| Meeting prep written for student | `/ppt-prep` reachable from profile; visible to any user with `can_access_student` | ✅ working |
| Calendar tied to pathway | `DashboardCalendar studentId=…` on `StudentDashboard` | ✅ working |
| Resources saved for/by student | `saved_resources` table, accessible via `/resources` | ✅ working |

## Rights status field

`students.rights_status` (migration `20260612004324`) with CHECK constraint covering
all seven values:

- `under_18_parent_rights_active`
- `approaching_transfer_of_rights`
- `rights_transferred_to_student`
- `student_shared_decision_making`
- `parent_guardian_authorized_by_student`
- `legal_representative_or_conservator`
- `unknown_needs_review`

UI: `RightsStatusCard` on the student profile (`students.$studentId.tsx`).
Server: `getRightsStatus` / `setRightsStatus` in `src/lib/rights.functions.ts`.
On transfer of rights, the student is auto-granted `view_document` on their
own IEP/transition documents. ✅

## Age-based prompts

`src/lib/transition-age.ts` + `CtTransitionPrompts` render the correct band:

| Band | Trigger | Copy |
| --- | --- | --- |
| `early` | <14 | "Start early transition exploration" |
| `age_14` | 14–15 | "Transition planning is active" (annual review) |
| `age_16` | 16 | "Strengthen work-based learning and self-advocacy" |
| `age_17` | 17 | "Prepare for transfer of rights" |
| `age_18_plus` | 18+ | "Student controls sharing" |
| `exit_year` | exit/post-secondary grade band | "Focus on final transition steps" |

Mounted on student profile alongside `RightsStatusCard`. ✅

## Transfer-of-rights reminder around age 17

`transitionBand` returns `age_17` at age 17 → `CtTransitionPrompts` renders the
"Prepare for transfer of rights" reminder. The body explicitly notes CT
defaults plus decision-making options (supported decision-making, continued
parent/guardian involvement with consent) without giving legal advice. The
shared `NOT_LEGAL_ADVICE` string in `src/lib/legal-copy.ts` is the single
source of truth for the disclaimer language. ✅

## Permission posture

- Students reach all of the above through routes gated by `can_access_student`
  (RLS) — owner, accepted collaborator, or platform admin.
- Plain-language summary deliberately excludes family/educator-private fields
  (see `STUDENT_SECTIONS` in `student-access.functions.ts`).
- Rights changes write an `audit_log` row and, where applicable, a
  `consent_records` entry capturing the basis.

## Needs attention

- None blocking. Student-Voice + meeting-prep + saved-resources surfaces live
  on the profile / dedicated routes rather than the student dashboard; the
  user explicitly asked not to redesign, so leaving as-is.
