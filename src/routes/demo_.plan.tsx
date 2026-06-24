import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarRange,
  CheckCircle2,
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
import { Button } from "@/components/ui/button";
import { getDemoStudent } from "@/lib/demo-data";
import {
  EXTENDED_PLANS,
  HORIZON_META,
  type PlanHorizon,
} from "@/lib/demo-extended-plans";
import {
  PlanHorizonTabs,
  RichPlanStepCard,
} from "@/components/pathway/PlanHorizon";
import { DemoRoleLens } from "@/components/demo/DemoRoleLens";

export const Route = createFileRoute("/demo_/plan")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "30 / 60 / 90-Day Action Plan — TransitionForward demo" },
      {
        name: "description",
        content:
          "Switch between 30, 60, and 90-day action plans TransitionForward generates from the Pathway Report — comprehensive, week-by-week, with owners and outcomes.",
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
  const familyPlan = report.family_action_plan;

  const studentKey = bundle.id;
  const plans = EXTENDED_PLANS[studentKey];
  const [horizon, setHorizon] = useState<PlanHorizon>("thirty");
  const steps = plans[horizon];
  const meta = HORIZON_META[horizon];

  const counts: Record<PlanHorizon, number> = {
    thirty: plans.thirty.length,
    sixty: plans.sixty.length,
    ninety: plans.ninety.length,
  };

  return (
    <SiteShell>
      <DemoStepBar current="plan" student={s} />

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        {/* Header */}
        <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                {meta.label}
              </p>
              <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
                {profile.first_name}'s next {meta.days} days
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{meta.tagline}</p>
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

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <PlanHorizonTabs value={horizon} onChange={setHorizon} counts={counts} />
            <p className="text-xs text-muted-foreground">
              Each step has an owner, a time estimate, and what success looks like.
            </p>
          </div>
        </div>

        {/* Role lens */}
        <div className="mt-8">
          <DemoRoleLens step="plan" student={s} />
        </div>

        {/* Weekly timeline */}
        <div className="mt-8">
          <ol className="space-y-4">
            {steps.map((step) => (
              <RichPlanStepCard key={`${horizon}-${step.week}`} step={step} />
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
