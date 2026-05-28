import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Quote,
  Users,
  MessageSquare,
  Target,
  Compass,
  Heart,
  Mic,
  GraduationCap,
  Handshake,
  LineChart,
  FileWarning,
  Layers,
  Briefcase,
  ScrollText,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import researchHero from "@/assets/research-hero.jpg";
import {
  Parallax,
  Reveal,
  Marquee,
  TextScrollFill,
} from "@/components/effects/ScrollEffects";
import {
  CursorField,
  Magnetic,
  HoverReveal,
  TextMask,
  StickyPin,
  MorphCard,
  FloatingShape,
} from "@/components/effects/ImmersiveEffects";
import { toTitleCase } from "@/lib/title-case";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "The research behind it — TransitionForward" },
      {
        name: "description",
        content:
          "Transition planning works best when students, families, and educators move together. Research-grounded practices, mapped to the features inside TransitionForward.",
      },
      { property: "og:title", content: "The research behind TransitionForward" },
      {
        property: "og:description",
        content:
          "Evidence-based transition planning practices, translated into a practical digital experience.",
      },
      { property: "og:image", content: researchHero },
      { property: "twitter:image", content: researchHero },
    ],
  }),
  component: ResearchPage,
});

// ─── Pain points ───────────────────────────────────────────
const painPoints = [
  {
    icon: MessageSquare,
    title: "Families struggle to understand transition language",
    body: "Acronyms, agency names, and legal phrasing make it hard to know what to ask or what comes next.",
  },
  {
    icon: Mic,
    title: "Student voice can get lost",
    body: "When meetings move quickly through forms, the student's own goals, interests, and questions often slip out of the room.",
  },
  {
    icon: Target,
    title: "Goals are disconnected from real opportunities",
    body: "A goal on paper is not the same as a program down the street, an internship next summer, or a college that fits.",
  },
  {
    icon: Layers,
    title: "Resources are scattered",
    body: "Helpful information lives across binders, PDFs, district sites, agency portals, and word of mouth.",
  },
  {
    icon: FileWarning,
    title: "Educators are juggling too many tools",
    body: "IEP systems, communication apps, district platforms, document folders — the load makes deep planning hard.",
  },
  {
    icon: LineChart,
    title: "Progress can be hard to see",
    body: "Without a shared view of growth, students, families, and teachers each track different pieces of the same story.",
  },
  {
    icon: ScrollText,
    title: "Systems can feel overwhelming",
    body: "When the process feels bureaucratic, families often disengage — not from a lack of care, but from a lack of clarity.",
  },
];

// ─── Effective practice cards ──────────────────────────────
const practices = [
  { icon: Users, title: "Student-centered planning", body: "Goals begin with who the student is — interests, strengths, voice." },
  { icon: Heart, title: "Family engagement", body: "Plans improve when families understand and contribute throughout the year." },
  { icon: Target, title: "Clear, measurable goals", body: "Goals named in plain language, owned by the people who work on them." },
  { icon: LineChart, title: "Progress monitoring", body: "Visible growth across academic, life-skill, and transition domains." },
  { icon: Briefcase, title: "Career exploration", body: "Early, structured exposure to real careers, employers, and work settings." },
  { icon: Compass, title: "Life skills development", body: "Daily-living, self-care, and community-navigation skills woven into the plan." },
  { icon: Mic, title: "Self-advocacy", body: "Students learning to name what they need and lead the conversation about it." },
  { icon: GraduationCap, title: "Postsecondary pathways", body: "Connecting goals to colleges, technical programs, and supported employment." },
  { icon: Handshake, title: "Community partnerships", body: "Schools moving in step with agencies, employers, and family-led organizations." },
];

