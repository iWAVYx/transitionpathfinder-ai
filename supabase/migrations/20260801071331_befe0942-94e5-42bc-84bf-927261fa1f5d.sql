CREATE OR REPLACE FUNCTION public.tg_release_allocation_on_membership_end()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid := COALESCE(OLD.organization_id, NEW.organization_id);
  v_user uuid := COALESCE(OLD.user_id, NEW.user_id);
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.membership_status = 'active'
     AND NEW.status = 'active' THEN
    RETURN NEW;
  END IF;

  UPDATE public.license_allocations
  SET state = 'revoked',
      revoked_at = now(),
      notes = 'Organization membership ended',
      updated_at = now()
  WHERE sponsor_organization_id = v_org
    AND beneficiary_user_id = v_user
    AND state IN ('reserved','active');

  RETURN COALESCE(NEW, OLD);
END;
$$;