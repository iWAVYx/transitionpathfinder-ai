
-- QA fixture districts (idempotent by name)
INSERT INTO public.organizations (id, name, type, verified_status)
VALUES
  ('11111111-1111-1111-1111-1111111111aa', 'QA District A (test)', 'district', 'pending'),
  ('11111111-1111-1111-1111-1111111111bb', 'QA District B (test)', 'district', 'pending')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, type=EXCLUDED.type, verified_status=EXCLUDED.verified_status;

-- District A admin: qa.districtadmin
INSERT INTO public.organization_memberships (user_id, organization_id, role_within_org, status)
SELECT 'b4aec3a7-daa5-453d-9481-a45bac781437'::uuid, '11111111-1111-1111-1111-1111111111aa'::uuid, 'district_admin', 'active'
ON CONFLICT (user_id, organization_id) DO UPDATE SET role_within_org='district_admin', status='active';

-- District B admin: qa.schooladmin
INSERT INTO public.organization_memberships (user_id, organization_id, role_within_org, status)
SELECT '97c6e8b7-faa9-4bd0-a044-012c55122ddd'::uuid, '11111111-1111-1111-1111-1111111111bb'::uuid, 'district_admin', 'active'
ON CONFLICT (user_id, organization_id) DO UPDATE SET role_within_org='district_admin', status='active';

-- District B extra member: qa.parent (cross-district "stranger" record)
INSERT INTO public.organization_memberships (user_id, organization_id, role_within_org, status)
SELECT '038f92be-916f-4dc9-84e4-b36f9645f5c2'::uuid, '11111111-1111-1111-1111-1111111111bb'::uuid, 'member', 'active'
ON CONFLICT (user_id, organization_id) DO UPDATE SET role_within_org='member', status='active';
