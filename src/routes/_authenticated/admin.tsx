import { createFileRoute, redirect } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";

// Legacy /admin route — consolidated into the Admin Hub at /owner.
export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/owner", replace: true });
  },
  component: () => (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
          data-dashboard-landmark="admin"
        >
          Admin Hub — Platform Admin
        </p>
      </div>
    </SiteShell>
  ),
});
