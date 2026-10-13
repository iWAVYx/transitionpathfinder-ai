import { OrganizationLoadError } from "@/components/dashboard/OrganizationLoadError";
import { schoolDashboardNavigation } from "@/lib/organization-dashboard-navigation";
import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { WorkspaceZone } from "@/components/dashboard/CommandCenter";
import { SchoolAdminOverviewGrid } from "@/components/dashboard/role/SchoolAdminOverviewGrid";
import { DashboardWidgetBoard } from "@/components/dashboard/DashboardWidgetBoard";
import { useSchoolDashboard } from "@/components/school/SchoolPageShell";
import { getHub } from "@/lib/hubs/registry";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/hubs/school")({
  ...schoolDashboardNavigation,
  beforeLoad: () => ensureRoleAccess(["school_admin", "admin"]),
  head: () => ({
    meta: [
      { title: "School Implementation Hub — TransitionForward" },
      {
        name: "description",
        content: "School-level oversight, team coordination, and implementation tools.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HubPage,
});

function HubPage() {
  const { data, loading, orgId, reload } = useSchoolDashboard();

  const selectedOrgId = orgId ?? data?.selected_org_id ?? data?.orgs[0]?.id;
  return (
    <SiteShell>
      <HubShell hub={getHub("school-implementation")!} hideSpokes hideRelatedLinks>
        <WorkspaceZone>
          {!loading && !data ? (
            <OrganizationLoadError onRetry={() => void reload()} />
          ) : (
            <>
              <SchoolAdminOverviewGrid liveData={data} selectedOrgId={orgId} loading={loading} />
              <DashboardWidgetBoard role="school_admin" organizationId={loading ? undefined : selectedOrgId} />
            </>
          )}
        </WorkspaceZone>
      </HubShell>
    </SiteShell>
  );
}
