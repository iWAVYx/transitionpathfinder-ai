import { districtDashboardNavigation } from "@/lib/organization-dashboard-navigation";
import { createFileRoute } from "@tanstack/react-router";
import { useOrganizationDashboardLoad } from "@/hooks/use-organization-dashboard-load";
import { OrganizationLoadError } from "@/components/dashboard/OrganizationLoadError";
import { useServerFn } from "@tanstack/react-start";

import { DistrictPageShell, useDistrictDashboard } from "@/components/district/DistrictPageShell";
import { ensureRoleAccess } from "@/lib/route-role-guard";
import {
  getDistrictReadinessTrends,
  type ReadinessTrendData,
} from "@/lib/school-insights.functions";
import { TrendsView } from "./school.readiness-trends";
import { SchoolComparisonChart } from "@/components/district/SchoolComparisonChart";

export const Route = createFileRoute("/_authenticated/district/readiness-trends")({
  ...districtDashboardNavigation,
  beforeLoad: () => ensureRoleAccess(["district_admin", "admin"]),
  head: () => ({
    meta: [
      { title: "District Readiness Trends — TransitionForward" },
      {
        name: "description",
        content:
          "District-wide movement across the readiness domains — aggregated across every connected school.",
      },
    ],
  }),
  component: DistrictReadinessTrendsPage,
});

function DistrictReadinessTrendsPage() {
  const { data: dash, loading: dashLoading, districtId, reload, recoverSelection } = useDistrictDashboard();
  const fetchTrends = useServerFn(getDistrictReadinessTrends);
  const { data: trend, loading: trendLoading, reload: reloadTrend } = useOrganizationDashboardLoad<ReadinessTrendData>(
    (id) => fetchTrends({ data: { district_id: id } }),
    (result) => result.org_id,
    "Could not load district readiness information.",
    { id: districtId, active: !dashLoading && !!dash?.selected_district_id },
  );

  return (
    <DistrictPageShell
      path="/district/readiness-trends"
      title="Readiness Trends"
      subtitle="Average readiness score per pillar, rolled up across every school in your district."
      data={dash}
      loading={dashLoading}
      districtId={districtId}
      onSwitchDistrict={(id) => reload(id)}
      onRecoverSelection={recoverSelection}
    >
      {() => (
        <div className="space-y-6">
          <SchoolComparisonChart schools={[]} />
          {!trendLoading && !trend ? (
            <OrganizationLoadError onRetry={() => void reloadTrend()} onRecoverSelection={recoverSelection} />
          ) : (
            <TrendsView data={trend} loading={trendLoading} scopeLabel="district" />
          )}
        </div>
      )}
    </DistrictPageShell>
  );
}
