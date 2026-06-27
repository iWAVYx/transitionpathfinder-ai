import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { getHub } from "@/lib/hubs/registry";

export const Route = createFileRoute("/hubs/bridgeforward")({
  head: () => ({
    meta: [
      { title: "BridgeForward Hub — TransitionForward" },
      {
        name: "description",
        content:
          "The grade 6–8 bridge into high school. Strengths, interests, early readiness, and family preparation for a confident grade 9 PPT.",
      },
      { property: "og:title", content: "BridgeForward Hub — TransitionForward" },
      {
        property: "og:description",
        content: "The middle-school pillar page for Connecticut transition planning.",
      },
    ],
    links: [{ rel: "canonical", href: "/hubs/bridgeforward" }],
  }),
  component: BridgeForwardHubPage,
});

function BridgeForwardHubPage() {
  const hub = getHub("bridgeforward")!;
  return (
    <SiteShell>
      <HubShell hub={hub} />
    </SiteShell>
  );
}
