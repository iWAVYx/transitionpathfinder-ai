import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring, AnimatePresence, useMotionValue, useMotionTemplate } from "motion/react";
import {
  ArrowRight,
  Sparkles,
  ClipboardCheck,
  MessagesSquare,
  Compass,
  Users,
  GraduationCap,
  Building2,
  Briefcase,
  Lock,
  FileText,
  Target,
  CalendarCheck,
  BookOpen,
  HeartHandshake,
  Wand2,
  TrendingUp,
  Library,
  Network,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import heroImg from "@/assets/home-hero-cinematic.jpg";
import roleFamilyImg from "@/assets/role-family-v2.jpg";
import roleEducatorImg from "@/assets/role-educator-v2.jpg";
import studentPhotoImg from "@/assets/home-student-photo.jpg";
import dashboardImg from "@/assets/dashboard-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TransitionForward — From IEP goals to real-life pathways" },
      {
        name: "description",
        content:
          "TransitionForward helps students, families, and educators move from IEP goals to real-life pathways — organizing transition goals, student voice, resources, and progress in one cinematic, easy-to-use platform.",
      },
      { property: "og:title", content: "TransitionForward — From IEP goals to real-life pathways" },
      {
        property: "og:description",
        content: "One platform. One plan. Forward together.",
      },
      { property: "og:image", content: heroImg },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <SiteShell>
      <Hero />
      <ProblemToClarity />
      <TransformationStrip />
      <ModulesBento />
      <RoleSwitcher />
      <PathwayReportReveal />
      <PartnerNetwork />
      <FinalCTA />
    </SiteShell>
  );
}

/* ============================================================
 * 1. HERO — cinematic full-bleed photo + masked headline + floating cards
 * ============================================================ */