// ─── Evidence → Feature map ────────────────────────────────
const evidenceMap = [
  {
    need: "Families need clearer communication",
    feature: "Plain-language explanations & Family Dashboard",
    body: "Every acronym, form, and IEP term explained in language a family can actually use, alongside a shared view of what is happening for their student.",
  },
  {
    need: "Students need more voice",
    feature: "Student Hub & Student Voice Profile",
    body: "A space where students name interests, strengths, questions, and goals — then walk into the meeting prepared to speak to them.",
  },
  {
    need: "Transition goals need to connect to action",
    feature: "Pathway Report & 30-Day Action Plan",
    body: "Goals translated into concrete next steps the team can take this month, not just file for next year.",
  },
  {
    need: "Teachers need better organization",
    feature: "Educator Dashboard & Meeting Center",
    body: "One place to prep meetings, collect input, share documents, and track progress without juggling six tools.",
  },
  {
    need: "Students need real-world pathways",
    feature: "Partner Opportunity Network",
    body: "Vetted Connecticut programs, schools, and employers connected directly to a student's interests and goals.",
  },
  {
    need: "Progress needs to be visible",
    feature: "Goal & Progress Tracker",
    body: "A shared, calm view of growth — for the student, family, and team — across academic, transition, and life-skill domains.",
  },
];

// ─── Citations ──────────────────────────────────────────────
const citations = [
  "Mazzotti et al., 2021",
  "Test et al., 2009",
  "Allensworth, 2013",
  "Carter, 2011 · 2012",
  "Trainor, 2017",
  "Burke, 2013",
  "Connecticut SDE Transition Guidance",
];

