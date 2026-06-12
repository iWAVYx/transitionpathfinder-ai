
INSERT INTO public.system_health_checks
  (key, label, category, status, priority, sort_order, pass_criteria, fail_criteria, reference, notes)
VALUES
  ('compliance.student_iep_summary_enabled',
   'Student-facing IEP summary enabled',
   'compliance', 'working', 'high', 605,
   'Students with an accessible IEP see a plain-language "My IEP" summary (MyIepSummaryCard) on their dashboard, sourced from document_summaries / extractions without exposing raw clinical text.',
   'Eligible student has no student-facing summary, or summary leaks raw evaluation data they were not granted.',
   'IDEA §300.43 (transition services); FERPA §99.5',
   'Backed by getStudentFriendlyDocumentSummary + MyIepSummaryCard.'),

  ('compliance.age_17_transfer_prompt',
   'Age-17 transfer-of-rights prompt',
   'compliance', 'working', 'high', 615,
   'Students approaching age 17 (and their team) see a Transfer-of-Rights reminder on the profile and in CtTransitionPrompts, with plain-language explanation and "not legal advice" disclaimer.',
   'Eligible student passes 17 with no transfer-of-rights prompt anywhere in the app.',
   'IDEA §300.520; CT Sec. 10-76d',
   NULL),

  ('compliance.age_18_sharing_control',
   'Age-18 sharing control (student controls disclosure)',
   'compliance', 'working', 'critical', 625,
   'At 18, the student (not the parent) is the default rights-holder; continued parent/guardian access requires an explicit consent_records row written via setRightsStatus, and partner / collaborator grants respect the student''s decision.',
   'Parent or collaborator retains active access to an 18+ student record without a recorded consent.',
   'IDEA §300.520(a); FERPA §99.5(a)',
   NULL),

  ('compliance.resource_review_system',
   'Resource review / verification system',
   'compliance', 'working', 'medium', 690,
   'Every resource carries a review_status (verified, needs_review, community_resource, potential, archived, outdated) and last_reviewed_at; archived/outdated resources are excluded from student recommendations.',
   'Stale or unverified resources surface in student recommendations with no review state.',
   'Internal trust policy; resources table review_status column',
   NULL),

  ('compliance.partner_verification_system',
   'Partner verification system',
   'compliance', 'working', 'high', 695,
   'partner_organizations carry verification_status (verified, needs_review, community_resource, potential, archived, outdated); only non-archived partners are matched; partner privacy restrictions still apply to all statuses.',
   'Unverified or archived partner appears in student-facing matches, or verification cannot be updated by admins.',
   'Internal trust policy; partner_verification_status enum',
   NULL),

  ('compliance.responsive_testing',
   'Mobile / tablet / desktop testing complete',
   'compliance', 'needs_attention', 'medium', 700,
   'Every primary workspace surface (Dashboard, Students, Pathway Report, Meetings, Calendar, Resources, Partners) has been verified on mobile (≤640px), tablet (768–1024px), and desktop (≥1280px); a11y/responsive Playwright specs cover regressions.',
   'A primary surface is broken or unusable on a supported viewport, or has no responsive regression coverage.',
   'tests/e2e/mobile-responsive.spec.ts; tests/header-responsive.test.mjs',
   NULL)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label, category = EXCLUDED.category, status = EXCLUDED.status,
  priority = EXCLUDED.priority, sort_order = EXCLUDED.sort_order,
  pass_criteria = EXCLUDED.pass_criteria, fail_criteria = EXCLUDED.fail_criteria,
  reference = EXCLUDED.reference, notes = EXCLUDED.notes, updated_at = now();

INSERT INTO public.system_health_checks
  (key, label, category, status, priority, sort_order, backend_table, pass_criteria, fail_criteria, notes)
VALUES
  ('student_saved_partners',
   'Partner saving (student-saved partners)',
   'feature', 'working', 'medium', 470, 'student_saved_partners',
   'A signed-in user can save a partner from RecommendedPartnersPanel; the row is scoped per student via can_access_student and visible on the profile.',
   'Save action errors, or a saved partner is visible to a user outside the student team.',
   'Backed by student_saved_partners table + matching server functions.')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label, category = EXCLUDED.category, status = EXCLUDED.status,
  priority = EXCLUDED.priority, sort_order = EXCLUDED.sort_order,
  backend_table = EXCLUDED.backend_table,
  pass_criteria = EXCLUDED.pass_criteria, fail_criteria = EXCLUDED.fail_criteria,
  notes = EXCLUDED.notes, updated_at = now();
