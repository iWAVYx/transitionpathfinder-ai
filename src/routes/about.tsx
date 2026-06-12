import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
  AnimatePresence,
  useMotionValue,
} from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  Sparkles,
  Compass,
  Calendar,
  Users,
  GraduationCap,
  Building2,
  Heart,
  MapPin,
  Briefcase,
  BookOpen,
  Target,
  ShieldCheck,
  HandHeart,
  Megaphone,
  School,
  UserRound,
  Network,
  CheckCircle2,
  Quote,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Transition Forward CT" },
      {
        name: "description",
        content:
          "From paperwork to possibility — the cinematic story of why Transition Forward CT exists, the founder's MBA-to-MAT journey, and how we turn transition planning into a clear pathway for Connecticut students.",
      },
      { property: "og:title", content: "About — Transition Forward CT" },
      {
        property: "og:description",
        content:
          "Built from the classroom. Designed for the future. A visual founder story and mission for Transition Forward CT.",
      },
    ],
  }),
  component: AboutPage,
});

/* ============================================================ */
/* Primitives                                                    */
/* ============================================================ */

function useReveal(delay = 0) {
  const reduced = useReducedMotion();
  return {
    initial: reduced ? false : { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-10% 0px" },
    transition: { duration: 0.9, ease: [0.22, 0.61, 0.36, 1] as const, delay },
  };
}

function SectionLabel({ index, label }: { index: string; label: string }) {
  return (
    <motion.div
      {...useReveal()}
      className="mb-8 flex items-center gap-4 font-mono text-[0.7rem] uppercase tracking-[0.32em] text-muted-foreground"
    >
      <span className="tabular-nums">{index}</span>
      <span className="h-px w-10 bg-foreground/30" />
      <span>{label}</span>
    </motion.div>
  );
}

function Kinetic({
  text,
  className,
  delay = 0,
  stagger = 0.05,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <span className={className}>{text}</span>;
  return (
    <span className={cn("inline-block", className)} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span
          key={i}
          className="inline-block overflow-hidden align-baseline pr-[0.25em]"
        >
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            whileInView={{ y: "0%" }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{
              duration: 0.9,
              ease: [0.22, 0.61, 0.36, 1],
              delay: delay + i * stagger,
            }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* Tilt card — magnetic-ish hover */
function TiltCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const sx = useSpring(rx, { stiffness: 200, damping: 18 });
  const sy = useSpring(ry, { stiffness: 200, damping: 18 });
  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        if (reduced) return;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ry.set(px * 8);
        rx.set(-py * 8);
      }}
      onMouseLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      style={{ rotateX: sx, rotateY: sy, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================ */
/* HERO — cinematic layered scene                                */
/* ============================================================ */

function Hero() {
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -160]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -240]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden px-6 pb-32 pt-32 sm:px-12 lg:px-24"
    >
      {/* Atmospheric backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 70% 20%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 60%), radial-gradient(50% 40% at 15% 85%, color-mix(in oklab, var(--secondary) 22%, transparent), transparent 60%)",
        }}
      />
      <motion.div
        aria-hidden
        style={{ y: y3 }}
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[120%]"
      >
        <GridPaper />
      </motion.div>

      <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-8 flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.32em] text-muted-foreground"
          >
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" />
            00 / The Story Behind Transition Forward CT
          </motion.div>

          <h1 className="font-display text-[clamp(2.6rem,6.5vw,5.5rem)] font-medium leading-[0.98] tracking-tight">
            <Kinetic text="Built From" />
            <br />
            <Kinetic text="The Classroom." delay={0.1} />
            <br />
            <span className="italic text-muted-foreground">
              <Kinetic text="Designed for" delay={0.25} />
            </span>{" "}
            <Kinetic text="the Future." delay={0.4} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.1 }}
            className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
          >
            Transition Forward CT was created to help students receiving
            special education services, families, educators, and school teams
            move from confusing paperwork to clear, personalized pathways.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Button asChild size="lg">
              <Link to="/waitlist">
                Join the waitlist
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/platform">Explore the platform</Link>
            </Button>
          </motion.div>
        </div>

        {/* Cinematic layered scene */}
        <motion.div style={{ opacity }} className="relative mx-auto aspect-square w-full max-w-[560px]">
          {/* glow */}
          <div
            aria-hidden
            className="absolute inset-[12%] -z-10 rounded-full opacity-70 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--primary) 45%, transparent), transparent 65%)",
            }}
          />

          {/* floating papers */}
          <motion.div style={{ y: y2 }} className="absolute left-[4%] top-[10%] w-[42%]">
            <PaperCard rotate={-9} title="IEP" lines={4} muted />
          </motion.div>
          <motion.div style={{ y: y1 }} className="absolute right-[2%] top-[4%] w-[38%]">
            <PaperCard rotate={7} title="Notes" lines={3} muted />
          </motion.div>
          <motion.div style={{ y: y2 }} className="absolute left-[12%] bottom-[8%] w-[36%]">
            <PaperCard rotate={5} title="Calendar" lines={2} icon="calendar" />
          </motion.div>
          <motion.div style={{ y: y1 }} className="absolute right-[6%] bottom-[12%] w-[34%]">
            <PaperCard rotate={-6} title="Goals" lines={3} icon="target" />
          </motion.div>

          {/* central pathway report */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
            className="absolute left-1/2 top-1/2 w-[58%] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="relative rounded-2xl border border-border/60 bg-card/90 p-5 shadow-2xl backdrop-blur-md">
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
                  <Compass className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-display text-sm font-medium leading-none">Pathway Report</div>
                  <div className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
                    Personalized · CT
                  </div>
                </div>
              </div>
              <MiniBar label="Student snapshot" pct={92} />
              <MiniBar label="Goals" pct={70} />
              <MiniBar label="Resources" pct={84} />
              <MiniBar label="Partners" pct={58} />
            </div>
            <motion.div
              aria-hidden
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-6 -z-10 rounded-full border border-dashed border-primary/30"
            />
          </motion.div>

          {/* compass path */}
          <svg
            aria-hidden
            viewBox="0 0 400 400"
            className="absolute inset-0 h-full w-full"
            fill="none"
          >
            <motion.path
              d="M 30 360 C 120 280, 80 180, 200 200 S 320 120, 380 40"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              className="text-primary/40"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.4, delay: 0.8, ease: "easeInOut" }}
            />
          </svg>
        </motion.div>
      </div>

      {/* scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="mt-20 flex items-center gap-3 font-mono text-[0.65rem] uppercase tracking-[0.32em] text-muted-foreground"
      >
        <span>Scroll the journey</span>
        <motion.span
          animate={{ x: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="h-px w-12 bg-foreground/40"
        />
      </motion.div>
    </section>
  );
}

function GridPaper() {
  return (
    <svg className="h-full w-full text-foreground/[0.04]" aria-hidden>
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

function PaperCard({
  title,
  lines,
  rotate,
  muted,
  icon,
}: {
  title: string;
  lines: number;
  rotate: number;
  muted?: boolean;
  icon?: "calendar" | "target";
}) {
  const Icon = icon === "calendar" ? Calendar : icon === "target" ? Target : FileText;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotate: rotate * 1.5 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
      className={cn(
        "rounded-xl border border-border/60 p-3 shadow-xl backdrop-blur",
        muted ? "bg-card/70" : "bg-card/90",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="space-y-1.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full bg-foreground/10"
            style={{ width: `${60 + ((i * 13) % 35)}%` }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function MiniBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="mb-1 flex items-center justify-between font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }}
          className="h-full rounded-full bg-primary"
        />
      </div>
    </div>
  );
}

/* ============================================================ */
/* CINEMATIC QUOTE BREAK                                         */
/* ============================================================ */

function QuoteBreak({
  text,
  attribution,
  variant = "default",
}: {
  text: string;
  attribution?: string;
  variant?: "default" | "warm" | "cool";
}) {
  const bg =
    variant === "warm"
      ? "radial-gradient(60% 60% at 30% 40%, color-mix(in oklab, var(--secondary) 30%, transparent), transparent 70%)"
      : variant === "cool"
        ? "radial-gradient(60% 60% at 70% 50%, color-mix(in oklab, var(--primary) 28%, transparent), transparent 70%)"
        : "radial-gradient(50% 50% at 50% 50%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 70%)";

  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -40]);

  return (
    <section className="relative overflow-hidden border-y border-border/60 px-6 py-32 sm:px-12 lg:px-24">
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: bg }} />
      <motion.div style={{ y }} aria-hidden className="absolute right-6 top-6 text-foreground/[0.06] sm:right-12">
        <Quote className="h-40 w-40 sm:h-56 sm:w-56" strokeWidth={1} />
      </motion.div>
      <motion.blockquote
        {...useReveal()}
        className="mx-auto max-w-5xl font-display text-[clamp(1.75rem,4.5vw,3.5rem)] font-medium leading-[1.15] tracking-tight"
      >
        <Kinetic text={text} />
      </motion.blockquote>
      {attribution && (
        <motion.div
          {...useReveal(0.2)}
          className="mt-8 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground"
        >
          — {attribution}
        </motion.div>
      )}
    </section>
  );
}

