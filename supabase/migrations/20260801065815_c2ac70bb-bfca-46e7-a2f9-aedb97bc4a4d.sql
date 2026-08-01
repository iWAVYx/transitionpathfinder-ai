REVOKE EXECUTE ON FUNCTION public.license_capacity(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.org_capacity_summary(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.release_expired_license_reservations() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reserve_license_allocation(uuid, text, text, uuid, uuid, uuid, text, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.activate_license_allocation(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.revoke_license_allocation(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.transfer_license_allocation(uuid, text, uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_sponsored_license(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.student_pathway_licensed(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.license_capacity(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.org_capacity_summary(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_expired_license_reservations() TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_license_allocation(uuid, text, text, uuid, uuid, uuid, text, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.activate_license_allocation(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_license_allocation(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transfer_license_allocation(uuid, text, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_sponsored_license(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.student_pathway_licensed(uuid) TO authenticated, service_role;