-- =====================================================================
-- 1. PLAN CATALOG
-- =====================================================================
CREATE TABLE public.plans (
  code                text PRIMARY KEY,
  name                text NOT NULL,
  description         text,
  billing_scope       text NOT NULL CHECK (billing_scope IN ('individual','organization')),
  org_kind            text CHECK (org_kind IN ('school','district','partner')),
  stripe_product_id   text,
  monthly_price_id    text,
  yearly_price_id     text,
  one_time_price_id   text,
  term_months         integer,
  auto_convert        boolean NOT NULL DEFAULT true,
  sales_assisted      boolean NOT NULL DEFAULT false,
  is_addon            boolean NOT NULL DEFAULT false,
  sort_order          integer NOT NULL DEFAULT 100,
  active              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO authenticated, anon;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plan catalog is readable" ON public.plans FOR SELECT USING (active OR public.is_platform_admin(auth.uid()));
CREATE POLICY "Platform admins manage plans" ON public.plans FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE TRIGGER plans_set_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.plan_capacities (
  plan_code                   text PRIMARY KEY REFERENCES public.plans(code) ON DELETE CASCADE,
  pathway_licenses            integer NOT NULL DEFAULT 0,
  staff_seats                 integer NOT NULL DEFAULT 0,
  admin_seats                 integer NOT NULL DEFAULT 0,
  max_schools                 integer,
  family_accounts_per_pathway integer NOT NULL DEFAULT 3,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_capacities_nonneg CHECK (
    pathway_licenses >= 0 AND staff_seats >= 0 AND admin_seats >= 0
    AND family_accounts_per_pathway >= 0
  )
);
GRANT SELECT ON public.plan_capacities TO authenticated, anon;
GRANT ALL ON public.plan_capacities TO service_role;
ALTER TABLE public.plan_capacities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plan capacities are readable" ON public.plan_capacities FOR SELECT USING (true);
CREATE POLICY "Platform admins manage plan capacities" ON public.plan_capacities FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE TRIGGER plan_capacities_set_updated_at BEFORE UPDATE ON public.plan_capacities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.plans
  (code, name, description, billing_scope, org_kind, stripe_product_id, monthly_price_id, yearly_price_id, one_time_price_id, term_months, auto_convert, sales_assisted, is_addon, sort_order)
VALUES
  ('individual_pathway','Individual Pathway','One student pathway with up to three connected family accounts.','individual',NULL,'tf_family','tf_family_monthly','tf_family_yearly',NULL,NULL,true,false,false,10),
  ('educator_solo','Educator Solo','One educator with up to five independent student pathways.','individual',NULL,'tf_educator','tf_educator_monthly','tf_educator_yearly',NULL,NULL,true,false,false,20),
  ('school_core','School Core','30 student pathways, 8 staff seats, 2 school administrators.','organization','school','tf_school',NULL,'tf_school_yearly',NULL,12,true,false,false,30),
  ('school_plus','School Plus','50 student pathways, 15 staff seats, 3 school administrators.','organization','school','tf_school_plus',NULL,'tf_school_plus_yearly',NULL,12,true,false,false,40),
  ('founding_pilot','Founding School Pilot','Six-month pilot with 20 pathways and 6 staff seats. No automatic conversion.','organization','school','tf_founding_pilot',NULL,NULL,'tf_founding_pilot_once',6,false,false,false,50),
  ('district_starter','District Starter','Up to 3 schools, 150 pathways, 35 staff seats.','organization','district','tf_district_starter',NULL,'tf_district_starter_yearly',NULL,12,true,false,false,60),
  ('district_growth','District Growth','Up to 8 schools, 400 pathways, 90 staff seats.','organization','district','tf_district_growth',NULL,'tf_district_growth_yearly',NULL,12,true,false,false,70),
  ('district_enterprise','District Enterprise','Custom contract sized to the district. Sales assisted.','organization','district',NULL,NULL,NULL,NULL,12,false,true,false,80),
  ('student_addon','Student Pathway Add-On','Pack of 10 additional active student pathway licenses.','organization',NULL,'tf_student_addon',NULL,'tf_student_addon_yearly',NULL,12,true,false,true,90),
  ('staff_addon','Staff Seat Add-On','Pack of 5 additional educator or counselor staff seats.','organization',NULL,'tf_staff_addon',NULL,'tf_staff_addon_yearly',NULL,12,true,false,true,95),
  ('partner_premium','Partner Premium','Unlimited opportunity listings, analytics, and featured placement.','organization','partner','tf_partner_premium','tf_partner_premium_monthly','tf_partner_premium_yearly',NULL,NULL,true,false,false,120);

INSERT INTO public.plan_capacities
  (plan_code, pathway_licenses, staff_seats, admin_seats, max_schools, family_accounts_per_pathway)
VALUES
  ('individual_pathway', 1,   0,  0, NULL, 3),
  ('educator_solo',      5,   1,  0, NULL, 3),
  ('school_core',        30,  8,  2, 1,    3),
  ('school_plus',        50,  15, 3, 1,    3),
  ('founding_pilot',     20,  6,  1, 1,    3),
  ('district_starter',   150, 35, 5, 3,    3),
  ('district_growth',    400, 90, 10, 8,   3),
  ('district_enterprise',0,   0,  0, NULL, 3),
  ('student_addon',      10,  0,  0, NULL, 3),
  ('staff_addon',        0,   5,  0, NULL, 3),
  ('partner_premium',    0,   0,  0, NULL, 3);

-- =====================================================================
-- 2. BILLING ACCOUNTS — one paying party, one Stripe customer
-- =====================================================================
CREATE TABLE public.billing_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id     uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_customer_id  text NOT NULL,
  environment         text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','live')),
  billing_email       text,
  collection_method   text NOT NULL DEFAULT 'charge_automatically'
                        CHECK (collection_method IN ('charge_automatically','send_invoice')),
  purchase_order_ref  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_accounts_subject_check CHECK (num_nonnulls(user_id, organization_id) = 1)
);
CREATE UNIQUE INDEX billing_accounts_customer_uidx
  ON public.billing_accounts (stripe_customer_id, environment);
