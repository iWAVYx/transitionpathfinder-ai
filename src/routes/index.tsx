import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Compass,
  FileText,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TransitionForward — Confidence for the years after high school" },
      {
        name: "description",
        content:
          "A research-backed hub for families of students with IEPs. Start transition planning in 9th grade — not 11th. Upload your IEP, get AI-guided next steps, and explore real post-school pathways.",
      },
      { property: "og:title", content: "TransitionForward — Start transition planning in 9th grade" },
      {
        property: "og:description",
        content:
          "Built by a special-education teacher. AI-guided, evidence-based transition planning for families and educators.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <SiteShell>
      <Hero />
      <SixStrandsBento />
      <GradeBands />
      <HowItHelps />
      <ResearchTeaser />
      <ClosingCta />
    </SiteShell>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero opacity-70" aria-hidden />
      <div
        className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-soft blur-3xl"
        aria-hidden
      />
      <div
        className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-peach-soft blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8">
        <div className="grid items-start gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-foreground/80 shadow-soft backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              For families of students with IEPs
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Plan their future,{" "}
              <span className="bg-gradient-to-r from-primary to-secondary-foreground bg-clip-text text-transparent">
                starting in 9th grade.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              TransitionForward turns your child's IEP into a clear, research-backed
              roadmap — academics, self-advocacy, life skills, careers, and the people
              who can help — long before the senior-year scramble.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/waitlist"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-all hover:-translate-y-0.5"
              >
                Join the pilot
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/framework"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold text-foreground shadow-soft backdrop-blur hover:bg-background"
              >
                See the framework
              </Link>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 text-left">
              <Stat value="9th" label="When planning should start" />
              <Stat value="6" label="Strands across high school" />
              <Stat value="IDEA" label="& CT IEP aligned" />
            </dl>
          </div>

          {/* Hero card collage */}
          <div className="lg:col-span-5">
            <div className="grid grid-cols-6 gap-3">
              <FloatCard
                className="col-span-6 bg-card"
                eyebrow="Snapshot"
                title="Maya · 10th grade"
                body="Strong reader, growing self-advocate. Next: shadow a logistics site."
                accent="sky"
              />
              <FloatCard
                className="col-span-3 bg-card"
                eyebrow="Pathway match"
                title="Technical school"
                body="High fit"
                accent="peach"
              />
              <FloatCard
                className="col-span-3 bg-card"
                eyebrow="Next PPT"
                title="3 questions ready"
                body="Auto-prepped"
                accent="sky"
              />
              <div className="col-span-6 rounded-2xl border border-border/60 bg-card p-4 shadow-lift">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <MessageCircle className="h-3.5 w-3.5 text-primary" /> Transition coach
                </div>
                <p className="mt-2 text-sm text-foreground">
                  "His IEP mentions 'community-based instruction' — what does that
                  actually look like in 10th grade, and what should I ask for?"
                </p>
                <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Cites <span className="font-medium text-foreground">Handbook §5</span> ·{" "}
                  <span className="font-medium text-foreground">Carter et al. 2012</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="font-display text-2xl font-bold text-foreground">{value}</dt>
      <dd className="mt-1 text-xs text-muted-foreground">{label}</dd>
    </div>
  );
}

function FloatCard({
  className,
  eyebrow,
  title,
  body,
  accent,
}: {
  className?: string;
  eyebrow: string;
  title: string;
  body: string;
  accent: "sky" | "peach";
}) {
  return (
    <div
      className={`rounded-2xl border border-border/60 p-4 shadow-soft ${className ?? ""}`}
    >
      <div
        className={`mb-2 inline-flex h-6 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide ${
          accent === "sky"
            ? "bg-sky-soft text-primary"
            : "bg-peach-soft text-secondary-foreground"
        }`}
      >
        {eyebrow}
      </div>
      <div className="font-display text-sm font-semibold text-foreground">{title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

/* ---------- Six Strands (bento) ---------- */

const strands = [
  {
    icon: GraduationCap,
    title: "Academics that count",
    body:
      "Attendance, credits, executive function, and reading — treated as transition issues, not separate priorities.",
    span: "md:col-span-2",
    tint: "bg-sky-soft",
  },
  {
    icon: Compass,
    title: "Self-determination",
    body:
      "Students learn to explain their accommodations, set goals, and speak up at their own PPTs.",
    span: "md:col-span-2",
    tint: "bg-peach-soft",
  },
  {
    icon: HeartHandshake,
    title: "Life skills",
    body: "Money, transportation, health, daily routines — practiced early, layered over time.",
    span: "md:col-span-2",
    tint: "bg-card",
  },
  {
    icon: Lightbulb,
    title: "Postsecondary exposure",
    body:
      "Tours, job shadows, and career events — built into 9th and 10th grade, not saved for senior year.",
    span: "md:col-span-3",
    tint: "bg-card",
  },
  {
    icon: Users,
    title: "Family partnership",
    body: "You stop juggling this alone between PPTs. The plan lives with you, not in a folder.",
    span: "md:col-span-3",
    tint: "bg-gradient-warm",
  },
];

function SixStrandsBento() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            The framework
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Six strands, woven across all four years.
          </h2>
        </div>
        <p className="max-w-md text-sm text-muted-foreground">
          Adapted from the <span className="font-medium text-foreground">Transition Forward</span> handbook.
          Each strand runs from 9th grade through exit — with different
          emphases at each stage.
        </p>
      </div>

      <div className="mt-10 grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-6">
        {strands.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.title}
              className={`${s.span} ${s.tint} rounded-3xl border border-border/60 p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift`}
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-background/80 shadow-soft">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          );
        })}
        <div className="md:col-span-6 rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-semibold">Coordinated planning</h3>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Family, teachers, related services, and community partners share one
                view of the plan — so nothing falls through the cracks between meetings.
              </p>
            </div>
            <Link
              to="/framework"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
            >
              See full framework <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Grade bands ---------- */

