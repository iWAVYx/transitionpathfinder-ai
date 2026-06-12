import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
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
  MessageSquare,
  ShieldCheck,
  GraduationCap,
  School,
  Building2,
  Network,
  FileText,
  Lightbulb,
  Route as RouteIcon,
  CheckCircle2,
  Sunrise,
  ChevronRight,
  BookOpen,
  Play,
  PenLine,
  UserRound,
  X,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { photos } from "@/lib/photos";
import { cn } from "@/lib/utils";

const aboutHero = photos.about;

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — The Founder Story Behind TransitionForward" },
      {
        name: "description",
        content:
          "From strategy to Connecticut classrooms — the founder story and the platform built to move every student from paperwork to possibility.",
      },
      { property: "og:title", content: "About — TransitionForward" },
      {
        property: "og:description",
        content:
          "A focused, cinematic founder story and the mission behind TransitionForward.",
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
  { id: "story", label: "Story" },
  { id: "journey", label: "Journey" },
  { id: "values", label: "Values" },
  { id: "flow", label: "Pathway" },
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

/* ---------------------------------------------------------------- hero */

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const reduced = useReducedMotion();

  // Cursor-driven mesh gradient
  const mx = useMotionValue(50);
  const my = useMotionValue(40);
  const onMove = (e: React.MouseEvent) => {
    if (reduced) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 100);
    my.set(((e.clientY - r.top) / r.height) * 100);
  };
  const bgX = useSpring(mx, { stiffness: 60, damping: 20 });
  const bgY = useSpring(my, { stiffness: 60, damping: 20 });
  const background = useTransform(
    [bgX, bgY],
    ([x, y]) =>
      `radial-gradient(60% 50% at ${x}% ${y}%, color-mix(in oklab, var(--primary) 28%, transparent), transparent 70%), radial-gradient(50% 40% at ${100 - (x as number)}% ${100 - (y as number)}%, color-mix(in oklab, var(--accent) 24%, transparent), transparent 70%)`,
  );

  return (
    <section
      ref={ref}
      onMouseMove={onMove}
      className="relative isolate overflow-hidden border-b border-border/60 bg-background"
    >
      {/* Mesh gradient */}
      <motion.div className="absolute inset-0 -z-10" style={{ background, opacity }} aria-hidden />
      {/* Subtle photo wash */}
      <motion.div className="absolute inset-0 -z-20" style={{ y }} aria-hidden>
        <img src={aboutHero} alt="" className="h-full w-full object-cover opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </motion.div>
      {/* Grid texture */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-6 py-28 text-center sm:py-36 md:py-44">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" />
            The Founder Story
          </span>
        </Reveal>

        {/* Layered, masked headline */}
        <div className="relative mt-7">
          <motion.h1
            initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
            className="font-serif text-5xl leading-[1.02] tracking-tight text-foreground sm:text-7xl md:text-[5.5rem]"
          >
            Built From The Classroom.
          </motion.h1>
          <motion.h1
            initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
            className="mt-1 font-serif text-5xl leading-[1.02] tracking-tight sm:text-7xl md:text-[5.5rem]"
          >
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(120deg, var(--primary), var(--accent), var(--primary))",
                backgroundSize: "200% 200%",
                animation: reduced ? undefined : "tf-pan 14s ease-in-out infinite",
              }}
            >
              Designed For The Future.
            </span>
          </motion.h1>
          <style>{`@keyframes tf-pan { 0%,100% { background-position: 0% 50% } 50% { background-position: 100% 50% } }`}</style>
        </div>

        <Reveal delay={0.35}>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            From strategy decks to Connecticut classrooms — the story behind a
            platform built to move every student from paperwork to possibility.
          </p>
        </Reveal>
        <Reveal delay={0.45}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
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

        <Reveal delay={0.6}>
          <FounderLetter />
        </Reveal>
      </div>

      {/* Bottom scroll cue */}
      <motion.div
        aria-hidden
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60"
        animate={reduced ? undefined : { y: [0, 6, 0], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        Scroll
      </motion.div>
    </section>
  );
}

/* ---------------------------------------------------------------- story (condensed) */

