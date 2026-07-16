import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";

import { photos, srcSetFor } from "@/lib/photos";
import frameworkHeroAsset from "@/assets/framework-hero-graduation.png.asset.json";
const frameworkHero = frameworkHeroAsset.url;
const frameworkHeroSrcSet = undefined as unknown as string;
const bgTopo = photos.bgTopo;
const bgTopoSrcSet = srcSetFor("bgTopo");
const bgSunrise = photos.bgSunrise;
const bgSunriseSrcSet = srcSetFor("bgSunrise");

import {
  Parallax,
  ParallaxImage,
  Reveal,
  TextScrollFill,
  Marquee,
} from "@/components/effects/ScrollEffects";
import {
  CursorField,
  Magnetic,
  TextMask,
  FloatingShape,
} from "@/components/effects/ImmersiveEffects";
import {
  Squiggle,
  Sparkle,
  Starburst,
  ArrowDoodle,
  CompassRose,
  Confetti,
  UnderlineSwoosh,
  ArcStack,
  DotField,
  PaperPlane,
  BookDoodle,
} from "@/components/effects/Decorations";
import { toTitleCase } from "@/lib/title-case";

export const Route = createFileRoute("/programs/transitionforward")({
  head: () => ({
    meta: [
      { title: "TransitionForward (9–12) — Grade 9 to graduation, one connected story" },
      {
        name: "description",
        content:
          "TransitionForward is the high-school program for Connecticut families and teams. A grade-by-grade transition framework with six threads, four years, every recommendation tied to evidence.",
      },
      { property: "og:title", content: "TransitionForward (9–12) — Grade 9 to graduation" },
      {
        property: "og:description",
        content:
          "High school planning through graduation: settle in, try things on, begin to choose, hand off with confidence.",
      },
      { property: "og:url", content: "/programs/transitionforward" },
      { property: "og:image", content: frameworkHero },
    ],
    links: [
      { rel: "canonical", href: "/programs/transitionforward" },
      { rel: "preconnect", href: "https://images.unsplash.com", crossOrigin: "" },
      { rel: "preload", as: "image", href: frameworkHero, imagesrcset: frameworkHeroSrcSet, imagesizes: "100vw", fetchpriority: "high" },
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
  },
  {
    grade: "10",
    title: "Try things on",
    student:
      "Your child starts connecting their classes to real possibilities. Independence grows in small, practiced ways — not in one big leap.",
    team: "Life-skills instruction gets more deliberate. Career exposure widens. Accommodations are reviewed honestly, with your child in the room.",
    evidence:
      "Work samples that show growth, check-ins on the goals that matter, real attendance at career events.",
  },
  {
    grade: "11",
    title: "Begin to choose",
    student:
      "Postsecondary interests sharpen. Your child practices the decision-making that adulthood will ask of them — with support, not on their own.",
    team: "Visits, work experiences, agency referrals, and the early stages of applications get coordinated — together, with you in the loop.",
    evidence:
      "A resume your child can speak to, interview practice, fresh assessment data, family planning notes you've actually read.",
  },
  {
    grade: "12+",
    title: "Hand off with confidence",
    student:
      "Your child leaves with clear next steps, real contacts, the documents they need, and a support plan that follows them out the door.",
    team: "Applications finalized, referrals confirmed, graduation pathway settled, transition closeout handled with care — not chaos.",
    evidence:
      "Confirmed plans in writing, a contact sheet that's actually useful, a signed handoff so nothing is left assumed.",
  },
];

const strands = [
  {
    title: "Academics that lead somewhere",
    body: "Course choices read as transition signals, not isolated grades.",
  },
  {
    title: "Finding their own voice",
    body: "Self-determination practiced in small, real moments.",
  },
  {
    title: "The skills that shape a day",
    body: "Money, transportation, time, food, health — the quiet competencies of adulthood.",
  },
  {
    title: "A real look at what's out there",
    body: "Local employers, community colleges, BRS, youth-development partners.",
  },
  {
    title: "You, held in the loop",
    body: "Plain-language updates, prep sheets before meetings, translations after.",
  },
  {
    title: "Everyone on the same page",
    body: "Teachers, related services, agencies, family — one plan, no version drift.",
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
    body: "Your child names their strengths, their needs, their goals, the supports that help.",
  },
  {
    title: "Use the real world",
    body: "Local employers, colleges, training programs, agencies, youth-development partners — not slideshows.",
  },
  {
    title: "Build something teams can keep up with",
    body: "Routines and tools simple enough to actually use between meetings.",
  },
];

function FrameworkPage() {
  return (
    <SiteShell>
      {/* AMBIENT PAGE BACKGROUND — fixed, full-bleed watercolor washes */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-50 overflow-hidden"
      >
        {/* warm sunrise wash, top */}
        <img
          src={bgSunrise}
          srcSet={bgSunriseSrcSet}
          sizes="960px"
          alt=""
          loading="lazy"
          decoding="async"
          width={1920}
          height={1080}
          className="absolute inset-x-0 top-0 h-[70vh] w-full object-cover opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        />
        {/* topographic line texture, mid-page drifting right */}
        <img
          src={bgTopo}
          srcSet={bgTopoSrcSet}
          sizes="960px"
          alt=""
          loading="lazy"
          decoding="async"
          width={1920}
          height={1280}
          className="absolute -right-[15%] top-[30%] h-[90vh] w-[120%] object-cover opacity-25 mix-blend-multiply [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        />
        {/* second sunrise glow, bottom, flipped */}
        <img
          src={bgSunrise}
          srcSet={bgSunriseSrcSet}
          sizes="960px"
          alt=""
          loading="lazy"
          decoding="async"
          width={1920}
          height={1080}
          className="absolute inset-x-0 bottom-0 h-[60vh] w-full -scale-y-100 object-cover opacity-40 [mask-image:linear-gradient(to_bottom,transparent,black)]"
        />

        {/* color veil to keep contrast for text */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background/55" />
      </div>

      {/* HERO */}
      <CursorField className="relative border-b border-border/60">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-40" />
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

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.1fr_1fr] lg:px-8 lg:py-16">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              How We Walk Through It With You
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl font-medium leading-[1.02] tracking-tight sm:text-7xl">
              {toTitleCase("Grade 9 to graduation,")}{" "}
              <TextMask className="font-display">{toTitleCase("all of it one connected story.")}</TextMask>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/80 sm:text-lg">
              Adapted from <em>Transition Forward</em>, Caysi Morgan's graduate capstone at
              Southern Connecticut State University. Built around the federal IDEA mandate,
              Connecticut's IEP guidance, and the research that actually predicts a good life
              after high school.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center [&>*]:w-full sm:[&>*]:w-auto">
              <Magnetic>
                <Link
                  to="/waitlist"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-transform hover:-translate-y-0.5"
                >
                  Walk through it with us <ArrowRight className="h-4 w-4" />
                </Link>
              </Magnetic>
              <Magnetic strength={14}>
                <Link
                  to="/research"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-muted"
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
                  srcSet={frameworkHeroSrcSet}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  eager
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
      <section aria-label="Promises" className="border-b border-border/40 bg-background/40 py-6 backdrop-blur-sm">
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
              {toTitleCase(q)}
              <span className="mx-6 inline-block text-primary/40">✦</span>
            </span>
          ))}
        />
      </section>

      {/* Mission line */}
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <TextScrollFill
          className="text-center font-display text-3xl font-medium leading-tight tracking-tight sm:text-5xl"
          text={toTitleCase("Transition is not a senior-year scramble — it's a four-year story told one grade at a time.")}
        />
      </section>

      {/* PRINCIPLES — numbered manifesto, alternating sides, oversized outline numerals */}
      <section className="relative overflow-hidden">
        <DotField className="absolute -left-10 top-10 -z-10 h-64 w-64 text-primary/10" />
        <Sparkle className="absolute right-[12%] top-16 -z-10 h-8 w-8 text-primary/30" />
        <Sparkle className="absolute left-[40%] bottom-20 -z-10 h-5 w-5 text-primary/20" />
        <ArrowDoodle className="absolute right-[6%] bottom-24 -z-10 hidden h-24 w-32 text-primary/25 lg:block" />

        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
          <div className="mb-12 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              The Manifesto
            </p>
            <h2 className="mt-3 font-display text-4xl font-medium leading-tight sm:text-5xl">
              {toTitleCase("What we believe about transition.")}
            </h2>
            <Squiggle className="mt-4 h-3 w-40 text-primary/60" />
          </div>

          <ol className="space-y-6">
            {principles.map((p, i) => {
              const right = i % 2 === 1;
              return (
                <Reveal key={p.title} delay={i * 60}>
                  <li
                    className={`flex items-baseline gap-5 sm:gap-8 ${
                      right ? "sm:ml-24 sm:flex-row-reverse sm:text-right" : ""
                    }`}
                  >
                    <span
                      aria-hidden
                      className="font-display text-6xl font-medium leading-none text-transparent sm:text-7xl"
                      style={{ WebkitTextStroke: "1.5px var(--primary)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="max-w-md">
                      <h3 className="font-display text-xl font-medium tracking-tight sm:text-2xl">
                        {toTitleCase(p.title)}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {p.body}
                      </p>
                    </div>
                  </li>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </section>

      {/* SIX STRANDS — woven asymmetric list with sparkle markers */}
      <section className="relative overflow-hidden border-t border-border/40">
        <CompassRose className="absolute -right-16 top-10 -z-10 h-72 w-72 text-primary/10" />
        <Confetti className="absolute left-[4%] top-20 -z-10 h-32 w-32 opacity-60" />
        <BookDoodle className="absolute left-[8%] bottom-16 -z-10 hidden h-24 w-28 text-primary/20 lg:block" />
        <Starburst className="absolute right-[20%] bottom-24 -z-10 h-14 w-14 text-primary/25" />

        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              The Six Threads
            </p>
            <h2 className="mt-3 font-display text-4xl font-medium leading-tight sm:text-5xl">
              {toTitleCase("Six threads we weave,")}{" "}
              <TextMask className="font-display">{toTitleCase("all four years long.")}</TextMask>
            </h2>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
              <Compass className="h-3.5 w-3.5 text-primary" /> Six threads, four years, one plan.
            </div>
          </div>

          <ul className="relative mx-auto max-w-3xl">
            {/* central spine */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-2 bottom-2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-primary/30 to-transparent sm:block"
            />
            {strands.map((s, i) => {
              const left = i % 2 === 0;
              return (
                <Reveal key={s.title} delay={i * 50}>
                  <li
                    className={`relative flex py-3 sm:py-4 ${
                      left ? "sm:justify-start sm:pr-[52%]" : "sm:justify-end sm:pl-[52%]"
                    }`}
                  >
                    {/* sparkle marker on spine */}
                    <span
                      aria-hidden
                      className="absolute left-1/2 top-5 hidden h-3 w-3 -translate-x-1/2 rounded-full bg-primary/80 ring-4 ring-background sm:block"
                    />
                    <div
                      className={`flex items-start gap-3 ${
                        left ? "" : "sm:flex-row-reverse sm:text-right"
                      }`}
                    >
                      <span className="mt-0.5 font-display text-2xl font-medium leading-none text-primary/70 tabular-nums">
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="font-display text-lg font-medium tracking-tight">
                          {toTitleCase(s.title)}
                        </h3>
                        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                          {s.body}
                        </p>
                      </div>
                    </div>
                  </li>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </section>

      {/* GRADE BANDS — horizontal four-stop timeline */}
      <section className="relative overflow-hidden border-t border-border/60">
        <ArcStack className="absolute -left-4 bottom-0 -z-10 h-72 w-72 text-primary/20" />
        <PaperPlane className="absolute right-[8%] top-16 -z-10 h-14 w-14 text-primary/35" />
        <Sparkle className="absolute left-[35%] top-24 -z-10 h-6 w-6 text-primary/30" />
        <DotField className="absolute -right-10 bottom-10 -z-10 h-56 w-56 text-primary/10" />

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              The Four-Year Arc
            </p>
            <h2 className="mt-3 font-display text-4xl font-medium leading-tight sm:text-5xl">
              {toTitleCase("Each grade asks something different.")}{" "}
              <TextMask className="font-display">{toTitleCase("We answer all of it.")}</TextMask>
            </h2>
            <UnderlineSwoosh className="mx-auto mt-4 h-3 w-56 text-primary/60" />
          </div>

          <FourYearArc bands={bands} />


          <div className="mt-12 overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-hero p-10 text-center shadow-soft">
            <h3 className="font-display text-3xl font-medium sm:text-4xl">
              {"Ready to See This Applied to Your Child's IEP?"}
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-foreground/80">
              Bring us your child's plan and we'll hand you back a grade-by-grade roadmap — every
              suggestion tied to a real source, every next step quietly waiting for you to say yes.
            </p>
            <Magnetic>
              <Link
                to="/waitlist"
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-transform hover:-translate-y-0.5"
              >
                Walk through it with us <ArrowRight className="h-4 w-4" />
              </Link>
            </Magnetic>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

/* ------------------- FOUR-YEAR ARC -------------------
   Sticky scroll-driven storytelling: one year fills the viewport at a time,
   with an animated progress line tracking position across the four grades. */
type Band = (typeof bands)[number];

function FourYearArc({ bands }: { bands: Band[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 20%"],
  });
  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div ref={ref} className="relative mt-10">
      {/* Vertical progress rail (desktop only) */}
      <div className="pointer-events-none absolute left-6 top-0 bottom-0 hidden w-px bg-border md:block">
        <motion.div
          style={{ height: lineHeight }}
          className="absolute inset-x-0 top-0 w-px bg-primary"
        />
      </div>

      <div className="space-y-16 md:space-y-24 md:pl-20">
        {bands.map((b, i) => (
          <ArcPanel key={b.grade} band={b} index={i} total={bands.length} />
        ))}
      </div>
    </div>
  );
}

function ArcPanel({
  band,
  index,
  total,
}: {
  band: Band;
  index: number;
  total: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15% 0px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative scroll-mt-24"
    >
      {/* Year marker dot on rail */}
      <span
        aria-hidden
        className="absolute -left-[3.625rem] top-1 hidden h-11 w-11 items-center justify-center rounded-full bg-background font-display text-base font-semibold text-primary shadow-soft ring-4 ring-background md:inline-flex"
      >
        {band.grade}
      </span>

      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Year {index + 1} of {total} · Grade {band.grade}
      </p>
      <h3 className="mt-2 font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl lg:text-5xl">
        {toTitleCase(band.title)}
      </h3>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Your Child
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{band.student}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            The Team
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{band.team}</p>
        </div>
        <div className="rounded-2xl bg-gradient-warm p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[oklch(0.45_0.12_230)]">
            Evidence We Keep
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[oklch(0.22_0.04_250)]">{band.evidence}</p>
        </div>
      </div>
    </motion.article>
  );
}

