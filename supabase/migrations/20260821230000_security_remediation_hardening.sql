-- Forward-only security remediation for findings confirmed during the
-- 2026-08-21 production-readiness audit.

-- Private collaboration notes remain visible to their creator, but a user who
-- merely has student access must not see a row marked private through either
-- privacy field.
DROP POLICY IF EXISTS "View notes via student" ON public.collaboration_notes;
CREATE POLICY "View notes via student"
ON public.collaboration_notes
FOR SELECT
TO authenticated
USING (
  created_by_user_id = auth.uid()
  OR (
    public.can_access_student(auth.uid(), student_id)
    AND note_type <> 'private_note'
    AND visibility <> 'private'
  )
);

-- Attachment metadata has no supported update path. Removing the table grant
-- makes that immutability explicit even if a permissive UPDATE policy is added
-- accidentally in the future.
REVOKE UPDATE ON public.channel_attachments FROM authenticated;

-- Keep direct partner contact details service-role-only. These grants were
-- already restricted; reasserting them makes the expected ACL part of the
-- canonical security boundary and the migration-replay contract below.
REVOKE SELECT (contact_email, phone)
  ON public.partner_organizations FROM PUBLIC, anon, authenticated;

-- Public resource discovery intentionally exposes only reviewed, non-sensitive
-- metadata. Outdated sources must be excluded along with archived sources.
CREATE OR REPLACE FUNCTION public.list_public_resource_sources()
RETURNS TABLE(
  id uuid,
  source_name text,
  source_url text,
  organization_name text,
  description text,
  source_type text,
  audience_focus text[],
  topic_focus text[],
  location_scope text,
  review_status text,
  last_reviewed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.source_name,
    s.source_url,
    s.organization_name,
    s.description,
    s.source_type,
    s.audience_focus,
    s.topic_focus,
    s.location_scope,
    s.review_status,
    s.last_reviewed_at
  FROM public.resource_sources s
  WHERE s.review_status NOT IN ('archived', 'outdated')
  ORDER BY s.review_status, s.source_name;
$$;

REVOKE ALL ON FUNCTION public.list_public_resource_sources() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_resource_sources()
  TO anon, authenticated, service_role;

-- Invitation acceptance changes account relationships and must always require
-- an authenticated caller. Reassert the final ACL after every function replace.
REVOKE ALL ON FUNCTION public.accept_invitation_by_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation_by_token(text)
  TO authenticated, service_role;
