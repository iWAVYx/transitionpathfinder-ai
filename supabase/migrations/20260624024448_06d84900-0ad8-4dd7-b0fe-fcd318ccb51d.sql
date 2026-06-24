
-- Fix 1: partner_network_opportunities — restrict authenticated read to public rows,
-- and gate contact_email behind a SECURITY DEFINER admin-only accessor (already exists:
-- get_partner_network_opportunity_contact_email). Revoke direct column SELECT on contact_email
-- from non-admins by tightening the row policy AND revoking the column grant.

DROP POLICY IF EXISTS "Authenticated can read network opportunities" ON public.partner_network_opportunities;

CREATE POLICY "Authenticated can read public network opportunities"
ON public.partner_network_opportunities
FOR SELECT
TO authenticated
USING (is_public = true OR public.is_platform_admin(auth.uid()));

-- Belt-and-suspenders: revoke direct read on contact_email column for authenticated/anon.
-- Admins read it via the existing SECURITY DEFINER function.
REVOKE SELECT (contact_email) ON public.partner_network_opportunities FROM authenticated;
REVOKE SELECT (contact_email) ON public.partner_network_opportunities FROM anon;

-- Re-grant all OTHER columns to authenticated so the rest of the row remains readable.
GRANT SELECT (
  id, partner_id, opportunity_title, opportunity_type, description, location, county,
  pathway_category, age_range, eligibility, support_level, schedule, cost_or_funding_notes,
  application_url, next_step, status, is_public, created_at, updated_at
) ON public.partner_network_opportunities TO authenticated;


-- Fix 2: student_collaborators "Accept my own collaborator invite" — the prior WITH CHECK
-- compared the new role/student_id to SECURITY DEFINER helpers that just re-read the row
-- being updated, making the guard vacuously true. Replace with hard guards:
--   * role must remain in a fixed allowlist
--   * role, student_id, and invited_by cannot change (compare to subquery against the
--     pre-update row by id)
--   * status can only transition from 'pending' to 'accepted'

DROP POLICY IF EXISTS "Accept my own collaborator invite" ON public.student_collaborators;

CREATE POLICY "Accept my own collaborator invite"
ON public.student_collaborators
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND status = 'pending'
)
WITH CHECK (
  user_id = auth.uid()
  AND status = 'accepted'
  AND role IN ('viewer','editor','commenter')
  AND role       = (SELECT sc.role       FROM public.student_collaborators sc WHERE sc.id = student_collaborators.id)
  AND student_id = (SELECT sc.student_id FROM public.student_collaborators sc WHERE sc.id = student_collaborators.id)
  AND invited_by IS NOT DISTINCT FROM (SELECT sc.invited_by FROM public.student_collaborators sc WHERE sc.id = student_collaborators.id)
);