const STORY_CARDS = [
  {
    eyebrow: "Chapter 01",
    title: "From Strategy To The Classroom",
    body: "I began in business strategy — frameworks, decision trees, systems. Then I went back for a Master of Arts in Teaching, K–12 Special Education, and the classroom rewired me.",
  },
  {
    eyebrow: "Chapter 02",
    title: "Sitting With Families",
    body: "New Haven. Hamden. PPT meetings, IEP binders, families who advocated for a decade and still left the table with paper instead of a pathway.",
  },
  {
    eyebrow: "Chapter 03",
    title: "The Platform Became The Response",
    body: "TransitionForward grew from tools I built for my own caseload — opinionated, gentle with families, and built to make the next right step obvious.",
  },
];

function FounderSticky() {
  return (
    <section id="story" className="relative bg-background">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <Reveal>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Why I Built TransitionForward
                </p>
                <h2 className="mt-4 font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
                  A Letter From The Classroom.
                </h2>
              </Reveal>
              <Reveal delay={0.15}>
                <blockquote className="mt-8 border-l-2 border-primary/60 pl-5 font-serif text-xl italic leading-relaxed text-foreground/85">
                  "Students deserve more than paperwork. They deserve a clear
                  path forward."
                </blockquote>
              </Reveal>
              <Reveal delay={0.25}>
                <Button asChild className="mt-8 rounded-full">
                  <Link to="/waitlist">
                    Join The Waitlist <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </Reveal>
            </div>
          </div>

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
                <p className="text-[11px] uppercase tracking-[0.22em] text-primary">{c.eyebrow}</p>
                <h3 className="mt-3 font-serif text-2xl leading-tight tracking-tight text-foreground sm:text-3xl">
                  {c.title}
                </h3>
                <p className="mt-3 text-[0.98rem] leading-relaxed text-muted-foreground">{c.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- quote */

function QuoteBlock({ text, attribution }: { text: string; attribution?: string }) {
  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-gradient-to-br from-primary/[0.06] via-background to-accent/[0.05]">
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
            <p className="mt-6 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              {attribution}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- timeline (condensed + spotlight) */

const JOURNEY = [
  { icon: BookOpen, year: "Origin", title: "Strategy, Then The Classroom", body: "Strategy work, then an MAT in K–12 Special Education. Practice rewired the questions." },
  { icon: School, year: "Practice", title: "New Haven & Hamden", body: "Urban and suburban classrooms. Same gap. Families holding paper instead of plans." },
  { icon: Lightbulb, year: "Insight", title: "Naming The Real Gap", body: "The IEP transition page and the actual transition lived on different planets." },
  { icon: RouteIcon, year: "Build", title: "Building TransitionForward", body: "Tools for one caseload became tools for colleagues. Weekends became the platform." },
  { icon: Sunrise, year: "Today", title: "From Paperwork To Possibility", body: "A pathway students can read, families can understand, and districts can trust." },
];

function Timeline() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 30%"] });
  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const spotlightY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section
      id="journey"
      className="relative overflow-hidden bg-gradient-to-b from-background to-muted/40 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">The Founder Journey</p>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Five Chapters From Strategy To Classroom To Platform.
          </h2>
        </Reveal>

        <div ref={ref} className="relative mt-16">
          {/* Center rail */}
          <div
            className="absolute left-6 top-0 h-full w-[2px] bg-border/60 md:left-1/2 md:-translate-x-1/2"
            aria-hidden
          />
          <motion.div
            className="absolute left-6 top-0 w-[2px] origin-top bg-gradient-to-b from-primary via-accent to-primary md:left-1/2 md:-translate-x-1/2"
            style={{ height: lineHeight }}
            aria-hidden
          />
          {/* Spotlight glow following scroll */}
          <motion.div
            className="pointer-events-none absolute left-6 -ml-[60px] h-[120px] w-[120px] rounded-full bg-primary/30 blur-3xl md:left-1/2 md:-ml-[60px]"
            style={{ top: spotlightY }}
            aria-hidden
          />

          <ul className="space-y-12">
            {JOURNEY.map((m, i) => {
              const left = i % 2 === 0;
              return (
                <li key={m.title} className="relative">
                  <motion.span
                    className="absolute left-6 top-3 z-10 grid h-4 w-4 -translate-x-1/2 place-items-center rounded-full bg-primary shadow-[0_0_0_4px_var(--background)] md:left-1/2"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, margin: "-120px" }}
                    transition={{ duration: 0.45, type: "spring", stiffness: 200, damping: 14 }}
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
                        <span className="text-[11px] uppercase tracking-[0.22em] text-primary">{m.year}</span>
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

/* ---------------------------------------------------------------- values (orbital cluster) */

const VALUES = [
  { icon: MessageSquare, label: "Student Voice", body: "The student is the first author of their own pathway. Their words, goals, and choices shape the plan." },
  { icon: Compass, label: "Clarity", body: "Plain language. Visible next steps. No one needs a translator to read their own transition plan." },
  { icon: Scale, label: "Equity", body: "Every family — across language, income, and zip code — gets the same caliber of planning support." },
  { icon: CheckCircle2, label: "Action", body: "Plans are useless without movement. Every step ladders to a real, owned, due-dated next action." },
  { icon: HeartHandshake, label: "Collaboration", body: "Educators, families, agencies, and partners working from the same page — literally." },
  { icon: ShieldCheck, label: "Dignity", body: "Privacy, agency, and respect are not features. They are the floor." },
];

function Values() {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const v = VALUES[active];
  const Icon = v.icon;

  return (
    <section
      id="values"
      className="relative overflow-hidden bg-gradient-to-b from-background via-muted/30 to-background py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">What We Stand For</p>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Six Values, One Orbit.
          </h2>
        </Reveal>

        <div className="relative mx-auto mt-16 aspect-square max-w-[640px]">
          {/* Rotating orbit ring */}
          <motion.div
            aria-hidden
            className="absolute inset-6 rounded-full border border-dashed border-primary/30"
            animate={reduced ? undefined : { rotate: 360 }}
            transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            aria-hidden
            className="absolute inset-16 rounded-full border border-border/50"
            animate={reduced ? undefined : { rotate: -360 }}
            transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
          />

          {/* Center card */}
          <div className="absolute inset-1/2 z-10 grid h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 place-items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={v.label}
                initial={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
                transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
                className="flex h-full w-full flex-col items-center justify-center rounded-full border border-border/60 bg-background/90 p-8 text-center shadow-2xl backdrop-blur"
              >
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="mt-4 font-serif text-xl tracking-tight text-foreground sm:text-2xl">
                  {v.label}
                </h3>
                <p className="mt-2 max-w-[22ch] text-sm leading-relaxed text-muted-foreground">
                  {v.body}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Orbiting nodes */}
          {VALUES.map((val, i) => {
            const angle = (i / VALUES.length) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + 44 * Math.cos(angle);
            const y = 50 + 44 * Math.sin(angle);
            const isActive = active === i;
            const NodeIcon = val.icon;
            return (
              <button
                key={val.label}
                type="button"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                aria-label={val.label}
                className="group absolute z-20 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <motion.div
                  animate={
                    isActive
                      ? { scale: 1.18, boxShadow: "0 12px 40px -8px color-mix(in oklab, var(--primary) 60%, transparent)" }
                      : { scale: 1 }
                  }
                  transition={{ type: "spring", stiffness: 220, damping: 16 }}
                  className={cn(
                    "grid h-14 w-14 place-items-center rounded-2xl border bg-background transition-colors duration-300 sm:h-16 sm:w-16",
                    isActive
                      ? "border-primary text-primary"
                      : "border-border/60 text-foreground/70 hover:border-primary/60 hover:text-foreground",
                  )}
                >
                  <NodeIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </motion.div>
                <span
                  className={cn(
                    "absolute left-1/2 mt-2 hidden -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors sm:block",
                    isActive && "text-foreground",
                  )}
                >
                  {val.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- flow (signature) */

const FLOW = [
  { icon: FileText, title: "Paperwork", body: "IEPs, documents, and meetings can feel overwhelming." },
  { icon: Lightbulb, title: "Clarity", body: "We organize and explain the planning process." },
  { icon: RouteIcon, title: "Pathway", body: "A Pathway Report ties strengths, goals, and next steps." },
  { icon: CheckCircle2, title: "Action", body: "Resources, partners, and tasks create movement." },
  { icon: Sunrise, title: "Future", body: "Students move toward adult life with confidence." },
];

function Flow() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 40%"] });
  const lineScaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const lineScaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="flow" className="relative overflow-hidden bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">The Signature Flow</p>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
            From Paperwork To Possibility.
          </h2>
        </Reveal>

        <div ref={ref} className="relative mt-16">
          <div
            className="pointer-events-none absolute left-0 right-0 top-[44px] hidden h-[2px] bg-border/60 md:block"
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute left-0 right-0 top-[44px] hidden h-[2px] origin-left bg-gradient-to-r from-primary via-accent to-primary md:block"
            style={{ scaleX: lineScaleX }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-[22px] top-0 h-full w-[2px] bg-border/60 md:hidden"
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute left-[22px] top-0 w-[2px] origin-top bg-gradient-to-b from-primary via-accent to-primary md:hidden"
            style={{ scaleY: lineScaleY }}
            aria-hidden
          />

          <ol className="grid gap-8 md:grid-cols-5">
            {FLOW.map((s, i) => (
              <motion.li
                key={s.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 0.61, 0.36, 1] }}
                className="group relative pl-14 md:pl-0"
              >
                <motion.div
                  className="absolute left-0 top-0 z-10 grid h-11 w-11 place-items-center rounded-full border-2 border-primary bg-background text-primary shadow-lg md:relative md:mx-auto"
                  whileHover={{ scale: 1.18, rotate: 8 }}
                  whileInView={{ scale: [0.7, 1.15, 1] }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 + 0.2 }}
                >
                  <s.icon className="h-5 w-5" />
                </motion.div>
                <div className="md:mt-5 md:text-center">
                  <p className="font-serif text-[2.4rem] leading-none tracking-tight text-foreground/15 transition-colors duration-500 group-hover:text-primary/40 md:text-[3rem]">
                    0{i + 1}
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

/* ---------------------------------------------------------------- roles (condensed to 4) */

const ROLES = [
  {
    icon: GraduationCap,
    label: "Students & Families",
    need: "Clarity on what's next — and how to help.",
    help: "Plain-language IEP summary, Student Voice, shared pathway view, and curated family resources.",
    features: ["Student-friendly summary", "Student Voice intake", "Shared pathway view", "Family resources"],
    href: "/families",
  },
  {
    icon: BookOpen,
    label: "Educators",
    need: "Less duplicate work, more time with students.",
    help: "IEP upload + AI assist, action items, partner suggestions, and audit-ready collaboration.",
    features: ["IEP upload + AI assist", "Action items", "Collaboration & notes", "Partner suggestions"],
    href: "/educators",
  },
  {
    icon: School,
    label: "Schools & Districts",
    need: "Confidence every student has a real plan.",
    help: "School and district dashboards, compliance signals, and templates that lift the whole building.",
    features: ["School & district rollups", "Compliance signals", "Templates & playbooks", "Role & access controls"],
    href: "/platform",
  },
  {
    icon: Network,
    label: "Partners",
    need: "Reach the families who actually need us.",
    help: "Partner profile, opportunity posting, and warm matches into student pathways — no PII required.",
    features: ["Partner profile", "Opportunity posting", "Pathway matches", "No private document access"],
    href: "/partners",
  },
];

function Roles() {
  const [active, setActive] = useState(0);
  const role = ROLES[active];
  const RoleIcon = role.icon;
  return (
    <section
      id="roles"
      className="relative overflow-hidden bg-gradient-to-b from-muted/40 via-background to-background py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Who We Serve</p>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
            One Platform, Four Vantage Points.
          </h2>
        </Reveal>

        <div className="mt-10 -mx-6 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div role="tablist" className="flex min-w-max gap-3 pb-2">
            {ROLES.map((r, i) => {
              const isActive = i === active;
              const TabIcon = r.icon;
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
                  <TabIcon className="h-4 w-4 transition-transform group-hover:scale-110" />
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={role.label}
              initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
              transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
              className="grid gap-8 p-8 md:grid-cols-[1.1fr_1fr] md:gap-12 md:p-12"
            >
              <div>
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <RoleIcon className="h-7 w-7" />
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
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Key Features</p>
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
    <section className="relative overflow-hidden border-t border-border/60 bg-gradient-to-br from-primary/[0.08] via-background to-accent/[0.08]">
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
        text="Transition planning should not just document a future. It should help build one."
        attribution="Our North Star"
      />
      <Timeline />
      <Values />
      <Flow />
      <Roles />
      <Closing />
    </SiteShell>
  );
}
