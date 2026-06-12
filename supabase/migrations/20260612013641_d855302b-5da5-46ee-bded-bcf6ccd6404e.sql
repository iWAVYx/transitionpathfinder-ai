
-- Add document metadata columns to match the documented upload flow.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS annual_review_date date,
  ADD COLUMN IF NOT EXISTS reevaluation_date date,
  ADD COLUMN IF NOT EXISTS source text;

-- Record QA audit results in the platform-admin health checklist.
INSERT INTO public.system_health_checks
  (key, label, category, status, route, backend_table, priority, sort_order,
   notes, action_needed, pass_criteria, fail_criteria, reference)
VALUES
  ('docs_qa_upload_surfaces', 'Document upload — entry-point coverage', 'document_qa',
   'needs_attention', '/students/$studentId', 'documents', 'medium', 810,
   'FamilyDocumentUpload is only mounted on the student profile (Documents section). Onboarding, parent dashboard, educator/case-manager dashboard, Pathway Report setup, and Meeting Prep route to the profile via NextBestAction/JourneyStrip instead of embedding the uploader inline.',
   'Confirm cross-link CTAs land on the Documents section on the student profile. If a true inline uploader is desired in any of those surfaces, mount <FamilyDocumentUpload/> with the correct studentId.',
   'All listed surfaces have a visible CTA that reaches an upload form scoped to the correct student.',
   'A user lands on a dashboard/wizard with no clear "upload IEP" action.',
   'src/components/students/FamilyDocumentUpload.tsx'),

  ('docs_qa_doc_types', 'Document types — full taxonomy', 'document_qa',
   'working', '/students/$studentId', 'documents', 'medium', 811,
   'Expanded doc_type taxonomy in Zod validator and UI: current-iep, previous-iep, transition-plan, evaluation, progress-report, meeting-notes, other. Legacy "iep" is preserved as an alias for backward compatibility.',
   NULL,
   'Upload form lists all 7 categories; legacy rows still load.',
   'Old IEP rows fail to render or required types are missing.',
   'src/components/students/FamilyDocumentUpload.tsx + src/lib/documents.functions.ts'),

  ('docs_qa_metadata', 'Document metadata — required fields', 'document_qa',
   'working', '/students/$studentId', 'documents', 'medium', 812,
   'Added notes, annual_review_date, reevaluation_date, source columns. Combined with existing title/school_year/meeting_date/effective_date/review_date/visibility/consent_acknowledged_at/uploaded_by — full set per spec.',
   NULL,
   'All metadata fields persist via registerDocument and surface on the file row.',
   'A user reports a metadata field cannot be captured.',
   'documents table'),

  ('docs_qa_role_access', 'Document access — role boundaries', 'document_qa',
   'working', NULL, 'document_permissions', 'high', 813,
   'can_view_document() security-definer enforces student-team baseline + document_permissions grants. Partners excluded by DocumentPermissionsDialog warning and by RLS scope (partner role does not satisfy can_access_student). Student rights-transfer flow auto-grants view_document on own IEPs (rights.functions.ts).',
   NULL,
   'tests/documents-rls.test.mjs + tests/iep-upload-signed-url.test.mjs continue to pass.',
   'A role can read a document outside their lane in the RLS matrix snapshot.',
   'supabase migrations + tests/__snapshots__/documents-rls-policies.snap.json'),

  ('docs_qa_audit_trail', 'Document access — audit logging', 'document_qa',
   'working', NULL, 'audit_log', 'high', 814,
   'audit_log captures: document.upload, document.signed_url.mint, document.signed_url.denied, document.permission.grant, document.permission.revoke. iep_access_alerts captures revoked-access signed-URL attempts. AuditTrailPanel renders per-student timeline.',
   NULL,
   'Every signed-URL mint and permission change appears in AuditTrailPanel within seconds.',
   'A sensitive action is taken without a corresponding audit_log row.',
   'src/lib/documents.functions.ts + src/components/students/AuditTrailPanel.tsx')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  route = EXCLUDED.route,
  backend_table = EXCLUDED.backend_table,
  priority = EXCLUDED.priority,
  sort_order = EXCLUDED.sort_order,
  notes = EXCLUDED.notes,
  action_needed = EXCLUDED.action_needed,
  pass_criteria = EXCLUDED.pass_criteria,
  fail_criteria = EXCLUDED.fail_criteria,
  reference = EXCLUDED.reference,
  updated_at = now();
