-- Student accounts own their identity link directly. They do not need a
-- collaborator row to open or edit their own transition plan.

CREATE OR REPLACE FUNCTION public.can_access_student(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = _student_id
      AND (s.owner_id = _user_id OR s.student_user_id = _user_id)
  ) OR EXISTS (
    SELECT 1
    FROM public.student_collaborators c
    WHERE c.student_id = _student_id
      AND c.user_id = _user_id
      AND c.status = 'accepted'
  ) OR EXISTS (
    SELECT 1
    FROM public.student_relationships r
    WHERE r.student_id = _student_id
      AND r.related_user_id = _user_id
      AND r.consent_status = 'approved'
  ) OR public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.can_edit_student(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = _student_id
      AND (s.owner_id = _user_id OR s.student_user_id = _user_id)
  ) OR EXISTS (
    SELECT 1
    FROM public.student_collaborators c
    WHERE c.student_id = _student_id
      AND c.user_id = _user_id
      AND c.status = 'accepted'
      AND c.role = 'editor'
  ) OR EXISTS (
    SELECT 1
    FROM public.student_relationships r
    WHERE r.student_id = _student_id
      AND r.related_user_id = _user_id
      AND r.consent_status = 'approved'
      AND r.permission_level IN ('collaborate','manage_documents','manage_plan')
  ) OR public.has_role(_user_id, 'admin');
$$;

