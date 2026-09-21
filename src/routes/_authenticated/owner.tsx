import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMyAdminRoles } from "@/lib/owner/owner.functions";
import { hasPlatformAdminRouteAccess } from "@/lib/owner/admin-route-access";

export const Route = createFileRoute("/_authenticated/owner")({
  beforeLoad: async () => {
    const allowed = await hasPlatformAdminRouteAccess(() => getMyAdminRoles());
    if (!allowed) {
      throw redirect({ to: "/dashboard", replace: true });
    }
  },
  component: () => <Outlet />,
});