/* ============================================================ */
/* FOUNDER JOURNEY — sticky scrollytelling timeline              */
/* ============================================================ */

const JOURNEY = [
  {
    n: "01",
    tag: "MBA",
    title: "Learning Systems",
    body: "Operations, data, sustainability, and how good systems quietly shape every user's experience.",
    icon: Briefcase,
  },
  {
    n: "02",
    tag: "Entering Education",
    title: "Into the Classroom",
    body: "Trading boardrooms for hallways — the work felt closer to people, and a lot harder to measure.",
    icon: School,
  },
  {
    n: "03",
    tag: "MAT · Special Education K–12",
    title: "Built for Students",
    body: "Lesson plans, IEPs, modifications — learning the craft of teaching every student as an individual.",
    icon: GraduationCap,
  },
  {
    n: "04",
    tag: "New Haven Public Schools",
    title: "Community in Practice",
    body: "Urban schools, real families, real constraints — where transition planning meets daily reality.",
    icon: Building2,
  },
  {
    n: "05",
    tag: "Hamden Public Schools",
    title: "Student Teaching Year",
    body: "Inside PPTs, IEP meetings, and case management — seeing exactly where the system asks too much of too few.",
    icon: Users,
  },
  {
    n: "06",
    tag: "The Gap",
    title: "Seeing the Problem",
    body: "Scattered documents. Confused families. Overloaded case managers. Disconnected resources. Students waiting.",
    icon: FileText,
  },
  {
    n: "07",
    tag: "Building",
    title: "Transition Forward CT",
    body: "One profile. One plan. One report. A platform that gives families and educators back their time.",
    icon: Sparkles,
  },
  {
    n: "08",
    tag: "Forward",
    title: "Paperwork to Possibility",
    body: "A clear pathway from school to adult life — built in Connecticut, with Connecticut, for Connecticut.",
    icon: Compass,
  },
];