function ResearchPage() {
  return (
    <SiteShell>
      {/* ============ HERO ============ */}
      <CursorField className="relative">
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <img
              src={researchHero}
              alt=""
              aria-hidden
              className="h-full w-full object-cover opacity-25"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background" />
          </div>




          <div className="mx-auto max-w-7xl px-4 pt-20 pb-20 sm:px-6 lg:px-8 lg:pt-28 lg:pb-28">
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-primary backdrop-blur">
                <BookOpen className="h-3.5 w-3.5" /> The research behind it
              </p>
            </Reveal>

            <h1 className="mt-7 font-display text-[clamp(2.5rem,7vw,6.5rem)] font-medium leading-[0.98] tracking-tight">
              <Reveal>
                <span className="block">The research is clear:</span>
              </Reveal>
              <Reveal delay={100}>
                <span className="block">
                  transition planning works best when students, families,
                </span>
              </Reveal>
              <Reveal delay={200}>
                <span className="block">
                  and educators{" "}
                  <TextMask gradient="linear-gradient(120deg, oklch(0.78 0.12 50), oklch(0.82 0.1 25), oklch(0.78 0.1 220), oklch(0.78 0.12 50))">
                    move together
                  </TextMask>
                  .
                </span>
              </Reveal>
            </h1>

            <Reveal delay={300}>
              <p className="mt-10 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Two decades of secondary transition research point to the same set of practices —
                student-centered planning, family engagement, real-world pathways, and visible
                progress. TransitionForward turns those practices into a tool teams can actually
                use on a Tuesday afternoon.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Citation marquee */}
        <div className="border-y border-border/50 bg-card/60 backdrop-blur-sm">
          <Marquee
            speed={35}
            className="py-4 font-sans text-sm uppercase tracking-[0.2em] text-muted-foreground"
            items={citations.flatMap((c) => [
              <span key={c} className="inline-flex items-center">
                {c}
                <span className="ml-8 text-primary">·</span>
              </span>,
            ])}
          />
        </div>
      </CursorField>

      {/* ============ THE PROBLEM IN PRACTICE ============ */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            The problem in practice
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
            {toTitleCase("What gets in the way of good transition planning.")}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            These are not failures of caring. They are friction points inside systems that ask a lot
            of everyone — students, families, and educators alike.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {painPoints.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 60}>
              <article className="group relative h-full overflow-hidden rounded-3xl border border-border/60 bg-card p-7 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-peach/15 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-warm text-primary shadow-soft">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-2xl font-medium leading-tight tracking-tight">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ TEXT SCROLL FILL — STATEMENT ============ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background via-sky-soft/20 to-background py-32">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            What works
          </p>
          <TextScrollFill
            className="mt-6 font-display text-[clamp(1.75rem,3.5vw,3rem)] font-medium leading-[1.2] tracking-tight"
            text="A plan should sound like the student. Families should walk in informed, not catching up. Goals should connect to people, programs, and opportunities. Progress should be visible to everyone working on it."
          />
        </div>
      </section>

      {/* ============ WHAT EFFECTIVE TRANSITION PLANNING NEEDS ============ */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Evidence-based practice
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
            {toTitleCase("Nine practices that change outcomes.")}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Hover any card to read why it matters — drawn from the Mazzotti, Test, and Carter
            evidence bases and Connecticut transition guidance.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {practices.map(({ icon: Icon, title, body }) => (
            <HoverReveal
              key={title}
              height="220px"
              className="bg-gradient-to-br from-background via-sky-soft/25 to-peach-soft/30"
              front={
                <div className="flex h-[220px] flex-col justify-between p-7">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background text-primary shadow-soft">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-2xl font-medium leading-tight tracking-tight">
                    {title}
                  </h3>
                </div>
              }
              back={
                <div className="flex h-full flex-col justify-end">
                  <p className="text-sm leading-relaxed text-foreground/85">{body}</p>
                </div>
              }
            />
          ))}
        </div>
      </section>

      {/* ============ STICKY: WHY TRANSITIONFORWARD EXISTS ============ */}
      <section className="relative bg-gradient-to-b from-background to-sky-soft/30">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:px-8 lg:py-32">
          <div>
            <StickyPin top="8rem">
              <div className="rounded-3xl border border-border/60 bg-card/80 p-8 shadow-soft backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  Why TransitionForward exists
                </p>
                <h2 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
                  {toTitleCase("Research-backed practices, turned into a tool you can use on a Tuesday.")}
                </h2>
                <p className="mt-6 text-base leading-relaxed text-muted-foreground">
                  TransitionForward turns research-backed transition practices into a practical
                  digital experience — one platform for the planning, the people, and the progress.
                </p>
                <p className="mt-6 font-display text-xl italic text-foreground/80">
                  One platform. One plan. Forward together.
                </p>
              </div>
            </StickyPin>
          </div>

          <div className="space-y-5">
            {evidenceMap.map((row, i) => (
              <Reveal key={row.need} delay={i * 60}>
                <article className="group rounded-3xl border border-border/60 bg-card p-7 shadow-soft transition-all hover:-translate-x-1 hover:shadow-lift">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
                    <span className="rounded-full bg-peach/30 px-3 py-1 text-foreground/85">
                      Research / Need
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-primary transition-transform group-hover:translate-x-1" />
                    <span className="rounded-full bg-sky/30 px-3 py-1 text-foreground/85">
                      TransitionForward Feature
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                    <p className="font-display text-xl font-medium leading-snug tracking-tight">
                      {row.need}
                    </p>
                    <ArrowRight className="hidden h-5 w-5 text-primary md:block" />
                    <p className="font-display text-xl font-medium leading-snug tracking-tight text-primary">
                      {row.feature}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{row.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ INTERACTIVE QUOTE BLOCK ============ */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        <MorphCard className="bg-gradient-to-br from-peach-soft/40 via-background to-sky-soft/40">
          <div className="relative p-10 sm:p-14">
            <Quote className="absolute right-8 top-8 h-12 w-12 text-primary/30" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              The closing statement
            </p>
            <p className="mt-6 max-w-4xl font-display text-3xl font-medium leading-[1.15] tracking-tight sm:text-5xl">
              TransitionForward is built on a simple idea: transition planning should not end with
              a document. It should{" "}
              <TextMask gradient="linear-gradient(120deg, oklch(0.78 0.1 220), oklch(0.78 0.12 50))">
                begin a pathway
              </TextMask>
              .
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Magnetic>
                <Link
                  to="/platform"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lift hover:shadow-soft"
                >
                  See the platform <ArrowRight className="h-4 w-4" />
                </Link>
              </Magnetic>
              <Magnetic>
                <Link
                  to="/framework"
                  className="inline-flex items-center justify-center rounded-full border border-border bg-background/90 px-7 py-3 text-sm font-semibold backdrop-blur hover:bg-background"
                >
                  Read the framework
                </Link>
              </Magnetic>
              <Magnetic>
                <Link
                  to="/waitlist"
                  className="inline-flex items-center justify-center rounded-full border border-border bg-background/90 px-7 py-3 text-sm font-semibold backdrop-blur hover:bg-background"
                >
                  Join the waitlist
                </Link>
              </Magnetic>
            </div>
          </div>
        </MorphCard>
      </section>
    </SiteShell>
  );
}
