import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { WorkspaceZone } from "@/components/dashboard/CommandCenter";
import { PartnerOverviewGrid } from "@/components/dashboard/role/PartnerOverviewGrid";
import { DashboardWidgetBoard } from "@/components/dashboard/DashboardWidgetBoard";
import { getPartnerWorkspace, type PartnerWorkspace } from "@/lib/partner-workspace.functions";
import { getHub } from "@/lib/hubs/registry";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/hubs/partner")({
  beforeLoad: () => ensureRoleAccess(["partner", "admin"]),
  head: () => ({
    meta: [
      { title: "Partner Opportunity Hub — TransitionForward" },
      {
        name: "description",
        content: "Publish opportunities and access PartnerForward supports — no student PII.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HubPage,
});

function HubPage() {
  const loadWorkspace = useServerFn(getPartnerWorkspace);
  const [workspace, setWorkspace] = useState<PartnerWorkspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadWorkspace({ data: {} })
      .then((result) => {
        if (active) setWorkspace(result);
      })
      .catch(() => {
        if (active) setWorkspace(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadWorkspace]);

  return (
    <SiteShell>
      <HubShell hub={getHub("partner-opportunity")!} hideSpokes hideRelatedLinks>
        <WorkspaceZone>
          <PartnerOverviewGrid liveData={workspace} loading={loading} />
          <DashboardWidgetBoard role="partner" />
        </WorkspaceZone>
      </HubShell>
    </SiteShell>
  );
}