function FounderJourney() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const pathLen = useSpring(scrollYProgress, { stiffness: 80, damping: 20 });

  return (
    <section id="journey" className="px-6 py-32 sm:px-12 lg:px-24">
      <SectionLabel index="01" label="The Founder Journey" />
      <div className="mb-20 grid items-end gap-8 lg:grid-cols-[1.5fr_1fr]">
        <h2 className="font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.98] tracking-tight">
          <Kinetic text="From" /> <Kinetic text="MBA" delay={0.05} />{" "}
          <span className="italic text-muted-foreground">
            <Kinetic text="to" delay={0.1} />
          </span>{" "}
          <Kinetic text="MAT." delay={0.15} />
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
          A Black male Connecticut special educator's path through strategy,
          service, and the classroom — and why that mix made this platform
          inevitable.
        </p>
      </div>

      <div ref={ref} className="relative grid gap-12 lg:grid-cols-[120px_1fr]">
        {/* sticky rail with drawing path */}
        <div className="relative hidden lg:block">
          <div className="sticky top-32 h-[60vh]">
            <svg viewBox="0 0 60 600" className="h-full w-full" fill="none" aria-hidden>
              <path d="M 30 0 L 30 600" stroke="currentColor" className="text-border" strokeWidth="2" />
              <motion.path
                d="M 30 0 L 30 600"
                stroke="currentColor"
                className="text-primary"
                strokeWidth="2"
                style={{ pathLength: pathLen }}
              />
              <motion.circle
                cx="30"
                cy="0"
                r="6"
                className="fill-primary"
                style={{ cy: useTransform(pathLen, [0, 1], [0, 600]) }}
              />
            </svg>
          </div>
        </div>

        <ol className="space-y-10">
          {JOURNEY.map((j, i) => {
            const Icon = j.icon;
            return (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-15% 0px" }}
                transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
              >
                <TiltCard className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-8 shadow-sm backdrop-blur transition-colors hover:border-primary/40">
                  <div
                    aria-hidden
                    className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background:
                        "radial-gradient(circle, color-mix(in oklab, var(--primary) 35%, transparent), transparent 65%)",
                    }}
                  />
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="mb-3 flex items-center gap-3 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">
                        <span className="tabular-nums">{j.n}</span>
                        <span className="h-px w-6 bg-foreground/30" />
                        <span>{j.tag}</span>
                      </div>
                      <h3 className="font-display text-[clamp(1.5rem,3vw,2.25rem)] font-medium leading-tight tracking-tight">
                        {j.title}
                      </h3>
                      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                        {j.body}
                      </p>
                    </div>
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-border/60 bg-background/60 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </TiltCard>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ============================================================ */
/* PAPERWORK → POSSIBILITY transformation                        */
/* ============================================================ */

const FLOW = [
  { label: "Scattered IEPs", icon: FileText, tone: "muted" },
  { label: "Student Voice", icon: HandHeart, tone: "warm" },
  { label: "Pathway Report", icon: Compass, tone: "primary" },
  { label: "Resources", icon: BookOpen, tone: "primary" },
  { label: "Partners", icon: Network, tone: "primary" },
  { label: "Action Plan", icon: CheckCircle2, tone: "primary" },
  { label: "Future", icon: Sparkles, tone: "glow" },
] as const;

function PaperworkToPossibility() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 30%"],
  });
  const draw = useSpring(scrollYProgress, { stiffness: 80, damping: 22 });

  return (
    <section className="relative overflow-hidden px-6 py-32 sm:px-12 lg:px-24">
      <SectionLabel index="02" label="The Transformation" />
      <h2 className="mb-16 max-w-4xl font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.98] tracking-tight">
        <Kinetic text="From paperwork" />
        <br />
        <span className="italic text-muted-foreground">
          <Kinetic text="to possibility." delay={0.1} />
        </span>
      </h2>

      <div ref={ref} className="relative">
        {/* desktop horizontal flow */}
        <div className="relative hidden lg:block">
          <svg viewBox="0 0 1200 80" className="absolute inset-x-0 top-12 h-20 w-full" fill="none" aria-hidden>
            <path d="M 40 60 C 240 -10, 480 90, 720 30 S 1080 60, 1160 20" stroke="currentColor" strokeWidth="2" strokeDasharray="2 6" className="text-border" />
            <motion.path
              d="M 40 60 C 240 -10, 480 90, 720 30 S 1080 60, 1160 20"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-primary"
              style={{ pathLength: draw }}
            />
          </svg>
          <ol className="relative grid grid-cols-7 gap-4">
            {FLOW.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-10% 0px" }}
                  transition={{ duration: 0.7, delay: i * 0.1 }}
                  className="flex flex-col items-center text-center"
                  style={{ marginTop: i % 2 === 0 ? 0 : 40 }}
                >
                  <FlowNode tone={s.tone} icon={Icon} step={i + 1} />
                  <div className="mt-4 font-mono text-[0.65rem] uppercase tracking-[0.24em] text-muted-foreground">
                    Step {i + 1}
                  </div>
                  <div className="mt-1 font-display text-base font-medium">{s.label}</div>
                </motion.li>
              );
            })}
          </ol>
        </div>

        {/* mobile vertical stacked story */}
        <ol className="space-y-4 lg:hidden">
          {FLOW.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur"
              >
                <FlowNode tone={s.tone} icon={Icon} step={i + 1} compact />
                <div>
                  <div className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                    Step {i + 1}
                  </div>
                  <div className="font-display text-base font-medium">{s.label}</div>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function FlowNode({
  tone,
  icon: Icon,
  step,
  compact,
}: {
  tone: string;
  icon: typeof FileText;
  step: number;
  compact?: boolean;
}) {
  const styles =
    tone === "primary"
      ? "border-primary/50 bg-primary/10 text-primary"
      : tone === "warm"
        ? "border-secondary/50 bg-secondary/20 text-secondary-foreground"
        : tone === "glow"
          ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/40"
          : "border-border bg-card text-muted-foreground";
  return (
    <div
      className={cn(
        "relative grid place-items-center rounded-2xl border-2 backdrop-blur transition-transform hover:scale-105",
        compact ? "h-12 w-12" : "h-20 w-20",
        styles,
      )}
    >
      <Icon className={compact ? "h-5 w-5" : "h-7 w-7"} />
      {!compact && (
        <span className="absolute -bottom-2 -right-2 grid h-6 w-6 place-items-center rounded-full border border-border bg-background font-mono text-[0.6rem] tabular-nums">
          {step}
        </span>
      )}
    </div>
  );
}

/* ============================================================ */
/* ECOSYSTEM — radial orbit                                       */
/* ============================================================ */

const ORBIT = [
  { label: "Family", icon: Heart },
  { label: "Educator", icon: UserRound },
  { label: "School", icon: School },
  { label: "District", icon: Building2 },
  { label: "Partners", icon: Network },
  { label: "Resources", icon: BookOpen },
  { label: "Pathway Report", icon: Compass },
  { label: "Calendar", icon: Calendar },
];

function Ecosystem() {
  const reduced = useReducedMotion();
  return (
    <section className="border-t border-border/60 px-6 py-32 sm:px-12 lg:px-24">
      <SectionLabel index="03" label="The Ecosystem" />
      <div className="grid items-center gap-16 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h2 className="font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.98] tracking-tight">
            <Kinetic text="The student" />
            <br />
            <span className="italic text-muted-foreground">
              <Kinetic text="at the center." delay={0.1} />
            </span>
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            Transition Forward CT pulls every adult in a student's life into
            one shared room — with the student's voice in the middle, not the
            margins.
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:hidden">
            {ORBIT.map((o, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2 backdrop-blur"
              >
                <o.icon className="h-4 w-4 text-primary" />
                <span className="text-sm">{o.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* radial */}
        <div className="relative mx-auto hidden aspect-square w-full max-w-[560px] lg:block">
          <motion.div
            aria-hidden
            animate={reduced ? undefined : { rotate: 360 }}
            transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
            className="absolute inset-8 rounded-full border border-dashed border-border"
          />
          <motion.div
            aria-hidden
            animate={reduced ? undefined : { rotate: -360 }}
            transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
            className="absolute inset-24 rounded-full border border-dashed border-border/60"
          />

          {/* center student */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="absolute left-1/2 top-1/2 grid h-32 w-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-primary/40 bg-card text-center shadow-2xl"
          >
            <div
              aria-hidden
              className="absolute inset-0 -z-10 rounded-full opacity-70 blur-2xl"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in oklab, var(--primary) 50%, transparent), transparent 60%)",
              }}
            />
            <div>
              <UserRound className="mx-auto h-7 w-7 text-primary" />
              <div className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.22em]">
                Student
              </div>
            </div>
          </motion.div>

          {/* orbit nodes */}
          {ORBIT.map((o, i) => {
            const angle = (i / ORBIT.length) * Math.PI * 2 - Math.PI / 2;
            const r = 42; // %
            const x = 50 + Math.cos(angle) * r;
            const y = 50 + Math.sin(angle) * r;
            const Icon = o.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.6 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.08 }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div className="group flex flex-col items-center gap-2">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl border border-border/60 bg-card/90 text-primary shadow-lg backdrop-blur transition-transform group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
                    {o.label}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* connecting lines */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden>
            {ORBIT.map((_, i) => {
              const angle = (i / ORBIT.length) * Math.PI * 2 - Math.PI / 2;
              const x = 50 + Math.cos(angle) * 42;
              const y = 50 + Math.sin(angle) * 42;
              return (
                <motion.line
                  key={i}
                  x1="50"
                  y1="50"
                  x2={x}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="0.2"
                  className="text-primary/40"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, delay: 0.4 + i * 0.06 }}
                />
              );
            })}
          </svg>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/* BEFORE / AFTER slider                                          */
/* ============================================================ */

function BeforeAfter() {
  const [pos, setPos] = useState(50);
  return (
    <section className="border-t border-border/60 px-6 py-32 sm:px-12 lg:px-24">
      <SectionLabel index="04" label="Problem · Solution" />
      <div className="mb-12 grid items-end gap-8 lg:grid-cols-[1.5fr_1fr]">
        <h2 className="font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.98] tracking-tight">
          <Kinetic text="The old way," />
          <br />
          <span className="italic text-muted-foreground">
            <Kinetic text="and a new one." delay={0.1} />
          </span>
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
          Drag the divider. See transition planning move from scattered to
          coordinated.
        </p>
      </div>

      <div
        className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl"
        onMouseMove={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setPos(Math.min(95, Math.max(5, ((e.clientX - r.left) / r.width) * 100)));
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (!t) return;
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setPos(Math.min(95, Math.max(5, ((t.clientX - r.left) / r.width) * 100)));
        }}
      >
        {/* AFTER (full) */}
        <AfterScene />
        {/* BEFORE (clipped) */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <BeforeScene />
        </div>
        {/* handle */}
        <div className="absolute inset-y-0" style={{ left: `${pos}%` }}>
          <div className="absolute inset-y-0 -ml-px w-0.5 bg-primary" />
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary bg-background px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.22em] text-primary shadow-lg">
            Drag
          </div>
        </div>
        {/* labels */}
        <div className="absolute left-6 top-6 rounded-full bg-background/80 px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.22em] backdrop-blur">
          Paperwork
        </div>
        <div className="absolute right-6 top-6 rounded-full bg-primary px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-primary-foreground">
          Pathway
        </div>
      </div>
    </section>
  );
}

