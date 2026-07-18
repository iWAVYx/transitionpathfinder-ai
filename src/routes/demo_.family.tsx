import { createFileRoute } from "@tanstack/react-router";
import { RolePreviewShell } from "@/components/demo/role-preview/RolePreviewShell";
import { getDemoRole } from "@/lib/demo/role-previews";
import { ParentOverviewGrid } from "@/components/dashboard/role/ParentOverviewGrid";


const role = getDemoRole("family");

export const Route = createFileRoute("/demo_/family")({
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
      workspace={<ParentOverviewGrid isSample />}
      afterWorkspace={<OpportunityMatches compact limit={3} />}
    />
  ),
});

