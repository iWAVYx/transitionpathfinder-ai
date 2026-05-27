import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — TransitionForward" },
      { name: "description", content: "Your TransitionForward parent dashboard." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, signOut } = useAuth();
  const name =
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ??
    user?.email ??
    "there";

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Welcome
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
              Hello, {name}.
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your TransitionForward hub. Upload your student's IEP next to unlock grade-banded
              recommendations grounded in the framework.
            </p>
          </div>
          <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-6">
          <div className="rounded-3xl bg-gradient-hero p-8 shadow-soft md:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Next step
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-foreground">
              Upload your student's IEP
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Coming in the next build: a private, encrypted upload that automatically extracts
              your CT IEP transition elements — present levels, post-secondary goals, services,
              and accommodations — and maps each to the TransitionForward framework.
            </p>
            <Button className="mt-6" disabled>IEP upload — coming soon</Button>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft md:col-span-2">
            <p className="font-display text-sm font-semibold text-foreground">Your students</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You haven't added a student yet. Once you upload an IEP we'll build a profile here.
            </p>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft md:col-span-3">
            <p className="font-display text-sm font-semibold text-foreground">Grade-band snapshot</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We'll show your student's readiness across the six TransitionForward strands here.
            </p>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft md:col-span-3">
            <p className="font-display text-sm font-semibold text-foreground">Next best actions</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A grade-aware checklist will appear once your student's plan is in.
            </p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
