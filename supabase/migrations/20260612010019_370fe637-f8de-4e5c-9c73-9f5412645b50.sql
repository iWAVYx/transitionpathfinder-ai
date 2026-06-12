
ALTER TABLE public.system_health_checks
  ADD COLUMN IF NOT EXISTS pass_criteria text,
  ADD COLUMN IF NOT EXISTS fail_criteria text,
  ADD COLUMN IF NOT EXISTS reference text;

-- Backfill criteria for existing compliance items
UPDATE public.system_health_checks SET
  pass_criteria = 'Students with rights_transferred_to_student see a "My Plan" summary card on their dashboard and can open student-friendly summaries of their own IEPs without escalating to view_document.',
  fail_criteria = 'Post-18 student cannot see their own plan, or sees raw document contents they were not explicitly granted.',
  reference = 'IDEA §300.520 (transfer of rights); FERPA §99.5 (rights transfer at 18)'
WHERE key = 'compliance.student_access_enabled';

UPDATE public.system_health_checks SET
  pass_criteria = 'Parent/guardian collaborators can be added, edited, and removed per student; access is scoped via student_collaborators; post-18 parent access requires an explicit consent_record.',
  fail_criteria = 'Any path that grants a parent access without a student_collaborators row, or post-18 parent retains access without a recorded consent.',
  reference = 'FERPA §99.5(b); 34 CFR §300.625'
WHERE key = 'compliance.parent_access_controls';

UPDATE public.system_health_checks SET
  pass_criteria = 'Rights Status Card appears on every student profile, age-17 reminder fires, and every status change writes a rights_transfer_status row plus an audit_log entry.',
  fail_criteria = 'Status changes do not persist, no history row is written, or the age-17 prompt is missing for eligible students.',
  reference = 'IDEA §300.520; CT Bureau of Special Education Transition Bulletin'
WHERE key = 'compliance.transfer_of_rights_tracked';

UPDATE public.system_health_checks SET
  pass_criteria = 'user_roles enforces role separation; has_role() is the only path used in RLS; no UPDATE grant on user_roles for authenticated; admin actions are gated by admin_roles or has_role(_,''admin'').',
  fail_criteria = 'Any RLS policy reads a role column off profiles/students, or any non-admin can write to user_roles.',
  reference = 'FERPA §99.31 (school officials with legitimate educational interest)'
WHERE key = 'compliance.role_permissions_reviewed';

UPDATE public.system_health_checks SET
  pass_criteria = 'DocumentPermissionsDialog enforces audience-aware levels, partner audience is hard-blocked on IEP/Transition Plan, and every grant/revoke writes to document_permissions + audit_log.',
  fail_criteria = 'Partner can be granted any access to an IEP/Transition Plan, or a permission change is not auditable.',
  reference = 'FERPA §99.30 (consent for disclosure); §99.32 (disclosure record)'
WHERE key = 'compliance.document_permissions_reviewed';

UPDATE public.system_health_checks SET
  pass_criteria = 'Partner organizations cannot view PII outside opportunity-matched, redacted student data; partner audience is disabled in the dialog for IEP/Transition Plan; regression covers the partner read path.',
  fail_criteria = 'A partner role can read student name, DOB, IEP contents, or contact info outside an explicit, time-bounded match.',
  reference = 'FERPA §99.31(a)(1); CT Sec. 10-15b'
WHERE key = 'compliance.partner_privacy_restrictions';

UPDATE public.system_health_checks SET
  pass_criteria = 'All AI-generated summaries and pathway reports show the centralized AI_REVIEW disclaimer from lib/legal-copy.ts; copy is consistent across surfaces.',
  fail_criteria = 'Any AI output is rendered without the disclaimer, or older inline disclaimer copy is still in use.',
  reference = 'Internal policy; aligns with US Dept of Ed AI guidance (2023)'
WHERE key = 'compliance.ai_disclaimer_active';

UPDATE public.system_health_checks SET
  pass_criteria = 'Document upload UI shows the PRIVACY_UPLOAD disclaimer before submission and records implicit acknowledgment in audit_log on first upload per student.',
  fail_criteria = 'Upload can complete with no consent text visible, or no audit trail of first-upload acknowledgment.',
  reference = 'FERPA §99.30; CT Sec. 10-15b'
WHERE key = 'compliance.upload_consent_active';

UPDATE public.system_health_checks SET
  pass_criteria = 'AuditTrailPanel renders on every student profile and shows permission, status, and disclosure events; audit_log entries are immutable for authenticated users.',
  fail_criteria = 'Permission or status change has no audit_log row, or non-admin can update/delete audit_log rows.',
  reference = 'FERPA §99.32 (record of disclosures); 34 CFR §300.614'
