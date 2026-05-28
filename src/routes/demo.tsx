import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  ClipboardList,
  LayoutDashboard,
  FileText,
  ShieldCheck,
  ArrowRight,
  PawPrint,
  Palette,
  Leaf,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEMO_STUDENT } from "@/lib/demo-data";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "See a live demo — TransitionForward" },
      {
        name: "description",
        content:
          "Walk through a complete TransitionForward Pathway Report using a fictional Connecticut high school student. No sign-up required.",
      },
      { property: "og:title", content: "See a live demo — TransitionForward" },
      {
        property: "og:description",
        content:
          "Sample intake, Student Hub, and Pathway Report for a fictional 11th grader receiving transition services.",
      },
    ],
  }),
  component: DemoIndex,
});

function DemoIndex() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" /> Live demo
          </Badge>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Fictional student · no real data
          </Badge>
        </div>
        <h1 className="mt-4 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          See exactly how TransitionForward works.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Walk through a complete planning experience using <strong>{DEMO_STUDENT.full_name}</strong>,
          a fictional {DEMO_STUDENT.grade} student at {DEMO_STUDENT.school}. No account, no setup —
          everything you'd see on day one with a real student.
        </p>

        {/* Student card */}
        <div className="mt-8 rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Meet the demo student
              </p>
              <h2 className="mt-2 font-display text-3xl">{DEMO_STUDENT.full_name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {DEMO_STUDENT.pronouns} · {DEMO_STUDENT.grade} · {DEMO_STUDENT.school}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {DEMO_STUDENT.disability_category} · Graduating {DEMO_STUDENT.graduation_year}
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              Case manager: {DEMO_STUDENT.case_manager}
            </Badge>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <InterestChip icon={<PawPrint className="h-4 w-4" />} label="Animals & shelter work" />
            <InterestChip icon={<Palette className="h-4 w-4" />} label="Drawing & illustration" />
            <InterestChip icon={<Leaf className="h-4 w-4" />} label="Environmental clean-ups" />
          </div>
          <p className="mt-6 rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm italic leading-relaxed text-foreground/80">
            "I want to work somewhere with animals. Quiet is better. I want to learn how to ride
            the bus by myself."
            <span className="mt-2 block not-italic text-xs text-muted-foreground">
              — In Maya's voice (from the intake)
            </span>
          </p>
        </div>

        {/* Steps */}
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <StepCard
            step="1"
            icon={<ClipboardList className="h-5 w-5" />}
            title="Sample intake"
            body="See the guided transition-planning interview the family completed — strengths, interests, concerns, and student voice."
            to="/demo/intake"
          />
          <StepCard
            step="2"
            icon={<FileText className="h-5 w-5" />}
            title="Pathway Report"
            body="The full report families and educators receive — pathways, IEP translation, PPT prep, and a 30-day plan."
            to="/demo/report"
          />
          <StepCard
            step="3"
            icon={<LayoutDashboard className="h-5 w-5" />}
            title="Student Hub"
            body="The ongoing workspace where Maya's family, case manager, and team track goals and documents over time."
            to="/demo/hub"
          />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border/60 bg-gradient-hero p-6 sm:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Ready to try it for a real student?
            </p>
            <p className="mt-2 font-display text-2xl">Create your own Pathway Report.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Free during pilot. Privacy-first. 15–20 minutes to complete the intake.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/waitlist">
              Join the waitlist <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}

function StepCard({
  step,
  icon,
  title,
  body,
  to,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group block rounded-3xl border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Step {step}
        </span>
      </div>
      <h3 className="mt-4 font-display text-xl">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
        Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function InterestChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm">
      <span className="text-primary">{icon}</span>
      {label}
    </div>
  );
}
