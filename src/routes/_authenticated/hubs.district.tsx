import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { StageJourneyCard } from "@/components/dashboard/StageJourneyCard";
import { DistrictAdminOverviewGrid } from "@/components/dashboard/role/DistrictAdminOverviewGrid";
import { DistrictComplianceCard } from "@/components/dashboard/DistrictComplianceCard";
import { DistrictEvidenceCoverageCard } from "@/components/dashboard/DistrictEvidenceCoverageCard";
import { DistrictTrendMetricsCard } from "@/components/dashboard/DistrictTrendMetricsCard";
import { getHub } from "@/lib/hubs/registry";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/hubs/district")({
  beforeLoad: () => ensureRoleAccess(["district_admin", "admin"]),
  head: () => ({
    meta: [
      { title: "District Strategy Hub — TransitionForward" },
      { name: "description", content: "District-level readiness, service-gap visibility, and adoption signals." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HubPage,
});

function HubPage() {
  return (
    <SiteShell>
      <HubShell hub={getHub("district-strategy")!}>
        <DistrictAdminOverviewGrid />
        <DistrictComplianceCard isSample />
        <DistrictEvidenceCoverageCard isSample />
        <DistrictTrendMetricsCard isSample />
        <div className="mt-8">
          <StageJourneyCard audience="district_admin" />
        </div>
      </HubShell>
    </SiteShell>
  );
}
