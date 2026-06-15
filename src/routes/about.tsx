import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useSpring,
  useMotionValueEvent,
  type MotionValue,
} from "motion/react";
import {
  ArrowRight,
  FileText,
  Compass,
  Calendar,
  GraduationCap,
  MapPin,
  ShieldCheck,
  Sparkles,
  Quote,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Imagery — reused project assets, cropped via aspect wrappers per project rules.
import heroImg from "@/assets/about-cinematic.jpg";
import studentCenter from "@/assets/about-student-center.jpg";
import founderImg from "@/assets/home-educator.jpg";
import paperworkImg from "@/assets/iep-upload.jpg";
import classroomImg from "@/assets/educators-hero-v2.jpg";
import familyImg from "@/assets/families-hero-v2.jpg";
import pathwayImg from "@/assets/pathway-hero.jpg";
import dashboardImg from "@/assets/dashboard-hero.jpg";
import ctaImg from "@/assets/home-road.jpg";
import sunriseImg from "@/assets/framework-bg-sunrise.jpg";
import topoImg from "@/assets/framework-bg-topo.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Transition Forward CT" },
      {
        name: "description",
        content:
          "A Connecticut special educator's story behind Transition Forward — moving students and families from paperwork to possibility.",
      },
      { property: "og:title", content: "About — Transition Forward CT" },
      {
        property: "og:description",
        content:
          "From MBA to MAT, from New Haven to Hamden classrooms — the founder story behind Transition Forward CT.",
      },
      { property: "og:image", content: heroImg },
      { property: "twitter:card", content: "summary_large_image" },
      { property: "twitter:image", content: heroImg },
    ],
  }),
  component: AboutPage,
});

/* -------------------------------------------------------------------------- */
/*  Intro loader — short, skippable                                            */
/* -------------------------------------------------------------------------- */

