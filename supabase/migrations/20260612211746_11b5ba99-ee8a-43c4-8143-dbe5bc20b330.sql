
-- ============================================================
-- Phase 1: Account, access, and entitlement architecture
-- ============================================================

-- 1) organizations: add status, billing_plan, billing_owner_user_id; extend type check
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS billing_plan text,
  ADD COLUMN IF NOT EXISTS billing_owner_user_id uuid;

ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_type_check;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_type_check
  CHECK (type = ANY (ARRAY['school','district','partner','agency','platform','family','platform_internal']));

ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_status_check;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_status_check
  CHECK (status = ANY (ARRAY['waitlist','pilot','active','inactive','archived']));

-- 2) profiles: add account_status, selected_plan
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS selected_plan text;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status = ANY (ARRAY['waitlist','invited','active','demo','suspended']));

-- 3) organization_memberships: add membership_status, invited_by
ALTER TABLE public.organization_memberships
  ADD COLUMN IF NOT EXISTS membership_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invited_by uuid;

ALTER TABLE public.organization_memberships DROP CONSTRAINT IF EXISTS organization_memberships_membership_status_check;
ALTER TABLE public.organization_memberships ADD CONSTRAINT organization_memberships_membership_status_check
  CHECK (membership_status = ANY (ARRAY['pending','active','suspended','removed']));

-- 4) waitlist: add structured intake fields
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS requested_role text,
  ADD COLUMN IF NOT EXISTS organization_name text,
  ADD COLUMN IF NOT EXISTS organization_type text,
  ADD COLUMN IF NOT EXISTS district_name text,
  ADD COLUMN IF NOT EXISTS school_name text,
  ADD COLUMN IF NOT EXISTS student_connection_interest text,
  ADD COLUMN IF NOT EXISTS intended_use text,
  ADD COLUMN IF NOT EXISTS referral_source text;

-- 5) invitations: general-purpose invitation table (separate from admin_invitations)
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invited_role text NOT NULL,
  invited_by_user_id uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  student_profile_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  invitation_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  token text NOT NULL UNIQUE DEFAULT (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid,
  revoked_at timestamptz,
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invitations_type_check CHECK (invitation_type = ANY (ARRAY[
    'connect_to_student','join_school','join_district','join_partner_org','platform_admin_invite'
  ])),
  CONSTRAINT invitations_status_check CHECK (status = ANY (ARRAY['pending','accepted','expired','revoked']))
);

CREATE INDEX IF NOT EXISTS invitations_email_idx ON public.invitations (lower(email));
CREATE INDEX IF NOT EXISTS invitations_token_idx ON public.invitations (token);
CREATE INDEX IF NOT EXISTS invitations_org_idx ON public.invitations (organization_id);
CREATE INDEX IF NOT EXISTS invitations_student_idx ON public.invitations (student_profile_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View my invitations or as platform admin"
  ON public.invitations FOR SELECT TO authenticated
  USING (
    invited_by_user_id = auth.uid()
    OR lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Create invitations when authorized"
  ON public.invitations FOR INSERT TO authenticated
  WITH CHECK (
    invited_by_user_id = auth.uid()
    AND (
      public.is_platform_admin(auth.uid())
      OR (organization_id IS NOT NULL AND public.is_org_admin(auth.uid(), organization_id))
      OR (student_profile_id IS NOT NULL AND public.can_edit_student(auth.uid(), student_profile_id))
    )
  );

CREATE POLICY "Update own invitations or platform admin"
  ON public.invitations FOR UPDATE TO authenticated
  USING (invited_by_user_id = auth.uid() OR public.is_platform_admin(auth.uid()))
  WITH CHECK (invited_by_user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Delete own invitations or platform admin"
  ON public.invitations FOR DELETE TO authenticated
  USING (invited_by_user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE TRIGGER invitations_set_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6) student_relationships: human relationship + consent (separate from doc-ACL student_collaborators)
CREATE TABLE IF NOT EXISTS public.student_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  related_user_id uuid NOT NULL,
  relationship_type text NOT NULL,
  permission_level text NOT NULL DEFAULT 'view_summary',
  consent_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_relationships_unique UNIQUE (student_id, related_user_id, relationship_type),
  CONSTRAINT student_relationships_type_check CHECK (relationship_type = ANY (ARRAY[
    'parent_guardian','educator_case_manager','school_admin','district_admin'
  ])),
  CONSTRAINT student_relationships_permission_check CHECK (permission_level = ANY (ARRAY[
    'view_summary','collaborate','manage_documents','manage_plan'
  ])),
  CONSTRAINT student_relationships_consent_check CHECK (consent_status = ANY (ARRAY[
    'pending','approved','revoked','needs_review'
  ]))
);

CREATE INDEX IF NOT EXISTS student_relationships_student_idx ON public.student_relationships (student_id);
CREATE INDEX IF NOT EXISTS student_relationships_user_idx ON public.student_relationships (related_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_relationships TO authenticated;
GRANT ALL ON public.student_relationships TO service_role;

ALTER TABLE public.student_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View relationships you're part of"
  ON public.student_relationships FOR SELECT TO authenticated
  USING (
    related_user_id = auth.uid()
    OR public.can_edit_student(auth.uid(), student_id)
    OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Editors create relationships"
  ON public.student_relationships FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id));

CREATE POLICY "Editors or self update relationships"
  ON public.student_relationships FOR UPDATE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id) OR related_user_id = auth.uid())
  WITH CHECK (public.can_edit_student(auth.uid(), student_id) OR related_user_id = auth.uid());

