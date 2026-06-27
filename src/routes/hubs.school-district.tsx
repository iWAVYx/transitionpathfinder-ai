import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { getHub } from "@/lib/hubs/registry";

export const Route = createFileRoute("/hubs/school-district")({
  head: () => ({
    meta: [
      { title: "School & District Hub — TransitionForward" },
      {
        name: "description",
        content:
          "How TransitionForward supports CT special education teams, transition coordinators, and district leaders.",
      },
      { property: "og:title", content: "School & District Hub — TransitionForward" },
      {
        property: "og:description",
        content: "The pillar page for school and district adoption.",
      },
    ],
    links: [{ rel: "canonical", href: "/hubs/school-district" }],
  }),
  component: SchoolDistrictHubPage,
});

function SchoolDistrictHubPage() {
  const hub = getHub("school-district")!;
  return (
    <SiteShell>
      <HubShell hub={hub} />
    </SiteShell>
  );
}
