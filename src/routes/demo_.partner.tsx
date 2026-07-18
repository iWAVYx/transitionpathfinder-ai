import { createFileRoute } from "@tanstack/react-router";
import { RolePreviewShell } from "@/components/demo/role-preview/RolePreviewShell";
import { getDemoRole } from "@/lib/demo/role-previews";
import { PartnerOverviewGrid } from "@/components/dashboard/role/PartnerOverviewGrid";
import { PremiumPartnerToolkitTile } from "@/components/demo/PremiumPartnerToolkitTile";

const role = getDemoRole("partner");

export const Route = createFileRoute("/demo_/partner")({
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
      workspace={<PartnerOverviewGrid isSample />}
      afterWorkspace={<PremiumPartnerToolkitTile />}
    />
  ),
});