const bands = [
  {
    grade: "9",
    title: "Launch & stabilize",
    body: "Schedule, credits, supports, strengths, interests. Early-warning signals become transition conversations.",
  },
  {
    grade: "10",
    title: "Explore & build",
    body: "Career exposure expands. Life skills get explicit instruction. Accommodations are reviewed and practiced.",
  },
  {
    grade: "11",
    title: "Plan & apply",
    body: "Postsecondary interests narrow. Visits, work experiences, agency referrals, and applications begin.",
  },
  {
    grade: "12+",
    title: "Execute & hand off",
    body: "Finalize applications, referrals, graduation pathway. Student exits with contacts, documents, and a plan.",
  },
];

function GradeBands() {
  return (
    <section className="relative border-y border-border/60 bg-muted/40 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Grade-banded
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            A different focus for every year of high school.
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Your parent dashboard shifts as your child progresses — so the next best
            action is always grade-appropriate, not generic.
          </p>
        </div>

        <ol className="mt-12 grid gap-4 md:grid-cols-4">
          {bands.map((b, i) => (
            <li
              key={b.grade}
              className="relative rounded-3xl border border-border/60 bg-card p-6 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-hero font-display text-base font-bold text-foreground shadow-soft">
                  {b.grade}
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Stage {i + 1}
                </span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{b.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- How it helps ---------- */

const helps = [
  {
    icon: FileText,
    title: "Upload the IEP, get plain English back",
    body:
      "Drop in your child's IEP or Connecticut SED form. The AI surfaces transition goals, services, and what's missing — with citations.",
  },
  {
    icon: Compass,
    title: "Ranked pathways with reasoning",
    body:
      "4-year college, 2-year, technical school, supported employment, competitive work, day programs — ranked for fit with the why behind each.",
  },
  {
    icon: MessageCircle,
    title: "Ask anything, anytime",
    body:
      "A coach that knows your child's IEP and the TransitionForward research base. No more saving up questions for the next PPT.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body:
      "IEPs are encrypted and scoped to your account only. Never used to train AI. You can delete everything, any time.",
  },
];

function HowItHelps() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          For families
        </p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          The questions you've been carrying alone — answered.
        </h2>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {helps.map((h) => {
          const Icon = h.icon;
          return (
            <div
              key={h.title}
              className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-soft">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{h.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{h.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Research teaser ---------- */

function ResearchTeaser() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Built on evidence
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Grounded in the predictors that actually move post-school outcomes.
          </h2>
          <p className="mt-3 max-w-xl text-base text-foreground/80">
            Student involvement, work-based learning, self-determination, family
            engagement, interagency collaboration — the predictors from Mazzotti, Test,
            Allensworth, Carter, Trainor, Burke, and CSDE guidance show up in every
            recommendation the platform makes.
          </p>
          <Link
            to="/research"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90"
          >
            Browse the research library <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Mazzotti et al.", year: "2021", topic: "Updated predictors of post-school success" },
            { label: "Test et al.", year: "2009", topic: "Evidence-based predictors of post-school outcomes" },
            { label: "Allensworth", year: "2013", topic: "Ninth grade as the key transition year" },
            { label: "Carter et al.", year: "2011 / 2012", topic: "Work-based learning & community experiences" },
          ].map((p) => (
            <div
              key={p.label}
              className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft"
            >
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {p.year}
              </div>
              <div className="mt-1 font-display text-sm font-semibold">{p.label}</div>
              <p className="mt-1 text-xs text-muted-foreground">{p.topic}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Closing CTA ---------- */

function ClosingCta() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-card p-8 shadow-lift sm:p-12">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">
              Be one of our first pilot families.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              We're onboarding a small group of CT families and educators this season.
              No charge during the pilot. Your feedback shapes what we build next.
            </p>
          </div>
          <Link
            to="/waitlist"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift hover:-translate-y-0.5 transition-transform"
          >
            Request access <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
