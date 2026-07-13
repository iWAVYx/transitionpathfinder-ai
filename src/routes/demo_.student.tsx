import { createFileRoute } from "@tanstack/react-router";
import { RolePreviewShell } from "@/components/demo/role-preview/RolePreviewShell";
import { getDemoRole } from "@/lib/demo/role-previews";
import { StudentPathwaySections } from "@/components/dashboard/StudentPathwaySections";
import { NextStepsTimeline } from "@/components/dashboard/NextStepsTimeline";
import { StudentOverviewGrid } from "@/components/dashboard/role/StudentOverviewGrid";
import { PathwayTimeline } from "@/components/pathway/PathwayTimeline";
import { MissingInputsPanel } from "@/components/pathway/MissingInputsPanel";
import { ReadinessScorecard } from "@/components/pathway/ReadinessScorecard";
import { PlainLanguageCard } from "@/components/pathway/PlainLanguageCard";
import { RoleActionPlan } from "@/components/pathway/RoleActionPlan";
import { CollaborationFlags } from "@/components/collaboration/CollaborationFlags";
import { ProgressOverTimeCard } from "@/components/progress/ProgressOverTimeCard";
import { TrustCenterCard } from "@/components/trust/TrustCenterCard";

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
          <PathwayTimeline />
          <CollaborationFlags
            flags={[
              { key: "student_voice" },
              { key: "parent_input" },
              { key: "partner_match" },
            ]}
          />
          <MissingInputsPanel />
          <ReadinessScorecard />
          <PlainLanguageCard />
          <RoleActionPlan defaultRole="student" />
          <ProgressOverTimeCard studentName="You" />
          <TrustCenterCard studentName="You" />
          <StudentOverviewGrid isSample />
          <StudentPathwaySections isSample />
          <NextStepsTimeline />
        </>
      }
    />
  ),
});
