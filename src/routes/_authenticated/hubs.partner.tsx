import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { getHub } from "@/lib/hubs/registry";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/hubs/partner")({
  beforeLoad: () => ensureRoleAccess(["partner", "admin"]),
  head: () => ({
    meta: [
      { title: "Partner Opportunity Hub — TransitionForward" },
      { name: "description", content: "Publish opportunities and access PartnerForward supports — no student PII." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <SiteShell>
      <HubShell hub={getHub("partner-opportunity")!} />
    </SiteShell>
  ),
});