function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  return (
    <section ref={ref} className="relative isolate -mt-px h-[100svh] min-h-[680px] w-full overflow-hidden">
      <motion.div style={{ scale, y }} className="absolute inset-0 -z-20">
        <img
          src={heroImg}
          alt="A student looking forward at golden hour"
          className="h-full w-full object-cover object-[65%_center]"
        />
      </motion.div>
      {/* gradient washes */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/85 to-background/10" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-transparent to-transparent" />

      {/* animated grain noise */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06] mix-blend-overlay" style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
      }} />

      <motion.div style={{ opacity }} className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-xs font-semibold uppercase tracking-[0.28em] text-primary"
        >
          Transition planning, reimagined
        </motion.p>

        <h1 className="mt-5 max-w-3xl font-display text-5xl font-medium leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl xl:text-8xl">
          <AnimatedWord text="From IEP goals to" delay={0.15} />
          <br />
          <AnimatedWord text="real-life " delay={0.35} />
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-primary via-sky to-peach bg-clip-text text-transparent">
              pathways.
            </span>
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.1, delay: 0.9, ease: [0.65, 0, 0.35, 1] }}
              style={{ originX: 0 }}
              className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-primary via-sky to-peach"
            />
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mt-7 max-w-xl text-lg text-muted-foreground sm:text-xl"
        >
          One platform for students, families, and educators to organize transition goals,
          student voice, resources, and progress — built for what comes next.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="mt-9 flex flex-wrap items-center gap-3"
        >
          <Link
            to="/platform"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-7 py-3.5 text-sm font-semibold text-background shadow-lift transition-transform hover:scale-[1.02]"
          >
            <span className="relative z-10">Explore the platform</span>
            <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            <span className="absolute inset-0 -z-0 translate-y-full bg-gradient-to-r from-primary to-peach transition-transform duration-500 group-hover:translate-y-0" />
          </Link>
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background/60 px-7 py-3.5 text-sm font-semibold text-foreground backdrop-blur-md transition-colors hover:bg-background"
          >
            Generate a Pathway Report
          </Link>
          <Link
            to="/waitlist"
            className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
          >
            Join the waitlist
          </Link>
        </motion.div>

        {/* Floating module pills — desktop */}
        <FloatingPills />
      </motion.div>

      {/* scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.6 }}
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2"
        >
          <span>Scroll</span>
          <span className="h-8 w-px bg-foreground/30" />
        </motion.div>
      </motion.div>
    </section>
  );
}

function AnimatedWord({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span className="inline-block overflow-hidden align-baseline">
      <motion.span
        initial={{ y: "100%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.85, delay, ease: [0.65, 0, 0.35, 1] }}
        className="inline-block"
      >
        {text}
      </motion.span>
    </span>
  );
}

function FloatingPills() {
  const pills = [
    { icon: Sparkles, label: "Student Voice", x: "right-[2%]", y: "top-[18%]", d: 0 },
    { icon: HeartHandshake, label: "Family Input", x: "right-[14%]", y: "top-[40%]", d: 0.4 },
    { icon: Wand2, label: "AI Pathway Report", x: "right-[4%]", y: "top-[58%]", d: 0.8 },
    { icon: Target, label: "Goal Tracking", x: "right-[18%]", y: "top-[72%]", d: 1.2 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 hidden lg:block">
      {pills.map((p, i) => (
        <motion.div
          key={p.label}
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 1.2 + i * 0.12, ease: [0.34, 1.4, 0.64, 1] }}
          className={`absolute ${p.x} ${p.y}`}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: p.d }}
            className="flex items-center gap-2 rounded-full border border-white/30 bg-white/55 px-4 py-2 text-sm font-medium text-foreground shadow-lift backdrop-blur-xl"
          >
            <p.icon className="h-4 w-4 text-primary" />
            {p.label}
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

/* ============================================================
 * 2. PROBLEM → CLARITY — scattered paper that organizes itself
 * ============================================================ */
function ProblemToClarity() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 20 });

  const papers = [
    { rot: -14, x: -260, y: -40, label: "IEP draft" },
    { rot: 9, x: -120, y: 60, label: "Transition plan" },
    { rot: -6, x: 40, y: -80, label: "PPT notes" },
    { rot: 18, x: 180, y: 20, label: "Evaluation" },
    { rot: -22, x: -40, y: 110, label: "Meeting agenda" },
    { rot: 4, x: 260, y: -50, label: "Resource list" },
  ];

  return (
    <section ref={ref} className="relative overflow-hidden py-32 sm:py-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-xs font-semibold uppercase tracking-[0.28em] text-peach"
            >
              The problem
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="mt-4 font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              Transition planning shouldn't feel{" "}
              <span className="italic text-muted-foreground line-through decoration-peach decoration-2">scattered</span>.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
              className="mt-6 max-w-lg text-lg text-muted-foreground"
            >
              Families decode documents. Students search for their voice. Educators juggle goals,
              meetings, and resources across too many places. We bring it together.
            </motion.p>

            <ul className="mt-8 space-y-3 text-sm">
              {[
                "Paperwork lives in folders, inboxes, and binders",
                "Student voice gets lost in the planning",
                "Families don't know what comes next after high school",
                "Educators repeat the same work for every meeting",
              ].map((line, i) => (
                <motion.li
                  key={line}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  viewport={{ once: true }}
                  className="flex items-start gap-3 text-foreground/80"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-peach" />
                  {line}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Animated paper scatter */}
          <div className="relative h-[480px]">
            <motion.div
              style={{
                rotate: useTransform(progress, [0, 1], [-2, 0]),
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {papers.map((p, i) => {
                const rot = useTransform(progress, [0, 1], [p.rot, 0]);
                const x = useTransform(progress, [0, 1], [p.x, 0]);
                const y = useTransform(progress, [0, 1], [p.y, i * 6 - 12]);
                const z = useTransform(progress, [0, 1], [1, papers.length - i]);
                return (
                  <motion.div
                    key={p.label}
                    style={{ rotate: rot, x, y, zIndex: z as unknown as number }}
                    className="absolute h-56 w-44 origin-center rounded-lg border border-foreground/10 bg-card p-4 shadow-lift"
                  >
                    <div className="mb-2 h-2 w-12 rounded-full bg-primary/40" />
                    <div className="space-y-1.5">
                      {Array.from({ length: 8 }).map((_, k) => (
                        <div
                          key={k}
                          className="h-1.5 rounded-full bg-foreground/10"
                          style={{ width: `${60 + ((i * 7 + k * 11) % 35)}%` }}
                        />
                      ))}
                    </div>
                    <div className="absolute bottom-3 left-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {p.label}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
            {/* Glow under the stack when sorted */}
            <motion.div
              style={{ opacity: useTransform(progress, [0.6, 1], [0, 0.6]) }}
              className="pointer-events-none absolute inset-x-10 bottom-6 h-32 rounded-full bg-primary/30 blur-3xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
 * 3. TRANSFORMATION STRIP — horizontal Prezi journey
 * ============================================================ */
function TransformationStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-80%"]);

  const steps = [
    { icon: FileText, title: "Paperwork", desc: "IEPs, evaluations, transition forms — uploaded or simulated.", tone: "from-sky-soft to-sky/40" },
    { icon: Sparkles, title: "Student Voice", desc: "Strengths, interests, goals — captured in the student's own words.", tone: "from-peach-soft to-peach/40" },
    { icon: Wand2, title: "Pathway Report", desc: "AI organizes everything into a clear, family-friendly plan.", tone: "from-primary/20 to-sky/30" },
    { icon: Library, title: "Resources", desc: "Verified programs, services, and supports matched to the plan.", tone: "from-sky-soft to-primary/20" },
    { icon: Briefcase, title: "Opportunities", desc: "College, technical training, employment, life-skills programs.", tone: "from-peach-soft to-peach/40" },
    { icon: Target, title: "Action Plan", desc: "A 30-day next step list everyone can actually follow.", tone: "from-primary/25 to-peach/30" },
  ];

  return (
    <section ref={ref} className="relative h-[500vh] bg-gradient-to-b from-background via-sky-soft/30 to-background">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mx-auto mb-10 max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">The transformation</p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            From confusion to a clear next step.
          </h2>
        </div>
        <motion.div style={{ x }} className="flex gap-8 px-[10vw] will-change-transform">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="relative flex h-[440px] w-[78vw] shrink-0 flex-col justify-between overflow-hidden rounded-3xl border border-foreground/10 bg-card p-10 shadow-lift sm:w-[58vw] lg:w-[44vw]"
            >
              <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${s.tone} opacity-70`} />
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/30 blur-3xl" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/60">
                  Step {String(i + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
                </span>
                <s.icon className="h-7 w-7 text-foreground/70" />
              </div>
              <div>
                <h3 className="font-display text-5xl font-medium leading-tight text-foreground sm:text-6xl">
                  {s.title}
                </h3>
                <p className="mt-4 max-w-md text-lg text-foreground/80">{s.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================
 * 4. MODULES BENTO GRID
 * ============================================================ */
const MODULES = [
  { icon: Wand2, title: "AI Pathway Builder", desc: "Turns IEP goals + student voice into a personalized plan.", span: "lg:col-span-2 lg:row-span-2", tone: "primary" },
  { icon: Sparkles, title: "Student Hub", desc: "Voice, strengths, goals — owned by the student.", span: "", tone: "peach" },
  { icon: HeartHandshake, title: "Family Dashboard", desc: "Plain-language view of the whole plan.", span: "", tone: "sky" },
  { icon: GraduationCap, title: "Educator Dashboard", desc: "Caseload, progress, and meeting prep in one view.", span: "lg:col-span-2", tone: "primary" },
  { icon: FileText, title: "Pathway Report Portal", desc: "Share a clean report with the team.", span: "", tone: "peach" },
  { icon: CalendarCheck, title: "Meeting Center", desc: "PPT prep, agendas, and follow-ups.", span: "", tone: "sky" },
  { icon: TrendingUp, title: "Goal & Progress Tracker", desc: "Visualize movement on every goal.", span: "", tone: "primary" },
  { icon: Library, title: "Resource & Opportunity Hub", desc: "Verified programs, matched to the plan.", span: "lg:col-span-2", tone: "peach" },
  { icon: ClipboardCheck, title: "Transition Forms Library", desc: "Editable, sharable, district-ready.", span: "", tone: "sky" },
  { icon: MessagesSquare, title: "Communication Center", desc: "One thread for every team member.", span: "", tone: "primary" },
];

function ModulesBento() {
  return (
    <section className="relative overflow-hidden py-32 sm:py-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">The platform</p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Ten modules. One coherent plan.
            </h2>
          </div>
          <Link to="/platform" className="group inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            Tour every module <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-14 grid auto-rows-[180px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m, i) => (
            <BentoCard key={m.title} mod={m} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BentoCard({ mod, index }: { mod: (typeof MODULES)[number]; index: number }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const bg = useMotionTemplate`radial-gradient(400px circle at ${mx}px ${my}px, var(--color-primary), transparent 60%)`;
  const toneBg =
    mod.tone === "primary" ? "from-primary/12 to-sky-soft/30"
    : mod.tone === "peach" ? "from-peach-soft to-peach/25"
    : "from-sky-soft to-sky/25";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay: (index % 5) * 0.05 }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
      className={`group relative overflow-hidden rounded-3xl border border-foreground/10 bg-card p-6 shadow-soft transition-all hover:shadow-lift hover:-translate-y-1 ${mod.span}`}
    >
      <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${toneBg} opacity-60`} />
      <motion.div style={{ background: bg }} className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-15" />
      <div className="flex h-full flex-col justify-between">
        <mod.icon className="h-7 w-7 text-foreground/70 transition-transform group-hover:scale-110 group-hover:text-primary" />
        <div>
          <h3 className="font-display text-2xl font-medium leading-tight text-foreground">
            {mod.title}
          </h3>
          <p className="mt-2 text-sm text-foreground/70">{mod.desc}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ============================================================
 * 5. ROLE SWITCHER
 * ============================================================ */
const ROLES = [
  {
    key: "student",
    label: "Students",
    icon: Sparkles,
    img: studentPhotoImg,
    headline: "Your voice. Your plan. Your next step.",
    body: "Capture strengths and interests, set goals in your own words, and see your pathway take shape.",
    bullets: ["Student voice activities", "Self-advocacy prompts", "Pathway preview"],
  },
  {
    key: "family",
    label: "Families",
    icon: HeartHandshake,
    img: roleFamilyImg,
    headline: "Plain-language clarity, without the binders.",
    body: "Understand the IEP, see what's next, share priorities, and prep for meetings — together.",
    bullets: ["Pathway Report in family-friendly language", "Priority and concern capture", "Meeting prep guide"],
  },
  {
    key: "educator",
    label: "Educators",
    icon: GraduationCap,
    img: roleEducatorImg,
    headline: "A calmer caseload. A clearer meeting.",
    body: "Auto-prep PPTs, surface goal progress, and connect students to verified opportunities.",
    bullets: ["Caseload dashboard", "Meeting & PPT prep", "Goal progress tracking"],
  },
  {
    key: "partner",
    label: "Partners",
    icon: Building2,
    img: dashboardImg,
    headline: "Be discoverable to the students who need you.",
    body: "Universities, technical programs, and employers reach students through the resource network.",
    bullets: ["Verified resource listing", "Direct family reach", "Opportunity matching"],
  },
] as const;

function RoleSwitcher() {
  const [active, setActive] = useState<typeof ROLES[number]["key"]>("student");
  const role = ROLES.find((r) => r.key === active)!;

  return (
    <section className="relative overflow-hidden bg-foreground py-32 text-background sm:py-40">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_0%,oklch(0.55_0.13_230/0.4),transparent_60%),radial-gradient(circle_at_85%_100%,oklch(0.82_0.07_25/0.35),transparent_60%)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-background/60">Every role, supported</p>
        <h2 className="mt-3 max-w-3xl font-display text-4xl font-medium tracking-tight text-background sm:text-5xl lg:text-6xl">
          One platform. Four points of view.
        </h2>

        <div className="mt-10 flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <button
              key={r.key}
              onClick={() => setActive(r.key)}
              className={`group relative inline-flex items-center gap-2 overflow-hidden rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors ${
                active === r.key
                  ? "border-background bg-background text-foreground"
                  : "border-background/25 text-background/80 hover:border-background/60 hover:text-background"
              }`}
            >
              <r.icon className="h-4 w-4" />
              {r.label}
            </button>
          ))}
        </div>

        <div className="mt-12 grid items-center gap-12 lg:grid-cols-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={role.key + "-text"}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1] }}
              className="lg:col-span-2"
            >
              <h3 className="font-display text-3xl font-medium leading-tight text-background sm:text-4xl lg:text-5xl">
                {role.headline}
              </h3>
              <p className="mt-5 text-lg text-background/75">{role.body}</p>
              <ul className="mt-7 space-y-3">
                {role.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-3 text-sm text-background/85">
                    <span className="h-1.5 w-1.5 rounded-full bg-peach" />
                    {b}
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>

          <div className="relative lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={role.key + "-img"}
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.02, y: -20 }}
                transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
                className="relative aspect-[5/4] overflow-hidden rounded-3xl border border-background/10 shadow-lift"
              >
                <img src={role.img} alt={role.label} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-tr from-foreground/40 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full bg-background/85 px-4 py-2 text-xs font-semibold text-foreground backdrop-blur">
                  <role.icon className="h-3.5 w-3.5 text-primary" />
                  {role.label}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
 * 6. PATHWAY REPORT REVEAL — sticky mockup with sections
 * ============================================================ */
function PathwayReportReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const sections = [
    { title: "Student Snapshot", desc: "Who they are, in their own words." },
    { title: "Strengths & Interests", desc: "What lights them up, what they're good at." },
    { title: "Recommended Pathways", desc: "College, technical, career, life-skills — matched." },
    { title: "Life-Skills Focus", desc: "The few things that move the needle most." },
    { title: "PPT Questions", desc: "Bring the right questions to the meeting." },
    { title: "30-Day Action Plan", desc: "What to do this month — concretely." },
  ];

  return (
    <section ref={ref} className="relative bg-sky-soft/40" style={{ height: `${sections.length * 80}vh` }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">The Pathway Report</p>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              The plan, written like a human would write it.
            </h2>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Every report has the same calm structure — so families, students, and educators
              can land on the same page in minutes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/demo" className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:scale-[1.02]">
                Preview a sample report <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/pathways/sample" className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background/60 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur hover:bg-background">
                Build a pathway
              </Link>
            </div>
          </div>

          {/* Mock report */}
          <div className="relative">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-3xl border border-foreground/10 bg-card shadow-lift">
              <div className="flex items-center justify-between border-b border-foreground/10 bg-background/80 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <span>Pathway Report · Maya R.</span>
                <span className="text-primary">Draft</span>
              </div>
              <div className="space-y-5 p-6">
                {sections.map((s, i) => {
                  const start = i / sections.length;
                  const end = (i + 1) / sections.length;
                  const opacity = useTransform(scrollYProgress, [start, start + 0.05, end - 0.05, end], [0.25, 1, 1, 0.25]);
                  const x = useTransform(scrollYProgress, [start, start + 0.08], [20, 0]);
                  return (
                    <motion.div key={s.title} style={{ opacity, x }} className="border-l-2 border-primary/40 pl-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                        Section {i + 1}
                      </div>
                      <div className="font-display text-xl font-medium text-foreground">{s.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{s.desc}</div>
                      <div className="mt-2 space-y-1">
                        {Array.from({ length: 3 }).map((_, k) => (
                          <div key={k} className="h-1.5 rounded-full bg-foreground/10" style={{ width: `${70 + ((i * 5 + k * 9) % 25)}%` }} />
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            {/* Floating chip */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-4 top-10 hidden rounded-2xl border border-foreground/10 bg-card px-4 py-3 text-xs shadow-lift sm:block"
            >
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Wand2 className="h-3.5 w-3.5 text-primary" /> AI-assisted
              </div>
              <div className="mt-1 text-muted-foreground">Human-reviewable, editable.</div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
 * 7. PARTNER NETWORK — animated node map
 * ============================================================ */
function PartnerNetwork() {
  const nodes = [
    { x: 50, y: 50, label: "Student", primary: true, icon: Sparkles },
    { x: 20, y: 20, label: "Family", icon: HeartHandshake },
    { x: 82, y: 22, label: "Educator", icon: GraduationCap },
    { x: 12, y: 75, label: "Universities", icon: Building2 },
    { x: 88, y: 78, label: "Employers", icon: Briefcase },
    { x: 50, y: 90, label: "Technical schools", icon: Compass },
    { x: 50, y: 12, label: "Community", icon: Users },
  ];
  const links = nodes.slice(1).map((n) => ({ from: nodes[0], to: n }));

  return (
    <section className="relative overflow-hidden py-32 sm:py-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">The network</p>
          <h2 className="mt-3 font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            No student moves forward alone.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            TransitionForward connects students, families, educators, universities, technical
            programs, employers, and community partners — into one network of support.
          </p>
        </div>

        <div className="relative mt-16 aspect-[16/10] w-full overflow-hidden rounded-3xl border border-foreground/10 bg-gradient-to-br from-sky-soft/60 via-background to-peach-soft/40">
          {/* SVG links */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            {links.map((l, i) => (
              <motion.line
                key={i}
                x1={l.from.x}
                y1={l.from.y}
                x2={l.to.x}
                y2={l.to.y}
                stroke="currentColor"
                strokeWidth="0.18"
                strokeDasharray="0.6 0.9"
                className="text-primary/60"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.15 * i, ease: "easeInOut" }}
              />
            ))}
          </svg>

          {/* Nodes */}
          {nodes.map((n, i) => (
            <motion.div
              key={n.label}
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.34, 1.4, 0.64, 1] }}
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
            >
              <motion.div
                animate={n.primary ? { scale: [1, 1.06, 1] } : undefined}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-lift backdrop-blur-md ${
                  n.primary
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-foreground/10 bg-card/90 text-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </motion.div>
              {n.primary && (
                <span className="trust-pulse-ring absolute inset-0 -z-10 rounded-full bg-primary/30" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
 * 8. FINAL CTA
 * ============================================================ */
function FinalCTA() {
  return (
    <section className="relative isolate overflow-hidden py-32 sm:py-44">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary via-sky to-peach" />
      <motion.div
        animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 -z-10 opacity-40 mix-blend-overlay"
        style={{
          backgroundImage: "radial-gradient(circle at 20% 30%, white 0%, transparent 50%), radial-gradient(circle at 80% 70%, white 0%, transparent 50%)",
          backgroundSize: "200% 200%",
        }}
      />
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="font-display text-4xl font-medium leading-[1.05] tracking-tight text-primary-foreground sm:text-5xl lg:text-7xl"
        >
          A clearer path. A stronger voice.
          <br />
          <span className="italic">A future that feels possible.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/90"
        >
          One platform. One plan. Forward together.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-sm font-semibold text-background shadow-lift hover:scale-[1.02]"
          >
            Start building a pathway <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/waitlist"
            className="inline-flex items-center gap-2 rounded-full border-2 border-background/80 bg-background/10 px-7 py-3.5 text-sm font-semibold text-background backdrop-blur hover:bg-background/20"
          >
            Join the waitlist
          </Link>
        </motion.div>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-primary-foreground/80">
          <span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Family-controlled privacy</span>
          <span className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5" /> Built with educators</span>
          <span className="flex items-center gap-2"><Network className="h-3.5 w-3.5" /> Verified partner network</span>
        </div>
      </div>
    </section>
  );
}
