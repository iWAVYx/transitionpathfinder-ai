import { createFileRoute } from "@tanstack/react-router";

import { BackToDashboard } from "@/components/dashboard/BackToDashboard";
import { NextActionCardServer } from "@/components/next-actions/NextActionCardServer";
import { SiteShell } from "@/components/site/SiteShell";

import { nextActionContextSchema } from "@/lib/next-actions/action-context";

export const Route = createFileRoute("/_authenticated/next-actions")({
  validateSearch: (search) => nextActionContextSchema.parse(search),
  head: () => ({
    meta: [{ title: "Next Actions — TransitionForward" }, { name: "robots", content: "noindex" }],
  }),
  component: NextActionsPage,
});

function NextActionsPage() {
  const context = Route.useSearch();
  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <BackToDashboard />
        <NextActionCardServer
          context={context}
          title="Your Next Actions"
          eyebrow="Signed-in action workspace"
          description="Your personal tasks and available planning suggestions for this workspace. Open an item to work in its tool."
          defaultLimit={100}
        />
      </section>
    </SiteShell>
  );
}
