import { createFileRoute } from "@tanstack/react-router";
import {
  ShieldCheck,
  TrendingUp,
  School,
  ClipboardCheck,
  FileBarChart,
  History,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DashboardRowList } from "@/components/dashboard/DashboardRowList";
import { WorkspaceZone } from "@/components/dashboard/CommandCenter";
import { StageJourneyCard } from "@/components/dashboard/StageJourneyCard";
import { DistrictAdminOverviewGrid } from "@/components/dashboard/role/DistrictAdminOverviewGrid";
import { NextActionCardServer } from "@/components/next-actions/NextActionCardServer";
import { useDistrictDashboard } from "@/components/district/DistrictPageShell";
import { getHub } from "@/lib/hubs/registry";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/hubs/district")({
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
  const { data, loading, districtId } = useDistrictDashboard();
  const schoolsNeedingFollowup =
    data?.schools.filter((school) => school.needs_followup).length ?? 0;

  return (
    <SiteShell>
      <HubShell hub={getHub("district-strategy")!} hideSpokes>
        <WorkspaceZone>
          <DistrictAdminOverviewGrid
            liveData={data}
            selectedDistrictId={districtId}
            loading={loading}
          />
        </WorkspaceZone>
        <DashboardSection
          eyebrow="Operations"
          title="Compliance, Coverage & Trends"
          description="Aggregate rollups across schools — no student PII, just readiness and adoption."
          gap="tight"
        >
          <DashboardRowList
            rows={[
              {
                icon: ShieldCheck,
                title: "District Compliance",
                description: "Indicator 13 rollup across all schools with outliers flagged.",
                to: "/district/overview",
                status: data ? `${data.metrics.schools_count} connected schools` : undefined,
              },
              {
                icon: ClipboardCheck,
                title: "Evidence Coverage",
                description: "How consistently transition evidence is on file across the district.",
                to: "/district/service-gaps",
                status: data ? `${schoolsNeedingFollowup} schools need follow-up` : undefined,
                tone: schoolsNeedingFollowup > 0 ? "warn" : undefined,
              },
              {
                icon: TrendingUp,
                title: "Readiness Trends",
                description:
                  "Multi-year postsecondary readiness trend lines by school and program.",
                to: "/district/readiness-trends",
              },
              {
                icon: School,
                title: "School Comparison",
                description: "Side-by-side school performance on the metrics your board tracks.",
                to: "/district/schools",
                status: data ? `${data.metrics.students_count} students · aggregate` : undefined,
              },
              {
                icon: FileBarChart,
                title: "District Reports",
                description: "Board-ready reports and downloadable rollups.",
                to: "/district/reports",
              },
              {
                icon: History,
                title: "Records & Disclosure History",
                description:
                  "Per-student audit trail for compliance review and FERPA disclosure logging.",
                to: "/district/history",
              },
            ]}
          />
        </DashboardSection>
        <DashboardSection
          eyebrow="Activity / Next Steps"
          title="Your District Next Actions"
          description="Rollout, compliance, and approvals that need district-level attention."
          gap="tight"
        >
          <NextActionCardServer
            historyRoute="/district/history"
            suggestionLabel="Open District Reports"
            suggestionRoute="/district/reports"
          />
        </DashboardSection>
        <DashboardSection
          eyebrow="Progress Band"
          title="Stage Journey"
          description="Where your district is on the transition strategy rollout."
          gap="tight"
        >
          <StageJourneyCard audience="district_admin" />
        </DashboardSection>
      </HubShell>
    </SiteShell>
  );
}