function BeforeScene() {
  const items = [
    { t: "IEP draft v3.docx", r: -8, x: 6, y: 18 },
    { t: "Email — RE: meeting", r: 5, x: 28, y: 8 },
    { t: "Sticky: call mom?", r: -3, x: 52, y: 14 },
    { t: "Goals (last yr)", r: 7, x: 8, y: 56 },
    { t: "PDF — transition", r: -6, x: 38, y: 62 },
    { t: "Notes from PPT", r: 4, x: 68, y: 48 },
    { t: "Folder: 2023–24", r: -5, x: 18, y: 78 },
    { t: "Print: services", r: 8, x: 60, y: 76 },
  ];
  return (
    <div className="absolute inset-0 bg-muted">
      <div aria-hidden className="absolute inset-0 opacity-60">
        <GridPaper />
      </div>
      {items.map((it, i) => (
        <div
          key={i}
          className="absolute rounded-md border border-border/60 bg-background/90 px-3 py-2 text-xs shadow-md"
          style={{
            left: `${it.x}%`,
            top: `${it.y}%`,
            transform: `rotate(${it.r}deg)`,
          }}
        >
          <FileText className="mb-1 inline h-3 w-3 text-muted-foreground" /> {it.t}
        </div>
      ))}
    </div>
  );
}

