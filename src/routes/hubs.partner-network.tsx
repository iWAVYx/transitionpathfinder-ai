import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { getHub } from "@/lib/hubs/registry";

export const Route = createFileRoute("/hubs/partner-network")({
  head: () => ({
    meta: [
      { title: "Partner Network Hub — TransitionForward" },
      {
        name: "description",
        content:
          "PartnerForward incentives, directory, and the matching engine that connects partner opportunities to student readiness — without exposing student records.",
      },
      { property: "og:title", content: "Partner Network Hub — TransitionForward" },
      {
        property: "og:description",
        content: "The pillar page for community partners across Connecticut.",
      },
    ],
    links: [{ rel: "canonical", href: "/hubs/partner-network" }],
  }),
  component: PartnerNetworkHubPage,
});

function PartnerNetworkHubPage() {
  const hub = getHub("partner-network")!;
  return (
    <SiteShell>
      <HubShell hub={hub} />
    </SiteShell>
  );
}
