import { createFileRoute } from "@tanstack/react-router";
import { OwnerDashboardPage } from "@/components/owner/OwnerDashboardPage";
import { dashboardErrorComponent } from "@/components/dashboard/DashboardErrorFallback";

// Legacy /admin route — render the same Admin Hub dashboard so main-scoped
// signed-in regressions can assert the Platform Admin landmark on this path.
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Hub — TransitionForward" }] }),
  errorComponent: dashboardErrorComponent("owner"),
  component: OwnerDashboardPage,
});