function Intro({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) {
      onDone();
      return;
    }
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [reduce, onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d0b08] text-white"
    >
      <button
        type="button"
        onClick={onDone}
        className="absolute right-5 top-5 text-xs uppercase tracking-[0.3em] text-white/60 hover:text-white"
        aria-label="Skip intro"
      >
        Skip
      </button>
      <div className="relative flex flex-col items-center gap-4 px-6 text-center">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "min(28rem, 70vw)" }}
          transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
          className="h-px bg-gradient-to-r from-transparent via-amber-200/80 to-transparent"
        />
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="font-serif text-2xl leading-snug sm:text-3xl"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          From paperwork
          <span className="mx-2 text-amber-200">→</span>
          to possibility.
        </motion.p>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-[10px] uppercase tracking-[0.4em] text-white/40"
        >
          Transition Forward CT
        </motion.span>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function SplitHeadline({
  words,
  className,
  delay = 0,
}: {
  words: string[];
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <h2 className={cn("font-serif leading-[0.95] tracking-tight", className)}
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
      {words.map((w, i) => (
        <span key={i} className="mr-[0.25em] inline-block overflow-hidden align-bottom">
          <motion.span
            initial={reduce ? false : { y: "110%" }}
            whileInView={{ y: "0%" }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{
              duration: 0.85,
              delay: delay + i * 0.07,
              ease: [0.22, 0.61, 0.36, 1],
            }}
            className="inline-block"
          >
            {w}
          </motion.span>
        </span>
      ))}
    </h2>
  );
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 0.61, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function useParallax(scrollY: MotionValue<number>, range: [number, number], distance: number) {
  return useTransform(scrollY, range, [distance, -distance]);
}

/* -------------------------------------------------------------------------- */
/*  Hero — full-bleed, animated pathway line, kinetic split headline           */
/* -------------------------------------------------------------------------- */

function CinematicHero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const pathLen = useSpring(useTransform(scrollYProgress, [0, 0.6], [0, 1]), {
    stiffness: 80,
    damping: 20,
  });

  return (
    <section ref={ref} className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-[#0d0b08] text-white">
      {/* image */}
      <motion.div style={{ y, scale }} className="absolute inset-0">
        <img
          src={heroImg}
          alt="Warm classroom light over a student's planning notebook"
          className="h-full w-full object-cover"
          style={{ objectPosition: "50% 38%" }}
        />
      </motion.div>
      {/* warm wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 110%, rgba(0,0,0,0.85), rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.15) 70%, transparent), linear-gradient(180deg, rgba(13,11,8,0.55) 0%, rgba(13,11,8,0.15) 30%, rgba(13,11,8,0.85) 100%)",
        }}
      />
      {/* animated pathway line */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="none"
        aria-hidden
      >
        <motion.path
          d="M -20 720 C 220 640, 360 540, 520 520 S 880 480, 1080 360 S 1240 120, 1240 60"
          fill="none"
          stroke="rgba(251, 191, 36, 0.75)"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ pathLength: pathLen }}
        />
      </svg>

      <motion.div style={{ opacity: fade }} className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-5 pb-16 sm:px-8 sm:pb-20 md:pb-28">
        <Reveal>
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-amber-100/90 backdrop-blur">
            <Sparkles className="h-3 w-3" /> About the founder
          </span>
        </Reveal>
        <SplitHeadline
          words={["Built", "from", "the", "space", "between"]}
          className="text-[12vw] leading-[0.92] sm:text-7xl md:text-[6.5rem] lg:text-[8.5rem]"
        />
        <SplitHeadline
          words={["paperwork", "and", "possibility."]}
          delay={0.25}
          className="mt-1 text-[12vw] leading-[0.92] text-amber-200 sm:text-7xl md:text-[6.5rem] lg:text-[8.5rem]"
        />
        <Reveal delay={0.6} className="mt-7 max-w-xl text-base text-white/75 sm:text-lg">
          A Connecticut special educator's story — and why the next chapter of transition planning had to be built differently.
        </Reveal>
        <Reveal delay={0.85} className="mt-8 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/55">
          <span className="h-px w-10 bg-white/40" />
          Scroll to begin
        </Reveal>
      </motion.div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Founder Journey — pinned text with crossfading visuals                     */
/* -------------------------------------------------------------------------- */

type JourneyStop = {
  id: string;
  year: string;
  chapter: string;
  title: string;
  body: string;
  image: string;
  alt: string;
  pos: string;
  icon: React.ReactNode;
};

const JOURNEY: JourneyStop[] = [
  {
    id: "mba",
    year: "Chapter 01",
    chapter: "Business systems",
    title: "An MBA before the classroom.",
    body:
      "Before teaching, the founder studied how systems scale, where they break, and who they leave behind. Business school taught the discipline of clear inputs, clean outputs, and accountability for outcomes.",
    image: dashboardImg,
    alt: "Notes and planning surfaces on a workspace",
    pos: "50% 40%",
    icon: <GraduationCap className="h-4 w-4" />,
  },
  {
    id: "classroom",
    year: "Chapter 02",
    chapter: "Into the classroom",
    title: "Then an MAT in Special Education, K–12.",
    body:
      "An MAT in Special Education translated that systems thinking into something more human — students, families, IEPs, PPT meetings, and the quiet weight of every annual goal.",
    image: classroomImg,
    alt: "Bright Connecticut classroom",
    pos: "50% 45%",
    icon: <School className="h-4 w-4" />,
  },
  {
    id: "newhaven",
    year: "Chapter 03",
    chapter: "New Haven & Hamden",
    title: "Years inside Connecticut classrooms.",
    body:
      "Teaching across New Haven Public Schools and Hamden Public Schools made the gap impossible to ignore: paperwork was technically compliant, but families still left the table without a clear next step.",
    image: studentCenter,
    alt: "Student-centered planning moment",
    pos: "50% 40%",
    icon: <MapPin className="h-4 w-4" />,
  },
  {
    id: "build",
    year: "Chapter 04",
    chapter: "The platform",
    title: "Transition Forward, built from the practice.",
    body:
      "Every form, every prompt, every pathway in this platform comes from real PPT meetings — not a product team guessing what classrooms need.",
    image: pathwayImg,
    alt: "Pathway forward illustration",
    pos: "50% 45%",
    icon: <Compass className="h-4 w-4" />,
  },
];

function School(props: React.SVGProps<SVGSVGElement>) {
  // tiny inline icon to avoid extra lucide import name clash
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 10l9-6 9 6" />
      <path d="M5 9v11h14V9" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

function FounderJourney() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [active, setActive] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const idx = Math.min(JOURNEY.length - 1, Math.max(0, Math.floor(v * JOURNEY.length)));
    setActive(idx);
  });

  const progressScale = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <section ref={ref} className="relative bg-[#0d0b08] text-white" style={{ height: `${JOURNEY.length * 100}vh` }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        {/* background image stack */}
        <div className="absolute inset-0">
          {JOURNEY.map((s, i) => (
            <motion.div
              key={s.id}
              className="absolute inset-0"
              animate={{ opacity: active === i ? 1 : 0, scale: active === i ? 1 : 1.05 }}
              transition={{ duration: 1.1, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <img src={s.image} alt={s.alt} className="h-full w-full object-cover" style={{ objectPosition: s.pos }} />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0d0b08]/95 via-[#0d0b08]/70 to-[#0d0b08]/30" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0b08]/80 via-transparent to-[#0d0b08]/40" />
            </motion.div>
          ))}
        </div>

        {/* vertical chapter rail */}
        <div className="absolute left-4 top-1/2 z-10 hidden -translate-y-1/2 sm:left-8 md:block">
          <div className="relative h-64 w-px bg-white/15">
            <motion.div
              style={{ scaleY: progressScale, transformOrigin: "top" }}
              className="absolute inset-0 origin-top bg-amber-200"
            />
          </div>
          <ul className="absolute -right-2 top-0 flex h-64 translate-x-full flex-col justify-between pl-6 text-[10px] uppercase tracking-[0.3em] text-white/40">
            {JOURNEY.map((s, i) => (
              <li key={s.id} className={cn("transition-colors", active === i && "text-amber-200")}>{s.year}</li>
            ))}
          </ul>
        </div>

        {/* content */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div className="relative max-w-xl">
              {JOURNEY.map((s, i) => (
                <motion.div
                  key={s.id}
                  className={cn("absolute", "max-w-xl")}
                  initial={false}
                  animate={{
                    opacity: active === i ? 1 : 0,
                    y: active === i ? 0 : 24,
                    pointerEvents: active === i ? "auto" : "none",
                  }}
                  transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
                >
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-200/5 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-amber-100">
                    {s.icon} {s.chapter}
                  </span>
                  <h3
                    className="mt-5 font-serif text-4xl leading-[1.02] tracking-tight sm:text-5xl md:text-6xl"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    {s.title}
                  </h3>
                  <p className="mt-5 max-w-md text-base text-white/75 sm:text-lg">{s.body}</p>
                </motion.div>
              ))}
              {/* spacer to give the absolute-positioned cards room */}
              <div className="invisible">
                <span className="text-[10px] uppercase">spacer</span>
                <h3 className="font-serif text-4xl sm:text-5xl md:text-6xl">{JOURNEY[0].title}</h3>
                <p className="mt-5 max-w-md text-base sm:text-lg">{JOURNEY[0].body}</p>
              </div>
            </div>

            {/* numbered counter */}
            <div className="hidden items-end justify-end md:flex">
              <div className="text-right">
                <div
                  className="font-serif text-[18vw] leading-none text-white/[0.06] md:text-[14rem]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  aria-hidden
                >
                  0{active + 1}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* mobile progress dots */}
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2 md:hidden">
          {JOURNEY.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                "h-1 w-6 rounded-full transition-colors",
                active === i ? "bg-amber-200" : "bg-white/20"
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  The Gap — scattered documents that animate into order                      */
/* -------------------------------------------------------------------------- */

function TheGap() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const cards = [
    { t: "IEP — 47 pages", s: "compliance language" },
    { t: "Meeting notes", s: "scribbled, scattered" },
    { t: "Next steps?", s: "unclear, unassigned" },
    { t: "Family question", s: "\"so… what do we do Monday?\"" },
    { t: "Goals doc", s: "annual, abstract" },
    { t: "Email thread", s: "lost in the inbox" },
  ];

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#f7f3ec] py-24 text-stone-900 sm:py-32">
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: `url(${topoImg})`, backgroundSize: "cover" }} aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <div className="lg:sticky lg:top-24">
            <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-stone-500">
              <FileText className="h-3 w-3" /> The gap
            </span>
            <SplitHeadline
              words={["Compliant", "on", "paper.", "Unclear", "in", "practice."]}
              className="mt-5 text-4xl sm:text-5xl md:text-6xl"
            />
            <p className="mt-6 max-w-md text-base text-stone-600 sm:text-lg">
              Transition paperwork meets every requirement and still leaves the room without an answer to the simplest question a family asks: <em>what happens next?</em>
            </p>
          </div>

          {/* scattered cards */}
          <div className="relative h-[520px] sm:h-[560px]">
            {cards.map((c, i) => (
              <GapCard key={i} c={c} i={i} scrollYProgress={scrollYProgress} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function GapCard({
  c,
  i,
  scrollYProgress,
}: {
  c: { t: string; s: string };
  i: number;
  scrollYProgress: MotionValue<number>;
}) {
  const angle = [-9, 6, -4, 8, -7, 3][i] ?? 0;
  const x = [0, 65, 10, 80, 30, 60][i] ?? 0;
  const y = [0, 30, 130, 180, 280, 340][i] ?? 0;
  const rotate = useTransform(scrollYProgress, [0.1, 0.55], [angle, 0]);
  const tx = useTransform(scrollYProgress, [0.1, 0.55], [x, 20]);
  const ty = useTransform(scrollYProgress, [0.1, 0.55], [y, i * 64]);
  return (
    <motion.div
      style={{ rotate, x: tx, y: ty }}
      className="absolute left-0 top-0 w-[78%] max-w-md rounded-md border border-stone-300/80 bg-white px-5 py-4 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.25)] sm:w-[70%]"
    >
      <div className="flex items-center justify-between text-xs text-stone-400">
        <span className="uppercase tracking-[0.2em]">Document {String(i + 1).padStart(2, "0")}</span>
        <span className="h-1.5 w-1.5 rounded-full bg-stone-300" />
      </div>
      <p className="mt-2 font-serif text-xl text-stone-900" style={{ fontFamily: "Georgia, serif" }}>
        {c.t}
      </p>
      <p className="mt-1 text-sm text-stone-500">{c.s}</p>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  The Mission — paperwork → possibility transform                            */
/* -------------------------------------------------------------------------- */

function TheMission() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const fadeOutPaper = useTransform(scrollYProgress, [0.2, 0.55], [1, 0]);
  const fadeInPath = useTransform(scrollYProgress, [0.35, 0.7], [0, 1]);
  const scalePaper = useTransform(scrollYProgress, [0.2, 0.55], [1, 0.92]);
  const scalePath = useTransform(scrollYProgress, [0.35, 0.7], [1.05, 1]);

  const pillars = [
    { icon: <Compass className="h-4 w-4" />, t: "Student voice, in the plan.", s: "Interests, goals, and self-advocacy shape the pathway — not a template." },
    { icon: <Calendar className="h-4 w-4" />, t: "Action steps families can do.", s: "Monday-morning next steps, not annual abstractions." },
    { icon: <ShieldCheck className="h-4 w-4" />, t: "Tools educators trust.", s: "Built by a teacher who's sat in the PPT chair." },
  ];

  return (
    <section ref={ref} className="relative bg-[#0d0b08] py-28 text-white sm:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-amber-200/80">
            <Sparkles className="h-3 w-3" /> The mission
          </span>
          <SplitHeadline
            words={["From", "paperwork", "→", "to", "possibility."]}
            className="mt-5 text-5xl sm:text-6xl md:text-7xl"
          />
          <p className="mt-6 max-w-xl text-base text-white/70 sm:text-lg">
            Transition Forward exists to move every Connecticut student and family from a folder of forms to a clear, shared pathway.
          </p>
        </div>

        <div className="relative mt-16 grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm">
            <motion.div style={{ opacity: fadeOutPaper, scale: scalePaper }} className="absolute inset-0">
              <img src={paperworkImg} alt="Stack of IEP paperwork" className="h-full w-full object-cover" style={{ objectPosition: "50% 50%" }} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0b08]/80 via-transparent to-[#0d0b08]/20" />
              <div className="absolute bottom-5 left-5 right-5 text-xs uppercase tracking-[0.3em] text-white/70">Before — Paperwork</div>
            </motion.div>
            <motion.div style={{ opacity: fadeInPath, scale: scalePath }} className="absolute inset-0">
              <img src={sunriseImg} alt="A bright pathway forward" className="h-full w-full object-cover" style={{ objectPosition: "50% 55%" }} />
              <div className="absolute inset-0 bg-gradient-to-t from-amber-900/40 via-transparent to-[#0d0b08]/10" />
              <div className="absolute bottom-5 left-5 right-5 text-xs uppercase tracking-[0.3em] text-amber-100">After — Pathway</div>
            </motion.div>
          </div>

          <ul className="space-y-8">
            {pillars.map((p, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <li className="border-l border-amber-200/30 pl-6">
                  <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-amber-200/80">
                    {p.icon} 0{i + 1}
                  </span>
                  <p className="mt-3 font-serif text-2xl leading-snug text-white sm:text-3xl" style={{ fontFamily: "Georgia, serif" }}>
                    {p.t}
                  </p>
                  <p className="mt-2 max-w-md text-white/65">{p.s}</p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Founder-Market Fit — portrait + quote overlay + collage                    */
/* -------------------------------------------------------------------------- */

function FounderFit() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const yPortrait = useParallax(scrollYProgress, [0, 1], -60);
  const yCollage = useParallax(scrollYProgress, [0, 1], 80);
  const yQuote = useParallax(scrollYProgress, [0, 1], -30);

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#f7f3ec] py-28 text-stone-900 sm:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* portrait */}
          <div className="lg:col-span-7">
            <motion.div style={{ y: yPortrait }} className="relative aspect-[4/5] overflow-hidden rounded-sm shadow-[0_40px_80px_-40px_rgba(0,0,0,0.35)]">
              <img
                src={founderImg}
                alt="The founder — a Connecticut special educator"
                className="h-full w-full object-cover"
                style={{ objectPosition: "50% 30%" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/55 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-white">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] opacity-80">Founder</div>
                  <div className="mt-1 font-serif text-2xl" style={{ fontFamily: "Georgia, serif" }}>
                    A Connecticut special educator.
                  </div>
                </div>
                <span className="hidden text-[10px] uppercase tracking-[0.3em] opacity-70 sm:inline">New Haven · Hamden</span>
              </div>
            </motion.div>

            {/* small collage card */}
            <motion.div
              style={{ y: yCollage }}
              className="relative ml-auto -mt-20 hidden w-64 overflow-hidden rounded-sm border border-stone-300 bg-white p-1 shadow-xl sm:block"
            >
              <div className="aspect-[5/4] overflow-hidden">
                <img src={familyImg} alt="A family planning together" className="h-full w-full object-cover" style={{ objectPosition: "50% 40%" }} />
              </div>
              <p className="px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-stone-500">From the kitchen-table conversation</p>
            </motion.div>
          </div>

          {/* quote + fit */}
          <div className="relative lg:col-span-5">
            <motion.div style={{ y: yQuote }}>
              <Quote className="h-8 w-8 text-amber-600" />
              <p
                className="mt-4 font-serif text-3xl leading-[1.15] text-stone-900 sm:text-4xl md:text-[2.6rem]"
                style={{ fontFamily: "Georgia, serif" }}
              >
                "I built this because I'd sat at too many tables where the paperwork was perfect and the path forward still wasn't clear."
              </p>
              <div className="mt-6 h-px w-16 bg-stone-400" />
              <p className="mt-6 max-w-md text-base text-stone-700 sm:text-lg">
                A Black male special educator in Connecticut, with an MBA in systems and an MAT in K–12 Special Education. Years in New Haven and Hamden classrooms — and then the platform those years asked for.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-4 text-xs text-stone-500">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-400">Edu.</div>
                  <div className="mt-1 font-medium text-stone-800">MBA → MAT SPED K–12</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-400">Practice</div>
                  <div className="mt-1 font-medium text-stone-800">New Haven · Hamden</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-400">Focus</div>
                  <div className="mt-1 font-medium text-stone-800">Transition, ages 14–22</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Closing CTA — warm and uncluttered                                         */
/* -------------------------------------------------------------------------- */

function ClosingCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#0d0b08] text-white">
      <motion.div style={{ y }} className="absolute inset-0">
        <img src={ctaImg} alt="A road opening forward" className="h-full w-full object-cover" style={{ objectPosition: "50% 55%" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0b08] via-[#0d0b08]/70 to-[#0d0b08]/40" />
      </motion.div>
      <div className="relative mx-auto max-w-5xl px-5 py-28 text-center sm:px-8 sm:py-36">
        <SplitHeadline
          words={["Walk", "the", "next", "step", "with", "us."]}
          className="text-5xl sm:text-6xl md:text-7xl"
        />
        <Reveal delay={0.3} className="mx-auto mt-6 max-w-xl text-base text-white/75 sm:text-lg">
          Whether you're a family, an educator, a district, or a partner — there's a way in.
        </Reveal>
        <Reveal delay={0.5} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="rounded-full bg-amber-200 px-6 text-stone-900 hover:bg-amber-100">
            <Link to="/platform">Explore TransitionForward <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full border-white/30 bg-white/0 text-white hover:bg-white/10">
            <Link to="/waitlist">Join the waitlist</Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="rounded-full text-white/85 hover:bg-white/10">
            <Link to="/partners">Partner with us</Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="rounded-full text-white/85 hover:bg-white/10">
            <Link to="/demo">Request a demo</Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

function AboutPage() {
  const [introDone, setIntroDone] = useState(false);

  return (
    <SiteShell>
      {!introDone && <Intro onDone={() => setIntroDone(true)} />}
      <article className="bg-[#0d0b08]">
        <CinematicHero />
        <FounderJourney />
        <TheGap />
        <TheMission />
        <FounderFit />
        <ClosingCTA />
      </article>
    </SiteShell>
  );
}
