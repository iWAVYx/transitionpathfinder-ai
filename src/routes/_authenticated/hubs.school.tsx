import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StageJourneyCard } from "@/components/dashboard/StageJourneyCard";
import { SchoolAdminOverviewGrid } from "@/components/dashboard/role/SchoolAdminOverviewGrid";
import { ComplianceOverviewCard } from "@/components/dashboard/ComplianceOverviewCard";
import { TransitionEvidenceCard } from "@/components/dashboard/TransitionEvidenceCard";
import { CaseloadRollupsCard } from "@/components/dashboard/CaseloadRollupsCard";
import { getHub } from "@/lib/hubs/registry";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/hubs/school")({
  beforeLoad: () => ensureRoleAccess(["school_admin", "admin"]),
  head: () => ({
    meta: [
      { title: "School Implementation Hub — TransitionForward" },
      { name: "description", content: "School-level oversight, team coordination, and implementation tools." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HubPage,
});

function HubPage() {
  return (
    <SiteShell>
      <HubShell hub={getHub("school-implementation")!} hideSpokes>
        <SchoolAdminOverviewGrid />
        <DashboardSection
          eyebrow="Operational Signals"
          title="Compliance, Evidence & Caseload"
          description="School-level rollups of Indicator 13 compliance, transition evidence, and caseload activity."
          layout="grid-3"
        >
          <ComplianceOverviewCard isSample />
          <TransitionEvidenceCard isSample />
          <CaseloadRollupsCard isSample />
        </DashboardSection>
        <DashboardSection
          eyebrow="Your Pathway"
          title="Stage Journey"
          description="Where your building is on the transition implementation timeline."
        >
          <StageJourneyCard audience="school_admin" />
        </DashboardSection>
      </HubShell>
    </SiteShell>
  );
}
