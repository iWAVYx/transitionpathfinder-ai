
UPDATE public.admin_audit_reviews SET
  issues_found = 'No issues found.\n• No dead buttons, no duplicate hrefs.\n• Empty/loading states present; no role-leak (no /caseload, /admin, /owner, /partner* links).\n• BridgeForward quick-link only shown when grade_band=6-8.',
  staged_items = 'Missing error UI: if reload() fails after fetchSnapshot, the loading spinner renders indefinitely (dashboard.tsx:342). Add an error state + retry card.\nBridgeForward route-level grade-band gate missing (presentational only).',
  notes = 'Route: /dashboard → StudentDashboard (src/components/dashboard/StudentDashboard.tsx).',
  last_reviewed_at = now()
WHERE role_key = 'student';

UPDATE public.admin_audit_reviews SET
  issues_found = 'No issues found in family dashboard surfaces.\n• InvitesInbox, EntitlementGate → AccessPendingCard, NextBestAction, OnboardingChecklist, Pathway, Documents, Action Items, Meeting Prep, Resources, Privacy & Consent all render with empty states.\n• No /caseload, /owner, /admin, /partner* links.\n• reload() runs on mount; mutations re-fetch.',
  staged_items = 'Same shared loader as student: no dedicated error UI when fetchSnapshot fails (dashboard.tsx:342). Add error + retry card.\nBridgeForward / Pathway quick-link gates are presentational only; route-level grade-band guard not enforced.',
  notes = 'Route: /dashboard family branch. Empty state (no students) offers demo seed + add student CTAs.',
  last_reviewed_at = now()
WHERE role_key = 'parent';

UPDATE public.admin_audit_reviews SET
  issues_found = 'No dead buttons, no duplicate hrefs, no role-leak (no /owner, /admin, /partners-manage, /district links).\n• Empty caseload renders EmptyState with "Add your first student" CTA.\n• reload() on mount and after every save/submit; toast.error on failures.',
  staged_items = 'Minor mobile polish: caseload.tsx:412 priority Select uses fixed w-[130px] at all breakpoints. Consider w-full sm:w-[130px].',
  notes = 'Route: /caseload (RoleGuard educator,admin). Cards: stats, quick links, Team Calendar, search/filter, expandable inline note + action assign.',
  last_reviewed_at = now()
WHERE role_key = 'educator';

UPDATE public.admin_audit_reviews SET
  issues_found = 'ROLE-LEAK / DEAD CTA: school.overview.tsx:67 — "Compliance & Milestones" links to /teacher-portal, but ROUTE_AUDIENCES["/teacher-portal"] excludes school_admin (role-policy.ts:53). RoleGuard will redirect any school admin that clicks it; the CTA is effectively dead.',
  staged_items = 'Decision needed: either add school_admin to /teacher-portal audience in role-policy.ts, or remove the Compliance & Milestones button from the school overview card. Recommended: remove the CTA from school.overview.tsx and surface compliance via /school/implementation, which already has the right audience.',
  notes = 'Route: /school/overview. Shell: SchoolPageShell (CreateSchoolCard renders when no org). No /owner or /district leak. Mobile responsive.',
  last_reviewed_at = now()
WHERE role_key = 'school_admin';

UPDATE public.admin_audit_reviews SET
  issues_found = 'No issues found.\n• No /owner, /admin, /caseload, /partner*, IEP, or Pathway Report surfaces leaked.\n• Stats, planning adoption progress, schools-needing-follow-up, implementation status tiles all render with empty/loading/error states.\n• CreateDistrictCard handles no-district unconnected state.',
  staged_items = 'None.',
  notes = 'Route: /district/overview. Shell: DistrictPageShell. withRoleGuard(["district_admin","admin"]).',
  last_reviewed_at = now()
WHERE role_key = 'district_admin';

UPDATE public.admin_audit_reviews SET
  issues_found = 'No private-student-data leak.\n• Partner dashboard contains no /caseload, /goals, /documents, /students, /pathway, /reports, /meetings, /insights, /analytics, /owner, /admin, /school, /district, or /bridgeforward links.\n• PartnerForward link points to public marketing page only.\n• Opportunities tab has empty/loading/error states; reload() on mount + after every mutation.',
  staged_items = 'Minor: partners-manage.tsx:97-100 catch block is silent — if workspace reload fails, user re-sees FirstRunSetup with no explanation. Add a toast.error in the catch.',
  notes = 'Route: /partners-manage. Shell: SiteShell + RoleGuard partner,admin. Cards: org header, PartnerForward link, Opportunities + Profile tabs.',
  last_reviewed_at = now()
WHERE role_key = 'partner';

UPDATE public.admin_audit_reviews SET
  issues_found = 'No duplicated School Admin or District Admin operational pages inside OwnerShell — those workspaces remain in their own shells. Legacy /admin → /owner and /admin-school → /school/overview redirects confirmed.\n• Minor duplicate href: owner.index.tsx:126 and :131 both link to /owner/resource-review ("Resources needing review" and "Broken links" cards share destination).',
  staged_items = 'Optional: have the "Broken links" card link to a filtered view of the review queue (e.g. /owner/resource-review?filter=broken) so the two cards have distinct, non-duplicate destinations.',
  notes = 'Route: /owner (beforeLoad redirects non-platform-admins). Shell: OwnerShell. 10 sections in spec all present. All owner.*.tsx pages enumerated and classified as real pages (no orphans, no overlap with school/district workspaces).',
  last_reviewed_at = now()
WHERE role_key = 'owner';
