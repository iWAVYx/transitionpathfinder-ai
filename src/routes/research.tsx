import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useInView, useSpring } from "motion/react";
import {
  ArrowRight,
  FileWarning,
  Mic,
  Compass,
  Users,
  Briefcase,
  ScrollText,
  Sparkles,
  Target,
  HeartHandshake,
  BookOpen,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { photos } from "@/lib/photos";


export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "The research behind TransitionForward" },
      {
        name: "description",
        content:
          "An interactive evidence journey — the data, voices, and findings that shaped TransitionForward, mapped directly to the platform we built.",
      },
      { property: "og:title", content: "The research behind TransitionForward" },
      { property: "og:image", content: researchHero },
      { property: "og:url", content: "/research" },
    ],
    links: [{ rel: "canonical", href: "/research" }],
  }),
  component: ResearchPage,
});

function ResearchPage() {
  return (
    <SiteShell>
      <ResearchHero />
      <StatStrip />
      <EvidenceJourney />
      <CitationsGrid />
      <ClosingNote />
    </SiteShell>
  );
}

/* -------------------- HERO -------------------- */
function ResearchHero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  return (
    <section ref={ref} className="relative isolate -mt-px h-[65svh] min-h-[480px] overflow-hidden">
      <motion.div style={{ scale, y }} className="absolute inset-0 -z-20">
        <img src={researchHero} alt="Research papers, notebook, and a chart on a desk" className="h-full w-full object-cover" />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/90 to-background/30" />
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-4 sm:px-6 lg:px-8">
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
          Evidence first
        </motion.p>
        <h1 className="mt-4 max-w-3xl font-display text-5xl font-medium leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          The research behind every <span className="italic text-primary">pathway</span>.
        </h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4 max-w-xl text-lg text-muted-foreground">
          What we learned from families, students, and educators — and how each finding shaped
          a piece of the platform.
        </motion.p>
      </div>
    </section>
  );
}

/* -------------------- STAT STRIP -------------------- */
const STATS = [
  { value: 65, suffix: "%", label: "of students with IEPs leave high school without a clear next-step plan." },
  { value: 4, suffix: "×", label: "more likely to be unemployed two years after graduation, vs. peers." },
  { value: 12, suffix: "h", label: "average time families spend decoding a single IEP document." },
  { value: 1, suffix: "in 3", label: "educators report no shared system for tracking transition goals." },
];

function StatStrip() {
  return (
    <section className="relative border-y border-foreground/10 bg-foreground py-12 text-background">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 sm:px-6 lg:grid-cols-4 lg:gap-5 lg:px-8">
        {STATS.map((s, i) => (
          <Stat key={i} {...s} delay={i * 0.1} />
        ))}
      </div>
    </section>
  );
}

function Stat({ value, suffix, label, delay }: { value: number; suffix: string; label: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 1500;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
    >
      <div className="font-display text-4xl font-medium leading-none text-background sm:text-5xl lg:text-6xl">
        {n}
        <span className="text-peach">{suffix}</span>
      </div>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-background/70">{label}</p>
    </motion.div>
  );
}

/* -------------------- EVIDENCE JOURNEY (sticky pain→feature mapper) -------------------- */
const FINDINGS = [
  {
    pain: { icon: ScrollText, title: "Paperwork overload", desc: "Families spend hours decoding IEPs, evaluations, and transition plans written for compliance, not clarity." },
    feature: { icon: Sparkles, title: "Plain-language Pathway Report", desc: "Every plan is rewritten in family-friendly language, with the source documents one click away." },
  },
  {
    pain: { icon: Mic, title: "Student voice gets lost", desc: "Most transition plans are written about the student, not with them." },
    feature: { icon: HeartHandshake, title: "Student Hub & voice activities", desc: "Guided prompts capture strengths, interests, and goals in the student's own words." },
  },
  {
    pain: { icon: Compass, title: "No shared map", desc: "Educators, families, and partners often work from different documents and timelines." },
    feature: { icon: Target, title: "Shared dashboards & action plans", desc: "One source of truth, four points of view — student, family, educator, partner." },
  },
  {
    pain: { icon: Briefcase, title: "Post-high-school cliff", desc: "Students with IEPs disproportionately end up without college, training, or employment two years out." },
    feature: { icon: Users, title: "Verified resource & opportunity network", desc: "Universities, technical schools, and employers matched to the student's goals." },
  },
  {
    pain: { icon: FileWarning, title: "Meeting prep falls on memory", desc: "PPT/IEP meetings often happen without a shared agenda or follow-up loop." },
    feature: { icon: BookOpen, title: "Meeting Center", desc: "Agenda, prep questions, and follow-up actions generated from the plan itself." },
  },
];

