import { createFileRoute } from "@tanstack/react-router";
import { RolePreviewShell } from "@/components/demo/role-preview/RolePreviewShell";
import { getDemoRole } from "@/lib/demo/role-previews";
import { DistrictComplianceCard } from "@/components/dashboard/DistrictComplianceCard";
import { DistrictEvidenceCoverageCard } from "@/components/dashboard/DistrictEvidenceCoverageCard";
import { DistrictTrendMetricsCard } from "@/components/dashboard/DistrictTrendMetricsCard";

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
          <DistrictComplianceCard isSample />
          <DistrictEvidenceCoverageCard isSample />
          <DistrictTrendMetricsCard isSample />
        </>
      }
    />
  ),
});
