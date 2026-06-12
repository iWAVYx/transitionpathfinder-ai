import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
  AnimatePresence,
} from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
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
          "Why Transition Forward CT exists — a kinetic, typographic story about turning IEP paperwork into possibility for Connecticut families.",
      },
      { property: "og:title", content: "About — Transition Forward CT" },
      {
        property: "og:description",
        content:
          "A typographic manifesto: why we built Transition Forward CT for Connecticut families and educators.",
      },
    ],
  }),
  component: AboutPage,
});

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

function useReveal() {
  const reduced = useReducedMotion();
  return {
    initial: reduced ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-10% 0px" },
    transition: { duration: 0.8, ease: [0.22, 0.61, 0.36, 1] as const },
  };
}

/** Per-word reveal — typography is the hero. */
function Kinetic({
  text,
  className,
  delay = 0,
  stagger = 0.06,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const reduced = useReducedMotion();
  const words = text.split(" ");
  if (reduced) return <span className={className}>{text}</span>;
  return (
    <span className={cn("inline-block", className)} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-baseline pr-[0.25em]">
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

function SectionLabel({ index, label }: { index: string; label: string }) {
  const r = useReveal();
  return (
    <motion.div
      {...r}
      className="mb-10 flex items-center gap-4 font-mono text-[0.7rem] uppercase tracking-[0.32em] text-muted-foreground"
    >
      <span className="tabular-nums">{index}</span>
      <span className="h-px w-10 bg-foreground/30" />
      <span>{label}</span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero — kinetic manifesto                                            */
/* ------------------------------------------------------------------ */

function Hero() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 0.15], [0, -80]);
  const opacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  return (
    <section className="relative flex min-h-[92vh] flex-col justify-center px-6 pb-32 pt-40 sm:px-12 lg:px-24">
      <motion.div style={{ y, opacity }} className="max-w-6xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="mb-12 flex items-center gap-4 font-mono text-[0.7rem] uppercase tracking-[0.32em] text-muted-foreground"
        >
          <span className="tabular-nums">00 / About</span>
          <span className="h-px w-16 bg-foreground/30" />
          <span>A Manifesto</span>
        </motion.div>

        <h1 className="font-display text-[clamp(3rem,10vw,9rem)] font-medium leading-[0.92] tracking-tight">
          <Kinetic text="Paperwork" />
          <br />
          <span className="italic text-muted-foreground">
            <Kinetic text="becomes" delay={0.15} />
          </span>{" "}
          <Kinetic text="possibility." delay={0.3} />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="mt-12 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
        >
          We built Transition Forward CT for the Connecticut families and educators
          carrying the weight of transition planning — alone, after-hours, and
          unsure where to start.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.6 }}
          className="mt-12 flex flex-wrap items-center gap-4"
        >
          <Button asChild size="lg">
            <Link to="/framework">
              See the framework
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to="/contact">Talk to us</Link>
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2 }}
        className="absolute bottom-10 left-6 right-6 flex items-end justify-between sm:left-12 sm:right-12 lg:left-24 lg:right-24"
      >
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.32em] text-muted-foreground">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="h-12 w-px bg-foreground/40"
        />
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Marquee — single rotating statement                                 */
/* ------------------------------------------------------------------ */

