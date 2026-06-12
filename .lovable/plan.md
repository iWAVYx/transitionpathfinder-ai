## TransitionForward — Account, Access, and Entitlement Architecture

This is a large, cross-cutting pass touching schema, server functions, signup, onboarding, dashboards, and a Platform Admin console. I want to align on scope and sequencing before I write any code, because several pieces (`organizations`, `organization_memberships`, `waitlist`, `admin_invitations`, `profiles`, `student_collaborators`, `user_roles`) already exist and need to be **adapted**, not duplicated.

### Guiding principles

- **Adapt existing tables** rather than create parallel ones. Same row, more columns.
- **Roles stay in `user_roles`** (never on `profiles`) — per project security memory.
- **Access = role + org membership + student relationship + active entitlement + consent**, evaluated by SECURITY DEFINER functions. RLS continues to enforce per-student scoping via `can_access_student` / `can_edit_student`.
- **Partner accounts are hard-walled** out of student PII at the policy layer, not just the UI.
- **Compliance copy**: planning/organization/preparation language only — never legal/IEP authority claims.
- No disruption to current navigation, dashboards, branding, Resource Library, Partner Network, Pathway Report, Calendar.

---

### Phase 1 — Schema migration (one migration, reviewed before run)

Adapt existing tables:

- `organizations`: add `status` (`waitlist|pilot|active|inactive|archived`), `billing_plan`, `billing_owner_user_id`. Extend `type` check to include `family` and `platform_internal`. Keep `parent_organization_id` for school→district.
- `profiles`: add `account_status` (`waitlist|invited|active|demo|suspended`), `selected_plan`. Keep `primary_role`, `organization_id`, `is_demo`.
- `organization_memberships`: add `membership_status` (`pending|active|suspended|removed`), `invited_by`. Keep existing `role_within_org`, `status`.
- `waitlist`: add `requested_role`, `organization_name`, `organization_type`, `district_name`, `school_name`, `student_connection_interest`, `intended_use`, `referral_source`. (Existing `role`, `organization`, `reason` become aliases / backfilled.)
- `admin_invitations` → repurpose into a **general `invitations`** table by adding `invited_role` (text), `organization_id`, `student_profile_id`, `invitation_type` (`connect_to_student|join_school|join_district|join_partner_org|platform_admin_invite`), `status`. Keep the existing platform-admin flow working.

New tables:

- `student_relationships` — `student_id`, `related_user_id`, `relationship_type`, `permission_level`, `consent_status`. Complements `student_collaborators` (which stays for editor/viewer doc access). This one models the **human relationship + consent**, not document ACLs.
- `access_entitlements` — `organization_id`, `plan_type`, `status`, `starts_at`, `ends_at`, `max_schools|students|staff`, `grants_family_access`, `grants_student_access`, `grants_partner_access`.

Helper functions (SECURITY DEFINER):

- `has_active_entitlement(_org_id, _kind)`
- `effective_entitlement_for_user(_user_id)` — walks user → memberships → org → parent district → entitlement.
- `user_has_feature(_user_id, _feature)` — used by UI and RLS.
- Update `can_access_student` / `can_edit_student` to also accept active `student_relationships` rows with appropriate `permission_level` and `consent_status='approved'`.

GRANTs and RLS on every new/changed table per project conventions. No `UPDATE` on `user_roles` (privilege-escalation rule). No broad `TO anon` on PII.

---

### Phase 2 — Server functions (`createServerFn`, `requireSupabaseAuth`)

Grouped files under `src/lib/`:

- `signup.functions.ts` — `submitWaitlist` (extend existing), `startSignup`, `chooseRole`, `completeBasicInfo`.
- `invitations.functions.ts` — `createInvitation`, `acceptInvitation`, `revokeInvitation`, `listMyInvitations`.
- `organizations.functions.ts` — `searchSchools`, `searchDistricts`, `requestOrgAccess`, `approveOrgMembership`.
- `relationships.functions.ts` — `requestStudentConnection`, `respondToConnectionRequest`, `setConsent`.
- `entitlements.functions.ts` — `getMyEntitlement`, `listOrgEntitlements`, `setEntitlement` (admin), `cascadeDistrictAccess`.
- `admin/waitlist.functions.ts` — list/filter, convert to invitation, archive.
- `admin/organizations.functions.ts` — CRUD + status transitions.
- `admin/subscriptions.functions.ts` — entitlement management.

Every privileged fn double-checks `is_platform_admin` or `has_role` after `requireSupabaseAuth`.

---

### Phase 3 — Frontend flows

- `/signup` (or extend `/onboarding`): role selector → basic info → role-specific questions → resolution screen (self-serve / waitlist / request-access / accept-invitation).
- Role-specific connection screens: student↔parent, student↔educator, educator↔school, admin↔district, partner org.
- `/invite/$token` acceptance screen (generalize existing `/admin-invite/$token`).
- "Access pending", "Included through your district", "Available through family early access" staged dashboard states — drop-in components, no broken buttons.
- Reusable components: `<RoleSelector>`, `<SchoolDistrictPicker>`, `<StudentConnectionStep>`, `<AccessPendingCard>`, `<EntitlementBadge>`.

Platform Admin console under `/owner`:

- Waitlist manager (filter, convert→invitation, notes — partly exists, extended)
- Invitation manager
- Organization manager (districts, schools, hierarchy, status)
- Subscription / entitlement manager
- Role approval queue
- System status (reuse existing SystemHealthChecklist)

---

### Phase 4 — Access gating & dashboard adapters

- `useEntitlement()` hook reads `getMyEntitlement` and exposes `{ plan, features, isPilot, isWaitlist, viaDistrict }`.
- Update `RoleGuard` to also consider entitlement, not just role.
- Each role dashboard renders a staged empty state when no active entitlement (no broken CTAs).
- Partner dashboards explicitly hide any student-scoped widgets; corresponding RLS denies them regardless.

---

### Phase 5 — Verification

Server-side test scripts under `tests/`:

1. Student signs up → invites parent + educator → rows land in `invitations` + `student_relationships(pending)`.
2. Parent signs up → connects to student → consent gated.
3. Educator requests school access → pending membership → admin approves.
4. District admin creates/connects schools → child org rows.
5. Platform admin converts waitlist → invitation → accepted → active profile.
6. District `access_entitlements` row cascades to school members via `effective_entitlement_for_user`.
7. Partner role cannot SELECT `students`, `documents`, or `pathway_reports` (RLS matrix test).
8. Refresh persistence (already covered by existing persistence-smoke harness; extend).
9. Empty/loading/success/error snapshot on each dashboard.

---

### Questions before I start

1. **Scope of this single turn.** This is realistically 4–6 turns of work. Do you want me to ship it in phases (Phase 1 schema first, then return for approval; then Phase 2; etc.), or one big push with the migration up front and frontend in the same turn?
2. **Schema reuse.** OK to extend `admin_invitations` into the general `invitations` table (additive columns + new type values), rather than creating a second table? Same question for keeping `student_collaborators` (doc ACL) alongside new `student_relationships` (human/consent).
3. **Billing.** Should `access_entitlements` be wired now as a data-only model (no payment provider, admin sets rows manually for pilots), or do you want Stripe/Paddle hooked up in this pass too?
4. **Partner data wall.** Confirm partners get **zero** read access to `students`, `documents`, `pathway_reports`, `goals`, `meetings`, even when a student "saves" their opportunity (currently `student_saved_partners` exists). I'll harden RLS to match.

Once you answer, I'll start with the Phase 1 migration.