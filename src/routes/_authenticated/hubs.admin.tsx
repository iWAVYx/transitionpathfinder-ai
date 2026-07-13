import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
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
        <div className="mt-8">
          <LaunchReadinessBoard />
        </div>
        <div className="mt-8">
          <StageJourneyCard audience="admin" />
        </div>
      </HubShell>
    </SiteShell>
  );
}
