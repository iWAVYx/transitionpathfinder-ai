import { createFileRoute } from "@tanstack/react-router";
import { RolePreviewShell } from "@/components/demo/role-preview/RolePreviewShell";
import { getDemoRole } from "@/lib/demo/role-previews";
import { StudentOverviewGrid } from "@/components/dashboard/role/StudentOverviewGrid";


const role = getDemoRole("student");

export const Route = createFileRoute("/demo_/student")({
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
      workspace={<StudentOverviewGrid isSample />}
      afterWorkspace={<OpportunityMatches compact limit={3} />}
    />
  ),
});
