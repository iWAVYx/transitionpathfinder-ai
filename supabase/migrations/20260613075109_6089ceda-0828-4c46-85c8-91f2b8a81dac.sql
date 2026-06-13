
-- 1. Revoke contact_email column from authenticated for partner tables
REVOKE SELECT (contact_email) ON public.partner_organizations FROM authenticated;
REVOKE SELECT (contact_email) ON public.partner_network_opportunities FROM authenticated;
-- Re-grant all other columns explicitly is not needed; table-level SELECT remains, column REVOKE applies to that specific column.

-- 2. Tighten document_extractions UPDATE to editors only
DROP POLICY IF EXISTS extractions_update_via_student ON public.document_extractions;
CREATE POLICY extractions_update_via_student ON public.document_extractions
  FOR UPDATE
  USING (can_edit_student(auth.uid(), student_id))
  WITH CHECK (can_edit_student(auth.uid(), student_id));

-- 3. Scope pathway_report_versions to current student access
DROP POLICY IF EXISTS "Owners view report versions" ON public.pathway_report_versions;
DROP POLICY IF EXISTS "Owners insert report versions" ON public.pathway_report_versions;

CREATE POLICY "Owners view report versions" ON public.pathway_report_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pathway_reports r
      WHERE r.id = pathway_report_versions.report_id
        AND r.user_id = auth.uid()
        AND (r.student_id IS NULL OR can_access_student(auth.uid(), r.student_id))
    )
  );

CREATE POLICY "Owners insert report versions" ON public.pathway_report_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pathway_reports r
      WHERE r.id = pathway_report_versions.report_id
        AND r.user_id = auth.uid()
        AND (r.student_id IS NULL OR can_access_student(auth.uid(), r.student_id))
    )
  );
