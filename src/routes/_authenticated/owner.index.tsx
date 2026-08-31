import { createFileRoute } from "@tanstack/react-router";

import { OwnerDashboardPage } from "@/components/owner/OwnerDashboardPage";
import { dashboardErrorComponent } from "@/components/dashboard/DashboardErrorFallback";

export const Route = createFileRoute("/_authenticated/owner/")({
  head: () => ({ meta: [{ title: "Admin Hub — TransitionForward" }] }),
  errorComponent: dashboardErrorComponent("owner"),
  component: OwnerDashboardPage,
});
