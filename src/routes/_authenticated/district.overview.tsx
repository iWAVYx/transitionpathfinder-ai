import { DistrictAdminOverviewGrid } from "@/components/dashboard/role/DistrictAdminOverviewGrid";
import { DashboardWidgetBoard } from "@/components/dashboard/DashboardWidgetBoard";
import { createFileRoute } from "@tanstack/react-router";
import { withRoleGuard } from "@/components/withRoleGuard";
import { ensureRoleAccess } from "@/lib/route-role-guard";

import { DistrictPageShell, useDistrictDashboard } from "@/components/district/DistrictPageShell";

import { dashboardErrorComponent } from "@/components/dashboard/DashboardErrorFallback";

export const Route = createFileRoute("/_authenticated/district/overview")({
  head: () => ({
    meta: [{ title: "District Overview — TransitionForward" }],
  }),
  beforeLoad: () => ensureRoleAccess(["district_admin", "admin"]),
  errorComponent: dashboardErrorComponent("district_admin"),
  component: withRoleGuard(["district_admin", "admin"], DistrictOverviewPage),
});

function DistrictOverviewPage() {
  const { data, loading, districtId, reload } = useDistrictDashboard();
  return (
    <DistrictPageShell
      path="/district/overview"
      title="District Transition Planning Overview"
      subtitle="Adoption, readiness trends, and service gaps across every connected school in your district."
      data={data}
      loading={loading}
      districtId={districtId}
      onSwitchDistrict={(id) => reload(id)}
    >
      {(_, d) => (
        <div className="space-y-6 sm:space-y-8">
          <DistrictAdminOverviewGrid liveData={d} selectedDistrictId={districtId} hideOverview />
          <DashboardWidgetBoard role="district_admin" />
        </div>
      )}
    </DistrictPageShell>
  );
}
