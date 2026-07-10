import { createFileRoute } from "@tanstack/react-router";
import { RolePreviewShell } from "@/components/demo/role-preview/RolePreviewShell";
import { getDemoRole } from "@/lib/demo/role-previews";
import { StudentPathwaySections } from "@/components/dashboard/StudentPathwaySections";
import { NextStepsTimeline } from "@/components/dashboard/NextStepsTimeline";

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
      extras={
        <>
          <StudentPathwaySections isSample />
          <NextStepsTimeline />
        </>
      }
    />
  ),
});