CREATE POLICY "Editors delete relationships"
  ON public.student_relationships FOR DELETE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));

CREATE TRIGGER student_relationships_set_updated_at
  BEFORE UPDATE ON public.student_relationships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7) access_entitlements: plan + grants per organization
CREATE TABLE IF NOT EXISTS public.access_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  max_schools integer,
  max_students integer,
  max_staff integer,
  grants_family_access boolean NOT NULL DEFAULT false,
  grants_student_access boolean NOT NULL DEFAULT false,
  grants_partner_access boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT access_entitlements_plan_check CHECK (plan_type = ANY (ARRAY[
    'free_waitlist','family_early_access','educator_individual',
    'school_pilot','school_plan','district_pilot','district_plan',
    'partner_basic','partner_featured','platform_internal'
  ])),
  CONSTRAINT access_entitlements_status_check CHECK (status = ANY (ARRAY[
    'trial','pilot','active','past_due','canceled','comped'
  ]))
);

CREATE INDEX IF NOT EXISTS access_entitlements_org_idx ON public.access_entitlements (organization_id);
CREATE INDEX IF NOT EXISTS access_entitlements_status_idx ON public.access_entitlements (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_entitlements TO authenticated;
GRANT ALL ON public.access_entitlements TO service_role;

ALTER TABLE public.access_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View entitlements for my orgs or as platform admin"
  ON public.access_entitlements FOR SELECT TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
    OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Platform admins manage entitlements (insert)"
  ON public.access_entitlements FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins manage entitlements (update)"
  ON public.access_entitlements FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins manage entitlements (delete)"
  ON public.access_entitlements FOR DELETE TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE TRIGGER access_entitlements_set_updated_at
  BEFORE UPDATE ON public.access_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8) Helper functions
CREATE OR REPLACE FUNCTION public.has_active_entitlement(_org_id uuid, _plan_kind text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.access_entitlements e
    WHERE e.organization_id = _org_id
      AND e.status IN ('trial','pilot','active','comped')
      AND (e.ends_at IS NULL OR e.ends_at > now())
      AND (_plan_kind IS NULL OR e.plan_type = _plan_kind)
  );
$$;

CREATE OR REPLACE FUNCTION public.effective_entitlement_for_user(_user_id uuid)
RETURNS TABLE(
  organization_id uuid,
  plan_type text,
  status text,
  via_district boolean,
  grants_family_access boolean,
  grants_student_access boolean,
  grants_partner_access boolean,
  ends_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH user_orgs AS (
    SELECT m.organization_id
    FROM public.organization_memberships m
    WHERE m.user_id = _user_id AND m.membership_status = 'active'
  ),
  expanded AS (
    SELECT o.id AS org_id, false AS via_district
    FROM user_orgs u JOIN public.organizations o ON o.id = u.organization_id
    UNION
    SELECT parent.id, true
    FROM user_orgs u
    JOIN public.organizations child ON child.id = u.organization_id
    JOIN public.organizations parent ON parent.id = child.parent_organization_id
  )
  SELECT e.organization_id, e.plan_type, e.status, x.via_district,
         e.grants_family_access, e.grants_student_access, e.grants_partner_access, e.ends_at
  FROM expanded x
  JOIN public.access_entitlements e ON e.organization_id = x.org_id
  WHERE e.status IN ('trial','pilot','active','comped')
    AND (e.ends_at IS NULL OR e.ends_at > now());
$$;

CREATE OR REPLACE FUNCTION public.user_has_feature(_user_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.effective_entitlement_for_user(_user_id) e
    WHERE
      (_feature = 'family_access'  AND e.grants_family_access)
   OR (_feature = 'student_access' AND e.grants_student_access)
   OR (_feature = 'partner_access' AND e.grants_partner_access)
   OR (_feature = 'any')
  );
$$;

-- 9) Update can_access_student to also honor approved student_relationships
CREATE OR REPLACE FUNCTION public.can_access_student(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = _student_id AND s.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.student_collaborators c
    WHERE c.student_id = _student_id
      AND c.user_id = _user_id
      AND c.status = 'accepted'
  ) OR EXISTS (
    SELECT 1 FROM public.student_relationships r
    WHERE r.student_id = _student_id
      AND r.related_user_id = _user_id
      AND r.consent_status = 'approved'
  ) OR public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.can_edit_student(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = _student_id AND s.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.student_collaborators c
    WHERE c.student_id = _student_id
      AND c.user_id = _user_id
      AND c.status = 'accepted'
      AND c.role = 'editor'
  ) OR EXISTS (
    SELECT 1 FROM public.student_relationships r
    WHERE r.student_id = _student_id
      AND r.related_user_id = _user_id
      AND r.consent_status = 'approved'
      AND r.permission_level IN ('collaborate','manage_documents','manage_plan')
  ) OR public.has_role(_user_id, 'admin');
$$;
