import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your quiet hub — TransitionForward" },
      {
        name: "description",
        content:
          "A calm home base for your child's transition plan. Upload their IEP and we'll gently translate it into a grade-by-grade picture you can act on.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, signOut } = useAuth();
  const fullName =
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name;
  const friendly = fullName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Welcome back
            </p>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
              Good to see you, {friendly}.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              This is your quiet hub. Bring us your child's IEP whenever
              you're ready, and we'll start translating it — grade by grade,
              strand by strand — into something you can actually use between
              meetings.
            </p>
          </div>
          <Button variant="outline" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-6">
          <article className="rounded-3xl bg-gradient-hero p-8 shadow-soft md:col-span-4 md:p-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              The next gentle step
            </p>
            <h2 className="mt-3 font-display text-3xl font-medium text-foreground">
              Upload your child's IEP, in your own time.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              In the next build, you'll be able to drop in your child's plan
              and the Connecticut SED transition forms. We'll quietly pull out
              the present levels, postsecondary goals, services, and
              accommodations, and map each one onto the six TransitionForward
              strands — so the path forward stops feeling like a binder and
              starts feeling like a story.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-foreground/70">
              Everything stays encrypted, locked to your account, and never
              used to train AI models. You can delete it any time.
            </p>
            <Button className="mt-7" disabled>
              IEP upload — coming soon
            </Button>
          </article>

          <article className="rounded-3xl border border-border/60 bg-card p-7 shadow-soft md:col-span-2">
            <p className="font-display text-lg font-medium text-foreground">
              Your students
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              You haven't added a child yet. Once you bring in their IEP,
              we'll build a gentle profile here — strengths, supports, the
              people on their team.
            </p>
          </article>

          <article className="rounded-3xl border border-border/60 bg-card p-7 shadow-soft md:col-span-3">
            <p className="font-display text-lg font-medium text-foreground">
              How they're doing, across the six strands
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Academics, voice, life skills, real-world exposure, your role,
              and the team around them. As soon as we have your child's plan,
              this becomes a soft snapshot of where they are — and where
              they're quietly growing.
            </p>
          </article>

          <article className="rounded-3xl border border-border/60 bg-card p-7 shadow-soft md:col-span-3">
            <p className="font-display text-lg font-medium text-foreground">
              The next small things to try
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A grade-aware shortlist of next steps will live here — sized for
              real life, not for a perfect week. Each suggestion will be tied
              back to the research, so you always know why it's on the list.
            </p>
          </article>
        </div>

        <p className="mt-10 text-xs leading-relaxed text-muted-foreground/80">
          Building with care in Connecticut. If anything here feels off, tell
          us — this pilot is shaped by the families and educators in it.
        </p>
      </section>
    </SiteShell>
  );
}
