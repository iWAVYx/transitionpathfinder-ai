import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
  useReducedMotion,
} from "motion/react";
import {
  ArrowRight,
  Quote,
  Compass,
  HeartHandshake,
  Sparkles,
  Scale,
  Users,
  MessageSquare,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  School,
  Building2,
  Network,
  UserRound,
  FileText,
  Lightbulb,
  Route as RouteIcon,
  CheckCircle2,
  Sunrise,
  ChevronRight,
  BookOpen,
  Layers,
  MapPin,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { photos, srcSetFor } from "@/lib/photos";
import { cn } from "@/lib/utils";

const aboutHero = photos.about;
const aboutHeroSrcSet = srcSetFor("about");

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — The Founder Story Behind TransitionForward" },
      {
        name: "description",
        content:
          "From MBA to MAT to Connecticut classrooms — the cinematic founder story, mission, values, and pathway behind TransitionForward.",
      },
      { property: "og:title", content: "About — TransitionForward" },
      {
        property: "og:description",
        content:
          "A scroll-driven founder journey from strategy to special education, and the platform built to move students from paperwork to possibility.",
      },
      { property: "og:url", content: "/about" },
      { property: "og:image", content: aboutHero },
      { name: "twitter:image", content: aboutHero },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

/* ---------------------------------------------------------------- helpers */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.7, ease: [0.22, 0.61, 0.36, 1] as const },
  }),
};

function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ---------------------------------------------------------------- chrome */

function ReadingRail() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-40 h-[3px] origin-left bg-gradient-to-r from-primary via-accent to-primary/40"
      style={{ scaleX }}
    />
  );
}

const SECTIONS = [
  { id: "story", label: "Founder Story" },
  { id: "mission", label: "Mission" },
  { id: "values", label: "Values" },
  { id: "journey", label: "The Journey" },
  { id: "problem", label: "The Problem" },
  { id: "flow", label: "Paperwork → Possibility" },
  { id: "roles", label: "Who We Serve" },
] as const;

