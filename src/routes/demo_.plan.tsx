import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarRange,
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  Download,
  Printer,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import {
  DemoStepBar,
  DemoStepFooter,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDemoStudent } from "@/lib/demo-data";

export const Route = createFileRoute("/demo_/plan")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "30-Day Action Plan — TransitionForward demo" },
      {
        name: "description",
        content:
          "See the 30-day action plan TransitionForward generates from the Pathway Report — one focused step per week.",
      },
      { property: "og:url", content: "/demo/plan" },
    ],
    links: [{ rel: "canonical", href: "/demo/plan" }],
  }),
  component: DemoPlanPage,
});

function DemoPlanPage() {
  const { s } = Route.useSearch();
  const bundle = getDemoStudent(s);
  const { profile, report } = bundle;
  const plan = report.thirty_day_plan;
  const familyPlan = report.family_action_plan;

  return (
    <SiteShell>
      <DemoStepBar current="plan" student={s} />

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                30-Day Action Plan
              </p>
              <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
                {profile.first_name}'s next four weeks
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                One real step per week — small enough to actually do, big enough to move the
                pathway forward.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button size="sm">
                <Download className="h-4 w-4" /> Export plan
              </Button>
            </div>
          </div>
        </div>

        {/* Weekly timeline */}
        <div className="mt-8 relative">
          {/* connecting line */}
          <div className="absolute left-[27px] top-2 bottom-2 hidden w-px bg-gradient-to-b from-primary via-primary/50 to-transparent sm:block" />
          <ol className="space-y-4">
            {plan.map((step, i) => (
              <li
                key={step.week}
                className="relative flex gap-4 rounded-3xl border bg-card p-5 shadow-soft sm:p-6"
              >
                <div className="flex flex-col items-center">
                  <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
                    <div className="text-center leading-tight">
                      <div className="text-[9px] font-semibold uppercase tracking-wider opacity-80">
                        Week
                      </div>
                      <div className="font-display text-xl">{step.week}</div>
                    </div>
                  </span>
                </div>
                <div className="flex-1">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                    {weekLabel(i)}
                  </Badge>
                  <p className="mt-2 font-display text-lg leading-snug text-foreground">
                    {step.action}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Chip>Owner: family + case manager</Chip>
                    <Chip>≈ 30 min</Chip>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Mark complete (demo)"
                  className="self-start text-muted-foreground hover:text-primary"
                >
                  <Circle className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ol>
        </div>

        {/* Then what */}
        {familyPlan && (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Panel
              title="Then this school year"
              icon={<Sparkles className="h-4 w-4" />}
              items={familyPlan.this_school_year}
            />
            <Panel
              title="Before graduation"
              icon={<CalendarRange className="h-4 w-4" />}
              items={familyPlan.before_graduation}
            />
          </div>
        )}

        {/* Outro CTA */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border/60 bg-gradient-hero p-6 sm:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              You've seen the full TransitionForward flow
            </p>
            <p className="mt-1 font-display text-2xl">
              Hub → Intake → Report → Meeting Prep → Resources → Calendar → Plan.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ready to build one for a real student?
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/demo">Restart demo</Link>
            </Button>
            <Button asChild>
              <Link to="/waitlist">
                Join the waitlist <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <DemoStepFooter current="plan" student={s} />
      </section>
    </SiteShell>
  );
}

function weekLabel(i: number) {
  return ["Read & align", "Reach out", "Visit & explore", "Show up prepared"][i] ?? "Step";
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/70">
      {children}
    </span>
  );
}

function Panel({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-soft sm:p-6">
      <h2 className="flex items-center gap-2 border-b border-border/60 pb-3 font-display text-lg">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm leading-relaxed">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
            <span className="text-foreground/85">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
