import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StageJourneyCard } from "@/components/dashboard/StageJourneyCard";
import { LaunchReadinessBoard } from "@/components/platform/LaunchReadinessBoard";
import { getHub } from "@/lib/hubs/registry";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/hubs/admin")({
  beforeLoad: () => ensureRoleAccess(["admin"]),
  head: () => ({
    meta: [
      { title: "Platform Operations Hub — TransitionForward" },
      { name: "description", content: "Platform-wide oversight, queues, and operations." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HubPage,
});

function HubPage() {
  return (
    <SiteShell>
      <HubShell hub={getHub("platform-operations")!}>
        <DashboardSection
          eyebrow="Platform Readiness"
          title="Launch Readiness Board"
          description="Cross-role rollout, adoption, and support signals."
        >
          <LaunchReadinessBoard />
        </DashboardSection>
        <DashboardSection
          eyebrow="Your Pathway"
          title="Stage Journey"
          description="Where the platform sits across the transition rollout lifecycle."
        >
          <StageJourneyCard audience="admin" />
        </DashboardSection>
      </HubShell>
    </SiteShell>
  );
}
