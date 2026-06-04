import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { LockedFeature } from "@/components/LockedFeature";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/_authenticated/school/implementation")({
  head: () => ({
    meta: [{ title: "Implementation — TransitionForward" }],
  }),
  component: SchoolImplementationPage,
});

function SchoolImplementationPage() {
  return (
    <SiteShell>
      <RoleGuard path="/school/implementation">
        <LockedFeature
          eyebrow="School Administrator"
          title="Implementation"
          description="Rollout checklists, training resources, and support requests for getting your team up and running on TransitionForward. Coming soon."
        />
      </RoleGuard>
    </SiteShell>
  );
}
