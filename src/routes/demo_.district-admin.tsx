import { createFileRoute } from "@tanstack/react-router";
import { RolePreviewShell } from "@/components/demo/role-preview/RolePreviewShell";
import { getDemoRole } from "@/lib/demo/role-previews";
import { DistrictComplianceCard } from "@/components/dashboard/DistrictComplianceCard";
import { DistrictEvidenceCoverageCard } from "@/components/dashboard/DistrictEvidenceCoverageCard";
import { DistrictTrendMetricsCard } from "@/components/dashboard/DistrictTrendMetricsCard";
import { DistrictAdminOverviewGrid } from "@/components/dashboard/role/DistrictAdminOverviewGrid";
import { SchoolComparisonChart } from "@/components/district/SchoolComparisonChart";
import { ImplementationHealthCard } from "@/components/implementation/ImplementationHealthCard";

const role = getDemoRole("district-admin");

export const Route = createFileRoute("/demo_/district-admin")({
  head: () => ({
    meta: [
      { title: `${role.label} Preview — TransitionForward Demo` },
      { name: "description", content: role.intro },
      { property: "og:title", content: `${role.label} Preview — TransitionForward` },
      { property: "og:description", content: role.intro },
    ],
  }),
  component: () => (
    <RolePreviewShell
      role={role}
      extras={
        <>
          <SchoolComparisonChart />
          <ImplementationHealthCard
            scope="district"
            scopeName="Harborview Public Schools"
            healthScore={72}
            completionRate={58}
            readinessDelta={6}
            activeUsers={[
              { role: "Schools onboarded", used: 7, total: 9 },
              { role: "Educators active (30d)", used: 121, total: 168 },
              { role: "Families invited", used: 412, total: 720 },
              { role: "Partners active", used: 12, total: 22 },
            ]}
            risks={[
              "2 schools haven't logged a transition review this quarter",
              "38 pathway reports missing a signed transition consent",
              "1 school below 50% educator activation",
            ]}
            nextRecommendedStep="Convene the two lagging schools with district transition coordinator this month."
          />
          <DistrictAdminOverviewGrid isSample />
          <DistrictComplianceCard isSample />
          <DistrictEvidenceCoverageCard isSample />
          <DistrictTrendMetricsCard isSample />
        </>
      }
    />
  ),
});
