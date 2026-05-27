import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Your dashboard — TransitionForward" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const fullName = (user?.user_metadata as { full_name?: string } | undefined)?.full_name;
  const friendly = fullName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Welcome back</p>
        <h1 className="mt-2 font-display text-5xl font-medium tracking-tight">Hi, {friendly}.</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          This is your quiet hub. Start with a Pathway Report — share a little about your student,
          and we'll generate a personalized plan you can take to the next PPT meeting.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Link
            to="/pathway"
            className="rounded-3xl bg-gradient-hero p-7 shadow-soft transition-all hover:shadow-lift md:col-span-2"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Signature feature</p>
            <h2 className="mt-2 font-display text-3xl font-medium tracking-tight">Create a Pathway Report →</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Strengths, interests, current goals, your concerns — even partial is fine. We'll turn
              it into career directions, life-skills focus, family questions, and a 30-day plan.
            </p>
          </Link>

          <div className="rounded-3xl border border-border/60 bg-card p-7 shadow-soft">
            <h3 className="font-display text-xl font-medium tracking-tight">Coming next</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              IEP upload with automatic strand mapping, goal &amp; progress tracking, PPT meeting
              prep, and your saved Pathway Reports — all coming as we roll out the pilot.
            </p>
          </div>
        </div>

        <p className="mt-14 text-xs italic text-muted-foreground">Building with care in Connecticut.</p>
      </section>
    </SiteShell>
  );
}
