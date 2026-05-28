import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import frameworkHero from "@/assets/framework-hero.jpg";
import {
  Parallax,
  ParallaxImage,
  Reveal,
  ShapeScroll,
  TextScrollFill,
} from "@/components/effects/ScrollEffects";



import { toTitleCase } from "@/lib/title-case";
export const Route = createFileRoute("/framework")({
  head: () => ({
    meta: [
      { title: "How we walk through it with you — The TransitionForward framework" },
      {
        name: "description",
        content:
          "A grade-by-grade companion for transition planning. Six gentle threads from 9th grade through graduation, grounded in IDEA, Connecticut IEP guidance, and the research families can trust.",
      },
      { property: "og:title", content: "How we walk through transition with you" },
      {
        property: "og:description",
        content:
          "Grade 9 to graduation: settle in, try things on, begin to choose, hand off with confidence. Built from the Transition Forward handbook.",
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
    evidence: "Attendance and grade patterns, a living profile, your child's own reflections in their own words.",
  },
  {
    grade: "10",
    title: "Try things on",
    student:
      "Your child starts connecting their classes to real possibilities. Independence grows in small, practiced ways — not in one big leap.",
    team: "Life-skills instruction gets more deliberate. Career exposure widens. Accommodations are reviewed honestly, with your child in the room.",
    evidence: "Work samples that show growth, check-ins on the goals that matter, real attendance at career events.",
  },
  {
    grade: "11",
    title: "Begin to choose",
    student:
      "Postsecondary interests sharpen. Your child practices the decision-making that adulthood will ask of them — with support, not on their own.",
    team: "Visits, work experiences, agency referrals, and the early stages of applications get coordinated — together, with you in the loop.",
    evidence: "A resume your child can speak to, interview practice, fresh assessment data, family planning notes you've actually read.",
  },
  {
    grade: "12+",
    title: "Hand off with confidence",
    student:
      "Your child leaves with clear next steps, real contacts, the documents they need, and a support plan that follows them out the door.",
    team: "Applications finalized, referrals confirmed, graduation pathway settled, transition closeout handled with care — not chaos.",
    evidence: "Confirmed plans in writing, a contact sheet that's actually useful, a signed handoff so nothing is left assumed.",
  },
];

const strands = [
  "Academics that lead somewhere",
  "Finding their own voice",
  "The skills that shape a day",
  "A real look at what's out there",
  "You, held in the loop",
  "Everyone on the same page",
];

const principles = [
  {
    title: "Start sooner, gentler",
    body: "Transition and life skills introduced in 9th grade — not held back until the senior-year scramble.",
  },
  {
    title: "Tie schoolwork to a life",
    body: "Attendance, credits, reading, writing, communication, executive function — all read as transition signals, not isolated grades.",
  },
  {
    title: "Keep your child at the center",
    body: "Your child gets to name their strengths, their needs, their goals, the supports that help. Their voice leads the plan.",
  },
  {
    title: "Use the real world",
    body: "Local employers, colleges, training programs, agencies, and youth-development partners — not just brochures and slideshows.",
  },
  {
    title: "Build something teams can keep up with",
    body: "Routines and tools simple enough to actually use between meetings — not another binder no one opens.",
  },
];

function FrameworkPage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-70" />
        <ShapeScroll
          className="absolute -left-36 -top-20 -z-10 h-[40rem] w-[40rem] mix-blend-multiply"
          spin={200}
          scale={1}
          tilt={45}
          drift={130}
          gradientFrom="hsl(150 70% 65%)"
          gradientTo="hsl(200 85% 70%)"
        />
        <ShapeScroll
          className="absolute -right-28 top-32 -z-10 hidden h-[26rem] w-[26rem] mix-blend-multiply lg:block"
          spin={-160}
          scale={0.8}
          tilt={30}
          drift={-90}
          gradientFrom="hsl(40 95% 72%)"
          gradientTo="hsl(15 90% 70%)"
        />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 sm:py-24 md:grid-cols-[1.1fr_1fr] lg:px-8">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              How we walk through it with you
            </p>
            <h1 className="mt-3 max-w-2xl font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              Grade 9 to Graduation, All of It One Connected Story.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-foreground/80 sm:text-lg">
              Adapted from <em>Transition Forward</em>, Caysi Morgan's graduate
              capstone at Southern Connecticut State University. Built around the
              federal IDEA mandate, Connecticut's IEP guidance, and the research that
              actually predicts a good life after high school.
            </p>
          </Reveal>
          <Reveal delay={150}>
            <div className="relative">
              <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-warm blur-2xl opacity-60" />
              <Parallax speed={-0.15}>
                <ParallaxImage
                  src={frameworkHero}
                  alt="A winding path through a sunlit meadow at golden hour"
                  width={1600}
                  height={1200}
                  speed={0.4}
                  className="aspect-[4/3] w-full rounded-[2rem] shadow-lift"
                />
              </Parallax>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Mission line — text fill on scroll */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <TextScrollFill
          className="text-center font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl"
          text="Transition is not a senior-year scramble — it's a four-year story told one grade at a time."
        />
      </section>


      {/* Principles */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl font-medium sm:text-5xl">
            What We Believe About Transition.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Five quiet convictions, taken straight from the handbook, that shape
            every recommendation TransitionForward makes for your family.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {principles.map((p, i) => (
            <Reveal key={p.title} delay={i * 70}>
              <div className="h-full rounded-3xl border border-border/60 bg-card p-7 shadow-soft">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-soft">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-5 font-display text-2xl font-medium">{toTitleCase(p.title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Six strands */}
      <section className="relative border-y border-border/60 bg-muted/40 py-20">
        <ShapeScroll
          className="absolute right-10 top-10 -z-0 hidden h-80 w-80 text-primary/15 lg:block"
          spin={140}
          scale={0.7}
          tilt={25}
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-4xl font-medium sm:text-5xl">
            The Six Threads We Keep Weaving.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Every thread runs the full length of high school. The grade changes
            what we focus on inside each one — not which threads matter.
          </p>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {strands.map((s, i) => (
              <Reveal key={s} as="li" delay={i * 60}>
                <div className="flex h-full items-start gap-3 rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
                  <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-hero font-display text-sm font-semibold">
                    {i + 1}
                  </span>
                  <span className="font-display text-lg font-medium text-foreground">
                    {s}
                  </span>
                </div>
              </Reveal>
            ))}
          </ul>

        </div>
      </section>

      {/* Grade bands table */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl font-medium sm:text-5xl">
            What Every Grade Really Asks of Your Family.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            A snapshot of what your child is working on, what their team is doing
            alongside them, and the kind of evidence we collect so progress is
            real and visible — not just felt.
          </p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {bands.map((b, i) => (
            <Reveal key={b.grade} delay={i * 100}>
              <article className="h-full rounded-3xl border border-border/60 bg-card p-7 shadow-soft">
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
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      What we're keeping track of
                    </dt>
                    <dd className="mt-1 leading-relaxed text-foreground">{b.evidence}</dd>
                  </div>
                </dl>
              </article>
            </Reveal>
          ))}
        </div>


        <div className="mt-12 rounded-3xl border border-border/60 bg-gradient-hero p-10 text-center shadow-soft">
          <h3 className="font-display text-3xl font-medium sm:text-4xl">
            Ready to see this applied to your child's IEP?
          </h3>
          <p className="mt-3 max-w-xl mx-auto text-base leading-relaxed text-foreground/80">
            Bring us your child's plan and we'll hand you back a grade-by-grade
            roadmap — every suggestion tied to a real source, every next step
            quietly waiting for you to say yes.
          </p>
          <Link
            to="/waitlist"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift hover:-translate-y-0.5 transition-transform"
          >
            Walk through it with us <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
