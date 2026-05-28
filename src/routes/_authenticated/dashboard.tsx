import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { DashboardWidgets } from "@/components/dashboard/DashboardWidgets";
import { InvitesInbox } from "@/components/dashboard/InvitesInbox";
import { useAuth } from "@/hooks/use-auth";
import {
  Sparkles,
  ClipboardList,
  Target,
  FolderOpen,
  Compass,
  Heart,
  ArrowRight,
} from "lucide-react";
import dashboardHero from "@/assets/dashboard-hero.jpg";
import pathwayHero from "@/assets/pathway-hero.jpg";

import { toTitleCase } from "@/lib/title-case";
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
      {/* Hero band with photograph */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-70" />
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <Breadcrumbs trail={[{ label: "Dashboard" }]} />
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-6 pb-10 sm:px-6 md:grid-cols-[1.05fr_1fr] lg:px-8 lg:pb-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Welcome back</p>
            <h1 className="mt-3 font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              Hi, {toTitleCase(friendly)}.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              This is your quiet hub. Start a Pathway Report, prep for an upcoming PPT meeting, or
              track the small steps you've already begun.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/pathway"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-lift"
              >
                Create a Pathway Report
              </Link>
              <Link
                to="/onboarding"
                className="inline-flex items-center justify-center rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-muted"
              >
                <Sparkles className="h-4 w-4" /> Get started — 4-step setup
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-warm blur-2xl opacity-60" />
            <img
              src={dashboardHero}
              alt="A student looking ahead with hope"
              width={1600}
              height={1024}
              className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-lift"
            />
          </div>
        </div>
      </section>

      <DashboardWidgets />

      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <InvitesInbox />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {/* Signature feature — pathway report */}
          <Link
            to="/pathway"
            className="group relative overflow-hidden rounded-3xl bg-gradient-hero p-7 shadow-soft transition-all hover:shadow-lift md:col-span-2 md:row-span-2"
          >
            <img
              src={pathwayHero}
              alt=""
              aria-hidden
              loading="lazy"
              width={1600}
              height={900}
              className="pointer-events-none absolute -bottom-6 -right-6 h-56 w-2/3 rounded-2xl object-cover opacity-80 transition-transform duration-500 group-hover:scale-105 [mask-image:radial-gradient(circle_at_top_left,black,transparent_75%)]"
            />
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background/80 text-primary shadow-soft backdrop-blur">
                <Sparkles className="h-6 w-6" />
              </div>
              <span className="inline-flex items-center rounded-full bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary shadow-soft backdrop-blur">
                Suggested next step
              </span>
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-primary">Signature feature</p>
            <h2 className="mt-2 flex max-w-md items-center gap-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Create a Pathway Report
              <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" aria-hidden />
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Strengths, interests, current goals, your concerns — even partial is fine. Or upload
              an IEP and we'll fill it in. You'll get career directions, life-skills focus, family
              questions, and a 30-day plan.
            </p>
          </Link>

          <FeatureCard
            to="/ppt-prep"
            icon={<ClipboardList className="h-6 w-6" />}
            title="PPT meeting prep"
            body="Turn any Pathway Report into a calm one-page agenda, the right questions, and scripts you can borrow word-for-word."
          />

          <FeatureCard
            to="/goals"
            icon={<Target className="h-6 w-6" />}
            title="Goal tracker"
            body="Every step from your reports in one place — gently mark what's in progress and what's been met."
          />
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <FeatureCard
            to="/reports"
            title="My Pathway Reports"
            body="Everything you've generated, in one library. Open, print, or carry into your next PPT prep."
            icon={<FolderOpen className="h-6 w-6" />}
          />
          <FeatureCard
            to="/documents"
            title="Documents hub"
            body="Every IEP and evaluation across your roster, with status — needs review or summarized."
            icon={<FolderOpen className="h-6 w-6" />}
          />
          <FeatureCard
            to="/opportunities"
            title="Opportunities"
            body="Curated CT colleges, technical programs, employers, agencies, and mentorship."
            icon={<Compass className="h-6 w-6" />}
          />
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <FeatureCard
            to="/resources"
            title="Resource Hub"
            body="Plain-language guides to Connecticut agencies, a small glossary, and family worksheets."
            icon={<Compass className="h-6 w-6" />}
          />
          <div className="relative overflow-hidden rounded-3xl border border-dashed border-border/60 bg-gradient-warm p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background/70 text-secondary-foreground shadow-soft backdrop-blur">
              <Heart className="h-5 w-5" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-primary">A note from us</p>
            <p className="mt-2 font-display text-xl leading-snug">
              "We built this from inside a real classroom. If something feels off, it's because
              someone, somewhere, lived it."
            </p>
            <p className="mt-4 text-xs italic text-muted-foreground">Building with care in Connecticut.</p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function FeatureCard({
  to, title, body, icon,
}: {
  to: string;
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={to as never}
      className="group rounded-3xl border border-border/60 bg-card p-7 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-sky text-primary-foreground">
        {icon}
      </div>
      <h3 className="mt-5 font-display text-xl font-medium tracking-tight">{toTitleCase(title)} →</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </Link>
  );
}