function SideNav() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);
  return (
    <nav
      aria-label="On this page"
      className="pointer-events-none fixed left-6 top-1/2 z-30 hidden -translate-y-1/2 xl:block"
    >
      <ul className="pointer-events-auto flex flex-col gap-3">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="group flex items-center gap-3"
              aria-current={active === s.id ? "true" : undefined}
            >
              <span
                className={cn(
                  "h-px w-6 bg-muted-foreground/40 transition-all duration-300",
                  active === s.id && "w-10 bg-primary",
                )}
              />
              <span
                className={cn(
                  "text-[11px] uppercase tracking-[0.18em] text-muted-foreground/60 opacity-0 transition-all duration-300 group-hover:opacity-100",
                  active === s.id && "text-foreground opacity-100",
                )}
              >
                {s.label}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ---------------------------------------------------------------- floats */

function FloatingShape({
  className,
  delay = 0,
  duration = 16,
  children,
}: {
  className?: string;
  delay?: number;
  duration?: number;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={cn("pointer-events-none absolute", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={
        reduced
          ? { opacity: 0.7 }
          : { opacity: 0.7, y: [0, -14, 0, 12, 0], rotate: [0, 2, 0, -2, 0] }
      }
      transition={
        reduced
          ? { duration: 0.6 }
          : { delay, duration, repeat: Infinity, ease: "easeInOut" }
      }
    >
      {children}
    </motion.div>
  );
}

/* ---------------------------------------------------------------- hero */

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.2]);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-background via-background to-muted/40"
    >
      {/* Background image, parallax */}
      <motion.div className="absolute inset-0 -z-10" style={{ y, opacity }} aria-hidden>
        <img
          src={aboutHero}
          srcSet={aboutHeroSrcSet}
          sizes="100vw"
          alt=""
          className="h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      </motion.div>

      {/* Floating decor */}
      <FloatingShape className="left-[6%] top-[18%]" duration={14}>
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-border/60 bg-background/70 shadow-lg backdrop-blur">
          <FileText className="h-6 w-6 text-primary/80" />
        </div>
      </FloatingShape>
      <FloatingShape className="right-[8%] top-[22%]" delay={1.2} duration={18}>
        <div className="grid h-14 w-14 place-items-center rounded-full border border-border/60 bg-background/70 shadow-lg backdrop-blur">
          <Compass className="h-6 w-6 text-accent" />
        </div>
      </FloatingShape>
      <FloatingShape className="right-[14%] bottom-[12%]" delay={2.4} duration={20}>
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border/60 bg-background/70 shadow-lg backdrop-blur">
          <GraduationCap className="h-6 w-6 text-primary" />
        </div>
      </FloatingShape>
      <FloatingShape className="left-[10%] bottom-[18%]" delay={0.6} duration={22}>
        <div className="grid h-12 w-12 place-items-center rounded-full border border-border/60 bg-background/70 shadow-lg backdrop-blur">
          <RouteIcon className="h-5 w-5 text-accent" />
        </div>
      </FloatingShape>

      <div className="relative mx-auto max-w-5xl px-6 py-24 text-center sm:py-32 md:py-40">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" />
            The Founder Story
          </span>
        </Reveal>
        <Reveal delay={0.1}>
          <h1 className="mt-6 font-serif text-4xl leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl">
            Built From The Classroom.{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Designed For The Future.
            </span>
          </h1>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            From MBA to MAT, from strategy decks to Connecticut classrooms — the
            story behind TransitionForward and the mission to move every student
            from paperwork to possibility.
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full">
              <a href="#story">
                Read The Story <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="ghost" className="rounded-full">
              <a href="#journey">See The Journey</a>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- founder sticky */

const STORY_CARDS = [
  {
    eyebrow: "Chapter 01",
    title: "From MBA To Systems Thinking",
    body: "I started in strategy — frameworks, spreadsheets, decision trees. I learned to look for the place where a system quietly fails the people inside it.",
  },
  {
    eyebrow: "Chapter 02",
    title: "From MAT To Special Education Practice",
    body: "I went back for a Master of Arts in Teaching, K–12 Special Education. The classroom rewired me. The work is human, daily, and unforgiving of abstraction.",
  },
  {
    eyebrow: "Chapter 03",
    title: "In The Classroom, Every Day",
    body: "New Haven. Hamden. PPT meetings, IEP binders, transition goals written in language no seventeen-year-old should have to translate alone.",
  },
  {
    eyebrow: "Chapter 04",
    title: "Sitting With Families",
    body: "Parents who advocated for a decade. Guardians working two jobs. Families left meetings with paper, not pathways. The handoff was failing them.",
  },
  {
    eyebrow: "Chapter 05",
    title: "The Problem Came Into Focus",
    body: "Transition planning is required by law and almost never coordinated. The IEP is a page. The transition is a dozen systems that don't talk to each other.",
  },
  {
    eyebrow: "Chapter 06",
    title: "The Platform Became The Response",
    body: "TransitionForward grew from tools I built for my own caseload — opinionated, gentle with families, and built to make the next right step obvious.",
  },
];

function FounderSticky() {
  return (
    <section id="story" className="relative bg-background">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Sticky left panel */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <Reveal>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Why I Built TransitionForward
                </p>
                <h2 className="mt-4 font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
                  A Letter From The Classroom.
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="relative mt-8 aspect-[4/5] overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-accent/10 to-muted">
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-background/80 shadow-xl backdrop-blur">
                        <UserRound className="h-12 w-12 text-primary" />
                      </div>
                      <p className="mt-4 font-serif text-lg text-foreground/80">The Founder</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Connecticut Special Educator
                      </p>
                    </div>
                  </div>
                  <FloatingShape className="left-6 top-6" duration={20}>
                    <BookOpen className="h-6 w-6 text-primary/60" />
                  </FloatingShape>
                  <FloatingShape className="right-6 bottom-8" delay={1} duration={24}>
                    <Compass className="h-6 w-6 text-accent/70" />
                  </FloatingShape>
                </div>
              </Reveal>
              <Reveal delay={0.2}>
                <blockquote className="mt-8 border-l-2 border-primary/60 pl-5 font-serif text-lg italic leading-relaxed text-foreground/85">
                  "Students deserve more than paperwork. They deserve a clear
                  path forward."
                </blockquote>
              </Reveal>
              <Reveal delay={0.3}>
                <Button asChild className="mt-8 rounded-full">
                  <Link to="/waitlist">
                    Join The Waitlist <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </Reveal>
            </div>
          </div>

          {/* Right scrolling cards */}
          <div className="space-y-6 lg:col-span-7">
            {STORY_CARDS.map((c, i) => (
              <motion.article
                key={c.title}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 0.61, 0.36, 1] }}
                className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card p-7 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl sm:p-9"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <p className="text-[11px] uppercase tracking-[0.2em] text-primary">
                  {c.eyebrow}
                </p>
                <h3 className="mt-3 font-serif text-2xl leading-tight tracking-tight text-foreground sm:text-3xl">
                  {c.title}
                </h3>
                <p className="mt-3 text-[0.98rem] leading-relaxed text-muted-foreground">
                  {c.body}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- quote */

function QuoteBlock({
  text,
  attribution,
  variant = "default",
}: {
  text: string;
  attribution?: string;
  variant?: "default" | "tinted";
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden border-y border-border/60",
        variant === "tinted"
          ? "bg-gradient-to-br from-primary/[0.06] via-background to-accent/[0.05]"
          : "bg-muted/30",
      )}
    >
      <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <Quote className="mx-auto h-10 w-10 text-primary/40" aria-hidden />
          <blockquote className="mx-auto mt-6 max-w-3xl font-serif text-2xl leading-snug text-foreground sm:text-3xl md:text-4xl">
            {text}
          </blockquote>
          {attribution && (
            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {attribution}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- mission */

const MISSION = [
  {
    icon: Lightbulb,
    title: "Clarify The Process",
    body: "Translate IEP transition planning into language students, families, and educators can actually use together.",
  },
  {
    icon: HeartHandshake,
    title: "Center The Student",
    body: "Strengths, interests, and voice anchor every pathway — not just compliance checkboxes.",
  },
  {
    icon: RouteIcon,
    title: "Connect To Action",
    body: "Move from binders to next steps: resources, partners, calendar events, and meeting prep that compound.",
  },
];

function Mission() {
  return (
    <section id="mission" className="relative bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Our Mission</p>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Move Transition Planning From Paperwork To A Pathway.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {MISSION.map((m, i) => (
            <motion.div
              key={m.title}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card p-8 shadow-sm transition-shadow duration-500 hover:shadow-2xl"
            >
              <div
                className="absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in oklab, var(--primary) 18%, transparent), transparent 60%)",
                  pointerEvents: "none",
                }}
                aria-hidden
              />
              <motion.div
                className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"
                whileHover={{ rotate: 8, scale: 1.08 }}
                transition={{ type: "spring", stiffness: 200, damping: 14 }}
              >
                <m.icon className="h-6 w-6" />
              </motion.div>
              <h3 className="mt-5 font-serif text-2xl leading-tight tracking-tight text-foreground">
                {m.title}
              </h3>
              <p className="mt-3 text-[0.98rem] leading-relaxed text-muted-foreground">{m.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- values */

const VALUES = [
  { icon: MessageSquare, label: "Student Voice", body: "The student is the first author of their own pathway. Their words, goals, and choices shape the plan." },
  { icon: Compass, label: "Clarity", body: "Plain language. Visible next steps. No one needs a translator to read their own transition plan." },
  { icon: Scale, label: "Equity", body: "Every family — across language, income, and zip code — gets the same caliber of planning support." },
  { icon: CheckCircle2, label: "Action", body: "Plans are useless without movement. Every step ladders to a real, owned, due-dated next action." },
  { icon: Users, label: "Collaboration", body: "Educators, families, agencies, and partners working from the same page — literally." },
  { icon: ShieldCheck, label: "Dignity", body: "Privacy, agency, and respect are not features. They are the floor." },
];

function Values() {
  const [active, setActive] = useState(0);
  return (
    <section
      id="values"
      className="relative overflow-hidden bg-gradient-to-b from-background via-muted/30 to-background py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">What We Stand For</p>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Six Values, In Practice Every Day.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((v, i) => {
            const isActive = active === i;
            return (
              <motion.button
                key={v.label}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: i * 0.06 }}
                className={cn(
                  "group relative overflow-hidden rounded-3xl border bg-card p-6 text-left transition-all duration-500",
                  isActive
                    ? "border-primary/60 shadow-xl"
                    : "border-border/60 hover:border-primary/40 hover:shadow-lg",
                )}
              >
                <motion.div
                  animate={isActive ? { scale: 1.08, rotate: 6 } : { scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 14 }}
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-2xl transition-colors duration-500",
                    isActive ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                  )}
                >
                  <v.icon className="h-5 w-5" />
                </motion.div>
                <h3 className="mt-4 font-serif text-xl tracking-tight text-foreground">{v.label}</h3>
                <AnimatePresence initial={false}>
                  <motion.p
                    key={isActive ? "open" : "closed"}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35 }}
                    className="mt-2 overflow-hidden text-sm leading-relaxed text-muted-foreground"
                  >
                    {isActive ? v.body : v.body.split(".")[0] + "."}
                  </motion.p>
                </AnimatePresence>
                <div
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-primary to-accent transition-transform duration-500",
                    isActive ? "scale-x-100" : "scale-x-0",
                  )}
                  aria-hidden
                />
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- timeline */

const JOURNEY = [
  { icon: Briefcase, year: "Foundation", title: "MBA Foundation", body: "Strategy, systems, and a habit of looking for the place a system quietly fails." },
  { icon: BookOpen, year: "Pivot", title: "Entering Education", body: "Left strategy work to teach. The classroom rewired the questions I knew how to ask." },
  { icon: GraduationCap, year: "Credential", title: "MAT, K–12 Special Education", body: "Master of Arts in Teaching with a special-education focus. Practice, theory, and case law together." },
  { icon: School, year: "Practice", title: "New Haven Public Schools", body: "Urban classroom experience: IEPs, PPTs, families, agencies, and the daily reality of transition." },
  { icon: School, year: "Practice", title: "Hamden Public Schools — Student Teaching", body: "Suburban contrast. Same gap. Different building, same families left holding paper instead of plans." },
  { icon: Lightbulb, year: "Insight", title: "Seeing The Transition Planning Gap", body: "The IEP transition page and the actual transition were on different planets. The handoff was the problem." },
  { icon: Layers, year: "Build", title: "Building TransitionForward", body: "Tools for my caseload became tools for colleagues. Weekends became the platform." },
  { icon: Sunrise, year: "Today", title: "From Paperwork To Possibility", body: "A pathway students can read, families can understand, educators can stand behind, and districts can trust." },
];

function Timeline() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 30%"] });
  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section
      id="journey"
      className="relative overflow-hidden bg-gradient-to-b from-background to-muted/40 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">The Founder Journey</p>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Eight Chapters From Strategy Deck To Classroom To Platform.
          </h2>
        </Reveal>

        <div ref={ref} className="relative mt-16">
          {/* Center rail */}
          <div className="absolute left-6 top-0 h-full w-[2px] bg-border/60 md:left-1/2 md:-translate-x-1/2" aria-hidden />
          <motion.div
            className="absolute left-6 top-0 w-[2px] origin-top bg-gradient-to-b from-primary via-accent to-primary md:left-1/2 md:-translate-x-1/2"
            style={{ height: lineHeight }}
            aria-hidden
          />

          <ul className="space-y-12">
            {JOURNEY.map((m, i) => {
              const left = i % 2 === 0;
              return (
                <li key={m.title} className="relative">
                  {/* Dot */}
                  <motion.span
                    className="absolute left-6 top-3 z-10 grid h-4 w-4 -translate-x-1/2 place-items-center rounded-full bg-primary shadow-[0_0_0_4px_var(--background)] md:left-1/2"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, margin: "-120px" }}
                    transition={{ duration: 0.45, delay: 0.05, type: "spring", stiffness: 200, damping: 14 }}
                    aria-hidden
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                  </motion.span>

                  <div
                    className={cn(
                      "ml-14 md:ml-0 md:grid md:grid-cols-2 md:gap-12",
                      !left && "md:[&>*:first-child]:col-start-2",
                    )}
                  >
                    <motion.article
                      initial={{ opacity: 0, x: left ? -40 : 40 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-120px" }}
                      transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
                      className={cn(
                        "group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl sm:p-7",
                        left ? "md:text-right" : "md:text-left",
                      )}
                    >
                      <div className={cn("flex items-center gap-3", left ? "md:justify-end" : "md:justify-start")}>
                        <motion.div
                          whileHover={{ rotate: 12, scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 200, damping: 14 }}
                          className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"
                        >
                          <m.icon className="h-5 w-5" />
                        </motion.div>
                        <span className="text-[11px] uppercase tracking-[0.2em] text-primary">{m.year}</span>
                      </div>
                      <h3 className="mt-3 font-serif text-xl tracking-tight text-foreground sm:text-2xl">
                        {m.title}
                      </h3>
                      <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">{m.body}</p>
                    </motion.article>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- problem/solution */

const PROBLEMS = [
  "Scattered documents across binders, emails, and portals",
  "Unclear next steps after every meeting",
  "Student voice missing from their own plan",
  "Families overwhelmed and under-informed",
  "Educators overloaded with parallel systems",
  "Resources disconnected from the actual plan",
];
const SOLUTIONS = [
  "One student profile, one source of truth",
  "IEP upload + review with plain-language summary",
  "Student Voice surfaced into every pathway",
  "Pathway Report tying strengths, goals, and next steps",
  "Curated resources and partner matches built in",
  "Action items, calendar, and meeting prep in one place",
];

function ProblemSolution() {
  return (
    <section
      id="problem"
      className="relative overflow-hidden border-y border-border/60 bg-muted/40 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">The Problem · The Response</p>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Required By Law. Almost Never Coordinated.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          {/* Challenge */}
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-destructive/80">The Challenge</p>
            <ul className="mt-5 space-y-3">
              {PROBLEMS.map((p, i) => (
                <motion.li
                  key={p}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.07 }}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-destructive/70" aria-hidden />
                  <span className="text-[0.97rem] leading-relaxed text-foreground/85">{p}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Response */}
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-primary">The TransitionForward Response</p>
            <ul className="mt-5 space-y-3">
              {SOLUTIONS.map((s, i) => (
                <motion.li
                  key={s}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.07 + 0.1 }}
                  className="group flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/[0.05] p-4 transition-all duration-300 hover:border-primary/60 hover:bg-primary/[0.08]"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-[0.97rem] leading-relaxed text-foreground/90">{s}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- flow */

const FLOW = [
  { icon: FileText, title: "Paperwork", body: "IEPs, documents, meetings, and transition goals can feel overwhelming." },
  { icon: Lightbulb, title: "Clarity", body: "TransitionForward helps organize and explain the planning process." },
  { icon: RouteIcon, title: "Pathway", body: "The Pathway Report connects strengths, goals, needs, and next steps." },
  { icon: CheckCircle2, title: "Action", body: "Resources, partners, calendar items, meeting prep, and tasks create movement." },
  { icon: Sunrise, title: "Future", body: "Students move toward adult life with more support, direction, and confidence." },
];

function Flow() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 40%"] });
  const lineScaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const lineScaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      id="flow"
      className="relative overflow-hidden bg-background py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">The Signature Flow</p>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
            From Paperwork To Possibility.
          </h2>
        </Reveal>

        <div ref={ref} className="relative mt-16">
          {/* Desktop horizontal line */}
          <div className="pointer-events-none absolute left-0 right-0 top-[44px] hidden h-[2px] bg-border/60 md:block" aria-hidden />
          <motion.div
            className="pointer-events-none absolute left-0 right-0 top-[44px] hidden h-[2px] origin-left bg-gradient-to-r from-primary via-accent to-primary md:block"
            style={{ scaleX: lineScaleX }}
            aria-hidden
          />
          {/* Mobile vertical line */}
          <div className="pointer-events-none absolute left-[22px] top-0 h-full w-[2px] bg-border/60 md:hidden" aria-hidden />
          <motion.div
            className="pointer-events-none absolute left-[22px] top-0 w-[2px] origin-top bg-gradient-to-b from-primary via-accent to-primary md:hidden"
            style={{ scaleY: lineScaleY }}
            aria-hidden
          />

          <ol className="grid gap-6 md:grid-cols-5">
            {FLOW.map((s, i) => (
              <motion.li
                key={s.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 0.61, 0.36, 1] }}
                className="relative pl-14 md:pl-0"
              >
                <motion.div
                  className="absolute left-0 top-0 z-10 grid h-11 w-11 place-items-center rounded-full border-2 border-primary bg-background text-primary shadow-lg md:relative md:mx-auto"
                  whileHover={{ scale: 1.12, rotate: 8 }}
                  whileInView={{ scale: [0.7, 1.15, 1] }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 + 0.2 }}
                >
                  <s.icon className="h-5 w-5" />
                </motion.div>
                <div className="md:mt-5 md:text-center">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-primary">
                    Step 0{i + 1}
                  </p>
                  <h3 className="mt-1 font-serif text-xl tracking-tight text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- roles */

const ROLES = [
  {
    icon: GraduationCap,
    label: "Student",
    need: "A plan I can actually read and own.",
    help: "Plain-language IEP summary, Student Voice, and a Pathway Report that reflects my strengths and goals.",
    features: ["Student-friendly IEP summary", "Student Voice intake", "Pathway Report", "Resources I can save"],
    href: "/platform",
  },
  {
    icon: HeartHandshake,
    label: "Parent / Guardian",
    need: "Clarity on what's next — and how I can help.",
    help: "Shared view of the plan, meeting prep, document permissions, and curated resources for families.",
    features: ["Shared pathway view", "Meeting prep packets", "Document permissions", "Family resource library"],
    href: "/families",
  },
  {
    icon: BookOpen,
    label: "Educator / Case Manager",
    need: "Less duplicate work, more time with students.",
    help: "IEP upload + AI assist, action items, partner suggestions, and audit-ready collaboration in one place.",
    features: ["IEP upload + AI assist", "Action items", "Collaboration & notes", "Partner suggestions"],
    href: "/educators",
  },
  {
    icon: School,
    label: "School Administrator",
    need: "Confidence that every student has a real plan.",
    help: "School-level dashboards, compliance signals, and templates that lift the whole building.",
    features: ["School dashboard", "Compliance signals", "Templates & playbooks", "Caseload visibility"],
    href: "/platform",
  },
  {
    icon: Building2,
    label: "District Administrator",
    need: "Equity and quality across every building.",
    help: "District-wide rollups, school-by-school implementation, and aggregate transition trends.",
    features: ["District rollups", "School-by-school view", "Aggregate trends", "Role & access controls"],
    href: "/platform",
  },
  {
    icon: Network,
    label: "Partner Organization",
    need: "Reach the families who actually need us.",
    help: "Partner profile, opportunity posting, and warm matches into student pathways — no PII required.",
    features: ["Partner profile", "Opportunity posting", "Pathway matches", "No private document access"],
    href: "/partners",
  },
];

function Roles() {
  const [active, setActive] = useState(0);
  const role = ROLES[active];
  return (
    <section
      id="roles"
      className="relative overflow-hidden bg-gradient-to-b from-muted/40 via-background to-background py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Who We Serve</p>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
            One Platform, Six Vantage Points.
          </h2>
        </Reveal>

        {/* Role tabs */}
        <div className="mt-10 -mx-6 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div role="tablist" className="flex min-w-max gap-3 pb-2">
            {ROLES.map((r, i) => {
              const isActive = i === active;
              return (
                <button
                  key={r.label}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(i)}
                  className={cn(
                    "group flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-lg"
                      : "border-border/60 bg-background text-foreground/80 hover:border-primary/50 hover:text-foreground",
                  )}
                >
                  <r.icon className={cn("h-4 w-4 transition-transform group-hover:scale-110")} />
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active role panel */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={role.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
              className="grid gap-8 p-8 md:grid-cols-[1.1fr_1fr] md:gap-12 md:p-12"
            >
              <div>
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <role.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-5 font-serif text-2xl tracking-tight text-foreground sm:text-3xl">
                  {role.label}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">What they need:</span> {role.need}
                </p>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">How we help:</span> {role.help}
                </p>
                <Button asChild className="mt-6 rounded-full">
                  <Link to={role.href}>
                    Explore For {role.label} <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/40 p-6">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Key Features</p>
                <ul className="mt-4 space-y-3">
                  {role.features.map((f, i) => (
                    <motion.li
                      key={f}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.06 }}
                      className="flex items-start gap-2 text-sm text-foreground/85"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- close */

function Closing() {
  return (
    <section className="relative overflow-hidden border-t border-border/60 bg-gradient-to-br from-primary/[0.06] via-background to-accent/[0.06]">
      <FloatingShape className="left-[10%] top-12" duration={18}>
        <MapPin className="h-7 w-7 text-primary/40" />
      </FloatingShape>
      <FloatingShape className="right-[12%] bottom-12" delay={1} duration={22}>
        <RouteIcon className="h-7 w-7 text-accent/50" />
      </FloatingShape>
      <div className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
        <Reveal>
          <h2 className="font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
            From Paperwork To Possibility — For Every Student.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            TransitionForward is built for the families, educators, and districts
            who are already doing the work — and deserve a tool that respects it.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full">
              <Link to="/waitlist">
                Join The Waitlist <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="rounded-full">
              <Link to="/contact">Get In Touch</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- page */

function AboutPage() {
  return (
    <SiteShell>
      <ReadingRail />
      <SideNav />
      <Hero />
      <FounderSticky />
      <QuoteBlock
        text="Students deserve more than paperwork. They deserve a clear path forward."
        attribution="The Founding Belief"
      />
      <Mission />
      <Values />
      <QuoteBlock
        text="Transition planning should not just document a future. It should help build one."
        attribution="Our North Star"
        variant="tinted"
      />
      <Timeline />
      <ProblemSolution />
      <Flow />
      <QuoteBlock
        text="TransitionForward was built from the classroom, from the meeting table, and from the belief that every student deserves to be seen."
        attribution="Why We're Here"
      />
      <Roles />
      <Closing />
    </SiteShell>
  );
}
