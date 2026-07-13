import { createFileRoute } from "@tanstack/react-router";
import { RolePreviewShell } from "@/components/demo/role-preview/RolePreviewShell";
import { getDemoRole } from "@/lib/demo/role-previews";
import { ComplianceOverviewCard } from "@/components/dashboard/ComplianceOverviewCard";
import { TransitionEvidenceCard } from "@/components/dashboard/TransitionEvidenceCard";
import { CaseloadRollupsCard } from "@/components/dashboard/CaseloadRollupsCard";
import { SchoolAdminOverviewGrid } from "@/components/dashboard/role/SchoolAdminOverviewGrid";
import { CompletionRingsBoard } from "@/components/implementation/CompletionRingsBoard";

const role = getDemoRole("school-admin");

export const Route = createFileRoute("/demo_/school-admin")({
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
          <CompletionRingsBoard />
          <SchoolAdminOverviewGrid isSample />
          <ComplianceOverviewCard isSample />
          <TransitionEvidenceCard isSample />
          <CaseloadRollupsCard isSample />
        </>
      }
    />
  ),
});