function AfterScene() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(60% 50% at 50% 30%, color-mix(in oklab, var(--primary) 20%, transparent), transparent 70%), var(--background)",
      }}
    >
      <div className="grid h-full grid-cols-12 gap-4 p-8">
        <div className="col-span-4 rounded-2xl border border-border/60 bg-card p-4 shadow-lg">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
              <UserRound className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium">Student Snapshot</div>
              <div className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                Age 17 · CT
              </div>
            </div>
          </div>
          <MiniBar label="Strengths" pct={88} />
          <MiniBar label="Interests" pct={72} />
          <MiniBar label="Supports" pct={65} />
        </div>
        <div className="col-span-8 rounded-2xl border border-border/60 bg-card p-4 shadow-lg">
          <div className="mb-3 flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
            <Compass className="h-3.5 w-3.5 text-primary" /> Pathway Report
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { l: "Goals", v: "4 active" },
              { l: "Resources", v: "12 matched" },
              { l: "Partners", v: "3 nearby" },
              { l: "Actions", v: "30-day plan" },
              { l: "Meeting", v: "Apr 12" },
              { l: "Voice", v: "Recorded" },
            ].map((c, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/60 bg-background p-3 text-xs"
              >
                <div className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground">
                  {c.l}
                </div>
                <div className="mt-1 font-display text-sm font-medium">{c.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-12 rounded-2xl border border-border/60 bg-card p-4 shadow-lg">
          <div className="mb-3 font-mono text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
            Calendar · next milestones
          </div>
          <div className="grid grid-cols-5 gap-2">
            {["IEP Review", "Tour CCC", "Job Shadow", "DDS Intake", "Driver's Ed"].map(
              (m, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border/60 bg-background px-3 py-2 text-xs"
                >
                  <Calendar className="mb-1 h-3 w-3 text-primary" />
                  {m}
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
/* PATHWAY REPORT MOCKUP                                          */
/* ============================================================ */

const REPORT_SECTIONS = [
  { label: "Student Snapshot", icon: UserRound, note: "Strengths, interests, support style." },
  { label: "Student Voice", icon: HandHeart, note: "What the student wants from adult life." },
  { label: "Transition Goals", icon: Target, note: "Plain-language goals, by domain." },
  { label: "Readiness Scorecard", icon: ShieldCheck, note: "Where the plan is strong, where it needs work." },
  { label: "Recommended Resources", icon: BookOpen, note: "CT-specific, vetted, filtered." },
  { label: "Partner Matches", icon: Network, note: "Local programs that fit the goals." },
  { label: "30-Day Action Plan", icon: CheckCircle2, note: "Who does what, by when." },
  { label: "Meeting Prep Questions", icon: Megaphone, note: "Questions families can bring to the PPT." },
];

function PathwayReportMockup() {
  return (
    <section className="relative overflow-hidden border-t border-border/60 px-6 py-32 sm:px-12 lg:px-24">
      <SectionLabel index="05" label="The Pathway Report" />
      <div className="grid items-start gap-16 lg:grid-cols-[1fr_1.2fr]">
        <div className="lg:sticky lg:top-32">
          <h2 className="font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.98] tracking-tight">
            <Kinetic text="One report." />
            <br />
            <span className="italic text-muted-foreground">
              <Kinetic text="One shared page." delay={0.1} />
            </span>
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            The Pathway Report turns a stack of IEP documents into something
            every adult in the room — and the student — can read in five
            minutes.
          </p>
          <Button asChild className="mt-8" size="lg">
            <Link to="/platform">
              See the platform
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-8 -z-10 rounded-3xl opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(50% 50% at 50% 30%, color-mix(in oklab, var(--primary) 25%, transparent), transparent 70%)",
            }}
          />
          <div className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-2xl backdrop-blur sm:p-8">
            <div className="mb-6 flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display text-base font-medium">Pathway Report</div>
                  <div className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                    Draft · Auto-updated
                  </div>
                </div>
              </div>
              <div className="hidden font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground sm:block">
                v 1.2 · CT
              </div>
            </div>
            <ol className="space-y-3">
              {REPORT_SECTIONS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-10% 0px" }}
                    transition={{ duration: 0.6, delay: i * 0.08 }}
                    className="group flex items-start gap-4 rounded-xl border border-border/40 bg-background/60 p-4 transition-colors hover:border-primary/40"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-primary group-hover:bg-primary/15">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-display text-sm font-medium">{s.label}</div>
                        <span className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-muted-foreground">
                          0{i + 1}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{s.note}</div>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/* CONNECTICUT OPPORTUNITY MAP                                    */
/* ============================================================ */

const CT_PINS = [
  { x: 22, y: 60, label: "Workforce", cat: "Employment" },
  { x: 36, y: 48, label: "Adult Services", cat: "Services" },
  { x: 48, y: 62, label: "Community College", cat: "Education" },
  { x: 58, y: 38, label: "Training", cat: "Programs" },
  { x: 70, y: 55, label: "Partner Org", cat: "Partner" },
  { x: 82, y: 42, label: "Family Advocacy", cat: "Family" },
  { x: 30, y: 30, label: "Independent Living", cat: "Living" },
  { x: 64, y: 70, label: "Internship", cat: "Employment" },
];

function CTMap() {
  const [active, setActive] = useState<number | null>(null);
  return (
    <section className="border-t border-border/60 px-6 py-32 sm:px-12 lg:px-24">
      <SectionLabel index="06" label="Connecticut Ecosystem" />
      <div className="mb-12 grid items-end gap-8 lg:grid-cols-[1.5fr_1fr]">
        <h2 className="font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.98] tracking-tight">
          <Kinetic text="Connecting planning" />
          <br />
          <span className="italic text-muted-foreground">
            <Kinetic text="to real CT opportunity." delay={0.1} />
          </span>
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
          Every pin is a real Connecticut program, partner, or service that
          maps to a goal in the student's plan.
        </p>
      </div>

      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl border border-border/60 bg-card/60 backdrop-blur">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 50%, color-mix(in oklab, var(--primary) 14%, transparent), transparent 70%)",
          }}
        />
        {/* stylized CT silhouette */}
        <svg
          viewBox="0 0 100 60"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          <motion.path
            d="M 10 18 L 90 12 L 92 38 L 78 44 L 70 50 L 60 46 L 50 52 L 38 50 L 28 54 L 18 50 L 12 44 Z"
            className="fill-muted stroke-border"
            strokeWidth="0.3"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 2 }}
          />
        </svg>

        {CT_PINS.map((p, i) => (
          <button
            key={i}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <span className="relative grid h-4 w-4 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
              <span className="relative grid h-3 w-3 place-items-center rounded-full bg-primary shadow-lg shadow-primary/40" />
            </span>
            <AnimatePresence>
              {active === i && (
                <motion.span
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute left-1/2 top-4 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-background px-3 py-1.5 text-left text-xs shadow-xl"
                >
                  <span className="block font-display font-medium">{p.label}</span>
                  <span className="block font-mono text-[0.55rem] uppercase tracking-[0.22em] text-muted-foreground">
                    {p.cat}
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2 font-mono text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
        {["Employment", "Services", "Education", "Programs", "Partner", "Family", "Living"].map(
          (c) => (
            <span key={c} className="rounded-full border border-border bg-card px-3 py-1">
              {c}
            </span>
          ),
        )}
      </div>
    </section>
  );
}

/* ============================================================ */
/* VALUES — constellation                                         */
/* ============================================================ */

const VALUES = [
  { word: "Student Voice", detail: "The student speaks first. Every plan starts there.", icon: HandHeart },
  { word: "Clarity", detail: "Plain language. Real next steps. No jargon walls.", icon: Sparkles },
  { word: "Equity", detail: "Built so every CT family — not just the loudest — gets a real plan.", icon: ShieldCheck },
  { word: "Action", detail: "Every screen ends in something to do, not something to read.", icon: Target },
  { word: "Collaboration", detail: "Family, educator, partner — same page, same plan.", icon: Users },
  { word: "Dignity", detail: "Students are people, not paperwork. The product never forgets it.", icon: Heart },
];

function Values() {
  const [active, setActive] = useState<number | null>(null);
  return (
    <section id="values" className="border-t border-border/60 px-6 py-32 sm:px-12 lg:px-24">
      <SectionLabel index="07" label="Our Values" />
      <h2 className="mb-16 max-w-4xl font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.98] tracking-tight">
        <Kinetic text="What we stand on." />
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {VALUES.map((v, i) => {
          const Icon = v.icon;
          const isActive = active === i;
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.7, delay: i * 0.06 }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <TiltCard className="group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur transition-colors hover:border-primary/40">
                <div
                  aria-hidden
                  className="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(circle, color-mix(in oklab, var(--primary) 35%, transparent), transparent 65%)",
                  }}
                />
                <div className="mb-4 flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground tabular-nums">
                    0{i + 1}
                  </span>
                </div>
                <h3
                  className={cn(
                    "font-display text-2xl font-medium leading-tight transition-all duration-500",
                    isActive ? "italic" : "",
                  )}
                >
                  {v.word}.
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {v.detail}
                </p>
              </TiltCard>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

/* ============================================================ */
/* ROLES — interactive tabs                                       */
/* ============================================================ */

const ROLES = [
  {
    key: "Student",
    icon: GraduationCap,
    pain: "My plan is about me but never feels like mine.",
    win: "A voice tool that records what I want, in my words.",
    features: ["Student voice", "My pathway", "My calendar"],
  },
  {
    key: "Family",
    icon: Heart,
    pain: "I leave PPT meetings more confused than when I arrived.",
    win: "A plain-language report that travels home with us.",
    features: ["Pathway Report", "Meeting prep", "Resources"],
  },
  {
    key: "Educator",
    icon: UserRound,
    pain: "I lose hours to paperwork I'd rather spend with students.",
    win: "One profile, one report — generated, not retyped.",
    features: ["Profile sync", "Goals editor", "Auto-report"],
  },
  {
    key: "School",
    icon: School,
    pain: "I can't see who's on track and who's about to fall through.",
    win: "Building-level readiness, surfaced without spreadsheets.",
    features: ["Readiness view", "Caseload health", "Alerts"],
  },
  {
    key: "District",
    icon: Building2,
    pain: "Outcomes data lives in places nobody opens.",
    win: "District-level transition outcomes, in one dashboard.",
    features: ["Outcomes", "Equity gaps", "Reports"],
  },
  {
    key: "Partner",
    icon: Network,
    pain: "Programs are full of seats students never hear about.",
    win: "Targeted matches based on real student goals.",
    features: ["Partner directory", "Match feed", "Opportunities"],
  },
];

function Roles() {
  const [active, setActive] = useState(0);
  const r = ROLES[active]!;
  const Icon = r.icon;
  return (
    <section className="border-t border-border/60 px-6 py-32 sm:px-12 lg:px-24">
      <SectionLabel index="08" label="Built for Everyone Around the Student" />
      <h2 className="mb-12 max-w-4xl font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.98] tracking-tight">
        <Kinetic text="Six chairs," />{" "}
        <span className="italic text-muted-foreground">
          <Kinetic text="one table." delay={0.1} />
        </span>
      </h2>

      <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
        <ul className="flex flex-wrap gap-2 lg:flex-col">
          {ROLES.map((role, i) => {
            const RI = role.icon;
            const isActive = i === active;
            return (
              <li key={role.key}>
                <button
                  onClick={() => setActive(i)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                    isActive
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/60 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  <RI className="h-4 w-4" />
                  <span className="font-display text-sm font-medium">{role.key}</span>
                  {isActive && <ArrowRight className="ml-auto h-4 w-4 text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>

        <AnimatePresence mode="wait">
          <motion.div
            key={r.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
            className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-8 backdrop-blur sm:p-12"
          >
            <div
              aria-hidden
              className="absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-40 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in oklab, var(--primary) 40%, transparent), transparent 65%)",
              }}
            />
            <div className="mb-6 flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <div className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">
                For {r.key}
              </div>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <div className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                  The Pain
                </div>
                <p className="mt-2 font-display text-2xl font-medium leading-tight text-muted-foreground">
                  "{r.pain}"
                </p>
              </div>
              <div>
                <div className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-primary">
                  The Forward
                </div>
                <p className="mt-2 font-display text-2xl font-medium leading-tight">
                  {r.win}
                </p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {r.features.map((f) => (
                <span
                  key={f}
                  className="rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.22em]"
                >
                  {f}
                </span>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ============================================================ */
/* FOUNDER STORY CARDS                                            */
/* ============================================================ */

const FOUNDER_CARDS = [
  { tag: "Strategy", body: "My MBA gave me systems, operations, data, and user experience.", icon: Briefcase },
  { tag: "Service", body: "My MAT grounded that thinking in classrooms, students, and families.", icon: GraduationCap },
  { tag: "Special Education", body: "Student teaching showed me where families and educators need support most.", icon: BookOpen },
  { tag: "Student Voice", body: "Every plan should start with the student. The product enforces it.", icon: HandHeart },
  { tag: "Family Clarity", body: "Plain-language reports families can actually use in the meeting.", icon: Heart },
  { tag: "Systems Change", body: "Better tools for educators, real outcomes for students, real data for districts.", icon: Network },
];

function FounderCards() {
  return (
    <section className="border-t border-border/60 px-6 py-32 sm:px-12 lg:px-24">
      <SectionLabel index="09" label="Why This Founder, Why Now" />
      <h2 className="mb-16 max-w-4xl font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.98] tracking-tight">
        <Kinetic text="Strategy," />{" "}
        <Kinetic text="service," delay={0.1} />{" "}
        <span className="italic text-muted-foreground">
          <Kinetic text="students." delay={0.2} />
        </span>
      </h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FOUNDER_CARDS.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.7, delay: i * 0.06 }}
            >
              <TiltCard className="h-full rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
                <Icon className="h-5 w-5 text-primary" />
                <div className="mt-4 font-mono text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
                  {c.tag}
                </div>
                <p className="mt-2 font-display text-lg font-medium leading-snug">
                  {c.body}
                </p>
              </TiltCard>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================ */
/* FINAL CTA scene                                                */
/* ============================================================ */

function Closing() {
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden border-t border-border/60 px-6 py-40 sm:px-12 lg:px-24"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 30%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%)",
        }}
      />
      <motion.div aria-hidden style={{ y }} className="absolute inset-0 -z-10">
        <GridPaper />
      </motion.div>

      {/* floating product cards orbiting CTA */}
      <div className="relative mx-auto max-w-5xl">
        <SectionLabel index="10" label="The Invitation" />
        <h2 className="max-w-4xl font-display text-[clamp(2.5rem,7vw,6rem)] font-medium leading-[0.95] tracking-tight">
          <Kinetic text="Help build the" />
          <br />
          <span className="italic text-muted-foreground">
            <Kinetic text="future of transition planning." delay={0.1} />
          </span>
        </h2>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          A clearer bridge between students, families, educators, schools,
          districts, and real-world Connecticut opportunity.
        </p>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link to="/waitlist">
              Join the waitlist
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/platform">Explore the platform</Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to="/partners">
              Partner with us
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to="/contact">Contact</Link>
          </Button>
        </div>

        {/* floating product chips */}
        <div className="mt-20 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { l: "Pathway Report", i: Compass },
            { l: "Student Voice", i: HandHeart },
            { l: "Resources", i: BookOpen },
            { l: "Partners", i: Network },
            { l: "Actions", i: CheckCircle2 },
            { l: "Calendar", i: Calendar },
          ].map((c, i) => {
            const I = c.i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                animate={{ y: [0, -6, 0] }}
                style={{
                  animationDelay: `${i * 0.3}s`,
                }}
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 4 + i * 0.3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/80 px-4 py-3 backdrop-blur"
                >
                  <I className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{c.l}</span>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/* Progress rail                                                  */
/* ============================================================ */

function ProgressRail() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  return (
    <motion.div
      style={{ scaleX, transformOrigin: "0% 50%" }}
      className="fixed left-0 right-0 top-0 z-40 h-[2px] bg-primary"
      aria-hidden
    />
  );
}

/* ============================================================ */
/* Page                                                           */
/* ============================================================ */

function AboutPage() {
  // Ensure top-of-page on mount
  useEffect(() => {
    if (typeof window !== "undefined" && !window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <SiteShell>
      <ProgressRail />
      <main className="bg-background text-foreground">
        <Hero />
        <QuoteBreak
          text="Students deserve more than paperwork. They deserve a clear path forward."
          variant="cool"
        />
        <FounderJourney />
        <PaperworkToPossibility />
        <QuoteBreak
          text="Transition planning shouldn't just document a future. It should help build one."
          variant="warm"
        />
        <Ecosystem />
        <BeforeAfter />
        <PathwayReportMockup />
        <CTMap />
        <Values />
        <Roles />
        <FounderCards />
        <QuoteBreak
          text="Built from the classroom, from the meeting table, and from the belief that every student deserves to be seen."
          attribution="Transition Forward CT"
        />
        <Closing />
      </main>
    </SiteShell>
  );
}
