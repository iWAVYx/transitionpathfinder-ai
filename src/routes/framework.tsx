import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Compass, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import frameworkHero from "@/assets/framework-hero.jpg";
import pathProgress from "@/assets/path-progress.jpg";
import pathCollege from "@/assets/path-college.jpg";
import pathCareer from "@/assets/path-career.jpg";
import pathLifeskills from "@/assets/path-lifeskills.jpg";
import {
  Parallax,
  ParallaxImage,
  Reveal,
  ShapeScroll,
  TextScrollFill,
  StickyScrollStory,
  Marquee,
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

export const Route = createFileRoute("/framework")({
  head: () => ({
    meta: [
      { title: "The framework — How TransitionForward walks through it with you" },
      {
        name: "description",
        content:
          "A grade-by-grade transition framework for Connecticut families and teams. Six threads, four years, every recommendation tied to evidence.",
      },
      { property: "og:title", content: "How we walk through transition with you" },
      {
        property: "og:description",
        content:
          "Grade 9 to graduation: settle in, try things on, begin to choose, hand off with confidence.",
      },
    ],
  }),
  component: FrameworkPage,
});

const bands = [
  {
    grade: "9",
    title: "Settle in, look around",
    student:
      "Your child gets comfortable with their schedule, knows who's on their team, and starts naming what they're good at and what they care about.",
    team: "We help you build a transition profile, watch for early signals that need attention, and gently introduce self-advocacy without overwhelming anyone.",
    evidence:
      "Attendance and grade patterns, a living profile, your child's own reflections in their own words.",
    image: pathProgress,
  },
  {
    grade: "10",
    title: "Try things on",
    student:
      "Your child starts connecting their classes to real possibilities. Independence grows in small, practiced ways — not in one big leap.",
    team: "Life-skills instruction gets more deliberate. Career exposure widens. Accommodations are reviewed honestly, with your child in the room.",
    evidence:
      "Work samples that show growth, check-ins on the goals that matter, real attendance at career events.",
    image: pathLifeskills,
  },
  {
    grade: "11",
    title: "Begin to choose",
    student:
      "Postsecondary interests sharpen. Your child practices the decision-making that adulthood will ask of them — with support, not on their own.",
    team: "Visits, work experiences, agency referrals, and the early stages of applications get coordinated — together, with you in the loop.",
    evidence:
      "A resume your child can speak to, interview practice, fresh assessment data, family planning notes you've actually read.",
    image: pathCollege,
  },
  {
    grade: "12+",
    title: "Hand off with confidence",
    student:
      "Your child leaves with clear next steps, real contacts, the documents they need, and a support plan that follows them out the door.",
    team: "Applications finalized, referrals confirmed, graduation pathway settled, transition closeout handled with care — not chaos.",
    evidence:
      "Confirmed plans in writing, a contact sheet that's actually useful, a signed handoff so nothing is left assumed.",
    image: pathCareer,
  },
];

const strands = [
  {
    title: "Academics that lead somewhere",
    body: "Course choices read as transition signals, not isolated grades — every credit tied to a possible next chapter.",
  },
  {
    title: "Finding their own voice",
    body: "Self-determination practiced in small, real moments — naming a goal, asking for an accommodation, leading part of the PPT.",
  },
  {
    title: "The skills that shape a day",
    body: "Money, transportation, time, food, health — the quiet competencies that decide whether adulthood feels possible.",
  },
  {
    title: "A real look at what's out there",
    body: "Local employers, community colleges, technical schools, BRS, and youth-development partners — not brochures.",
  },
  {
    title: "You, held in the loop",
    body: "Families get plain-language updates, prep sheets before meetings, and translations after — never left guessing.",
  },
  {
    title: "Everyone on the same page",
    body: "Teachers, related services, agencies, and family see the same plan — no version drift, no surprise paperwork.",
  },
];

const principles = [
  {
    title: "Start sooner, gentler",
    body: "Transition and life skills introduced in 9th grade — not held back until the senior-year scramble.",
  },
  {
    title: "Tie schoolwork to a life",
    body: "Attendance, credits, reading, writing, communication, executive function — all read as transition signals.",
  },
  {
    title: "Keep your child at the center",
    body: "Your child names their strengths, their needs, their goals, the supports that help. Their voice leads the plan.",
  },
  {
    title: "Use the real world",
    body: "Local employers, colleges, training programs, agencies, and youth-development partners — not just slideshows.",
  },
  {
    title: "Build something teams can keep up with",
    body: "Routines and tools simple enough to actually use between meetings — not another binder no one opens.",
  },
];

function FrameworkPage() {
  return (
    <SiteShell>
      {/* HERO with cursor-tracked blobs + text mask headline */}
      <CursorField className="relative border-b border-border/60">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-60" />
        <FloatingShape className="absolute right-[8%] top-24 -z-10 hidden h-40 w-40 lg:block">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <circle cx="50" cy="50" r="40" fill="hsl(20 90% 70% / 0.7)" />
          </svg>
        </FloatingShape>
        <FloatingShape
          className="absolute left-[6%] bottom-10 -z-10 hidden h-24 w-24 lg:block"
          delay={1.2}
          duration={10}
        >
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <rect x="10" y="10" width="80" height="80" rx="24" fill="hsl(200 85% 70% / 0.65)" />
          </svg>
        </FloatingShape>

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-24 sm:px-6 md:grid-cols-[1.1fr_1fr] lg:px-8 lg:py-32">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              How we walk through it with you
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl font-medium leading-[1.02] tracking-tight sm:text-7xl">
              Grade 9 to graduation,{" "}
              <TextMask className="font-display">all of it one connected story.</TextMask>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/80 sm:text-lg">
              Adapted from <em>Transition Forward</em>, Caysi Morgan's graduate capstone at
              Southern Connecticut State University. Built around the federal IDEA mandate,
              Connecticut's IEP guidance, and the research that actually predicts a good life
              after high school.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Magnetic>
                <Link
                  to="/waitlist"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-transform hover:-translate-y-0.5"
                >
                  Walk through it with us <ArrowRight className="h-4 w-4" />
                </Link>
              </Magnetic>
              <Magnetic strength={14}>
                <Link
                  to="/research"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-muted"
                >
                  See the research <Sparkles className="h-4 w-4" />
                </Link>
              </Magnetic>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-warm opacity-60 blur-3xl" />
              <Parallax speed={-0.18}>
                <ParallaxImage
                  src={frameworkHero}
                  alt="A winding path through a sunlit meadow at golden hour"
                  width={1600}
                  height={1200}
                  speed={0.5}
                  className="aspect-[4/3] w-full rounded-[2rem] shadow-lift"
                />
              </Parallax>
            </div>
          </Reveal>
        </div>
      </CursorField>

      {/* Marquee of grade promises */}
      <section aria-label="Promises" className="border-b border-border/40 bg-muted/30 py-6">
        <Marquee
          speed={60}
          items={[
            "Settle in.",
            "Try things on.",
            "Begin to choose.",
            "Hand off with confidence.",
            "Held in the loop.",
            "On the same page.",
          ].map((q, i) => (
            <span key={i} className="font-display text-2xl text-foreground/70 sm:text-3xl">
              {q}
              <span className="mx-6 inline-block text-primary/40">✦</span>
            </span>
          ))}
        />
      </section>

      {/* Mission line — text fill on scroll */}
      <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
        <TextScrollFill
          className="text-center font-display text-3xl font-medium leading-tight tracking-tight sm:text-5xl"
          text="Transition is not a senior-year scramble — it's a four-year story told one grade at a time."
        />
      </section>

      {/* Principles — hover-reveal cards */}
      <section className="relative mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl font-medium sm:text-5xl">
            What we believe about transition.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Hover any conviction to see what it changes for your family.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {principles.map((p, i) => (
            <Reveal key={p.title} delay={i * 70}>
              <HoverReveal
                className="h-full shadow-soft transition-shadow hover:shadow-lift"
                height="100%"
                front={
                  <div className="p-7">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-soft">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mt-5 font-display text-2xl font-medium">{toTitleCase(p.title)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                  </div>
                }
                back={
                  <div className="bg-gradient-hero h-full rounded-3xl p-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      What it changes
                    </p>
                    <p className="mt-3 font-display text-xl leading-snug text-foreground">
                      {p.body}
                    </p>
                  </div>
                }
              />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Sticky scroll story across the grade bands */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            The four-year arc
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-medium leading-tight sm:text-5xl">
            Each grade asks something different.{" "}
            <TextMask className="font-display">We answer all of it.</TextMask>
          </h2>
        </div>
        <StickyScrollStory
          eyebrow="Grade bands"
          panels={bands.map((b) => ({
            title: `Grade ${b.grade} — ${b.title}`,
            body: `${b.student} ${b.team}`,
            image: b.image,
            alt: `${b.title} illustration`,
          }))}
        />
      </section>

      {/* Six strands with morphing cards */}
      <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <ShapeScroll
          className="absolute right-0 top-10 -z-10 hidden h-80 w-80 lg:block"
          spin={160}
          scale={0.7}
          tilt={25}
          drift={60}
          gradientFrom="hsl(40 95% 72%)"
          gradientTo="hsl(15 90% 70%)"
        />
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
          <StickyPin top="6rem">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              The six threads
            </p>
            <h2 className="mt-3 font-display text-4xl font-medium leading-tight sm:text-5xl">
              We keep weaving the same six threads,{" "}
              <TextMask className="font-display">all four years long.</TextMask>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Every thread runs the full length of high school. The grade changes what we focus on
              inside each one — not which threads matter.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
              <Compass className="h-4 w-4 text-primary" /> Six threads, four years, one plan.
            </div>
          </StickyPin>

          <div className="grid gap-5 sm:grid-cols-2">
            {strands.map((s, i) => (
              <Reveal key={s.title} delay={i * 70}>
                <MorphCard className="h-full p-7">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-hero font-display text-sm font-semibold">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-display text-xl font-medium tracking-tight">
                    {toTitleCase(s.title)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </MorphCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Grade band detail cards */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl font-medium sm:text-5xl">
            What every grade really asks of your family.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Hover any band to see the evidence we collect so progress stays real and visible —
            not just felt.
          </p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {bands.map((b, i) => (
            <Reveal key={b.grade} delay={i * 90}>
              <HoverReveal
                className="h-full"
                height="100%"
                front={
                  <article className="p-8">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-hero font-display text-2xl font-semibold shadow-soft">
                        {b.grade}
                      </span>
                      <h3 className="font-display text-2xl font-medium">{toTitleCase(b.title)}</h3>
                    </div>
                    <dl className="mt-5 space-y-4 text-sm">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Where your child is
                        </dt>
                        <dd className="mt-1 leading-relaxed text-foreground">{b.student}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          What the team is doing
                        </dt>
                        <dd className="mt-1 leading-relaxed text-foreground">{b.team}</dd>
                      </div>
                    </dl>
                  </article>
                }
                back={
                  <div className="h-full rounded-3xl bg-gradient-warm p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                      Evidence we keep
                    </p>
                    <p className="mt-3 font-display text-2xl leading-snug text-foreground">
                      {b.evidence}
                    </p>
                  </div>
                }
              />
            </Reveal>
          ))}
        </div>

        <div className="mt-14 overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-hero p-10 text-center shadow-soft">
          <h3 className="font-display text-3xl font-medium sm:text-4xl">
            Ready to see this applied to your child's IEP?
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-foreground/80">
            Bring us your child's plan and we'll hand you back a grade-by-grade roadmap — every
            suggestion tied to a real source, every next step quietly waiting for you to say yes.
          </p>
          <Magnetic>
            <Link
              to="/waitlist"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-transform hover:-translate-y-0.5"
            >
              Walk through it with us <ArrowRight className="h-4 w-4" />
            </Link>
          </Magnetic>
        </div>
      </section>
    </SiteShell>
  );
}