CREATE UNIQUE INDEX billing_accounts_user_uidx
  ON public.billing_accounts (user_id, environment) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX billing_accounts_org_uidx
  ON public.billing_accounts (organization_id, environment) WHERE organization_id IS NOT NULL;
GRANT SELECT ON public.billing_accounts TO authenticated;
GRANT ALL ON public.billing_accounts TO service_role;
ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View my billing account" ON public.billing_accounts FOR SELECT TO authenticated
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR (organization_id IS NOT NULL AND public.is_org_admin(auth.uid(), organization_id))
    OR public.is_platform_admin(auth.uid())
  );
CREATE POLICY "Platform admins manage billing accounts" ON public.billing_accounts FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE TRIGGER billing_accounts_set_updated_at BEFORE UPDATE ON public.billing_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- 3. SUBSCRIPTION / INVITATION LINKAGE (extend, never duplicate)
-- =====================================================================
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_code          text REFERENCES public.plans(code),
  ADD COLUMN IF NOT EXISTS billing_account_id uuid REFERENCES public.billing_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS collection_method  text NOT NULL DEFAULT 'charge_automatically',
  ADD COLUMN IF NOT EXISTS grace_until        timestamptz;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_collection_method_check
  CHECK (collection_method IN ('charge_automatically','send_invoice'));
CREATE INDEX IF NOT EXISTS subscriptions_plan_code_idx ON public.subscriptions (plan_code);
CREATE INDEX IF NOT EXISTS subscriptions_billing_account_idx ON public.subscriptions (billing_account_id);

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS license_type text CHECK (license_type IN ('pathway','staff','admin'));

-- =====================================================================
-- 4. LICENSE POOLS — purchased capacity
-- =====================================================================
CREATE TABLE public.license_pools (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  license_type     text NOT NULL CHECK (license_type IN ('pathway','staff','admin')),
  source           text NOT NULL DEFAULT 'subscription'
                     CHECK (source IN ('subscription','addon','grant','pilot')),
  plan_code        text REFERENCES public.plans(code),
  subscription_id  uuid REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  purchased        integer NOT NULL DEFAULT 0 CHECK (purchased >= 0),
  status           text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','suspended','expired')),
  effective_from   timestamptz NOT NULL DEFAULT now(),
  effective_to     timestamptz,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT license_pools_subject_check CHECK (num_nonnulls(user_id, organization_id) = 1)
);
CREATE INDEX license_pools_org_idx ON public.license_pools (organization_id, license_type) WHERE organization_id IS NOT NULL;
CREATE INDEX license_pools_user_idx ON public.license_pools (user_id, license_type) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX license_pools_subscription_type_uidx
  ON public.license_pools (subscription_id, license_type, source) WHERE subscription_id IS NOT NULL;