WHERE key = 'compliance.audit_logs_active';

UPDATE public.system_health_checks SET
  pass_criteria = 'CtTransitionPrompts surfaces age-banded reminders (14, 16, 17, 18+) on the student profile keyed off date_of_birth; copy cites CT timing.',
  fail_criteria = 'Age-eligible student sees no prompt, or prompt fires for a non-CT-aligned age band.',
  reference = 'CT Bureau of Special Education Transition Bulletin; IDEA §300.320(b)'
WHERE key = 'compliance.ct_age_prompts_active';

UPDATE public.system_health_checks SET
  pass_criteria = 'Every Pathway Report (including versioned exports) renders the PATHWAY_REPORT disclaimer header and footer; PDF/print includes the same copy.',
  fail_criteria = 'Any report version is shareable without the disclaimer on screen or in print.',
  reference = 'Internal policy; FERPA §99.31 disclosure framing'
WHERE key = 'compliance.pathway_report_disclaimer';

UPDATE public.system_health_checks SET
  pass_criteria = 'Sharing surfaces (share tokens, collaborators, document permissions) all flow through consent_records when scope crosses households or organizations; revocation immediately invalidates active tokens.',
  fail_criteria = 'A share token, collaborator, or permission remains active after the underlying consent_record is revoked.',
  reference = 'FERPA §99.30; 34 CFR §300.622'
WHERE key = 'compliance.data_sharing_settings_active';

-- Insert 6 additional IDEA/FERPA/transition-specific items
INSERT INTO public.system_health_checks
  (key, label, category, status, priority, sort_order, pass_criteria, fail_criteria, reference)
VALUES
  ('compliance.pwn_reminders',
   'Prior Written Notice (PWN) reminders',
   'compliance', 'coming_soon', 'high', 630,
   'When a user records a change to placement, services, or eligibility on a student, the UI surfaces a PWN reminder and a link to draft / attach the notice; reminder is logged.',
   'Eligibility/placement/service change can be recorded with no PWN prompt or audit entry.',
   'IDEA §300.503; 34 CFR §300.503(a)'),
  ('compliance.ferpa_disclosure_log',
   'FERPA disclosure log (record of disclosures)',
   'compliance', 'coming_soon', 'critical', 640,
   'Every disclosure of education records to a third party (partner, district, external collaborator) is recorded with party, date, purpose, and scope; viewable from the student profile and exportable on request.',
   'A disclosure occurs (share token used, partner match accepted, external export) with no row in the disclosure log.',
   'FERPA §99.32; 34 CFR §99.32(a)'),
  ('compliance.annual_ferpa_notice',
   'Annual FERPA notification to families',
   'compliance', 'coming_soon', 'high', 650,
   'Active families see an annual FERPA notice (rights to inspect, amend, consent to disclose, file a complaint) at first login each school year; acknowledgment is recorded.',
   'No annual notice surfaced, or notice shown without acknowledgment capture.',
   'FERPA §99.7; 34 CFR §99.7'),
  ('compliance.evaluation_consent_tracked',
   'Evaluation / reevaluation consent tracked',
   'compliance', 'coming_soon', 'high', 660,
   'Consent for evaluation and reevaluation is captured as a consent_record with type=evaluation, signer, date, and scope; revocation supported.',
   'Evaluation workflow proceeds without a stored consent_record, or revocation is not honored.',
   'IDEA §300.300; 34 CFR §300.300(a)–(c)'),
  ('compliance.surrogate_parent_support',
   'Surrogate parent / educational decision-maker',
   'compliance', 'coming_soon', 'medium', 670,
   'A student can have a designated surrogate parent / educational rights holder distinct from biological parents; that role inherits parent permissions and is reflected in the Rights Status Card.',
   'No way to designate a surrogate decision-maker, or surrogate cannot exercise parent-level rights.',
   'IDEA §300.519; CT Sec. 10-94f'),
  ('compliance.native_language_access',
   'Native-language access for families',
   'compliance', 'coming_soon', 'medium', 680,
   'Key family-facing surfaces (consent prompts, FERPA notice, PWN reminders, IEP summaries) are available in Spanish at minimum, with a per-user language preference stored in profiles.',
   'Family-facing legal copy ships English-only with no translation path or preference toggle.',
   'IDEA §300.9 (consent in native language); FERPA §99.7(b)(2)')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  category = EXCLUDED.category,
  priority = EXCLUDED.priority,
  sort_order = EXCLUDED.sort_order,
  pass_criteria = EXCLUDED.pass_criteria,
  fail_criteria = EXCLUDED.fail_criteria,
  reference = EXCLUDED.reference;
