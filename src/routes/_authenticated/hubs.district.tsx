import { organizationRouteErrorComponent } from "@/components/routing/OrganizationRouteError";
import { OrganizationLoadError } from "@/components/dashboard/OrganizationLoadError";
import { districtDashboardNavigation } from "@/lib/organization-dashboard-navigation";
import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { WorkspaceZone } from "@/components/dashboard/CommandCenter";
import { DistrictAdminOverviewGrid } from "@/components/dashboard/role/DistrictAdminOverviewGrid";
import { DashboardWidgetBoard } from "@/components/dashboard/DashboardWidgetBoard";
import { useDistrictDashboard } from "@/components/district/DistrictPageShell";
import { getHub } from "@/lib/hubs/registry";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/hubs/district")({
  ...districtDashboardNavigation,
  errorComponent: organizationRouteErrorComponent("district", "/hubs/district"),
  beforeLoad: () => ensureRoleAccess(["district_admin", "admin"]),
  head: () => ({
    meta: [
      { title: "District Strategy Hub — TransitionForward" },
      {
        name: "description",
        content: "District-level readiness, service-gap visibility, and adoption signals.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HubPage,
});

function HubPage() {
  const { data, loading, districtId, reload, recoverSelection } = useDistrictDashboard();

  return (
    <SiteShell>
      <HubShell hub={getHub("district-strategy")!} hideSpokes hideRelatedLinks>
        <WorkspaceZone>
          {!loading && !data ? (
            <OrganizationLoadError onRetry={() => void reload()} onRecoverSelection={recoverSelection} />
          ) : (
            <>
              <DistrictAdminOverviewGrid
                liveData={data}
                selectedDistrictId={districtId}
                loading={loading}
              />
              <DashboardWidgetBoard role="district_admin" organizationId={loading ? undefined : districtId} />
            </>
          )}
        </WorkspaceZone>
      </HubShell>
    </SiteShell>
  );
}
