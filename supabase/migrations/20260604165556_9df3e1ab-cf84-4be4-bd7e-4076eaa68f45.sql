
-- 1) Extend app_role enum with district_admin (additive, non-breaking)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'district_admin';

-- 2) Allow organizations to reference a parent organization (district -> schools)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS organizations_parent_idx ON public.organizations(parent_organization_id);
