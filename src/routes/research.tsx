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
import researchHero from "@/assets/research-cinematic.jpg";

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
    ],
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
    <section ref={ref} className="relative isolate -mt-px h-[88svh] min-h-[600px] overflow-hidden">
      <motion.div style={{ scale, y }} className="absolute inset-0 -z-20">
        <img src={researchHero} alt="Research papers, notebook, and a chart on a desk" className="h-full w-full object-cover" />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/90 to-background/30" />
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-4 sm:px-6 lg:px-8">
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
          Evidence first
        </motion.p>
        <h1 className="mt-5 max-w-3xl font-display text-5xl font-medium leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          The research behind every <span className="italic text-primary">pathway</span>.
        </h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 max-w-xl text-lg text-muted-foreground">
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
    <section className="relative border-y border-foreground/10 bg-foreground py-20 text-background">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-4 sm:px-6 lg:grid-cols-4 lg:gap-6 lg:px-8">
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
      <div className="font-display text-5xl font-medium leading-none text-background sm:text-6xl lg:text-7xl">
        {n}
        <span className="text-peach">{suffix}</span>
      </div>
      <p className="mt-4 max-w-xs text-sm leading-relaxed text-background/70">{label}</p>
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
    <section className="relative py-32 sm:py-40">
      <div className="mx-auto mb-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">From finding to feature</p>
        <h2 className="mt-3 max-w-3xl font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Every pain point maps to something we built.
        </h2>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
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
      <div className="rounded-3xl border border-foreground/10 bg-peach-soft/40 p-7 lg:rounded-r-none">
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
      <div className="rounded-3xl border border-foreground/10 bg-sky-soft/40 p-7 lg:rounded-l-none">
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
const CITATIONS = [
  { source: "NLTS2 — National Longitudinal Transition Study", note: "Long-term post-school outcomes for students with disabilities." },
  { source: "IDEA Section 614 (d)(1)(A)", note: "Transition services must begin by age 16." },
  { source: "U.S. Dept. of Education — IDEA State Performance Reports", note: "Indicator 13 and 14: transition planning quality + post-school outcomes." },
  { source: "Family interviews, 2024–2025", note: "Conducted across CT, MA, NY districts (n=40)." },
  { source: "Educator focus groups", note: "Special education teachers and transition coordinators (n=22)." },
  { source: "Student listening sessions", note: "High school students ages 15–21 (n=35)." },
];

function CitationsGrid() {
  return (
    <section className="relative bg-sky-soft/30 py-32 sm:py-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Sources & voices</p>
        <h2 className="mt-3 max-w-2xl font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
          Built on data and lived experience.
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CITATIONS.map((c, i) => (
            <motion.div
              key={c.source}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="group rounded-2xl border border-foreground/10 bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
                Source {String(i + 1).padStart(2, "0")}
              </div>
              <div className="mt-3 font-display text-xl font-medium leading-tight text-foreground">{c.source}</div>
              <p className="mt-2 text-sm text-muted-foreground">{c.note}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------- CLOSING -------------------- */
function ClosingNote() {
  return (
    <section className="relative isolate overflow-hidden py-32 sm:py-40">
      <div className="absolute inset-0 -z-10 bg-gradient-hero" />
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Evidence is the floor. Action is the bridge.
        </h2>
        <p className="mt-5 text-lg text-foreground/70">
          Every feature in TransitionForward maps to a finding above. As the research grows, the platform grows with it.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/platform" className="inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-sm font-semibold text-background shadow-lift hover:scale-[1.02]">
            See the platform <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/about" className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background/60 px-7 py-3.5 text-sm font-semibold text-foreground backdrop-blur hover:bg-background">
            Read our story
          </Link>
        </div>
      </div>
    </section>
  );
}
