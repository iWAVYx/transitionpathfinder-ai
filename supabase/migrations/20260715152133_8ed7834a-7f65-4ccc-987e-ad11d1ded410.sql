
-- 1) share_tokens: require ownership/access of referenced report
DROP POLICY IF EXISTS "Owners create share tokens" ON public.share_tokens;
CREATE POLICY "Owners create share tokens"
ON public.share_tokens
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.pathway_reports r
    WHERE r.id = report_id
      AND (
        r.user_id = auth.uid()
        OR (r.student_id IS NOT NULL AND public.can_access_student(auth.uid(), r.student_id))
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

-- 2) next_actions: require access to referenced student/organization
DROP POLICY IF EXISTS "Users insert own next actions" ON public.next_actions;
CREATE POLICY "Users insert own next actions"
ON public.next_actions
FOR INSERT
TO authenticated
WITH CHECK (
  owner_user_id = auth.uid()
  AND (student_id IS NULL OR public.can_edit_student(auth.uid(), student_id))
  AND (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))
);

DROP POLICY IF EXISTS "Users update own next actions" ON public.next_actions;
CREATE POLICY "Users update own next actions"
ON public.next_actions
FOR UPDATE
TO authenticated
USING (
  (owner_user_id = auth.uid())
  OR (student_id IS NOT NULL AND public.can_edit_student(auth.uid(), student_id))
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (
    (owner_user_id = auth.uid())
    OR (student_id IS NOT NULL AND public.can_edit_student(auth.uid(), student_id))
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  AND (student_id IS NULL OR public.can_edit_student(auth.uid(), student_id) OR public.has_role(auth.uid(), 'admin'::app_role))
  AND (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))
);

-- 3) calendar_events: require access to related_* references
DROP POLICY IF EXISTS calendar_events_insert ON public.calendar_events;
CREATE POLICY calendar_events_insert
ON public.calendar_events
FOR INSERT
TO authenticated
WITH CHECK (
  (owner_user_id = auth.uid())
  AND (
    (visibility = 'private'::text)
    OR ((visibility = 'platform_admin_only'::text) AND has_audience(auth.uid(), 'admin'::text))
    OR ((visibility = 'public_event'::text) AND has_audience(auth.uid(), 'admin'::text))
    OR ((visibility = ANY (ARRAY['team'::text, 'student_team'::text, 'family_team'::text])) AND (student_id IS NOT NULL) AND can_access_student(auth.uid(), student_id))
    OR ((visibility = ANY (ARRAY['school_team'::text, 'district_team'::text, 'partner_only'::text])) AND (related_organization_id IS NOT NULL) AND is_org_member(auth.uid(), related_organization_id))
  )
  AND (
    related_partner_id IS NULL
    OR EXISTS (SELECT 1 FROM public.partner_organizations po WHERE po.id = related_partner_id AND (po.created_by = auth.uid() OR public.is_platform_admin(auth.uid())))
  )
  AND (
    related_pathway_report_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.pathway_reports r
      WHERE r.id = related_pathway_report_id
        AND (r.user_id = auth.uid()
             OR (r.student_id IS NOT NULL AND public.can_access_student(auth.uid(), r.student_id))
             OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  )
  AND (
    related_action_item_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.action_items a
      WHERE a.id = related_action_item_id
        AND (public.can_access_student(auth.uid(), a.student_id) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  )
  AND (
    related_meeting_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = related_meeting_id
        AND (m.created_by = auth.uid()
             OR (m.student_id IS NOT NULL AND public.can_access_student(auth.uid(), m.student_id))
             OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  )
);

DROP POLICY IF EXISTS calendar_events_update ON public.calendar_events;
CREATE POLICY calendar_events_update
ON public.calendar_events
FOR UPDATE
TO authenticated
USING ((owner_user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (
  ((owner_user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  AND (
    (visibility = 'private'::text)
    OR ((visibility = 'platform_admin_only'::text) AND has_audience(auth.uid(), 'admin'::text))
    OR ((visibility = 'public_event'::text) AND has_audience(auth.uid(), 'admin'::text))
    OR ((visibility = ANY (ARRAY['team'::text, 'student_team'::text, 'family_team'::text])) AND (student_id IS NOT NULL) AND can_access_student(auth.uid(), student_id))
    OR ((visibility = ANY (ARRAY['school_team'::text, 'district_team'::text, 'partner_only'::text])) AND (related_organization_id IS NOT NULL) AND is_org_member(auth.uid(), related_organization_id))
  )
  AND (
    related_partner_id IS NULL
    OR EXISTS (SELECT 1 FROM public.partner_organizations po WHERE po.id = related_partner_id AND (po.created_by = auth.uid() OR public.is_platform_admin(auth.uid())))
  )
  AND (
    related_pathway_report_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.pathway_reports r
      WHERE r.id = related_pathway_report_id
        AND (r.user_id = auth.uid()
             OR (r.student_id IS NOT NULL AND public.can_access_student(auth.uid(), r.student_id))
             OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  )
  AND (
    related_action_item_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.action_items a
      WHERE a.id = related_action_item_id
        AND (public.can_access_student(auth.uid(), a.student_id) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  )
  AND (
    related_meeting_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = related_meeting_id
        AND (m.created_by = auth.uid()
             OR (m.student_id IS NOT NULL AND public.can_access_student(auth.uid(), m.student_id))
             OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  )
);