REVOKE ALL ON FUNCTION public.can_access_student(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_edit_student(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_student(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit_student(uuid, uuid) TO authenticated, service_role;

-- Idempotently creates or repairs the one student profile represented by the
-- signed-in student account. The advisory lock prevents two simultaneous
-- onboarding requests from creating two profiles for the same user.
CREATE OR REPLACE FUNCTION public.ensure_student_self_profile()
RETURNS public.students
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_student public.students%ROWTYPE;
  v_first_name text;
  v_last_name text;
  v_allocation_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_uid;

  IF v_profile.id IS NULL OR v_profile.primary_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Only a student account can create its own student profile'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  SELECT * INTO v_student
  FROM public.students
  WHERE student_user_id = v_uid
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  -- Repair student accounts created before student_user_id was wired into
  -- onboarding. Only a profile already owned by this user is eligible.
  IF v_student.id IS NULL THEN
    SELECT * INTO v_student
    FROM public.students
    WHERE owner_id = v_uid
      AND student_user_id IS NULL
    ORDER BY created_at
    LIMIT 1
    FOR UPDATE;
  END IF;

  v_first_name := COALESCE(
    NULLIF(btrim(v_profile.first_name), ''),
    NULLIF(split_part(COALESCE(v_profile.full_name, ''), ' ', 1), ''),
    'Student'
  );
  v_last_name := NULLIF(btrim(v_profile.last_name), '');

  IF v_student.id IS NULL THEN
    INSERT INTO public.students (
      owner_id,
      student_user_id,
      first_name,
      last_name,
      organization_id
    ) VALUES (
      v_uid,
      v_uid,
      v_first_name,
      v_last_name,
      v_profile.organization_id
    )
    RETURNING * INTO v_student;
  ELSIF v_student.student_user_id IS NULL THEN
    UPDATE public.students
    SET student_user_id = v_uid,
        organization_id = COALESCE(organization_id, v_profile.organization_id),
        updated_at = now()
    WHERE id = v_student.id
    RETURNING * INTO v_student;
  END IF;

  IF v_student.organization_id IS NULL
     AND v_profile.organization_id IS NOT NULL THEN
    UPDATE public.students
    SET organization_id = v_profile.organization_id,
        updated_at = now()
    WHERE id = v_student.id
    RETURNING * INTO v_student;
  END IF;

  -- A school or district may reserve a pathway seat before the student has
  -- finished onboarding. Once the self-profile exists, attach that seat to
  -- the student so coverage follows the plan instead of a temporary account.
  SELECT a.id INTO v_allocation_id
  FROM public.license_allocations a
  WHERE a.beneficiary_user_id = v_uid
    AND a.license_type = 'pathway'
    AND a.state IN ('reserved', 'active')
    AND a.student_id IS NULL
  ORDER BY a.created_at
  LIMIT 1;

  IF v_allocation_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.license_allocations a
       WHERE a.student_id = v_student.id
         AND a.state IN ('reserved', 'active')
     ) THEN
    UPDATE public.license_allocations
    SET student_id = v_student.id,
        updated_at = now()
    WHERE id = v_allocation_id;
  END IF;

  RETURN v_student;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_student_self_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_student_self_profile() TO authenticated, service_role;

-- When a family account redeemed a school/district pathway seat before it
-- created the student, attach that already-purchased seat to the first student
-- profile it owns. Connected family accounts then share this one pathway seat.
CREATE OR REPLACE FUNCTION public.attach_my_pathway_license_to_student(_student_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_allocation_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = _student_id
      AND (s.owner_id = v_uid OR s.student_user_id = v_uid)
  ) THEN
    RAISE EXCEPTION 'Student not found' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.license_allocations a
    WHERE a.student_id = _student_id
      AND a.license_type = 'pathway'
      AND a.state IN ('reserved', 'active')
  ) THEN
    RETURN true;
  END IF;

  SELECT a.id INTO v_allocation_id
  FROM public.license_allocations a
  WHERE a.beneficiary_user_id = v_uid
    AND a.student_id IS NULL
    AND a.license_type = 'pathway'
    AND a.state IN ('reserved', 'active')
  ORDER BY a.created_at
  LIMIT 1
  FOR UPDATE;

  IF v_allocation_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.license_allocations
  SET student_id = _student_id,
      updated_at = now()
  WHERE id = v_allocation_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_my_pathway_license_to_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attach_my_pathway_license_to_student(uuid) TO authenticated, service_role;

-- Resolves sponsored access for both direct staff/admin seats and the family
-- accounts included with a student's pathway license.
CREATE OR REPLACE FUNCTION public.my_sponsored_access()
RETURNS TABLE(
  sponsor_organization_id uuid,
  license_type text,
  activated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH viewer AS (
    SELECT auth.uid() AS user_id, p.primary_role
    FROM public.profiles p
    WHERE p.id = auth.uid()
  ),
  candidates AS (
    SELECT
      a.sponsor_organization_id,
      a.license_type,
      a.activated_at,
      0 AS priority
    FROM public.license_allocations a
    JOIN public.license_pools pool ON pool.id = a.pool_id
    JOIN viewer v ON v.user_id = a.beneficiary_user_id
    WHERE a.state = 'active'
      AND (a.effective_to IS NULL OR a.effective_to > now())
      AND pool.status = 'active'
      AND (pool.effective_to IS NULL OR pool.effective_to > now())

    UNION ALL

    SELECT
      a.sponsor_organization_id,
      a.license_type,
      a.activated_at,
      1 AS priority
    FROM public.license_allocations a
    JOIN public.license_pools pool ON pool.id = a.pool_id
    JOIN viewer v ON v.primary_role IN ('student','parent','guardian')
    WHERE a.license_type = 'pathway'
      AND a.student_id IS NOT NULL
      AND a.state = 'active'
      AND (a.effective_to IS NULL OR a.effective_to > now())
      AND pool.status = 'active'
      AND (pool.effective_to IS NULL OR pool.effective_to > now())
      AND public.can_access_student(v.user_id, a.student_id)
      AND (
        v.primary_role = 'student'
        OR v.user_id IN (
          -- A pathway includes at most three parent/guardian accounts. The
          -- plan owner is considered first, followed by approved family
          -- relationships and accepted family collaborators in connection
          -- order. Broader team collaboration remains available without
          -- silently expanding sponsored billing coverage.
          SELECT family_user_id
          FROM (
            SELECT
              family_candidates.family_user_id,
              min(family_candidates.priority) AS priority,
              min(family_candidates.connected_at) AS connected_at
            FROM (
              SELECT
                s.owner_id AS family_user_id,
                0 AS priority,
                s.created_at AS connected_at
              FROM public.students s
              JOIN public.profiles owner_profile ON owner_profile.id = s.owner_id
              WHERE s.id = a.student_id
                AND owner_profile.primary_role IN ('parent','guardian')

              UNION ALL

              SELECT
                r.related_user_id,
                1,
                r.created_at
              FROM public.student_relationships r
              JOIN public.profiles relationship_profile
                ON relationship_profile.id = r.related_user_id
              WHERE r.student_id = a.student_id
                AND r.relationship_type = 'parent_guardian'
                AND r.consent_status = 'approved'
                AND relationship_profile.primary_role IN ('parent','guardian')

              UNION ALL

              SELECT
                c.user_id,
                2,
                c.created_at
              FROM public.student_collaborators c
              JOIN public.profiles collaborator_profile
                ON collaborator_profile.id = c.user_id
              WHERE c.student_id = a.student_id
                AND c.status = 'accepted'
                AND collaborator_profile.primary_role IN ('parent','guardian')
            ) family_candidates
            WHERE family_candidates.family_user_id IS NOT NULL
            GROUP BY family_candidates.family_user_id
          ) ranked_family
          ORDER BY ranked_family.priority, ranked_family.connected_at, family_user_id
          LIMIT 3
        )
      )
  )
  SELECT c.sponsor_organization_id, c.license_type, c.activated_at
  FROM candidates c
  ORDER BY c.priority, c.activated_at DESC NULLS LAST
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.my_sponsored_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_sponsored_access() TO authenticated, service_role;

-- Invitation acceptance links a student account to the existing student
-- record. Family and team invitees remain relationships; the student is the
-- subject of the plan and therefore is never inserted as its own collaborator.
CREATE OR REPLACE FUNCTION public.accept_invitation_by_token(_token text)
RETURNS TABLE(invitation_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.invitations%ROWTYPE;
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_perm text;
  v_type text;
  v_alloc uuid;
  v_primary_role text;
  v_app_role public.app_role;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_inv
  FROM public.invitations
  WHERE token = _token
  LIMIT 1;

  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF v_inv.status = 'accepted' THEN
    IF v_inv.accepted_by IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'Invitation is no longer pending';
    END IF;
    RETURN QUERY SELECT v_inv.invitation_type;
    RETURN;
  END IF;

  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation is no longer pending';
  END IF;
  IF v_inv.expires_at < now() THEN
    UPDATE public.invitations SET status = 'expired' WHERE id = v_inv.id;
    PERFORM public.release_expired_license_allocations();
    RAISE EXCEPTION 'Invitation has expired';
  END IF;
  IF lower(v_inv.email) <> v_email THEN
    RAISE EXCEPTION 'Invitation is addressed to a different email';
  END IF;

  -- Preselect the invited role for first-time accounts so onboarding does not
  -- ask them to choose a contradictory role after accepting sponsored access.
  v_primary_role := CASE v_inv.invited_role
    WHEN 'guardian' THEN 'parent'
    WHEN 'parent_guardian' THEN 'parent'
    WHEN 'case_manager' THEN 'educator'
    WHEN 'teacher' THEN 'educator'
    WHEN 'counselor' THEN 'educator'
    WHEN 'educator_case_manager' THEN 'educator'
    ELSE v_inv.invited_role
  END;
  v_app_role := CASE v_inv.invited_role
    WHEN 'guardian' THEN 'parent'::public.app_role
    WHEN 'parent_guardian' THEN 'parent'::public.app_role
    WHEN 'teacher' THEN 'educator'::public.app_role
    WHEN 'counselor' THEN 'case_manager'::public.app_role
    WHEN 'educator_case_manager' THEN 'case_manager'::public.app_role
    ELSE v_inv.invited_role::public.app_role
  END;

  UPDATE public.profiles
  SET primary_role = CASE
        WHEN primary_role IS NULL OR btrim(primary_role) = '' THEN v_primary_role
        ELSE primary_role
      END,
      organization_id = COALESCE(organization_id, v_inv.organization_id),
      updated_at = now()
  WHERE id = v_uid;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, v_app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_inv.invitation_type IN ('join_school','join_district','join_partner_org')
     AND v_inv.organization_id IS NOT NULL THEN
    INSERT INTO public.organization_memberships
      (organization_id, user_id, role_within_org, status, membership_status, invited_by)
    VALUES
      (v_inv.organization_id, v_uid, v_inv.invited_role, 'active', 'active', v_inv.invited_by_user_id)
    ON CONFLICT ON CONSTRAINT organization_memberships_organization_id_user_id_key DO UPDATE
      SET status = 'active',
          membership_status = 'active',
          role_within_org = EXCLUDED.role_within_org;
  END IF;

  IF v_inv.invitation_type = 'connect_to_student'
     AND v_inv.student_profile_id IS NOT NULL THEN
    IF v_inv.invited_role = 'student' THEN
      PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
      UPDATE public.students
      SET student_user_id = v_uid,
          updated_at = now()
      WHERE id = v_inv.student_profile_id
        AND (student_user_id IS NULL OR student_user_id = v_uid);
      IF NOT FOUND THEN
        RAISE EXCEPTION 'This student profile is already linked to another account';
      END IF;
    ELSE
      v_type := CASE v_inv.invited_role
        WHEN 'parent' THEN 'parent_guardian'
        WHEN 'guardian' THEN 'parent_guardian'
        WHEN 'parent_guardian' THEN 'parent_guardian'
        WHEN 'case_manager' THEN 'educator_case_manager'
        WHEN 'educator' THEN 'educator_case_manager'
        WHEN 'teacher' THEN 'educator_case_manager'
        WHEN 'counselor' THEN 'educator_case_manager'
        WHEN 'educator_case_manager' THEN 'educator_case_manager'
        WHEN 'district_admin' THEN 'district_admin'
        ELSE 'school_admin'
      END;
      v_perm := CASE
        WHEN v_type IN ('parent_guardian','educator_case_manager') THEN 'collaborate'
        ELSE 'view_summary'
      END;
      INSERT INTO public.student_relationships
        (student_id, related_user_id, relationship_type, permission_level, consent_status)
      VALUES
        (v_inv.student_profile_id, v_uid, v_type, v_perm, 'approved')
      ON CONFLICT ON CONSTRAINT student_relationships_unique DO UPDATE
        SET consent_status = 'approved';
    END IF;
  END IF;

  SELECT a.id INTO v_alloc
  FROM public.license_allocations a
  WHERE a.invitation_id = v_inv.id
    AND a.state = 'reserved'
  LIMIT 1;

  IF v_alloc IS NOT NULL THEN
    PERFORM public.activate_license_allocation(v_alloc, v_uid);
  END IF;

  UPDATE public.invitations
  SET status = 'accepted', accepted_at = now(), accepted_by = v_uid
  WHERE id = v_inv.id;

  RETURN QUERY SELECT v_inv.invitation_type;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invitation_by_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation_by_token(text) TO authenticated, service_role;

-- License activation codes reserve purchased capacity when they are issued.
-- The issuing organization remains the administrative owner of the code while
-- target_organization_id identifies the school/district the account joins.
ALTER TABLE public.access_codes
  ADD COLUMN label text,
  ADD COLUMN target_organization_id uuid
    REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.access_codes
  ADD CONSTRAINT access_codes_label_length_check
  CHECK (label IS NULL OR char_length(btrim(label)) BETWEEN 1 AND 100);

CREATE INDEX access_codes_target_org_idx
  ON public.access_codes (target_organization_id);

ALTER TABLE public.license_allocations
  ADD COLUMN access_code_id uuid
    REFERENCES public.access_codes(id) ON DELETE SET NULL;

CREATE INDEX license_allocations_access_code_idx
  ON public.license_allocations (access_code_id, state)
  WHERE access_code_id IS NOT NULL;

-- Access-code writes must go through the transactional functions below. This
-- prevents a browser client from creating codes that are not backed by seats.
REVOKE INSERT, UPDATE, DELETE ON public.access_codes FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.access_code_redemptions FROM authenticated;

CREATE OR REPLACE FUNCTION public.license_access_code_options(_org_id uuid)
RETURNS TABLE(
  target_organization_id uuid,
  target_organization_name text,
  target_organization_type text,
  sponsor_organization_id uuid,
  license_type text,
  purchased integer,
  reserved integer,
  active integer,
  available integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT (
    public.is_org_admin(auth.uid(), _org_id)
    OR public.is_platform_admin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'You do not manage licenses for this organization'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH issuer AS (
    SELECT o.id, o.type
    FROM public.organizations o
    WHERE o.id = _org_id
  ),
  targets AS (
    SELECT o.id, o.name, o.type
    FROM public.organizations o
    CROSS JOIN issuer i
    WHERE i.type IN ('school', 'district')
      AND (
        o.id = i.id
        OR (i.type = 'district' AND o.parent_organization_id = i.id)
      )
      AND o.type IN ('school', 'district')
      AND o.status = 'active'
  )
  SELECT
    t.id,
    t.name,
    t.type,
    public.sponsoring_org_for(t.id, lt.license_type),
    lt.license_type,
    cap.purchased,
    cap.reserved,
    cap.active,
    cap.available
  FROM targets t
  CROSS JOIN (VALUES ('pathway'::text), ('staff'::text), ('admin'::text)) lt(license_type)
  CROSS JOIN LATERAL public.license_capacity(
    public.sponsoring_org_for(t.id, lt.license_type),
    lt.license_type
  ) cap
  ORDER BY t.name, lt.license_type;
END;
$$;

REVOKE ALL ON FUNCTION public.license_access_code_options(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.license_access_code_options(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.issue_license_access_code(
  _org_id uuid,
  _target_organization_id uuid,
  _role text,
  _code_hash text,
  _label text,
  _capacity integer,
  _single_use boolean,
  _expires_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_issuer_type text;
  v_target_type text;
  v_target_parent uuid;
  v_license_type text;
  v_sponsor uuid;
  v_pool uuid;
  v_code_id uuid;
  v_capacity record;
  v_expires_at timestamptz := COALESCE(_expires_at, now() + interval '30 days');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT (
    public.is_org_admin(v_uid, _org_id)
    OR public.is_platform_admin(v_uid)
  ) THEN
    RAISE EXCEPTION 'You do not manage licenses for this organization'
      USING ERRCODE = '42501';
  END IF;

  SELECT o.type INTO v_issuer_type
  FROM public.organizations o
  WHERE o.id = _org_id;

  SELECT o.type, o.parent_organization_id
  INTO v_target_type, v_target_parent
  FROM public.organizations o
  WHERE o.id = _target_organization_id
    AND o.status = 'active';

  IF v_issuer_type NOT IN ('school', 'district') OR v_target_type IS NULL THEN
    RAISE EXCEPTION 'License codes are available only for active schools and districts'
      USING ERRCODE = '22023';
  END IF;
  IF _target_organization_id <> _org_id
     AND NOT (v_issuer_type = 'district' AND v_target_parent = _org_id) THEN
    RAISE EXCEPTION 'The selected school is not managed by this district'
      USING ERRCODE = '42501';
  END IF;
  IF _role NOT IN (
    'student', 'parent', 'educator', 'case_manager', 'counselor',
    'school_admin', 'district_admin'
  ) THEN
    RAISE EXCEPTION 'Unsupported license role' USING ERRCODE = '22023';
  END IF;
  IF _role = 'district_admin' AND v_target_type <> 'district' THEN
    RAISE EXCEPTION 'District administrator codes must target a district'
      USING ERRCODE = '22023';
  END IF;
  IF _role = 'school_admin' AND v_target_type <> 'school' THEN
    RAISE EXCEPTION 'School administrator codes must target a school'
      USING ERRCODE = '22023';
  END IF;
  IF _capacity IS NULL OR _capacity < 1 OR _capacity > 500 THEN
    RAISE EXCEPTION 'Reserved seats must be between 1 and 500'
      USING ERRCODE = '22023';
  END IF;
  IF COALESCE(_single_use, false) AND _capacity <> 1 THEN
    RAISE EXCEPTION 'A single-use code must reserve exactly one seat'
      USING ERRCODE = '22023';
  END IF;
  IF _role IN ('school_admin', 'district_admin')
     AND (NOT COALESCE(_single_use, false) OR _capacity <> 1) THEN
    RAISE EXCEPTION 'Administrator activation codes must be single-use and reserve exactly one seat'
      USING ERRCODE = '22023';
  END IF;
  IF _code_hash IS NULL OR _code_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid access-code hash' USING ERRCODE = '22023';
  END IF;
  IF _label IS NULL OR char_length(btrim(_label)) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Add a label between 1 and 100 characters'
      USING ERRCODE = '22023';
  END IF;
  IF v_expires_at <= now() OR v_expires_at > now() + interval '365 days' THEN
    RAISE EXCEPTION 'Access codes must expire within 365 days'
      USING ERRCODE = '22023';
  END IF;
  IF _role IN ('school_admin', 'district_admin')
     AND v_expires_at > now() + interval '7 days' THEN
    RAISE EXCEPTION 'Administrator activation codes must expire within 7 days'
      USING ERRCODE = '22023';
  END IF;

  v_license_type := CASE
    WHEN _role IN ('student', 'parent') THEN 'pathway'
    WHEN _role IN ('educator', 'case_manager', 'counselor') THEN 'staff'
    WHEN _role IN ('school_admin', 'district_admin') THEN 'admin'
  END;
  v_sponsor := public.sponsoring_org_for(_target_organization_id, v_license_type);

  -- Lock the sponsor's pools before reclaiming expired reservations and
  -- measuring capacity. Concurrent code creation therefore serializes here.
  PERFORM 1
  FROM public.license_pools p
  WHERE p.organization_id = v_sponsor
    AND p.license_type = v_license_type
  ORDER BY p.id
  FOR UPDATE;

  UPDATE public.license_allocations a
  SET state = 'expired',
      effective_to = now(),
      updated_at = now()
  WHERE a.sponsor_organization_id = v_sponsor
    AND a.license_type = v_license_type
    AND a.state = 'reserved'
    AND a.reserved_until IS NOT NULL
    AND a.reserved_until < now();

  SELECT * INTO v_capacity
  FROM public.license_capacity(v_sponsor, v_license_type);

  IF v_capacity.available < _capacity THEN
    RAISE EXCEPTION 'Only % % seats are available',
      v_capacity.available, v_license_type
      USING ERRCODE = '23514';
  END IF;

  SELECT p.id INTO v_pool
  FROM public.license_pools p
  WHERE p.organization_id = v_sponsor
    AND p.license_type = v_license_type
    AND p.status = 'active'
    AND (p.effective_to IS NULL OR p.effective_to > now())
  ORDER BY p.effective_from
  LIMIT 1;

  IF v_pool IS NULL THEN
    RAISE EXCEPTION 'No active % license pool is available', v_license_type
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.access_codes (
    code_hash,
    org_id,
    target_organization_id,
    role,
    scope,
    label,
    capacity,
    single_use,
    expires_at,
    created_by
  ) VALUES (
    _code_hash,
    _org_id,
    _target_organization_id,
    _role,
    'license_activation',
    btrim(_label),
    _capacity,
    COALESCE(_single_use, false),
    v_expires_at,
    v_uid
  )
  RETURNING id INTO v_code_id;

  INSERT INTO public.license_allocations (
    pool_id,
    sponsor_organization_id,
    sponsor_user_id,
    license_type,
    state,
    invitation_source,
    access_code_id,
    reserved_until,
    created_by,
    notes
  )
  SELECT
    v_pool,
    v_sponsor,
    v_uid,
    v_license_type,
    'reserved',
    'access_code',
    v_code_id,
    v_expires_at,
    v_uid,
    CASE
      WHEN v_sponsor <> _target_organization_id
        THEN 'Reserved by district license activation code'
      ELSE 'Reserved by license activation code'
    END
  FROM generate_series(1, _capacity);

  INSERT INTO public.license_lifecycle_events (org_id, event, actor_id, payload)
  VALUES (
    _org_id,
    'license_access_code_issued',
    v_uid,
    jsonb_build_object(
      'code_id', v_code_id,
      'label', btrim(_label),
      'role', _role,
      'license_type', v_license_type,
      'target_organization_id', _target_organization_id,
      'sponsor_organization_id', v_sponsor,
      'reserved_seats', _capacity,
      'expires_at', v_expires_at
    )
  );

  RETURN v_code_id;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_license_access_code(
  uuid, uuid, text, text, text, integer, boolean, timestamptz
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_license_access_code(
  uuid, uuid, text, text, text, integer, boolean, timestamptz
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.revoke_license_access_code(
  _code_id uuid,
  _reason text DEFAULT 'Access code revoked by an administrator'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.access_codes%ROWTYPE;
  v_released integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.access_codes
  WHERE id = _code_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Access code not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT (
    public.is_platform_admin(v_uid)
    OR (v_row.org_id IS NOT NULL AND public.is_org_admin(v_uid, v_row.org_id))
  ) THEN
    RAISE EXCEPTION 'You do not manage this access code'
      USING ERRCODE = '42501';
  END IF;
  IF v_row.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'released_seats', 0, 'already_revoked', true);
  END IF;

  UPDATE public.access_codes
  SET revoked_at = now(), updated_at = now()
  WHERE id = v_row.id;

  -- Redeemed seats remain active. Only unclaimed reservations return to the
  -- sponsor, so revoking a distribution code never removes current users.
  UPDATE public.license_allocations
  SET state = 'revoked',
      revoked_at = now(),
      revoked_by = v_uid,
      effective_to = now(),
      notes = btrim(COALESCE(NULLIF(_reason, ''), 'Access code revoked')),
      updated_at = now()
  WHERE access_code_id = v_row.id
    AND state = 'reserved'
    AND beneficiary_user_id IS NULL;
  GET DIAGNOSTICS v_released = ROW_COUNT;

  INSERT INTO public.license_lifecycle_events (org_id, event, actor_id, payload)
  VALUES (
    v_row.org_id,
    'license_access_code_revoked',
    v_uid,
    jsonb_build_object(
      'code_id', v_row.id,
      'released_seats', v_released,
      'redeemed_seats_preserved', v_row.uses,
      'reason', btrim(COALESCE(NULLIF(_reason, ''), 'Access code revoked'))
    )
  );

  RETURN jsonb_build_object('ok', true, 'released_seats', v_released);
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_license_access_code(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_license_access_code(uuid, text) TO authenticated, service_role;

-- Onboarding uses this to keep a successfully activated account aligned with
-- the role printed on its code. A user may finish setup, but cannot turn a
-- student code into staff or administrator permissions by changing the form.
CREATE OR REPLACE FUNCTION public.my_activated_license_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT CASE ac.role
    WHEN 'family' THEN 'parent'
    WHEN 'guardian' THEN 'parent'
    WHEN 'case_manager' THEN 'educator'
    WHEN 'teacher' THEN 'educator'
    WHEN 'counselor' THEN 'educator'
    ELSE ac.role
  END
  INTO v_role
  FROM public.access_code_redemptions redemption
  JOIN public.access_codes ac ON ac.id = redemption.code_id
  WHERE redemption.user_id = v_uid
  ORDER BY redemption.redeemed_at DESC
  LIMIT 1;

  RETURN v_role;
END;
$$;

REVOKE ALL ON FUNCTION public.my_activated_license_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_activated_license_role() TO authenticated, service_role;

-- Access codes now consume the same purchased license pools as invitations.
-- Legacy pilot codes without a reserved allocation keep their existing
-- behavior; newly issued codes always claim the seat reserved for that code.
CREATE OR REPLACE FUNCTION public.redeem_access_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_hash text;
  v_row public.access_codes%ROWTYPE;
  v_account_role text;
  v_normalized_account_role text;
  v_primary_role text;
  v_membership_role text;
  v_app_role public.app_role;
  v_license_type text;
  v_target_org uuid;
  v_sponsor uuid;
  v_pool uuid;
  v_allocation uuid;
  v_code_reservation uuid;
  v_is_reserved_code boolean := false;
  v_capacity record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF _code IS NULL OR btrim(_code) = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  v_hash := encode(extensions.digest(btrim(_code), 'sha256'), 'hex');

  SELECT * INTO v_row
  FROM public.access_codes
  WHERE code_hash = v_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_code');
  END IF;
  IF v_row.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'revoked', 'code_id', v_row.id);
  END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired', 'code_id', v_row.id);
  END IF;
  IF (v_row.single_use AND v_row.uses >= 1)
     OR (v_row.capacity IS NOT NULL AND v_row.uses >= v_row.capacity) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'over_capacity', 'code_id', v_row.id);
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.access_code_redemptions r
    WHERE r.code_id = v_row.id AND r.user_id = v_uid
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'already_redeemed',
      'code_id', v_row.id,
      'org_id', v_row.org_id,
      'role', v_row.role
    );
  END IF;

  v_primary_role := CASE v_row.role
    WHEN 'family' THEN 'parent'
    WHEN 'guardian' THEN 'parent'
    WHEN 'case_manager' THEN 'educator'
    WHEN 'teacher' THEN 'educator'
    WHEN 'counselor' THEN 'educator'
    ELSE v_row.role
  END;
  v_membership_role := CASE v_row.role
    WHEN 'family' THEN 'parent'
    WHEN 'guardian' THEN 'parent'
    WHEN 'teacher' THEN 'educator'
    ELSE v_row.role
  END;
  v_app_role := CASE v_row.role
    WHEN 'family' THEN 'parent'::public.app_role
    WHEN 'guardian' THEN 'parent'::public.app_role
    WHEN 'teacher' THEN 'educator'::public.app_role
    WHEN 'counselor' THEN 'case_manager'::public.app_role
    ELSE v_row.role::public.app_role
  END;
  v_license_type := CASE
    WHEN v_row.role IN ('student','family','parent','guardian') THEN 'pathway'
    WHEN v_row.role IN ('educator','teacher','case_manager','counselor') THEN 'staff'
    WHEN v_row.role IN ('school_admin','district_admin') THEN 'admin'
    ELSE NULL
  END;
  v_target_org := COALESCE(v_row.target_organization_id, v_row.org_id);

  SELECT p.primary_role INTO v_account_role
  FROM public.profiles p
  WHERE p.id = v_uid;

  v_normalized_account_role := CASE v_account_role
    WHEN 'family' THEN 'parent'
    WHEN 'guardian' THEN 'parent'
    WHEN 'case_manager' THEN 'educator'
    WHEN 'teacher' THEN 'educator'
    WHEN 'counselor' THEN 'educator'
    ELSE v_account_role
  END;

  -- A code may establish the role of an account that has not completed
  -- onboarding. Once a role exists, a code from another role family cannot
  -- change it or silently add broader permissions.
  IF v_normalized_account_role IS NOT NULL
     AND btrim(v_normalized_account_role) <> ''
     AND v_normalized_account_role IS DISTINCT FROM v_primary_role THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'role_mismatch',
      'code_id', v_row.id,
      'org_id', v_target_org,
      'role', v_row.role,
      'account_role', v_account_role,
      'required_role', v_primary_role
    );
  END IF;

  IF v_target_org IS NOT NULL AND v_license_type IS NOT NULL THEN
    v_sponsor := public.sponsoring_org_for(v_target_org, v_license_type);

    PERFORM 1
    FROM public.license_pools p
    WHERE p.organization_id = v_sponsor
      AND p.license_type = v_license_type
      AND p.status = 'active'
      AND (p.effective_to IS NULL OR p.effective_to > now())
    ORDER BY p.id
    FOR UPDATE;

    SELECT p.id INTO v_pool
    FROM public.license_pools p
    WHERE p.organization_id = v_sponsor
      AND p.license_type = v_license_type
      AND p.status = 'active'
      AND (p.effective_to IS NULL OR p.effective_to > now())
    ORDER BY p.effective_from
    LIMIT 1;

    -- A missing pool identifies a legacy pilot entitlement. Once a paid pool
    -- exists, every code claim is represented in the allocation ledger.
    IF v_pool IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.license_allocations a
        WHERE a.access_code_id = v_row.id
      ) INTO v_is_reserved_code;

      -- Reuse coverage the account already holds with this sponsor. In that
      -- case one unclaimed code reservation is released instead of creating a
      -- duplicate live allocation for the same person.
      SELECT a.id INTO v_allocation
      FROM public.license_allocations a
      WHERE a.sponsor_organization_id = v_sponsor
        AND a.license_type = v_license_type
        AND a.state IN ('reserved','active')
        AND (
          a.beneficiary_user_id = v_uid
          OR (v_email <> '' AND a.beneficiary_email = v_email)
        )
      LIMIT 1;

      IF v_allocation IS NOT NULL THEN
        UPDATE public.license_allocations
        SET state = 'active',
            beneficiary_user_id = v_uid,
            beneficiary_email = COALESCE(beneficiary_email, NULLIF(v_email, '')),
            activated_at = COALESCE(activated_at, now()),
            reserved_until = NULL,
            updated_at = now()
        WHERE id = v_allocation
          AND state = 'reserved';

        IF v_is_reserved_code THEN
          SELECT a.id INTO v_code_reservation
          FROM public.license_allocations a
          WHERE a.access_code_id = v_row.id
            AND a.state = 'reserved'
            AND a.beneficiary_user_id IS NULL
          ORDER BY a.created_at
          LIMIT 1
          FOR UPDATE SKIP LOCKED;

          IF v_code_reservation IS NULL THEN
            RETURN jsonb_build_object(
              'ok', false,
              'reason', 'over_capacity',
              'code_id', v_row.id,
              'org_id', v_target_org,
              'role', v_row.role
            );
          END IF;

          UPDATE public.license_allocations
          SET state = 'revoked',
              revoked_at = now(),
              revoked_by = v_uid,
              effective_to = now(),
              notes = 'Released because this account already had sponsored coverage',
              updated_at = now()
          WHERE id = v_code_reservation;
        END IF;
      ELSE
        -- New codes claim a pre-reserved seat. This path never performs an
        -- independent capacity check because issuance already reserved it.
        SELECT a.id INTO v_code_reservation
        FROM public.license_allocations a
        WHERE a.access_code_id = v_row.id
          AND a.state = 'reserved'
          AND a.beneficiary_user_id IS NULL
        ORDER BY a.created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED;

        IF v_code_reservation IS NOT NULL THEN
          UPDATE public.license_allocations
          SET state = 'active',
              beneficiary_user_id = v_uid,
              beneficiary_email = NULLIF(v_email, ''),
              activated_at = now(),
              reserved_until = NULL,
              updated_at = now()
          WHERE id = v_code_reservation
          RETURNING id INTO v_allocation;
        ELSIF v_is_reserved_code THEN
          RETURN jsonb_build_object(
            'ok', false,
            'reason', 'over_capacity',
            'code_id', v_row.id,
            'org_id', v_target_org,
            'role', v_row.role
          );
        ELSE
          -- Backward-compatible fallback for pilot codes created before codes
          -- reserved capacity at issuance time.
        SELECT * INTO v_capacity
        FROM public.license_capacity(v_sponsor, v_license_type);
        IF v_capacity.available < 1 THEN
          RETURN jsonb_build_object(
            'ok', false,
            'reason', 'over_capacity',
            'code_id', v_row.id,
            'org_id', v_target_org,
            'role', v_row.role
          );
        END IF;

        INSERT INTO public.license_allocations (
          pool_id,
          sponsor_organization_id,
          sponsor_user_id,
          license_type,
          state,
          beneficiary_user_id,
          beneficiary_email,
          invitation_source,
          access_code_id,
          activated_at,
          created_by,
          notes
        ) VALUES (
          v_pool,
          v_sponsor,
          v_row.created_by,
          v_license_type,
          'active',
          v_uid,
          NULLIF(v_email, ''),
          'access_code',
          v_row.id,
          now(),
          v_row.created_by,
          CASE WHEN v_sponsor <> v_target_org
            THEN 'Covered by district umbrella license'
            ELSE NULL END
        )
        RETURNING id INTO v_allocation;
        END IF;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.access_code_redemptions (code_id, user_id)
  VALUES (v_row.id, v_uid);

  UPDATE public.access_codes
  SET uses = uses + 1
  WHERE id = v_row.id;

  UPDATE public.profiles
  SET primary_role = CASE
        WHEN primary_role IS NULL OR btrim(primary_role) = '' THEN v_primary_role
        ELSE primary_role
      END,
      organization_id = COALESCE(organization_id, v_target_org),
      updated_at = now()
  WHERE id = v_uid;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, v_app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_target_org IS NOT NULL THEN
    INSERT INTO public.organization_memberships
      (organization_id, user_id, role_within_org, status, membership_status)
    VALUES
      (v_target_org, v_uid, v_membership_role, 'active', 'active')
    ON CONFLICT (organization_id, user_id) DO UPDATE
      SET status = 'active',
          membership_status = 'active',
          role_within_org = EXCLUDED.role_within_org;
  END IF;

  INSERT INTO public.license_lifecycle_events
    (org_id, event, actor_id, payload)
  VALUES (
    v_row.org_id,
    'access_code_redeemed',
    v_uid,
    jsonb_build_object(
      'code_id', v_row.id,
      'role', v_row.role,
      'scope', v_row.scope,
      'single_use', v_row.single_use,
      'allocation_id', v_allocation,
      'target_organization_id', v_target_org,
      'sponsor_organization_id', v_sponsor
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'code_id', v_row.id,
    'org_id', v_target_org,
    'sponsor_org_id', v_sponsor,
    'role', v_row.role,
    'scope', v_row.scope
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_access_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_access_code(text) TO authenticated, service_role;