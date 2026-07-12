import { createFileRoute } from "@tanstack/react-router";
import { RolePreviewShell } from "@/components/demo/role-preview/RolePreviewShell";
import { getDemoRole } from "@/lib/demo/role-previews";
import { StudentPathwaySections } from "@/components/dashboard/StudentPathwaySections";
import { NextStepsTimeline } from "@/components/dashboard/NextStepsTimeline";
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
      extras={
        <>
          {/* Same at-a-glance workspace shown on the signed-in student
              dashboard, wired to the shared feature-detail drawer so demo
              visitors can preview each tool in place. */}
          <StudentOverviewGrid isSample />
          <StudentPathwaySections isSample />
          <NextStepsTimeline />
        </>
      }
    />
  ),
});