GRANT SELECT ON public.license_pools TO authenticated;
GRANT ALL ON public.license_pools TO service_role;
ALTER TABLE public.license_pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View license pools I administer" ON public.license_pools FOR SELECT TO authenticated
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
    OR public.is_platform_admin(auth.uid())
  );
CREATE POLICY "Platform admins manage license pools" ON public.license_pools FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE TRIGGER license_pools_set_updated_at BEFORE UPDATE ON public.license_pools
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- 5. LICENSE ALLOCATIONS — who holds a license
-- =====================================================================
CREATE TABLE public.license_allocations (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id                  uuid NOT NULL REFERENCES public.license_pools(id) ON DELETE CASCADE,
  sponsor_organization_id  uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  sponsor_user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  license_type             text NOT NULL CHECK (license_type IN ('pathway','staff','admin')),
  state                    text NOT NULL DEFAULT 'reserved'
                             CHECK (state IN ('reserved','active','revoked','expired','transferred')),
  beneficiary_user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  beneficiary_email        text,
  student_id               uuid REFERENCES public.students(id) ON DELETE SET NULL,
  invitation_id            uuid REFERENCES public.invitations(id) ON DELETE SET NULL,
  invitation_source        text,
  reserved_until           timestamptz,
  effective_from           timestamptz NOT NULL DEFAULT now(),
  effective_to             timestamptz,
  activated_at             timestamptz,
  revoked_at               timestamptz,
  revoked_by               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  transferred_to           uuid REFERENCES public.license_allocations(id) ON DELETE SET NULL,
  created_by               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX license_allocations_pool_idx ON public.license_allocations (pool_id, state);
CREATE INDEX license_allocations_org_idx  ON public.license_allocations (sponsor_organization_id, license_type, state);
CREATE INDEX license_allocations_user_idx ON public.license_allocations (beneficiary_user_id, state);
CREATE INDEX license_allocations_reserved_idx ON public.license_allocations (reserved_until) WHERE state = 'reserved';
-- One live pathway license per student; one live staff/admin seat per person per sponsor.
CREATE UNIQUE INDEX license_allocations_student_live_uidx
  ON public.license_allocations (student_id)
  WHERE student_id IS NOT NULL AND state IN ('reserved','active');
CREATE UNIQUE INDEX license_allocations_seat_live_uidx
  ON public.license_allocations (sponsor_organization_id, beneficiary_user_id, license_type)
  WHERE beneficiary_user_id IS NOT NULL AND license_type IN ('staff','admin') AND state IN ('reserved','active');
GRANT SELECT ON public.license_allocations TO authenticated;
GRANT ALL ON public.license_allocations TO service_role;
ALTER TABLE public.license_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View allocations I hold or administer" ON public.license_allocations FOR SELECT TO authenticated
  USING (
    beneficiary_user_id = auth.uid()
    OR (sponsor_organization_id IS NOT NULL AND public.is_org_admin(auth.uid(), sponsor_organization_id))
    OR public.is_platform_admin(auth.uid())
  );
CREATE POLICY "Platform admins manage allocations" ON public.license_allocations FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE TRIGGER license_allocations_set_updated_at BEFORE UPDATE ON public.license_allocations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- 6. CAPACITY FUNCTIONS — transactional, lock-first
-- =====================================================================

-- Live capacity for one org and license type. reserved + active both count.
CREATE OR REPLACE FUNCTION public.license_capacity(_org_id uuid, _license_type text)
RETURNS TABLE(purchased integer, reserved integer, active integer, available integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH pools AS (
    SELECT id, purchased FROM public.license_pools
    WHERE organization_id = _org_id
      AND license_type = _license_type
      AND status = 'active'
      AND (effective_to IS NULL OR effective_to > now())
  ),
  allocs AS (
    SELECT a.state FROM public.license_allocations a
    WHERE a.pool_id IN (SELECT id FROM pools)
  )
  SELECT
    COALESCE((SELECT sum(purchased) FROM pools), 0)::int,
    (SELECT count(*) FROM allocs WHERE state = 'reserved')::int,
    (SELECT count(*) FROM allocs WHERE state = 'active')::int,
    GREATEST(
      COALESCE((SELECT sum(purchased) FROM pools), 0)
      - (SELECT count(*) FROM allocs WHERE state IN ('reserved','active')), 0
    )::int;
$$;

-- Full utilisation summary for an org (all three capacity types).
CREATE OR REPLACE FUNCTION public.org_capacity_summary(_org_id uuid)
RETURNS TABLE(license_type text, purchased integer, reserved integer, active integer, available integer, utilization numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE t text; c record;
BEGIN
  IF NOT (public.is_org_member(auth.uid(), _org_id) OR public.is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized for this organization' USING ERRCODE = '42501';
  END IF;
  FOREACH t IN ARRAY ARRAY['pathway','staff','admin'] LOOP
    SELECT * INTO c FROM public.license_capacity(_org_id, t);
    license_type := t;
    purchased := c.purchased;
    reserved := c.reserved;
    active := c.active;
    available := c.available;
    utilization := CASE WHEN c.purchased = 0 THEN 0
      ELSE round(((c.reserved + c.active)::numeric / c.purchased::numeric), 4) END;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Release expired reservations so capacity comes back automatically.
CREATE OR REPLACE FUNCTION public.release_expired_license_reservations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.license_allocations
     SET state = 'expired', effective_to = now(), updated_at = now()
   WHERE state = 'reserved'
     AND reserved_until IS NOT NULL
     AND reserved_until < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Reserve one license. Locks the org's pools first so concurrent invitations
-- serialize and can never over-allocate.
CREATE OR REPLACE FUNCTION public.reserve_license_allocation(
  _org_id uuid,
  _license_type text,
  _beneficiary_email text DEFAULT NULL,
  _beneficiary_user_id uuid DEFAULT NULL,
  _student_id uuid DEFAULT NULL,
  _invitation_id uuid DEFAULT NULL,
  _invitation_source text DEFAULT 'admin_invite',
  _reserved_until timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pool uuid;
  v_cap record;
  v_alloc uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.is_org_admin(auth.uid(), _org_id) OR public.is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Only organization administrators can allocate licenses' USING ERRCODE = '42501';
  END IF;
  IF _license_type NOT IN ('pathway','staff','admin') THEN
    RAISE EXCEPTION 'Unknown license type: %', _license_type USING ERRCODE = '22023';
  END IF;

  -- Lock every pool of this type for the org: the serialization point.
  PERFORM 1 FROM public.license_pools
   WHERE organization_id = _org_id AND license_type = _license_type
   ORDER BY id FOR UPDATE;

  -- Reclaim expired reservations before measuring capacity.
  UPDATE public.license_allocations a
     SET state = 'expired', effective_to = now(), updated_at = now()
   WHERE a.state = 'reserved'
     AND a.reserved_until IS NOT NULL AND a.reserved_until < now()
     AND a.pool_id IN (SELECT id FROM public.license_pools
                        WHERE organization_id = _org_id AND license_type = _license_type);

  SELECT * INTO v_cap FROM public.license_capacity(_org_id, _license_type);
  IF v_cap.available < 1 THEN
    RAISE EXCEPTION 'No % capacity available (% purchased, % in use)',
      _license_type, v_cap.purchased, v_cap.reserved + v_cap.active
      USING ERRCODE = '23514';
  END IF;

  SELECT id INTO v_pool FROM public.license_pools
   WHERE organization_id = _org_id AND license_type = _license_type
     AND status = 'active' AND (effective_to IS NULL OR effective_to > now())
   ORDER BY effective_from
   LIMIT 1;
  IF v_pool IS NULL THEN
    RAISE EXCEPTION 'No active license pool for %', _license_type USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.license_allocations (
    pool_id, sponsor_organization_id, sponsor_user_id, license_type, state,
    beneficiary_user_id, beneficiary_email, student_id, invitation_id,
    invitation_source, reserved_until, created_by
  ) VALUES (
    v_pool, _org_id, auth.uid(), _license_type, 'reserved',
    _beneficiary_user_id, lower(_beneficiary_email), _student_id, _invitation_id,
    _invitation_source, COALESCE(_reserved_until, now() + interval '14 days'), auth.uid()
  ) RETURNING id INTO v_alloc;

  RETURN v_alloc;
END;
$$;

-- Turn a reservation into an active license when the invitee accepts.
CREATE OR REPLACE FUNCTION public.activate_license_allocation(_allocation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.license_allocations%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.license_allocations WHERE id = _allocation_id FOR UPDATE;
  IF v_row.id IS NULL THEN RETURN false; END IF;
  IF v_row.state <> 'reserved' THEN RETURN false; END IF;
  IF v_row.reserved_until IS NOT NULL AND v_row.reserved_until < now() THEN
    UPDATE public.license_allocations SET state = 'expired', effective_to = now() WHERE id = _allocation_id;
    RETURN false;
  END IF;
  UPDATE public.license_allocations
     SET state = 'active', beneficiary_user_id = COALESCE(_user_id, beneficiary_user_id),
         activated_at = now(), reserved_until = NULL, updated_at = now()
   WHERE id = _allocation_id;
  RETURN true;
END;
$$;

-- Revoke a license; capacity returns to the pool immediately.
CREATE OR REPLACE FUNCTION public.revoke_license_allocation(_allocation_id uuid, _reason text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.license_allocations%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.license_allocations WHERE id = _allocation_id FOR UPDATE;
  IF v_row.id IS NULL THEN RETURN false; END IF;
  IF NOT (public.is_org_admin(auth.uid(), v_row.sponsor_organization_id)
          OR public.is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Only organization administrators can revoke licenses' USING ERRCODE = '42501';
  END IF;
  IF v_row.state NOT IN ('reserved','active') THEN RETURN false; END IF;
  UPDATE public.license_allocations
     SET state = 'revoked', revoked_at = now(), revoked_by = auth.uid(),
         effective_to = now(), notes = COALESCE(_reason, notes), updated_at = now()
   WHERE id = _allocation_id;
  RETURN true;
END;
$$;

-- Reassign a license to a different person/student in one transaction.
CREATE OR REPLACE FUNCTION public.transfer_license_allocation(
  _allocation_id uuid,
  _to_email text DEFAULT NULL,
  _to_user_id uuid DEFAULT NULL,
  _to_student_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.license_allocations%ROWTYPE; v_new uuid;
BEGIN
  SELECT * INTO v_row FROM public.license_allocations WHERE id = _allocation_id FOR UPDATE;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Allocation not found'; END IF;
  IF NOT (public.is_org_admin(auth.uid(), v_row.sponsor_organization_id)
          OR public.is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Only organization administrators can transfer licenses' USING ERRCODE = '42501';
  END IF;
  IF v_row.state NOT IN ('reserved','active') THEN
    RAISE EXCEPTION 'Only a live license can be transferred' USING ERRCODE = '23514';
  END IF;

  -- Free the old holder first so the uniqueness guards do not collide.
  UPDATE public.license_allocations
     SET state = 'transferred', effective_to = now(), updated_at = now()
   WHERE id = _allocation_id;

  INSERT INTO public.license_allocations (
    pool_id, sponsor_organization_id, sponsor_user_id, license_type, state,
    beneficiary_user_id, beneficiary_email, student_id, invitation_source,
    reserved_until, created_by, notes
  ) VALUES (
    v_row.pool_id, v_row.sponsor_organization_id, auth.uid(), v_row.license_type, 'reserved',
    _to_user_id, lower(_to_email), _to_student_id, 'transfer',
    now() + interval '14 days', auth.uid(),
    'Transferred from ' || _allocation_id::text
  ) RETURNING id INTO v_new;

  UPDATE public.license_allocations SET transferred_to = v_new WHERE id = _allocation_id;
  RETURN v_new;
END;
$$;

-- True when a user currently holds a live sponsored license of any type.
CREATE OR REPLACE FUNCTION public.has_sponsored_license(_user_id uuid, _license_type text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.license_allocations a
    JOIN public.license_pools p ON p.id = a.pool_id
    WHERE a.beneficiary_user_id = _user_id
      AND a.state = 'active'
      AND (a.effective_to IS NULL OR a.effective_to > now())
      AND p.status = 'active'
      AND (p.effective_to IS NULL OR p.effective_to > now())
      AND (_license_type IS NULL OR a.license_type = _license_type)
  );
$$;

-- Student pathway coverage: sponsored license OR the owner's personal plan.
CREATE OR REPLACE FUNCTION public.student_pathway_licensed(_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.license_allocations a
    WHERE a.student_id = _student_id AND a.state = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.access_entitlements e ON e.user_id = s.owner_id
    WHERE s.id = _student_id
      AND e.status IN ('trial','pilot','active','comped')
      AND (e.ends_at IS NULL OR e.ends_at > now())
  );
$$;