import { createFileRoute } from "@tanstack/react-router";

import { BackToDashboard } from "@/components/dashboard/BackToDashboard";
import { NextActionCardServer } from "@/components/next-actions/NextActionCardServer";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/_authenticated/next-actions")({
  head: () => ({
    meta: [
      { title: "Next Actions — TransitionForward" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NextActionsPage,
});

function NextActionsPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <BackToDashboard />
        <NextActionCardServer
          title="All Your Next Actions"
          eyebrow="Signed-in action workspace"
          description="Every action assigned to you or derived from the plans you are allowed to see. Open an action to work in its full tool."
          defaultLimit={100}
        />
      </main>
    </SiteShell>
  );
}
