import { Link, createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Sparkles,
  HeartHandshake,
  Compass,
  Users,
  BookOpen,
  GraduationCap,
  Briefcase,
  Building2,
  School,
  Network,
  Shield,
  Lightbulb,
  Megaphone,
  Map,
  Target,
  CheckCircle2,
  FileText,
  Route as RouteIcon,
  Footprints,
  Sunrise,
  ChevronDown,
  Quote,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { photos, srcSetFor } from "@/lib/photos";
import { toTitleCase } from "@/lib/title-case";

const aboutHero = photos.about;
const aboutHeroSrcSet = srcSetFor("about");
const aboutStudent = photos.aboutStudent;
const aboutStudentSrcSet = srcSetFor("aboutStudent");
const pathCollege = photos.pathCollege;
const pathCollegeSrcSet = srcSetFor("pathCollege");
const pathCareer = photos.pathCareer;
const pathCareerSrcSet = srcSetFor("pathCareer");

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Built from the classroom, designed for the future" },
      {
        name: "description",
        content:
          "TransitionForward is built by a Connecticut special educator to help students, families, educators, schools, districts, and partners turn transition planning from paperwork into a clear, personalized pathway.",
      },
      { property: "og:title", content: "About — TransitionForward" },
      {
        property: "og:description",
        content:
          "From MBA to MAT, from strategy to special education classrooms — the founder story behind TransitionForward and the mission to move students from paperwork to possibility.",
      },
      { property: "og:url", content: "/about" },
      { property: "og:image", content: aboutHero },
      { name: "twitter:image", content: aboutHero },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "/about" },
      { rel: "preconnect", href: "https://images.unsplash.com", crossOrigin: "" },
      {
        rel: "preload",
        as: "image",
        href: aboutHero,
        imagesrcset: aboutHeroSrcSet,
        imagesizes: "100vw",
        fetchpriority: "high",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteShell>
      <ReadingRail />
      <AboutHero />
      <FounderStory />
      <FounderTimeline />
      <Mission />
      <Values />
      <ProblemSolution />
      <PaperworkToPossibility />
      <WhoWeServe />
      <Differentiators />
      <Inspiration />
      <TrustNote />
      <ClosingCTA />
    </SiteShell>
  );
}

/* ------------------- READING RAIL ------------------- */
function ReadingRail() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0.05, 0.95], [0, 1]);
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed left-0 right-0 top-0 z-40 h-[2px] origin-left bg-gradient-to-r from-primary via-sky to-peach"
    />
  );
}

/* ------------------- HERO ------------------- */
function AboutHero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 220]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -80]);

  return (
    <section
      ref={ref}
      className="relative isolate -mt-px min-h-[88svh] overflow-hidden sm:min-h-[82svh]"
    >
      <motion.div style={{ scale, y }} className="absolute inset-0 -z-20">
        <img
          src={aboutHero}
          srcSet={aboutHeroSrcSet}
          sizes="100vw"
          alt="Students walking toward an open doorway of light"
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/60 to-background/20" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,theme(colors.primary/0.18),transparent_55%),radial-gradient(circle_at_80%_70%,theme(colors.peach/0.22),transparent_60%)]"
      />

      <motion.div
        style={{ y: textY }}
        className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-6 pb-12 sm:px-8 sm:pb-20 lg:px-10"
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-xs"
        >
          Our Story · Built in Connecticut
        </motion.p>
        <h1 className="mt-4 max-w-5xl font-display text-[clamp(1.9rem,7vw,2.2rem)] font-medium leading-[1.12] tracking-tight text-foreground [text-wrap:balance] [hyphens:auto] [overflow-wrap:break-word] sm:mt-5 sm:text-6xl sm:leading-[1.05] md:text-7xl lg:text-8xl">
          <Phrase text="Built from the classroom." startDelay={0.1} />
          <br />
          <span className="bg-gradient-to-r from-primary via-sky to-peach bg-clip-text italic text-transparent">
            <Phrase text="Designed for the future." startDelay={0.35} />
          </span>
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-5 max-w-2xl text-base leading-relaxed text-foreground/75 sm:mt-7 sm:text-lg"
        >
          TransitionForward helps students receiving special education services, families,
          educators, and school teams turn transition planning from confusing paperwork into
          a clear, personalized pathway.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <Link
            to="/platform"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background shadow-lift transition hover:scale-[1.02]"
          >
            Explore the platform <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/waitlist"
            className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background/70 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur transition hover:bg-background"
          >
            Join the waitlist
          </Link>
          <a
            href="#mission"
            className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
          >
            View our mission ↓
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}

