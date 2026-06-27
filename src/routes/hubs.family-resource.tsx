import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { getHub } from "@/lib/hubs/registry";

export const Route = createFileRoute("/hubs/family-resource")({
  head: () => ({
    meta: [
      { title: "Family Resource Hub — TransitionForward" },
      {
        name: "description",
        content:
          "Plain-language guides, meeting prep, and tools for Connecticut families navigating IEPs and transition planning.",
      },
      { property: "og:title", content: "Family Resource Hub — TransitionForward" },
      {
        property: "og:description",
        content: "Everything a CT family needs to walk into the next PPT with confidence.",
      },
    ],
    links: [{ rel: "canonical", href: "/hubs/family-resource" }],
  }),
  component: FamilyResourceHubPage,
});

function FamilyResourceHubPage() {
  const hub = getHub("family-resource")!;
  return (
    <SiteShell>
      <HubShell hub={hub} />
    </SiteShell>
  );
}
