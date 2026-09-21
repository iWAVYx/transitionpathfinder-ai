import { createFileRoute, redirect } from "@tanstack/react-router";
import { OwnerDashboardPage } from "@/components/owner/OwnerDashboardPage";
import { dashboardErrorComponent } from "@/components/dashboard/DashboardErrorFallback";
import { getMyAdminRoles } from "@/lib/owner/owner.functions";
import { hasPlatformAdminRouteAccess } from "@/lib/owner/admin-route-access";

// Legacy /admin route — render the same Admin Hub dashboard so main-scoped
// signed-in regressions can assert the Platform Admin landmark on this path.
export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const allowed = await hasPlatformAdminRouteAccess(() => getMyAdminRoles());
    if (!allowed) {
      throw redirect({ to: "/dashboard", replace: true });
    }
  },
  head: () => ({ meta: [{ title: "Admin Hub — TransitionForward" }] }),
  errorComponent: dashboardErrorComponent("owner"),
  component: OwnerDashboardPage,
});