function Marquee() {
  const reduced = useReducedMotion();
  const phrase = "Built in Connecticut · For Connecticut · ";
  const row = phrase.repeat(6);
  return (
    <section className="overflow-hidden border-y border-border/60 py-10">
      <motion.div
        className="whitespace-nowrap font-display text-[clamp(2.5rem,7vw,5.5rem)] font-medium tracking-tight"
        animate={reduced ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        <span className="text-muted-foreground/40">{row}</span>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The Letter — typographic founder note                                */
/* ------------------------------------------------------------------ */

function Letter() {
  const paragraphs = [
    "I watched families show up to transition meetings exhausted — binders heavy, questions unanswered, the system speaking a language no one had taught them.",
    "And I watched educators care deeply, then drown in paperwork that ate the time meant for students.",
    "So we built a quieter way. One plan. One thread. One place where everyone — student, family, teacher, partner — can finally see the same horizon.",
  ];

  return (
    <section id="letter" className="px-6 py-32 sm:px-12 lg:px-24">
      <SectionLabel index="01" label="The Letter" />
      <div className="grid gap-16 lg:grid-cols-[1fr_2fr]">
        <motion.div {...useReveal()} className="font-mono text-sm uppercase tracking-[0.2em] text-muted-foreground">
          From the founder
        </motion.div>
        <div className="max-w-3xl space-y-10">
          {paragraphs.map((p, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15% 0px" }}
              transition={{ duration: 0.9, delay: i * 0.15, ease: [0.22, 0.61, 0.36, 1] }}
              className="font-display text-[clamp(1.5rem,3vw,2.4rem)] font-normal leading-[1.25] tracking-tight"
            >
              {p}
            </motion.p>
          ))}
          <motion.div {...useReveal()} className="pt-6 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            — The team behind Transition Forward CT
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Counter strip — quiet stats                                         */
/* ------------------------------------------------------------------ */

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [n, setN] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      setN(to);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          const start = performance.now();
          const dur = 1600;
          const tick = (t: number) => {
            const p = Math.min(1, (t - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            setN(Math.round(to * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, reduced]);
  return (
    <span ref={ref} className="tabular-nums">
      {n}
      {suffix}
    </span>
  );
}

function Stats() {
  const items = [
    { n: 169, suffix: "", label: "CT towns served" },
    { n: 22, suffix: "+", label: "Transition years, ages 14–22" },
    { n: 1, suffix: "", label: "Plan, one source of truth" },
  ];
  return (
    <section className="border-y border-border/60 px-6 py-20 sm:px-12 lg:px-24">
      <div className="grid gap-16 sm:grid-cols-3">
        {items.map((it, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: i * 0.1 }}
          >
            <div className="font-display text-[clamp(3rem,8vw,6rem)] font-medium leading-none tracking-tight">
              <CountUp to={it.n} suffix={it.suffix} />
            </div>
            <div className="mt-4 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
              {it.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Chapters — sticky scroll narrative                                  */
/* ------------------------------------------------------------------ */

const CHAPTERS = [
  {
    n: "I",
    title: "The Quiet Problem",
    body: "Transition planning is fragmented across documents, agencies, and meetings. Families translate. Educators duplicate. Students wait.",
  },
  {
    n: "II",
    title: "The Single Thread",
    body: "We stitched the timeline together. One plan that travels with the student — from 14 to 22, from school to adulthood.",
  },
  {
    n: "III",
    title: "The Shared Room",
    body: "Families, teachers, and partners working from the same page, in plain language, with the student's voice at the center.",
  },
  {
    n: "IV",
    title: "The Forward Motion",
    body: "Less paperwork. More possibility. A platform that gives back the hours transition planning was quietly taking.",
  },
];

function Chapters() {
  return (
    <section id="journey" className="px-6 py-32 sm:px-12 lg:px-24">
      <SectionLabel index="02" label="The Journey" />
      <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <h2 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[0.95] tracking-tight">
            <Kinetic text="Four" />
            <br />
            <span className="italic text-muted-foreground">
              <Kinetic text="movements." delay={0.1} />
            </span>
          </h2>
        </div>
        <ol className="space-y-24">
          {CHAPTERS.map((c, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15% 0px" }}
              transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
              className="grid grid-cols-[auto_1fr] gap-8 border-t border-border/60 pt-10"
            >
              <div className="font-display text-2xl text-muted-foreground tabular-nums">
                {c.n}
              </div>
              <div>
                <h3 className="font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-medium leading-tight tracking-tight">
                  {c.title}
                </h3>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {c.body}
                </p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Values — interactive list                                           */
/* ------------------------------------------------------------------ */

const VALUES = [
  { word: "Plain", detail: "We translate the system. No jargon, no gatekeeping." },
  { word: "Patient", detail: "Transition is a five-year arc, not a one-meeting sprint." },
  { word: "Private", detail: "Student data stays scoped, encrypted, and consented." },
  { word: "Practical", detail: "Every feature ships only if it saves a real hour." },
  { word: "Present", detail: "Built in Connecticut, for Connecticut, with families in the room." },
];

function Values() {
  const [active, setActive] = useState<number | null>(null);
  return (
    <section id="values" className="border-t border-border/60 px-6 py-32 sm:px-12 lg:px-24">
      <SectionLabel index="03" label="What We Stand For" />
      <ul className="divide-y divide-border/60">
        {VALUES.map((v, i) => {
          const isActive = active === i;
          return (
            <li key={i}>
              <button
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="group flex w-full items-center justify-between gap-8 py-8 text-left transition-colors"
              >
                <span className="flex items-baseline gap-6">
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    0{i + 1}
                  </span>
                  <span
                    className={cn(
                      "font-display text-[clamp(2rem,6vw,4.5rem)] font-medium leading-none tracking-tight transition-all duration-500",
                      isActive ? "italic translate-x-2" : "",
                    )}
                  >
                    {v.word}.
                  </span>
                </span>
                <ArrowUpRight
                  className={cn(
                    "h-6 w-6 shrink-0 text-muted-foreground transition-all duration-500",
                    isActive ? "rotate-45 text-foreground" : "",
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {isActive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="pb-8 pl-16 text-base text-muted-foreground sm:text-lg">
                      {v.detail}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Closing — oversized pull quote + CTA                                */
/* ------------------------------------------------------------------ */

function Closing() {
  const { scrollYProgress } = useScroll();
  const spring = useSpring(scrollYProgress, { stiffness: 80, damping: 20 });
  const x = useTransform(spring, [0.7, 1], ["-5%", "0%"]);

  return (
    <section className="border-t border-border/60 px-6 py-40 sm:px-12 lg:px-24">
      <SectionLabel index="04" label="The Invitation" />
      <motion.blockquote
        style={{ x }}
        className="max-w-6xl font-display text-[clamp(2.5rem,8vw,7rem)] font-medium leading-[0.95] tracking-tight"
      >
        <Kinetic text="If transition" />
        <br />
        <Kinetic text="planning feels" delay={0.1} />
        <br />
        <span className="italic text-muted-foreground">
          <Kinetic text="heavy" delay={0.2} />
        </span>{" "}
        <Kinetic text="—" delay={0.3} />
        <br />
        <Kinetic text="we built this" delay={0.4} />
        <br />
        <Kinetic text="for you." delay={0.5} />
      </motion.blockquote>

      <motion.div
        {...useReveal()}
        className="mt-20 flex flex-wrap items-center gap-4"
      >
        <Button asChild size="lg">
          <Link to="/families">
            For families
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link to="/educators">For educators</Link>
        </Button>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Reading progress rail                                                */
/* ------------------------------------------------------------------ */

function ProgressRail() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  return (
    <motion.div
      style={{ scaleX, transformOrigin: "0% 50%" }}
      className="fixed left-0 right-0 top-0 z-40 h-[2px] bg-foreground/80"
      aria-hidden
    />
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

function AboutPage() {
  return (
    <SiteShell>
      <ProgressRail />
      <main className="bg-background text-foreground">
        <Hero />
        <Marquee />
        <Letter />
        <Stats />
        <Chapters />
        <Values />
        <Closing />
      </main>
    </SiteShell>
  );
}
