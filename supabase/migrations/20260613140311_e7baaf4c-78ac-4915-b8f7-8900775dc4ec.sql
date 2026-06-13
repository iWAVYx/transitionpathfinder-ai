
-- 1. Column-level REVOKE on PII
REVOKE SELECT (contact_email, phone) ON public.partner_organizations FROM anon, authenticated;
REVOKE SELECT (contact_email)        ON public.partner_network_opportunities FROM anon, authenticated;
REVOKE SELECT (contact_email)        ON public.organizations FROM anon, authenticated;

-- 2. Re-scope document_extractions update policy from {public} role to {authenticated}
DROP POLICY IF EXISTS extractions_update_via_student ON public.document_extractions;
CREATE POLICY extractions_update_via_student
  ON public.document_extractions
  FOR UPDATE
  TO authenticated
  USING (can_edit_student(auth.uid(), student_id))
  WITH CHECK (can_edit_student(auth.uid(), student_id));

-- 3. Re-scope pathway_report_versions policies to {authenticated}
DROP POLICY IF EXISTS "Owners view report versions"   ON public.pathway_report_versions;
DROP POLICY IF EXISTS "Owners insert report versions" ON public.pathway_report_versions;

CREATE POLICY "Owners view report versions"
  ON public.pathway_report_versions
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pathway_reports r
    WHERE r.id = pathway_report_versions.report_id
      AND r.user_id = auth.uid()
      AND (r.student_id IS NULL OR can_access_student(auth.uid(), r.student_id))
  ));

CREATE POLICY "Owners insert report versions"
  ON public.pathway_report_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pathway_reports r
    WHERE r.id = pathway_report_versions.report_id
      AND r.user_id = auth.uid()
      AND (r.student_id IS NULL OR can_access_student(auth.uid(), r.student_id))
  ));
