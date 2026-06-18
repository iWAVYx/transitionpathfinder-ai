
ALTER TABLE public.admin_audit_reviews
  ADD COLUMN IF NOT EXISTS readiness text NOT NULL DEFAULT 'needs_review';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_audit_reviews_readiness_check'
  ) THEN
    ALTER TABLE public.admin_audit_reviews
      ADD CONSTRAINT admin_audit_reviews_readiness_check
      CHECK (readiness IN ('ready','needs_review','staged','blocked'));
  END IF;
END$$;

UPDATE public.admin_audit_reviews SET
  issues_found = 'Verified second pass — no role-leak (no /caseload, /admin, /owner, /partners-manage, /school, /district links from /dashboard student branch). Empty + loading states present. Cards limited to Student Voice, Pathway, Documents, Meeting Prep, Action Items, Resources, Opportunities, Invites.',
  issues_fixed = 'dashboard.tsx now renders a dedicated error card (AlertCircle + Try again button) when fetchSnapshot fails — previously stuck spinner. Verified at src/routes/_authenticated/dashboard.tsx lines 167 and 346–354.',
  staged_items = 'BridgeForward / TransitionForward gating is presentational (driven by grade_band on the snapshot). ROUTE_AUDIENCES on /bridgeforward/* still permits family/educator/student/admin regardless of grade — staged for a follow-up that enforces the grade band at the route guard layer. Polished "Coming for your grade band" message already shown in nav.',
  notes = 'Route: /dashboard → StudentDashboard. Verified mobile (375), tablet (820), desktop (1366). Saved actions: action_items + saved_resources reload after mutation and persist after refresh.',
  readiness = 'ready',
  last_reviewed_at = now()
WHERE role_key = 'student';

UPDATE public.admin_audit_reviews SET
  issues_found = 'Verified second pass — family branch of /dashboard shows InvitesInbox, EntitlementGate → AccessPendingCard, NextBestAction, OnboardingChecklist, Pathway, Documents, Action Items, Meeting Prep, Resources, Privacy & Consent. No /caseload, /owner, /admin, /partners-manage, /school, /district links.',
  issues_fixed = 'Same fix as student covers parent (shared loader): error UI + Try again button when fetchSnapshot fails.',
  staged_items = 'BridgeForward / TransitionForward grade-band gating is presentational only — same follow-up as student. Polished message already in place.',
  notes = 'Route: /dashboard family branch. Empty state (no connected students) offers demo seed + add student CTAs. Saved actions persist after refresh.',
  readiness = 'ready',
  last_reviewed_at = now()
WHERE role_key = 'parent';

UPDATE public.admin_audit_reviews SET
  issues_found = 'Verified second pass — /caseload shows caseload stats, Team Calendar, quick links to Meeting Prep / Documents / Pathway, inline note + action assignment. No /owner, /admin, /partners-manage, /district leaks. Empty caseload renders "Add your first student" CTA.',
  issues_fixed = 'caseload.tsx priority Select now responsive: SelectTrigger uses className="w-full sm:w-[130px]" (line 412). Verified at 375, 820, and 1366 viewports.',
  staged_items = 'None.',
  notes = 'Route: /caseload (RoleGuard educator,admin). reload() runs on mount and after every save/submit; toast.error on failures. Saved actions persist after refresh.',
  readiness = 'ready',
  last_reviewed_at = now()
WHERE role_key = 'educator';

UPDATE public.admin_audit_reviews SET
  issues_found = 'Verified second pass — School Overview renders SchoolPageShell cards: Team, Reports, Implementation. No Platform Admin owner controls. No /owner, /admin, /district, /partners-manage, /caseload links.',
  issues_fixed = 'school.overview.tsx Compliance & Milestones CTA re-pointed from /teacher-portal (forbidden audience → dead CTA) to /school/reports. Verified at lines 64 and 67.',
  staged_items = 'None.',
  notes = 'Route: /school/overview. Shell: SchoolPageShell. CreateSchoolCard renders when org not connected. Mobile responsive.',
  readiness = 'ready',
  last_reviewed_at = now()
WHERE role_key = 'school_admin';

UPDATE public.admin_audit_reviews SET
  issues_found = 'Verified second pass — District Overview renders stats, planning adoption progress, schools-needing-follow-up, implementation tiles. No Platform Admin controls. No /owner, /admin, /caseload, /partners-manage, IEP, or Pathway Report leaks.',
  issues_fixed = 'No fixes required this pass.',
  staged_items = 'None.',
  notes = 'Route: /district/overview. Shell: DistrictPageShell. withRoleGuard(["district_admin","admin"]). CreateDistrictCard handles unconnected state.',
  readiness = 'ready',
  last_reviewed_at = now()
WHERE role_key = 'district_admin';

UPDATE public.admin_audit_reviews SET
  issues_found = 'Verified second pass — /partners-manage contains only partner-scoped surfaces: org header, PartnerForward link (public marketing only), Opportunities + Profile tabs. No links to /caseload, /goals, /documents, /students, /pathway, /reports, /meetings, /insights, /analytics, /owner, /admin, /school, /district, or /bridgeforward. Confirmed against ROUTE_AUDIENCES partner forbidden list.',
  issues_fixed = 'partners-manage.tsx reload() catch block now surfaces toast.error (line 98) — previously silent failure left user staring at FirstRunSetup with no explanation.',
  staged_items = 'None.',
  notes = 'Route: /partners-manage. Shell: SiteShell + RoleGuard partner,admin. PartnerForward incentives surfaced as outbound link, not embedded admin tools.',
  readiness = 'ready',
  last_reviewed_at = now()
WHERE role_key = 'partner';

UPDATE public.admin_audit_reviews SET
  issues_found = 'Verified second pass — /owner enforces beforeLoad redirect for non-platform-admins. OwnerShell sections cover Access, Orgs, Students, Content, Partners, BridgeForward Source Manager, PartnerForward Resource Manager, Product Operations, Launch & Pilot Readiness (now includes Role Dashboard Audit), Feedback & Bugs, System Health. School Admin and District Admin operational pages are NOT duplicated inside OwnerShell — they remain in their own shells. Legacy /admin → /owner and /admin-school → /school/overview redirects confirmed.',
  issues_fixed = 'No code fixes this pass — duplicate /owner/resource-review href on owner.index.tsx lines 126 and 131 reviewed and intentionally retained: the two cards show distinct metrics (review queue total vs broken links) even though they share the destination route. Decision documented under staged_items.',
  staged_items = 'Optional polish: route the Broken links card to a filtered review queue (e.g. /owner/resource-review?filter=broken) so the two cards have distinct destinations. Low priority — both cards currently land users on the correct page.',
  notes = 'Route: /owner. Shell: OwnerShell. All owner.*.tsx pages enumerated and classified as real pages (no orphans, no overlap with school/district workspaces).',
  readiness = 'ready',
  last_reviewed_at = now()
WHERE role_key = 'owner';
