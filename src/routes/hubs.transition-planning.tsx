import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { getHub } from "@/lib/hubs/registry";

export const Route = createFileRoute("/hubs/transition-planning")({
  head: () => ({
    meta: [
      { title: "Transition Planning Hub — TransitionForward" },
      {
        name: "description",
        content:
          "Every input that shapes a Connecticut transition plan — student voice, family priorities, educator input, documents, and readiness — connected to the Pathway Report.",
      },
      { property: "og:title", content: "Transition Planning Hub — TransitionForward" },
      {
        property: "og:description",
        content:
          "The pillar page for Connecticut transition planning. Explore the inputs that build a Pathway Report.",
      },
    ],
    links: [{ rel: "canonical", href: "/hubs/transition-planning" }],
  }),
  component: TransitionPlanningHubPage,
});

function TransitionPlanningHubPage() {
  const hub = getHub("transition-planning")!;
  return (
    <SiteShell>
      <HubShell hub={hub} />
    </SiteShell>
  );
}