function EvidenceJourney() {
  return (
    <section className="relative py-16 sm:py-12">
      <div className="mx-auto mb-10 max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">From finding to feature</p>
        <h2 className="mt-2 max-w-3xl font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          Every pain point maps to something we built.
        </h2>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-3">
          {FINDINGS.map((f, i) => (
            <FindingRow key={i} finding={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FindingRow({ finding, index }: { finding: (typeof FINDINGS)[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.4"] });
  const arrow = useSpring(scrollYProgress, { stiffness: 100, damping: 20 });
  const arrowX = useTransform(arrow, [0, 1], ["0%", "100%"]);
  const arrowOpacity = useTransform(arrow, [0, 0.2, 0.9, 1], [0, 1, 1, 0]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      className="relative grid items-stretch gap-4 lg:grid-cols-[1fr_120px_1fr] lg:gap-0"
    >
      {/* Pain card */}
      <div className="rounded-2xl border border-foreground/10 bg-peach-soft/40 p-5 lg:rounded-r-none">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-peach">
          <span>What we heard · {String(index + 1).padStart(2, "0")}</span>
        </div>
        <div className="mt-3 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card text-foreground/70 shadow-soft">
            <finding.pain.icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-medium leading-tight text-foreground">{finding.pain.title}</h3>
            <p className="mt-2 text-sm text-foreground/70">{finding.pain.desc}</p>
          </div>
        </div>
      </div>

      {/* Animated arrow connector */}
      <div className="relative hidden items-center justify-center lg:flex">
        <div className="relative h-px w-full overflow-hidden bg-foreground/10">
          <motion.div style={{ width: arrowX }} className="absolute inset-y-0 left-0 bg-gradient-to-r from-peach via-primary to-sky" />
        </div>
        <motion.div
          style={{ opacity: arrowOpacity, left: arrowX }}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background shadow-lift">
            <ArrowRight className="h-4 w-4" />
          </div>
        </motion.div>
      </div>

      {/* Feature card */}
      <div className="rounded-2xl border border-foreground/10 bg-sky-soft/40 p-5 lg:rounded-l-none">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
          <span>What we built</span>
        </div>
        <div className="mt-3 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
            <finding.feature.icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-medium leading-tight text-foreground">{finding.feature.title}</h3>
            <p className="mt-2 text-sm text-foreground/70">{finding.feature.desc}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------- CITATIONS -------------------- */
type Citation = { source: string; note: string; kind: "data" | "voice"; meta: string };
const CITATIONS: Citation[] = [
  { source: "NLTS2 — National Longitudinal Transition Study", note: "Long-term post-school outcomes for students with disabilities.", kind: "data", meta: "Longitudinal · federal" },
  { source: "IDEA Section 614 (d)(1)(A)", note: "Transition services must begin by age 16.", kind: "data", meta: "Statute" },
  { source: "U.S. Dept. of Education — IDEA State Performance Reports", note: "Indicator 13 and 14: transition planning quality + post-school outcomes.", kind: "data", meta: "State reports" },
  { source: "NTACT:C — National Technical Assistance Center on Transition", note: "Evidence-based predictors of post-school success.", kind: "data", meta: "Research center" },
  { source: "WIOA Title IV — Rehabilitation Act amendments", note: "Pre-employment transition services (Pre-ETS) requirements.", kind: "data", meta: "Statute" },
  { source: "GAO Report 12-594 — Students with Disabilities", note: "Better federal coordination could improve transition outcomes.", kind: "data", meta: "Govt. audit" },
  { source: "Council for Exceptional Children — DCDT position papers", note: "Best-practice guidance for transition planning teams.", kind: "data", meta: "Professional org." },
  { source: "Test, Mazzotti et al. (2009)", note: "Evidence-based secondary transition predictors meta-analysis.", kind: "data", meta: "Peer-reviewed" },
  { source: "National Center for Learning Disabilities — Forward Together", note: "Family experience navigating special education systems.", kind: "data", meta: "Report, 2021" },
  { source: "Institute on Community Integration (UMN)", note: "Self-determination and student-led IEP research.", kind: "data", meta: "University research" },
  { source: "Bureau of Labor Statistics — Persons with a Disability", note: "Employment outcomes by disability status, annual series.", kind: "data", meta: "Federal data" },
  { source: "RSA-911 case-service reporting", note: "Vocational rehabilitation outcomes for transition-age youth.", kind: "data", meta: "Federal data" },
  { source: "Family interviews, 2024–2025", note: "Conducted across CT, MA, NY districts.", kind: "voice", meta: "n = 40 families" },
  { source: "Educator focus groups", note: "Special education teachers and transition coordinators.", kind: "voice", meta: "n = 22 educators" },
  { source: "Student listening sessions", note: "High school students ages 15–21.", kind: "voice", meta: "n = 35 students" },
  { source: "Transition coordinator roundtables", note: "District-level leaders across the Northeast.", kind: "voice", meta: "n = 14 coordinators" },
  { source: "Self-advocate advisory board", note: "Young adults with IEPs reviewing every product surface.", kind: "voice", meta: "n = 9 advisors" },
  { source: "Community partner interviews", note: "Universities, technical schools, and employer partners.", kind: "voice", meta: "n = 18 partners" },
  { source: "Parent Training & Information Centers", note: "Federally funded PTIs sharing common family questions.", kind: "voice", meta: "n = 6 centers" },
  { source: "School psychologist consultations", note: "On evaluation language and family comprehension.", kind: "voice", meta: "n = 11 psychologists" },
  { source: "Related-service provider sessions", note: "SLPs, OTs, and counselors on goal alignment.", kind: "voice", meta: "n = 15 providers" },
  { source: "Sibling & caregiver journals", note: "Diary studies of weekly transition-planning load.", kind: "voice", meta: "n = 12 households" },
];


function CitationsGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const titleY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const ringRot = useTransform(scrollYProgress, [0, 1], [-25, 25]);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  // auto-rotate active citation (paused on hover)
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setActive((a) => (a + 1) % CITATIONS.length), 3200);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <section ref={ref} className="relative isolate overflow-hidden bg-sky-soft/30 py-16 sm:py-12">
      {/* animated grid backdrop */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <motion.div
        aria-hidden
        style={{ rotate: ringRot }}
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/15"
      >
        <div className="absolute inset-8 rounded-full border border-primary/10" />
        <div className="absolute inset-20 rounded-full border border-primary/10" />
      </motion.div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          style={{ y: titleY }}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Sources &amp; voices</p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
            Built on <span className="italic text-primary">data</span> and <span className="italic text-peach">lived experience</span>.
          </h2>
        </motion.div>

        <div className="relative z-10 mt-10 grid gap-8 overflow-visible lg:grid-cols-[1.05fr_1fr] lg:items-center">
          {/* LEFT — orbital constellation */}
          <div
            className="relative z-10 mx-auto aspect-square w-full min-w-0 max-w-[520px] overflow-visible"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => {
              setPaused(false);
              setHovered(null);
            }}
          >
            {/* center pulse */}
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-primary/40 to-peach/40 blur-2xl"
            />
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-1/2 top-1/2 z-10 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-foreground/10 bg-background shadow-lift"
            >
              <div className="text-center">
                <div className="font-display text-3xl font-medium leading-none text-foreground">{CITATIONS.length}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">sources</div>
              </div>
            </motion.div>

            {/* slow-rotating orbit */}
            <motion.div
              animate={{ rotate: paused ? undefined : 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className="pointer-events-none absolute inset-0 z-20"
            >
              {CITATIONS.map((c, i) => {
                const angle = (i / CITATIONS.length) * Math.PI * 2 - Math.PI / 2;
                const r = 42; // percent
                const x = 50 + Math.cos(angle) * r;
                const y = 50 + Math.sin(angle) * r;
                const isActive = i === active;
                const isHover = i === hovered;
                return (
                  <motion.button
                    key={c.source}
                    type="button"
                    onClick={() => setActive(i)}
                    onMouseEnter={() => {
                      setHovered(i);
                      setActive(i);
                    }}
                    onFocus={() => setActive(i)}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    className="group pointer-events-auto absolute z-20 -translate-x-1/2 -translate-y-1/2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label={c.source}
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{
                      duration: 0.55,
                      delay: 0.15 + i * 0.08,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    whileTap={{ scale: 0.92 }}
                  >
                    {/* counter-rotate so the chip stays upright */}
                    <motion.div
                      animate={{ rotate: paused ? undefined : -360 }}
                      transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    >
                      <motion.div
                        animate={{
                          scale: isActive ? 1.18 : isHover ? 1.1 : 1,
                          y: isHover && !isActive ? -2 : 0,
                        }}
                        transition={{ type: "spring", stiffness: 260, damping: 18 }}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-soft backdrop-blur transition-colors ${
                          isActive
                            ? c.kind === "data"
                              ? "border-primary/60 bg-primary text-primary-foreground shadow-lift"
                              : "border-peach/60 bg-peach text-foreground shadow-lift"
                            : isHover
                              ? c.kind === "data"
                                ? "border-primary/50 bg-card text-foreground"
                                : "border-peach/50 bg-card text-foreground"
                              : "border-foreground/10 bg-card text-foreground/70"
                        }`}
                      >
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            c.kind === "data" ? "bg-primary" : "bg-peach"
                          } ${isActive ? "bg-current" : ""}`}
                        />
                        {String(i + 1).padStart(2, "0")}
                      </motion.div>
                    </motion.div>
                  </motion.button>
                );
              })}
            </motion.div>

            {/* SVG connector lines from center to each node */}
            <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              {CITATIONS.map((c, i) => {
                const angle = (i / CITATIONS.length) * Math.PI * 2 - Math.PI / 2;
                const r = 42;
                const x = 50 + Math.cos(angle) * r;
                const y = 50 + Math.sin(angle) * r;
                const emphasized = i === active || i === hovered;
                return (
                  <motion.line
                    key={i}
                    x1={50}
                    y1={50}
                    x2={x}
                    y2={y}
                    stroke={c.kind === "data" ? "var(--primary)" : "var(--peach, var(--foreground))"}
                    strokeWidth={emphasized ? 0.4 : 0.2}
                    strokeDasharray="1 1.5"
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: emphasized ? 0.5 : 0.12 }}
                    viewport={{ once: true, amount: 0.2 }}
                    animate={{ opacity: emphasized ? 0.5 : 0.12 }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.08, ease: "easeOut" }}
                  />
                );
              })}
            </svg>
          </div>

          {/* RIGHT — active citation detail + ticker */}
          <motion.div
            className="relative z-10 min-w-0"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative min-h-[200px] overflow-hidden rounded-2xl border border-foreground/10 bg-card p-6 shadow-lift transition-shadow hover:shadow-xl">

              {CITATIONS.map((c, i) => (
                <motion.div
                  key={c.source}
                  initial={false}
                  animate={{
                    opacity: i === active ? 1 : 0,
                    y: i === active ? 0 : 16,
                  }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={`absolute inset-0 p-6 ${i === active ? "" : "pointer-events-none"}`}
                >
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em]">
                    <span className={c.kind === "data" ? "text-primary" : "text-peach"}>
                      {c.kind === "data" ? "Data" : "Voice"}
                    </span>
                    <span className="text-muted-foreground">· {c.meta}</span>
                    <span className="ml-auto text-muted-foreground">
                      {String(i + 1).padStart(2, "0")} / {String(CITATIONS.length).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="mt-4 font-display text-2xl font-medium leading-tight text-foreground sm:text-3xl">
                    {c.source}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.note}</p>
                  <motion.div
                    key={`bar-${i}-${active}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: i === active ? 1 : 0 }}
                    transition={{ duration: 3.2, ease: "linear" }}
                    style={{ transformOrigin: "left" }}
                    className={`absolute inset-x-6 bottom-4 h-px ${c.kind === "data" ? "bg-primary" : "bg-peach"}`}
                  />
                </motion.div>
              ))}
            </div>

            {/* marquee of all sources */}
            <div className="relative mt-4 overflow-hidden rounded-full border border-foreground/10 bg-background/60 py-2.5 backdrop-blur">
              <motion.div
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                className="flex w-max gap-8 whitespace-nowrap px-6 text-xs font-semibold uppercase tracking-[0.22em] text-foreground/60"
              >
                {[...CITATIONS, ...CITATIONS].map((c, i) => (
                  <span key={i} className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${c.kind === "data" ? "bg-primary" : "bg-peach"}`} />
                    {c.source}
                    <span className="text-muted-foreground/60">·</span>
                  </span>
                ))}
              </motion.div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

/* -------------------- CLOSING -------------------- */
function ClosingNote() {
  return (
    <section className="relative isolate overflow-hidden py-16 sm:py-12">
      <div className="absolute inset-0 -z-10 bg-gradient-hero" />
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          Evidence is the floor. Action is the bridge.
        </h2>
        <p className="mt-4 text-base text-foreground/70">
          Every feature in TransitionForward maps to a finding above. As the research grows, the platform grows with it.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/platform" className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-sm font-semibold text-background shadow-lift hover:scale-[1.02]">
            See the platform <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/about" className="inline-flex items-center justify-center gap-2 rounded-full border border-foreground/15 bg-background/60 px-7 py-3.5 text-sm font-semibold text-foreground backdrop-blur hover:bg-background">
            Read our story
          </Link>
        </div>
      </div>
    </section>
  );
}
