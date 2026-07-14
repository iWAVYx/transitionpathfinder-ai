import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, TrendingUp, School, ClipboardCheck, FileBarChart } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DashboardRowList } from "@/components/dashboard/DashboardRowList";
import { StageJourneyCard } from "@/components/dashboard/StageJourneyCard";
import { DistrictAdminOverviewGrid } from "@/components/dashboard/role/DistrictAdminOverviewGrid";
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
      <HubShell hub={getHub("district-strategy")!} hideSpokes>
        <DistrictAdminOverviewGrid />
        <DashboardSection
          eyebrow="District Signals"
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
                status: "92% · on target",
                tone: "success",
              },
              {
                icon: ClipboardCheck,
                title: "Evidence Coverage",
                description: "How consistently transition evidence is on file across the district.",
                to: "/district/service-gaps",
                status: "3 schools trailing",
                tone: "warn",
              },
              {
                icon: TrendingUp,
                title: "Readiness Trends",
                description: "Multi-year postsecondary readiness trend lines by school and program.",
                to: "/district/readiness-trends",
              },
              {
                icon: School,
                title: "School Comparison",
                description: "Side-by-side school performance on the metrics your board tracks.",
                to: "/district/schools",
              },
              {
                icon: FileBarChart,
                title: "District Reports",
                description: "Board-ready reports and downloadable rollups.",
                to: "/district/reports",
              },
            ]}
          />
        </DashboardSection>
        <DashboardSection
          eyebrow="Your Pathway"
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
