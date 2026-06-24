import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  ClipboardList,
  LayoutDashboard,
  FileText,
  Users,
  BookOpen,
  CalendarRange,
  CalendarDays,
  ShieldCheck,
  ArrowRight,
  Mic,
  FileSearch,
  Briefcase,
  Compass,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEMO_STUDENTS, getDemoStudent, type DemoStudentId } from "@/lib/demo-data";
import {
  DEFAULT_DEMO_STUDENT,
  demoStudentSearch,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { toTitleCase } from "@/lib/title-case";

export const Route = createFileRoute("/demo")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "See A Live Demo — TransitionForward" },
      {
        name: "description",
        content:
          "Walk a fictional student through every step of TransitionForward — intake, Pathway Report, meeting prep, resources, calendar, and a 30-day plan.",
      },
      { property: "og:title", content: "See A Live Demo — TransitionForward" },
      {
        property: "og:description",
        content:
          "Pick a fictional student and walk the full TransitionForward pathway — no account required.",
      },
      { property: "og:url", content: "/demo" },
    ],
    links: [{ rel: "canonical", href: "/demo" }],
  }),
  component: DemoIndex,
});

const STEPS = [
  { n: "01", icon: ClipboardList, title: "Intake", body: "A guided transition-planning conversation that captures strengths, interests, and supports." },
  { n: "02", icon: Mic, title: "Student Voice", body: "Hear how the student's own words shape what the plan recommends." },
  { n: "03", icon: FileSearch, title: "Document Insights", body: "See how the IEP becomes a clear planning companion, with anything that needs review flagged." },
  { n: "04", icon: FileText, title: "Pathway Report", body: "An editorial report covering pathways, accommodations, and a plain-language plan." },
  { n: "05", icon: Briefcase, title: "Opportunity Matches", body: "Sample partner programs, apprenticeships, internships, and community supports." },
  { n: "06", icon: BookOpen, title: "Resource Matches", body: "Curated, student-matched resources with what it is, who it helps, and how to use it." },
  { n: "07", icon: Users, title: "Meeting Prep", body: "A PPT/IEP prep packet: agenda, questions to ask, strengths to highlight, follow-ups." },
  { n: "08", icon: CalendarDays, title: "Calendar", body: "One shared calendar — meetings, deadlines, tours, and weekly action steps." },
  { n: "09", icon: CalendarRange, title: "30 / 60 / 90 Day Plan", body: "Doable steps with a clear owner for each one." },
  { n: "10", icon: LayoutDashboard, title: "Role Dashboards", body: "See the same plan from student, family, educator, school, district, partner, and platform views." },
  { n: "11", icon: Compass, title: "What's Next", body: "Clear paths forward for families, educators, schools, districts, and partners." },
] as const;

const STEP_PATHS = [
  "/demo/intake",
  "/demo/voice",
  "/demo/documents",
  "/demo/report",
  "/demo/opportunities",
  "/demo/resources",
  "/demo/meeting",
  "/demo/calendar",
  "/demo/plan",
  "/demo/hub",
  "/demo/next",
] as const;

