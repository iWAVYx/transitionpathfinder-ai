import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/framework")({
  head: () => ({
    meta: [
      { title: "The TransitionForward Framework — Grade 9 to Exit" },
      {
        name: "description",
        content:
          "A grade-banded transition framework for students with IEPs. Six strands across four years, grounded in IDEA, CT IEP guidance, and evidence-based predictors.",
      },
      { property: "og:title", content: "The TransitionForward Framework" },
      {
        property: "og:description",
        content:
          "Grade 9 through exit: launch, explore, plan, execute. Adapted from the Transition Forward handbook.",
      },
    ],
  }),
  component: FrameworkPage,
});

const bands = [
  {
    grade: "9",
    title: "Launch & stabilization",
    student:
      "Understands schedule, credits, supports, strengths, and interests.",
    team: "Complete transition profile, monitor warning signs, teach self-advocacy basics.",
    evidence: "Attendance, grades, profile, reflection notes.",
  },
  {
    grade: "10",
    title: "Exploration & skill building",
    student:
      "Connects classes to possible pathways. Practices increasing independence.",
    team: "Deepen life-skills instruction, expand career exposure, review accommodations.",
    evidence: "Work samples, goal check-ins, event participation.",
  },
  {
    grade: "11",
    title: "Planning & application",
    student: "Narrows postsecondary interests, uses stronger decision making.",
    team: "Coordinate visits, work experiences, agency referrals, application prep.",
    evidence: "Resume, interviews, assessment data, family planning notes.",
  },
  {
    grade: "12+",
    title: "Execution & handoff",
    student:
      "Exits with next steps, contacts, documents, and a clear support plan.",
    team: "Finalize applications, referrals, graduation options, transition closeout.",
    evidence: "Confirmed plans, contact sheet, signed handoff.",
  },
];

const strands = [
  "Academics tied to outcomes",
  "Self-determination & self-advocacy",
  "Life skills & independent living",
  "Postsecondary & career exposure",
  "Family partnership",
  "Coordinated planning",
];

const principles = [
  {
    title: "Start earlier",
    body: "Transition and life skills introduced in 9th grade — not saved for senior year.",
  },
  {
    title: "Tie academics to outcomes",
    body: "Attendance, credits, reading, writing, communication, and executive functioning are transition issues.",
  },
  {
    title: "Keep student voice central",
    body: "Students name strengths, needs, goals, accommodations, and support preferences.",
  },
  {
    title: "Use community exposure",
    body: "Real employers, colleges, training sites, agencies, and youth-development partners.",
  },
  {
    title: "Build usable systems",
    body: "Routines and tools teams can actually maintain — not one-time paperwork.",
  },
];

function FrameworkPage() {
  return (
    <SiteShell>
      <section className="border-b border-border/60 bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            The framework
          </p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Grade 9 to exit, one connected plan.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-foreground/80 sm:text-lg">
            Adapted from <em>Transition Forward</em> by Caysi Morgan (SCSU EDU 591
            Capstone, 2026). Built around IDEA, CT IEP guidance, and the
            evidence-based predictors that move post-school outcomes.
          </p>
        </div>
      </section>

      {/* Principles */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">
          Design principles
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {principles.map((p) => (
            <div
              key={p.title}
              className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-soft">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Six strands */}
      <section className="border-y border-border/60 bg-muted/40 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">The six strands</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Strands run across every grade. The grade band changes the emphasis,
            not the strand.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {strands.map((s, i) => (
              <li
                key={s}
                className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-soft"
              >
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-hero font-display text-xs font-bold">
                  {i + 1}
                </span>
                <span className="font-display text-base font-semibold text-foreground">
                  {s}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Grade bands table */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">
          Grade bands at a glance
        </h2>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {bands.map((b) => (
            <article
              key={b.grade}
              className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero font-display text-lg font-bold shadow-soft">
                  {b.grade}
                </span>
                <h3 className="font-display text-xl font-semibold">{b.title}</h3>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Student outcomes
                  </dt>
                  <dd className="mt-1 text-foreground">{b.student}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Team actions
                  </dt>
                  <dd className="mt-1 text-foreground">{b.team}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Evidence to collect
                  </dt>
                  <dd className="mt-1 text-foreground">{b.evidence}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-border/60 bg-gradient-hero p-8 text-center shadow-soft">
          <h3 className="font-display text-xl font-bold sm:text-2xl">
            Want this applied to your child's IEP?
          </h3>
          <p className="mt-2 text-sm text-foreground/80">
            Join the pilot to upload an IEP and get a grade-band roadmap with citations.
          </p>
          <Link
            to="/waitlist"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift hover:-translate-y-0.5 transition-transform"
          >
            Request pilot access <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
