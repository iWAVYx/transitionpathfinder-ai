import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
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
  Star,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import researchHero from "@/assets/research-hero.jpg";
import {
  Reveal,
  Marquee,
  TextScrollFill,
} from "@/components/effects/ScrollEffects";
import {
  CursorField,
  Magnetic,
  TextMask,
  FloatingShape,
} from "@/components/effects/ImmersiveEffects";
import { toTitleCase } from "@/lib/title-case";

function GridBurst({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="0.6">
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return <line key={i} x1="100" y1="100" x2={100 + Math.cos(a) * 96} y2={100 + Math.sin(a) * 96} />;
      })}
      <circle cx="100" cy="100" r="38" />
      <circle cx="100" cy="100" r="62" opacity="0.5" />
      <circle cx="100" cy="100" r="86" opacity="0.25" />
    </svg>
  );
}
function CornerArc({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" aria-hidden className={className} fill="none">
      <path d="M 0 160 A 160 160 0 0 1 160 0" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path d="M 0 160 A 110 110 0 0 1 110 50" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <path d="M 0 160 A 60 60 0 0 1 60 100" stroke="currentColor" strokeWidth="1" opacity="0.2" />
    </svg>
  );
}

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




          <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-20 sm:px-6 lg:px-8 lg:pt-28 lg:pb-28">
            {/* Decorative illustrations in hero blank space */}
            <FloatingShape className="pointer-events-none absolute right-6 top-10 hidden text-primary/30 lg:block" duration={26}>
              <GridBurst className="h-40 w-40" />
            </FloatingShape>
            <FloatingShape className="pointer-events-none absolute right-[18%] bottom-10 hidden text-peach/60 lg:block" duration={22} delay={1}>
              <Star className="h-10 w-10" strokeWidth={1.2} />
            </FloatingShape>

            <Reveal>
              <p className="inline-flex items-center gap-2 border-l-2 border-primary pl-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
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

        <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {painPoints.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 60}>
              <article className="group relative border-t-2 border-foreground/15 pt-6">
                <GridBurst className="pointer-events-none absolute -left-6 -top-2 h-28 w-28 text-primary/15 transition-opacity group-hover:text-primary/30" />
                <div className="relative flex items-start gap-5">
                  <div className="relative shrink-0">
                    <div className="absolute -inset-3 -z-10 bg-gradient-warm opacity-50 blur-xl transition-opacity group-hover:opacity-90" />
                    <Icon className="h-12 w-12 text-primary transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110" strokeWidth={1.4} />
                  </div>
                  <span className="ml-auto font-display text-sm tabular-nums text-foreground/30">
                    {String(i + 1).padStart(2, "0")}
                  </span>
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
            Drawn from the Mazzotti, Test, and Carter evidence bases and Connecticut transition
            guidance — the practices we built TransitionForward around.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {practices.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 50}>
              <article className="group relative border-t-2 border-foreground/15 pt-6">
                <GridBurst className="pointer-events-none absolute -left-6 -top-2 h-28 w-28 text-sky/25 transition-opacity group-hover:text-sky/45" />
                <div className="relative flex items-start gap-5">
                  <div className="relative shrink-0">
                    <div className="absolute -inset-3 -z-10 bg-gradient-warm opacity-50 blur-xl transition-opacity group-hover:opacity-90" />
                    <Icon className="h-12 w-12 text-primary transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110" strokeWidth={1.4} />
                  </div>
                  <span className="ml-auto font-display text-sm tabular-nums text-foreground/30">
                    {String(i + 1).padStart(2, "0")}
                  </span>
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

      {/* ============ WHY TRANSITIONFORWARD EXISTS ============ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-sky-soft/30">
        <FloatingShape className="pointer-events-none absolute right-[3%] top-16 hidden text-primary/25 lg:block" duration={26}>
          <GridBurst className="h-48 w-48" />
        </FloatingShape>

        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:px-8 lg:py-32">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="border-l-2 border-primary pl-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
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
            <CornerArc className="pointer-events-none mt-8 hidden h-24 w-24 text-primary/40 lg:block" />
          </div>

          <ul className="divide-y divide-foreground/15 border-y border-foreground/15">
            {evidenceMap.map((row, i) => (
              <li key={row.need}>
                <Reveal delay={i * 50}>
                  <article className="group grid items-start gap-3 py-7 md:grid-cols-[1fr_auto_1fr] md:gap-6">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
                        Research / Need
                      </p>
                      <p className="mt-2 font-display text-xl font-medium leading-snug tracking-tight">
                        {row.need}
                      </p>
                    </div>
                    <ArrowRight className="hidden h-6 w-6 self-center text-primary transition-transform group-hover:translate-x-1 md:block" strokeWidth={1.5} />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">
                        TransitionForward Feature
                      </p>
                      <p className="mt-2 font-display text-xl font-medium leading-snug tracking-tight text-primary">
                        {row.feature}
                      </p>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground md:col-span-3">
                      {row.body}
                    </p>
                  </article>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ CLOSING STATEMENT — OPEN COMPOSITION ============ */}
      <section className="relative mx-auto max-w-6xl overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
        <FloatingShape className="pointer-events-none absolute left-[2%] top-10 hidden text-sky/30 lg:block" duration={26}>
          <GridBurst className="h-56 w-56" />
        </FloatingShape>
        <FloatingShape className="pointer-events-none absolute right-[4%] bottom-12 hidden text-peach/55 lg:block" duration={22} delay={1}>
          <Star className="h-14 w-14" strokeWidth={1.1} />
        </FloatingShape>

        <div className="relative">
          <p className="border-l-2 border-primary pl-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
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
                className="inline-flex items-center gap-2 bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lift hover:shadow-soft"
              >
                See the platform <ArrowRight className="h-4 w-4" />
              </Link>
            </Magnetic>
            <Magnetic>
              <Link
                to="/framework"
                className="inline-flex items-center justify-center border border-foreground/20 bg-background/90 px-7 py-3 text-sm font-semibold backdrop-blur hover:bg-background"
              >
                Read the framework
              </Link>
            </Magnetic>
            <Magnetic>
              <Link
                to="/waitlist"
                className="inline-flex items-center justify-center border border-foreground/20 bg-background/90 px-7 py-3 text-sm font-semibold backdrop-blur hover:bg-background"
              >
                Join the waitlist
              </Link>
            </Magnetic>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