function DemoIndex() {
  const search = Route.useSearch();
  const s = search.s ?? DEFAULT_DEMO_STUDENT;
  const preservedStudentSearch = demoStudentSearch(search.s);
  const bundle = getDemoStudent(s);
  const { profile: student } = bundle;

  return (
    <SiteShell>
      {/* Hero with horizon gradient + logo-safe brand mark */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-gradient-horizon opacity-95" />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent"
        />
        <div aria-hidden className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-sunrise opacity-40 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 pt-16 pb-24 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
          {/* Logo-safe brand mark */}
          <div className="tf-reveal flex items-center gap-3 text-primary-foreground/90">
            <span
              aria-hidden
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-primary-foreground/30 bg-primary-foreground/10 backdrop-blur"
            >
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">
              TransitionForward · Live Demo
            </span>
          </div>

          <h1 className="tf-reveal tf-reveal-delay-1 mt-6 max-w-3xl font-display text-4xl font-semibold tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl">
            Walk a real transition plan, end to end.
          </h1>
          <p className="tf-reveal tf-reveal-delay-2 mt-5 max-w-2xl text-base leading-relaxed text-primary-foreground/85 sm:text-lg">
            Pick a fictional student and follow the full pathway — intake, the report, partner
            opportunities, role dashboards, and the next step. No account, no setup.
          </p>

          {/* Animated step ribbon */}
          <div className="tf-reveal tf-reveal-delay-3 mt-8 flex items-center gap-3">
            <div className="relative h-1.5 w-48 overflow-hidden rounded-full bg-primary-foreground/15 sm:w-72">
              <span aria-hidden className="tf-step-fill block h-full w-full bg-gradient-sunrise" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/80">
              11 Steps · ~6 Minutes
            </span>
          </div>

          {/* Trust + CTA strip */}
          <div className="tf-reveal tf-reveal-delay-4 mt-8 flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="gap-1 border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground">
              <ShieldCheck className="h-3 w-3" /> Fictional Students · No Real Data
            </Badge>
            <Button asChild size="lg" variant="secondary" className="shadow-lift">
              <Link to="/demo/intake" {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}>
                Start The Walkthrough <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground">
              <Link to="/waitlist">Join The Waitlist</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        {/* Student picker */}
        <div className="-mt-12 grid gap-4 sm:grid-cols-2">
          {(["maya", "jordan"] as DemoStudentId[]).map((id, i) => {
            const b = DEMO_STUDENTS[id];
            const active = id === s;
            return (
              <Link
                key={id}
                to="/demo"
                search={{ s: id }}
                resetScroll={false}
                className={`tf-lift ${i === 1 ? "tf-reveal-delay-1" : ""} group rounded-3xl border bg-card p-6 shadow-soft tf-hover-lift ${
                  active ? "border-primary ring-2 ring-primary/30" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      {active ? "Walking With" : "Switch To"}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold">{toTitleCase(b.profile.full_name)}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{b.tagline}</p>
                  </div>
                  {active ? <Badge className="gap-1">Selected</Badge> : <Badge variant="outline">Switch</Badge>}
                </div>
                <p className="mt-3 text-sm text-foreground/85">{b.headline}</p>
              </Link>
            );
          })}
        </div>

        {/* Selected student card */}
        <div className="tf-reveal tf-reveal-delay-2 mt-8 overflow-hidden rounded-3xl border bg-card p-6 shadow-report sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                You're Walking With
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold">{toTitleCase(student.full_name)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {student.pronouns} · {student.grade} · {student.school}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {student.disability_category} · Graduating {student.graduation_year}
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              Case Manager: {toTitleCase(student.case_manager)}
            </Badge>
          </div>
          <div aria-hidden className="my-5 h-px pathway-line" />
          <p className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm italic leading-relaxed text-foreground/85">
            "{bundle.report.student_snapshot?.student_voice_quote}"
            <span className="mt-2 block not-italic text-xs text-muted-foreground">
              — in {student.first_name}'s words, from the intake
            </span>
          </p>
        </div>

        {/* Step grid */}
        <div className="mt-12">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            The Full Walkthrough
          </p>
          <div className="mx-auto mt-2 h-px w-24 pathway-line" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <Link
                  key={step.title}
                  to={STEP_PATHS[idx]}
                  {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}
                  className="tf-lift group block rounded-3xl border bg-card p-6 shadow-soft tf-hover-lift"
                  style={{ animationDelay: `${Math.min(idx * 40, 320)}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="step-marker h-10 w-10 text-sm font-semibold">{step.n}</span>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent/30 text-accent-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Final CTA */}
        <div className="tf-reveal mt-12 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl border border-border/60 bg-gradient-hero p-6 shadow-soft sm:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Start The Walkthrough
            </p>
            <p className="mt-2 font-display text-2xl font-semibold">
              Begin With {student.first_name}'s Intake.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              You can switch students any time using the bar at the top.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link to="/demo/intake" {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}>
                Start The Demo <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/waitlist">Join The Waitlist</Link>
            </Button>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Internal audit:{" "}
          <Link to="/demo/connection" className="underline hover:text-foreground">
            Demo Feature Connection Checklist
          </Link>
        </p>
      </section>
    </SiteShell>
  );
}
