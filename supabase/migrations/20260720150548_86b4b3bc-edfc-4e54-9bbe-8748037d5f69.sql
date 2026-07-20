
-- W6 — Signup, waitlist, license, access provisioning
-- Additive tables + column extensions. Idempotent.

-- 1) Extend invitations with capacity/uses/single_use for bulk district invites.
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS capacity integer,
  ADD COLUMN IF NOT EXISTS uses integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS single_use boolean NOT NULL DEFAULT true;

ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_capacity_nonneg;
ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_capacity_nonneg CHECK (capacity IS NULL OR capacity >= 0);

ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_uses_nonneg;
ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_uses_nonneg CHECK (uses >= 0);

-- 2) org_license_requests: school/district/partner asking for licensed access.
CREATE TABLE IF NOT EXISTS public.org_license_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_type text NOT NULL CHECK (org_type = ANY (ARRAY['school','district','partner'])),
  requester_user_id uuid NOT NULL,
  org_name text NOT NULL,
  contact_email text NOT NULL,
  contact_name text,
  contact_phone text,
  seat_count integer,
  notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending','in_review','approved','denied','withdrawn'])),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  approved_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_license_requests_seat_nonneg CHECK (seat_count IS NULL OR seat_count >= 0)
);

CREATE INDEX IF NOT EXISTS org_license_requests_status_idx
  ON public.org_license_requests (status);
CREATE INDEX IF NOT EXISTS org_license_requests_requester_idx
  ON public.org_license_requests (requester_user_id);

GRANT SELECT, INSERT, UPDATE ON public.org_license_requests TO authenticated;
GRANT ALL ON public.org_license_requests TO service_role;

ALTER TABLE public.org_license_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requester or platform admin can view license request"
  ON public.org_license_requests;
CREATE POLICY "requester or platform admin can view license request"
  ON public.org_license_requests FOR SELECT TO authenticated
  USING (
    requester_user_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS "authenticated users can submit license request"
  ON public.org_license_requests;
CREATE POLICY "authenticated users can submit license request"
  ON public.org_license_requests FOR INSERT TO authenticated
  WITH CHECK (requester_user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "platform admin updates license request"
  ON public.org_license_requests;
CREATE POLICY "platform admin updates license request"
  ON public.org_license_requests FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

DROP TRIGGER IF EXISTS org_license_requests_set_updated_at ON public.org_license_requests;
CREATE TRIGGER org_license_requests_set_updated_at
  BEFORE UPDATE ON public.org_license_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) access_codes: redeemable codes that grant entitlement on redemption.
--    Never a password; token stored hashed.
CREATE TABLE IF NOT EXISTS public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text NOT NULL,
  scope text NOT NULL DEFAULT 'org_member',
  capacity integer,
  uses integer NOT NULL DEFAULT 0,
  single_use boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT access_codes_capacity_nonneg CHECK (capacity IS NULL OR capacity >= 0),
  CONSTRAINT access_codes_uses_nonneg CHECK (uses >= 0),
  CONSTRAINT access_codes_uses_le_capacity CHECK (capacity IS NULL OR uses <= capacity)
);

CREATE INDEX IF NOT EXISTS access_codes_org_idx ON public.access_codes (org_id);
CREATE INDEX IF NOT EXISTS access_codes_expires_idx ON public.access_codes (expires_at);

GRANT SELECT, INSERT, UPDATE ON public.access_codes TO authenticated;
GRANT ALL ON public.access_codes TO service_role;

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org admin or platform admin views access codes"
  ON public.access_codes;
CREATE POLICY "org admin or platform admin views access codes"
  ON public.access_codes FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin(auth.uid(), org_id))
  );

DROP POLICY IF EXISTS "org admin or platform admin issues access codes"
  ON public.access_codes;
CREATE POLICY "org admin or platform admin issues access codes"
  ON public.access_codes FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.is_platform_admin(auth.uid())
      OR (org_id IS NOT NULL AND public.is_org_admin(auth.uid(), org_id))
    )
  );

DROP POLICY IF EXISTS "org admin or platform admin revokes access codes"
  ON public.access_codes;
CREATE POLICY "org admin or platform admin revokes access codes"
  ON public.access_codes FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin(auth.uid(), org_id))
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin(auth.uid(), org_id))
  );

DROP TRIGGER IF EXISTS access_codes_set_updated_at ON public.access_codes;
CREATE TRIGGER access_codes_set_updated_at
  BEFORE UPDATE ON public.access_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) access_code_redemptions: append-only audit of who redeemed a code.
CREATE TABLE IF NOT EXISTS public.access_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.access_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);

CREATE INDEX IF NOT EXISTS access_code_redemptions_user_idx
  ON public.access_code_redemptions (user_id);

GRANT SELECT, INSERT ON public.access_code_redemptions TO authenticated;
GRANT ALL ON public.access_code_redemptions TO service_role;

ALTER TABLE public.access_code_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user views own redemption or org admin views org codes"
  ON public.access_code_redemptions;
CREATE POLICY "user views own redemption or org admin views org codes"
  ON public.access_code_redemptions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.access_codes ac
      WHERE ac.id = access_code_redemptions.code_id
        AND ac.org_id IS NOT NULL
        AND public.is_org_admin(auth.uid(), ac.org_id)
    )
  );

DROP POLICY IF EXISTS "user records own redemption"
  ON public.access_code_redemptions;
CREATE POLICY "user records own redemption"
  ON public.access_code_redemptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5) license_lifecycle_events: append-only audit ledger of license transitions.
CREATE TABLE IF NOT EXISTS public.license_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  event text NOT NULL,
  actor_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS license_lifecycle_events_org_idx
  ON public.license_lifecycle_events (org_id);
CREATE INDEX IF NOT EXISTS license_lifecycle_events_license_idx
  ON public.license_lifecycle_events (license_id);
CREATE INDEX IF NOT EXISTS license_lifecycle_events_occurred_idx
  ON public.license_lifecycle_events (occurred_at DESC);

GRANT SELECT, INSERT ON public.license_lifecycle_events TO authenticated;
GRANT ALL ON public.license_lifecycle_events TO service_role;

ALTER TABLE public.license_lifecycle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org admin or platform admin views lifecycle events"
  ON public.license_lifecycle_events;
CREATE POLICY "org admin or platform admin views lifecycle events"
  ON public.license_lifecycle_events FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin(auth.uid(), org_id))
  );

DROP POLICY IF EXISTS "org admin or platform admin records lifecycle events"
  ON public.license_lifecycle_events;
CREATE POLICY "org admin or platform admin records lifecycle events"
  ON public.license_lifecycle_events FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND (
      public.is_platform_admin(auth.uid())
      OR (org_id IS NOT NULL AND public.is_org_admin(auth.uid(), org_id))
    )
  );
