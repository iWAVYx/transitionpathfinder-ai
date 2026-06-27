import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { getHub } from "@/lib/hubs/registry";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/hubs/student")({
  beforeLoad: () => ensureRoleAccess(["student", "admin"]),
  head: () => ({
    meta: [
      { title: "Student Planning Hub — TransitionForward" },
      { name: "description", content: "Your space to share your voice, track your goals, prep for meetings, and see your Pathway Report." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentHubPage,
});

function StudentHubPage() {
  const hub = getHub("student-planning")!;
  return (
    <SiteShell>
      <HubShell hub={hub} />
    </SiteShell>
  );
}
