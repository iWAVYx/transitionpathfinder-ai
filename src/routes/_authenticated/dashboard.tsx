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
          This is your quiet hub. Start with a Pathway Report, prep for an upcoming PPT
          meeting, or track the small steps you've already begun.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Link
            to="/pathway"
            className="rounded-3xl bg-gradient-hero p-7 shadow-soft transition-all hover:shadow-lift md:col-span-2 md:row-span-2"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Signature feature</p>
            <h2 className="mt-2 font-display text-3xl font-medium tracking-tight">Create a Pathway Report →</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Strengths, interests, current goals, your concerns — even partial is fine. We'll turn
              it into career directions, life-skills focus, family questions, and a 30-day plan.
            </p>
          </Link>

          <Link
            to="/ppt-prep"
            className="rounded-3xl border border-border/60 bg-card p-7 shadow-soft transition-all hover:shadow-lift"
          >
            <h3 className="font-display text-xl font-medium tracking-tight">PPT meeting prep →</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Turn any Pathway Report into a calm one-page agenda, the right questions,
              and scripts you can borrow word-for-word.
            </p>
          </Link>

          <Link
            to="/goals"
            className="rounded-3xl border border-border/60 bg-card p-7 shadow-soft transition-all hover:shadow-lift"
          >
            <h3 className="font-display text-xl font-medium tracking-tight">Goal tracker →</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Every step from your reports in one place — gently mark what's in progress
              and what's been met.
            </p>
          </Link>
        </div>

        <div className="mt-10 rounded-3xl border border-dashed border-border/60 bg-muted/30 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Also for you</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Visit the{" "}
            <Link to="/resources" className="font-semibold text-foreground hover:underline">
              Resource Hub
            </Link>{" "}
            for plain-language explanations of Connecticut agencies, a small glossary, and
            family worksheets we're opening up through the pilot.
          </p>
        </div>

        <p className="mt-14 text-xs italic text-muted-foreground">Building with care in Connecticut.</p>
      </section>
    </SiteShell>
  );
}
