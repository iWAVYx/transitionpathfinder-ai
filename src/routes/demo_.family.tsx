import { createFileRoute } from "@tanstack/react-router";
import { RolePreviewShell } from "@/components/demo/role-preview/RolePreviewShell";
import { getDemoRole } from "@/lib/demo/role-previews";
import { IepTranslatorCard } from "@/components/dashboard/IepTranslatorCard";
import { FamilyMeetingPrepCard } from "@/components/dashboard/FamilyMeetingPrepCard";
import { AdvocacyResourcesCard } from "@/components/dashboard/AdvocacyResourcesCard";

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
      extras={
        <>
          <IepTranslatorCard isSample />
          <FamilyMeetingPrepCard isSample />
          <AdvocacyResourcesCard isSample />
        </>
      }
    />
  ),
});
