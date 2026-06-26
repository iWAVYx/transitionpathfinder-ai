
REVOKE SELECT (contact_email) ON public.partner_network_opportunities FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Owners view report versions" ON public.pathway_report_versions;
DROP POLICY IF EXISTS "Owners insert report versions" ON public.pathway_report_versions;

CREATE POLICY "Team can view report versions"
ON public.pathway_report_versions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pathway_reports r
    WHERE r.id = pathway_report_versions.report_id
      AND (
        (r.user_id = auth.uid() AND (r.student_id IS NULL OR public.can_access_student(auth.uid(), r.student_id)))
        OR (r.student_id IS NOT NULL AND public.can_access_student(auth.uid(), r.student_id))
      )
  )
);

CREATE POLICY "Team can insert report versions"
ON public.pathway_report_versions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pathway_reports r
    WHERE r.id = pathway_report_versions.report_id
      AND (
        (r.user_id = auth.uid() AND (r.student_id IS NULL OR public.can_access_student(auth.uid(), r.student_id)))
        OR (r.student_id IS NOT NULL AND public.can_edit_student(auth.uid(), r.student_id))
      )
  )
);

REVOKE EXECUTE ON FUNCTION public.can_access_student(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_student(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_document(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.collaborator_role_for(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.collaborator_student_for(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.effective_entitlement_for_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_invitation_share_token(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_entitlement(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_admin_role(uuid, public.admin_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_audience(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_recent_admin_doc_access(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_hub_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_partner_only(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.storage_can_read_student_doc(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_has_feature(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_peer_profile(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_partner_network_opportunity_contact_email(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resolve_admin_invitation(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_admin_if_unclaimed() FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.resolve_share_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.track_share_view(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_unsubscribe_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_invitation_by_token(text) FROM PUBLIC;