function Phrase({ text, startDelay = 0 }: { text: string; startDelay?: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          {i > 0 && " "}
          <Word text={w} d={startDelay + i * 0.06} />
        </span>
      ))}
    </>
  );
}

function Word({ text, d = 0 }: { text: string; d?: number }) {
  return (
    <span className="inline-block overflow-hidden pb-[0.18em] align-bottom leading-[1.15]">
      <motion.span
        initial={{ y: "100%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.9, delay: d, ease: [0.65, 0, 0.35, 1] }}
        className="inline-block"
      >
        {text}
      </motion.span>
    </span>
  );
}

/* ------------------- FOUNDER STORY ------------------- */
function FounderStory() {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="relative py-14 sm:py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-8">
        <div className="lg:col-span-5">
          <figure className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-foreground/10 shadow-lift">
            <img
              src={aboutStudent}
              srcSet={aboutStudentSrcSet}
              sizes="(min-width: 1024px) 40vw, 100vw"
              loading="lazy"
              decoding="async"
              alt="A Connecticut classroom moment — student-centered learning"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent p-5 sm:p-7">
              <p className="font-display text-xs uppercase tracking-[0.3em] text-primary">
                Founder
              </p>
              <p className="mt-1 font-display text-lg leading-tight text-foreground">
                A Connecticut special educator with an MBA and an MAT — building from where
                strategy meets the classroom.
              </p>
            </div>
          </figure>
        </div>

        <div className="lg:col-span-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-xs">
            Founder Story
          </p>
          <h2 className="mt-4 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:mt-5 sm:text-5xl lg:text-6xl">
            Why I built TransitionForward
          </h2>

          <div className="mt-6 space-y-4 text-[1.02rem] leading-[1.75] text-foreground/80 sm:mt-8 sm:text-[1.1rem]">
            <p>
              TransitionForward grew from my journey from MBA to MAT — from business
              systems to special education classrooms, and from strategy to service. As a
              Black male special educator working in Connecticut, I came into this work
              with two lenses: how systems are designed, and how students actually
              experience them.
            </p>
            <p>
              I started with an MBA, learning how operations, strategy, data, and user
              experience shape sustainable organizations. Then I completed an MAT in
              Special Education K–12 and stepped into the classroom — student teaching
              and supporting students, teachers, families, and school teams across{" "}
              <strong className="text-foreground">New Haven Public Schools</strong> and{" "}
              <strong className="text-foreground">Hamden Public Schools</strong>.
            </p>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35 }}
                  className="space-y-4 overflow-hidden"
                >
                  <p>
                    I saw students with strengths, creativity, personality, and real
                    potential. I also saw families trying to decode confusing systems at
                    midnight, educators and case managers carrying enormous responsibility
                    with too few tools, and schools wanting better ways to organize
                    transition planning across every team.
                  </p>
                  <p>
                    Transition planning is one of the most important parts of special
                    education — yet it often lives in scattered documents, hurried meetings,
                    and binders that don't translate into next steps. Students deserve more
                    than paperwork. They deserve a clear, supported pathway forward.
                  </p>
                  <p>
                    TransitionForward is built from the intersection of strategy, service,
                    systems, humanity, equity, and lived classroom experience. It is the
                    tool I wished existed during every PPT meeting I sat in.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-foreground hover:text-background"
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : "Read the full story"}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>

          <blockquote className="mt-8 border-l-2 border-primary/70 pl-5 font-display text-xl italic leading-snug text-foreground/90 sm:text-2xl">
            <Quote className="mb-2 h-5 w-5 text-primary/70" />
            Students receiving special education services deserve more than paperwork.
            They deserve a clear, supported pathway forward.
          </blockquote>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/platform"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95"
            >
              See the platform <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-foreground/5"
            >
              Contact the founder
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------- FOUNDER TIMELINE ------------------- */
const TIMELINE = [
  {
    icon: Briefcase,
    title: "Business Foundation",
    body:
      "An MBA built the lens for systems, operations, strategy, data, sustainability, and user experience — how to design things that actually work for the people inside them.",
  },
  {
    icon: HeartHandshake,
    title: "Entering Education",
    body:
      "A purpose-driven turn toward students, families, and community impact — committing to work that pairs business discipline with human care.",
  },
  {
    icon: GraduationCap,
    title: "Special Education Training",
    body:
      "An MAT in Special Education K–12 brought deep grounding in IEPs, transition planning, instruction, student supports, and family engagement.",
  },
  {
    icon: School,
    title: "Classroom Experience",
    body:
      "Student teaching and work across New Haven Public Schools and Hamden Public Schools revealed the daily realities of students, educators, families, and school teams.",
  },
  {
    icon: Lightbulb,
    title: "The Gap Became Clear",
    body:
      "Transition planning lived in documents and meetings — but families and students still needed clarity, action steps, resources, and real pathways into adult life.",
  },
  {
    icon: Sunrise,
    title: "TransitionForward Was Born",
    body:
      "A platform built to move students and families from paperwork to possibility — one Pathway Report, one meeting, one next step at a time.",
  },
];

function FounderTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const lineHeight = useTransform(scrollYProgress, [0.05, 0.9], ["0%", "100%"]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-sky-soft/30 to-background py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-xs">
            The Journey
          </p>
          <h2 className="mt-4 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            The journey behind TransitionForward
          </h2>
          <p className="mt-4 text-base text-foreground/70 sm:text-lg">
            Six chapters that connect business systems training, special education
            practice, and the Connecticut classrooms that shaped this work.
          </p>
        </div>

        <div ref={ref} className="relative mx-auto mt-14 max-w-5xl sm:mt-20">
          {/* Vertical rail (mobile) / center rail (desktop) */}
          <div className="pointer-events-none absolute bottom-0 left-5 top-0 w-px bg-foreground/10 sm:left-1/2 sm:-translate-x-1/2" />
          <motion.div
            style={{ height: lineHeight }}
            className="pointer-events-none absolute left-5 top-0 w-px origin-top bg-gradient-to-b from-primary via-sky to-peach sm:left-1/2 sm:-translate-x-1/2"
          />

          <ol className="space-y-10 sm:space-y-16">
            {TIMELINE.map((t, i) => {
              const Icon = t.icon;
              const isLeft = i % 2 === 0;
              return (
                <motion.li
                  key={t.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, delay: 0.05 }}
                  className={`relative grid grid-cols-[40px_1fr] gap-4 sm:grid-cols-2 sm:gap-12 ${
                    isLeft ? "" : "sm:[&>*:first-child]:order-2"
                  }`}
                >
                  {/* Dot — mobile left, desktop center */}
                  <span className="absolute left-5 top-2 -translate-x-1/2 sm:left-1/2 sm:top-6">
                    <span className="relative flex h-4 w-4 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                    </span>
                  </span>

                  {/* Spacer on desktop for alternation */}
                  <div className={`hidden sm:block ${isLeft ? "sm:pr-12 sm:text-right" : "sm:pl-12"}`}>
                    {isLeft ? (
                      <TimelineCard t={t} Icon={Icon} align="right" index={i} />
                    ) : null}
                  </div>
                  <div className={`pl-2 sm:hidden`}>
                    <TimelineCard t={t} Icon={Icon} align="left" index={i} />
                  </div>
                  <div className={`hidden sm:block ${isLeft ? "sm:pl-12" : "sm:pr-12 sm:text-right"}`}>
                    {!isLeft ? <TimelineCard t={t} Icon={Icon} align="left" index={i} /> : null}
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

function TimelineCard({
  t,
  Icon,
  align,
  index,
}: {
  t: { title: string; body: string };
  Icon: React.ComponentType<{ className?: string }>;
  align: "left" | "right";
  index: number;
}) {
  return (
    <div
      className={`group relative rounded-2xl border border-foreground/10 bg-background/80 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lift sm:p-6 ${
        align === "right" ? "sm:text-right" : ""
      }`}
    >
      <div
        className={`flex items-center gap-3 ${align === "right" ? "sm:flex-row-reverse" : ""}`}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <span className="font-display text-[10px] uppercase tracking-[0.3em] text-foreground/50">
          Chapter {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <h3 className="mt-3 font-display text-xl text-foreground sm:text-2xl">{t.title}</h3>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-foreground/75">{t.body}</p>
    </div>
  );
}

/* ------------------- MISSION ------------------- */
function Mission() {
  const cards = [
    {
      icon: Compass,
      title: "Clarify the process",
      body:
        "Help families and students understand goals, supports, documents, and next steps — in plain language.",
    },
    {
      icon: Sparkles,
      title: "Center the student",
      body:
        "Make student voice, strengths, interests, and future goals a core part of every planning experience.",
    },
    {
      icon: RouteIcon,
      title: "Connect to action",
      body:
        "Turn reports, resources, partners, meetings, calendars, and tasks into real forward movement.",
    },
  ];
  return (
    <section id="mission" className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-xs">
            Our Mission
          </p>
          <h2 className="mt-4 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Transition planning, made clear and personal.
          </h2>
          <p className="mt-5 text-lg text-foreground/75">
            TransitionForward helps students receiving special education services, families,
            educators, and school teams turn transition planning into a clear, personalized,
            and actionable pathway.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-3 sm:gap-6">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-foreground/10 bg-gradient-to-br from-background to-sky-soft/40 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition group-hover:bg-primary/15" />
              <span className="relative grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow">
                <c.icon className="h-6 w-6" />
              </span>
              <h3 className="relative mt-5 font-display text-xl text-foreground">
                {c.title}
              </h3>
              <p className="relative mt-2 text-[0.95rem] leading-relaxed text-foreground/75">
                {c.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------- VALUES ------------------- */
function Values() {
  const values = [
    { icon: Megaphone, title: "Student Voice", body: "Students should not be passive subjects of transition planning. Their voice should shape the pathway." },
    { icon: BookOpen, title: "Clarity", body: "Families deserve plain-language tools that make transition planning easier to understand." },
    { icon: HeartHandshake, title: "Equity", body: "Students from historically underserved communities deserve systems that see their strengths, identity, and future." },
    { icon: Target, title: "Action", body: "Transition planning should lead to real next steps, not just more paperwork." },
    { icon: Network, title: "Collaboration", body: "Students, families, educators, schools, districts, and partners all share the pathway." },
    { icon: Shield, title: "Dignity", body: "Every student deserves to be seen as capable, growing, and worthy of a meaningful future." },
  ];
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-peach-soft/40 via-background to-background py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-xs">
            What We Believe
          </p>
          <h2 className="mt-4 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Six values that shape every decision.
          </h2>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {values.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group relative rounded-2xl border border-foreground/10 bg-background/70 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift"
            >
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-foreground text-background transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <v.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-lg text-foreground">{v.title}</h3>
                  <p className="mt-1.5 text-[0.95rem] leading-relaxed text-foreground/75">
                    {v.body}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------- PROBLEM / SOLUTION ------------------- */
function ProblemSolution() {
  return (
    <section className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-xs">
            Problem · Response
          </p>
          <h2 className="mt-4 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            The problem TransitionForward was built to solve.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <motion.article
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-foreground p-7 text-background sm:p-9"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-background/60">
              The Challenge
            </p>
            <h3 className="mt-3 font-display text-2xl leading-tight sm:text-3xl">
              Transition planning is fragmented.
            </h3>
            <p className="mt-4 text-[1rem] leading-[1.75] text-background/85">
              Families may have documents but not clarity. Students may have goals but not
              always understand how those goals connect to real life. Educators and case
              managers may know what students need — but lack the time or one connected
              system to organize documents, resources, action steps, and opportunities.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-background/80">
              {[
                "Paperwork without a clear next step",
                "Goals disconnected from daily life",
                "Tools scattered across binders, inboxes, and meetings",
                "Families translating dense documents alone",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-peach" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-sky-soft/60 via-background to-peach-soft/40 p-7 sm:p-9"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
              The TransitionForward Response
            </p>
            <h3 className="mt-3 font-display text-2xl leading-tight text-foreground sm:text-3xl">
              One connected pathway.
            </h3>
            <p className="mt-4 text-[1rem] leading-[1.75] text-foreground/80">
              TransitionForward brings the pieces together. It helps users organize student
              information, upload and understand IEPs, complete Student Voice prompts,
              generate Pathway Reports, save resources, explore partner opportunities,
              prepare for meetings, create action items, and keep planning moving over time.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-foreground/80">
              {[
                "Pathway Reports that connect strengths, goals, and next steps",
                "Resource Library + Partner Network matched to the student",
                "Meeting prep, action items, and calendar built in",
                "Roles and permissions designed for whole teams",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </motion.article>
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/platform"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:scale-[1.02]"
          >
            See how the platform works <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------- PAPERWORK TO POSSIBILITY ------------------- */
const FLOW = [
  { icon: FileText, label: "Paperwork", body: "IEPs, transition goals, reports, and meetings can feel overwhelming." },
  { icon: BookOpen, label: "Clarity", body: "TransitionForward helps organize and translate the planning process." },
  { icon: Map, label: "Pathway", body: "The Pathway Report connects student strengths, goals, needs, and next steps." },
  { icon: Footprints, label: "Action", body: "Resources, partners, calendar, meeting prep, and action items keep movement going." },
  { icon: Sunrise, label: "Future", body: "Students move toward adult life with more confidence, support, and direction." },
];

function PaperworkToPossibility() {
  return (
    <section className="relative isolate overflow-hidden py-16 sm:py-24">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,theme(colors.primary/0.12),transparent_55%),radial-gradient(circle_at_85%_90%,theme(colors.peach/0.18),transparent_60%)]"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-xs">
            The Promise
          </p>
          <h2 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            From paperwork{" "}
            <span className="bg-gradient-to-r from-primary via-sky to-peach bg-clip-text italic text-transparent">
              to possibility.
            </span>
          </h2>
          <p className="mt-5 text-lg text-foreground/75">
            Five stages of the pathway — the throughline of everything we build.
          </p>
        </div>

        <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
          {FLOW.map((f, i) => (
            <motion.li
              key={f.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="group relative rounded-2xl border border-foreground/10 bg-background/80 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </span>
                <span className="font-display text-xs uppercase tracking-[0.25em] text-foreground/40">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg text-foreground">{f.label}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/70">{f.body}</p>
              {i < FLOW.length - 1 && (
                <ArrowRight className="absolute -right-2 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-foreground/20 lg:block" />
              )}
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------- WHO WE SERVE ------------------- */
const ROLES = [
  { key: "students", icon: GraduationCap, label: "Students", body: "A place to understand their goals, share their voice, and see their pathway." },
  { key: "families", icon: HeartHandshake, label: "Parents / Guardians", body: "A clearer way to prepare, understand documents, and support next steps." },
  { key: "educators", icon: BookOpen, label: "Educators / Case Managers", body: "A tool to organize student planning, reports, resources, and follow-up." },
  { key: "school", icon: School, label: "School Administrators", body: "View school-level transition planning progress and support teams." },
  { key: "district", icon: Building2, label: "District Administrators", body: "See implementation, readiness trends, and engagement across schools." },
  { key: "partners", icon: Network, label: "Partner Organizations", body: "Connect real opportunities, programs, and supports to students and families." },
  { key: "admin", icon: Shield, label: "Platform Admin", body: "Manage resources, partners, waitlist, content, feedback, and system health." },
];

function WhoWeServe() {
  const [active, setActive] = useState(ROLES[0].key);
  const current = ROLES.find((r) => r.key === active) ?? ROLES[0];
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-sky-soft/30 to-background py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-xs">
            Who We Serve
          </p>
          <h2 className="mt-4 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Built for everyone around the student.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setActive(r.key)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    active === r.key
                      ? "border-foreground bg-foreground text-background"
                      : "border-foreground/15 bg-background text-foreground/80 hover:border-foreground/40"
                  }`}
                >
                  <r.icon className="h-4 w-4" />
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-background/80 p-7 shadow-sm backdrop-blur sm:p-10"
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow">
                  <current.icon className="h-7 w-7" />
                </span>
                <h3 className="mt-5 font-display text-2xl text-foreground sm:text-3xl">
                  {current.label}
                </h3>
                <p className="mt-3 text-[1rem] leading-[1.75] text-foreground/75">
                  {current.body}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/platform"
                    className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:scale-[1.02]"
                  >
                    Explore the platform <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/waitlist"
                    className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-foreground/5"
                  >
                    Join the waitlist
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------- DIFFERENTIATORS ------------------- */
function Differentiators() {
  const items = [
    "Combines student voice, IEP information, family priorities, and educator input",
    "Generates deeper, plain-language Pathway Reports",
    "Connects planning to a curated Resource Library and Partner Network",
    "Supports action items, calendar reminders, and meeting prep",
    "Separates roles and permissions clearly across the team",
    "Serves students, families, educators, schools, districts, and partners",
    "Built by someone with both business systems training and special education classroom experience",
    "Designed for Connecticut transition planning first — with room to scale",
  ];
  return (
    <section className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-xs">
              What Makes Us Different
            </p>
            <h2 className="mt-4 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              More than a resource list. More than a report.
            </h2>
            <p className="mt-5 text-base text-foreground/75 sm:text-lg">
              TransitionForward is a connective tissue for transition planning — built from
              lived classroom experience and the operational discipline of a builder who
              has studied how good systems actually work.
            </p>
            <figure className="mt-8 overflow-hidden rounded-2xl border border-foreground/10 shadow-lift">
              <img
                src={pathCareer}
                srcSet={pathCareerSrcSet}
                sizes="(min-width: 1024px) 40vw, 100vw"
                loading="lazy"
                decoding="async"
                alt="A student moving into the future they're planning for"
                className="aspect-[4/3] w-full object-cover"
              />
            </figure>
          </div>

          <ul className="grid gap-3 lg:col-span-7 lg:gap-4">
            {items.map((x, i) => (
              <motion.li
                key={x}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className="flex items-start gap-4 rounded-xl border border-foreground/10 bg-background/80 p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <p className="text-[0.98rem] leading-relaxed text-foreground/85">{x}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------- INSPIRATION ------------------- */
function Inspiration() {
  const items = [
    "Students who deserve to be seen beyond paperwork",
    "Families who need clarity and confidence",
    "Educators and case managers doing heavy work every day",
    "Schools turning compliance into meaningful planning",
    "Districts working to improve transition outcomes",
    "Community partners offering real opportunities",
    "The belief that adult life should be prepared for with dignity and support",
  ];
  return (
    <section className="relative overflow-hidden bg-foreground py-16 text-background sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(255,200,150,0.1),transparent_60%)]"
      />
      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-peach sm:text-xs">
          Inspiration
        </p>
        <h2 className="mt-4 font-display text-3xl font-medium leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Inspired by students, families, educators — and the future they are building.
        </h2>
        <ul className="mx-auto mt-10 grid max-w-3xl gap-3 text-left sm:gap-4">
          {items.map((x, i) => (
            <motion.li
              key={x}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="flex items-start gap-3 rounded-xl border border-background/10 bg-background/5 p-4 backdrop-blur"
            >
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-peach" />
              <span className="text-[0.98rem] leading-relaxed text-background/90">{x}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------- TRUST NOTE ------------------- */
function TrustNote() {
  return (
    <section className="relative py-10 sm:py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-foreground/10 bg-background/80 p-6 text-sm leading-relaxed text-foreground/70 shadow-sm sm:p-7">
          <p className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">A note on what TransitionForward is.</strong>{" "}
              TransitionForward is designed as a planning companion. It does not replace
              official IEP/PPT processes, school team decisions, legal advice, or district
              responsibilities. It helps students, families, educators, and teams organize
              information, prepare for meetings, understand next steps, and connect
              planning to action.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------- CLOSING CTA ------------------- */
function ClosingCTA() {
  return (
    <section className="relative isolate overflow-hidden py-16 sm:py-24">
      <div className="absolute inset-0 -z-10 bg-gradient-hero" />
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl lg:text-6xl"
        >
          Forward, together.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mx-auto mt-5 max-w-2xl text-lg text-foreground/75"
        >
          Help us build the platform every transition plan deserves — for students,
          families, educators, schools, districts, and partners across Connecticut and
          beyond.
        </motion.p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/waitlist"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-sm font-semibold text-background shadow-lift hover:scale-[1.02]"
          >
            Join the waitlist <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/resources"
            className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background/70 px-7 py-3.5 text-sm font-semibold text-foreground backdrop-blur hover:bg-background"
          >
            Resource Hub
          </Link>
          <Link
            to="/partner-directory"
            className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background/70 px-7 py-3.5 text-sm font-semibold text-foreground backdrop-blur hover:bg-background"
          >
            Partner Network
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
          >
            Contact us
          </Link>
        </div>
      </div>
    </section>
  );
}
