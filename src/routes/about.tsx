import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useSpring,
  AnimatePresence,
  type MotionValue,
} from "motion/react";
import { ArrowRight, MapPin, Quote } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { HeroCTAs } from "@/components/site/HeroCTAs";
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
import studentPhoto from "@/assets/home-student-photo.jpg";
import collageImg from "@/assets/about-hero-collage.png";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Transition Forward CT" },
      {
        name: "description",
        content:
          "A Connecticut special educator's story behind Transition Forward — from paperwork to possibility.",
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
/*  Intro loader                                                              */
/* -------------------------------------------------------------------------- */

function Intro({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) {
      onDone();
      return;
    }
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [reduce, onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0b0a09]"
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[10px] uppercase tracking-[0.4em] text-white/50"
        >
          Loading the pathway
        </motion.span>
        <div className="relative h-px w-56 overflow-hidden bg-white/10">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.3, ease: "easeInOut" }}
            className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white to-transparent"
          />
        </div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="font-serif text-2xl italic text-white/80"
        >
          Transition Forward
        </motion.span>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero — full-screen cinematic                                              */
/* -------------------------------------------------------------------------- */

function CinematicHero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "30%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.12]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);
  const titleY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-20%"]);

  const labels = [
    { text: "New Haven · CT", top: "18%", left: "6%" },
    { text: "MBA → MAT", top: "26%", right: "8%" },
    { text: "Special Education K–12", bottom: "30%", left: "5%" },
    { text: "Founder · Educator", bottom: "20%", right: "7%" },
  ];

  return (
    <section
      ref={ref}
      className="relative h-[100svh] w-full overflow-hidden bg-[#0b0a09] text-white"
    >
      {/* Background image */}
      <motion.div style={{ y, scale }} className="absolute inset-0">
        <img
          src={heroImg}
          alt="A Connecticut classroom at golden hour"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)]" />
      </motion.div>

      {/* Floating context labels */}
      <motion.div style={{ opacity }} className="absolute inset-0 hidden sm:block">
        {labels.map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.12, duration: 0.6 }}
            className="absolute flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/70"
            style={l as React.CSSProperties}
          >
            <span className="h-px w-6 bg-white/40" />
            {l.text}
          </motion.div>
        ))}
      </motion.div>

      {/* Headline */}
      <motion.div
        style={{ y: titleY, opacity }}
        className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col justify-end px-6 pb-20 sm:pb-28"
      >
        <div className="mb-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-white/60">
          <span className="h-px w-8 bg-white/40" />
          A founder story
          <span className="h-px w-8 bg-white/40" />
        </div>
        <h1 className="font-serif text-[clamp(3rem,11vw,11rem)] font-light leading-[0.88] tracking-tight">
          <SplitReveal text="From paperwork" />
          <span className="block italic text-white/80">
            <SplitReveal text="to possibility." delay={0.25} />
          </span>
        </h1>
        <p className="mt-8 max-w-xl text-base text-white/75 sm:text-lg">
          The story of a Black special educator from Connecticut — and the platform built from
          everything he kept seeing between the binder and the bus.
        </p>
      </motion.div>

      {/* Continue cue */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-white/55"
      >
        <div className="flex flex-col items-center gap-2">
          Scroll
          <motion.span
            animate={reduce ? {} : { y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            className="h-6 w-px bg-white/40"
          />
        </div>
      </motion.div>
    </section>
  );
}

function SplitReveal({ text, delay = 0 }: { text: string; delay?: number }) {
  const words = text.split(" ");
  return (
    <span className="inline-block">
      {words.map((w, i) => (
        <span key={i} className="mr-[0.25em] inline-block overflow-hidden align-bottom">
          <motion.span
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{
              duration: 0.9,
              delay: delay + i * 0.08,
              ease: [0.22, 0.61, 0.36, 1],
            }}
            className="inline-block"
          >
            {w}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pinned scroll-lock guided story                                           */
/* -------------------------------------------------------------------------- */

const CHAPTERS = [
  {
    label: "Chapter 01 · The Binder",
    title: "It started with a binder no one had time to read.",
    body: "Every student arrived with a story compressed into paperwork — IEPs, evaluations, transition pages — sitting in a binder that families and educators didn't have time to decode.",
    image: paperworkImg,
    place: "New Haven, CT",
  },
  {
    label: "Chapter 02 · The Classroom",
    title: "The classroom showed me what the paperwork couldn't.",
    body: "Hamden. New Haven. Student teaching. The plan on the page rarely matched the student in the room — their strengths, their voice, the family at the table.",
    image: classroomImg,
    place: "Hamden, CT",
  },
  {
    label: "Chapter 03 · The Pattern",
    title: "I kept seeing the same gap, in district after district.",
    body: "Paperwork without a path. Brilliant families and educators doing heroic work to translate documents into next steps that should have been obvious.",
    image: familyImg,
    place: "Connecticut",
  },
  {
    label: "Chapter 04 · The Build",
    title: "So I built what the binder was missing.",
    body: "Transition Forward turns the paperwork into a plan — a Pathway Report families, educators, and partners can actually use together.",
    image: pathwayImg,
    place: "Transition Forward",
  },
];

function PinnedStory() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const [active, setActive] = useState(0);

  useEffect(() => {
    return scrollYProgress.on("change", (v) => {
      const idx = Math.min(CHAPTERS.length - 1, Math.floor(v * CHAPTERS.length));
      setActive(idx);
    });
  }, [scrollYProgress]);

  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  const progressWidth = useTransform(progress, [0, 1], ["0%", "100%"]);

  if (reduce) {
    return (
      <section className="bg-[#0b0a09] text-white">
        <div className="mx-auto max-w-5xl px-6 py-20 space-y-16">
          {CHAPTERS.map((c, i) => (
            <article key={i} className="space-y-4">
              <div className="text-[10px] uppercase tracking-[0.4em] text-white/50">{c.label}</div>
              <h3 className="font-serif text-3xl">{c.title}</h3>
              <p className="text-white/70">{c.body}</p>
              <img src={c.image} alt="" className="aspect-[16/9] w-full rounded-2xl object-cover" />
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative bg-[#0b0a09] text-white" style={{ height: "400vh" }}>
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        {/* Background image crossfade */}
        <div className="absolute inset-0">
          <AnimatePresence>
            <motion.img
              key={active}
              src={CHAPTERS[active].image}
              alt=""
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: [0.22, 0.61, 0.36, 1] }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        </div>

        {/* Top progress bar */}
        <div className="absolute left-0 right-0 top-0 z-20">
          <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-6 py-5 text-[10px] uppercase tracking-[0.4em] text-white/60">
            <span>The Story</span>
            <div className="relative h-px flex-1 bg-white/15">
              <motion.div style={{ width: progressWidth }} className="absolute inset-y-0 bg-white" />
            </div>
            <span>
              0{active + 1} / 0{CHAPTERS.length}
            </span>
          </div>
        </div>

        {/* Chapter text */}
        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6">
          <div className="max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
              >
                <div className="mb-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-white/60">
                  <span className="h-px w-6 bg-white/40" />
                  {CHAPTERS[active].label}
                </div>
                <h3 className="font-serif text-[clamp(2rem,5.5vw,4.5rem)] font-light leading-[1.02]">
                  {CHAPTERS[active].title}
                </h3>
                <p className="mt-6 max-w-xl text-base text-white/80 sm:text-lg">
                  {CHAPTERS[active].body}
                </p>
                <div className="mt-6 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-white/60">
                  <MapPin className="h-3 w-3" />
                  {CHAPTERS[active].place}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Founder message                                                            */
/* -------------------------------------------------------------------------- */

function FounderMessage() {
  return (
    <section className="relative overflow-hidden bg-[#f4ede3] text-[#1c1814]">
      <img
        src={topoImg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-10"
      />
      <div className="relative mx-auto grid max-w-[1300px] gap-12 px-6 py-24 md:grid-cols-[5fr_6fr] md:gap-20 md:py-32">
        <div className="relative">
          <div className="aspect-[4/5] overflow-hidden rounded-[2rem] bg-black/5">
            <motion.img
              initial={{ scale: 1.1 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 1.4, ease: [0.22, 0.61, 0.36, 1] }}
              src={founderImg}
              alt="The founder — a Connecticut special educator"
              className="h-full w-full object-cover object-[50%_30%]"
            />
          </div>
          <div className="absolute -bottom-4 left-6 rounded-full bg-[#1c1814] px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-[#f4ede3] shadow-lg">
            Founder · Educator
          </div>
        </div>
        <div className="flex flex-col justify-center">
          <div className="mb-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-[#1c1814]/60">
            <span className="h-px w-8 bg-[#1c1814]/30" />
            Message from the founder
          </div>
          <h2 className="font-serif text-[clamp(2rem,4.6vw,3.6rem)] font-light leading-[1.05]">
            I built this from the chair I sat in —
            <span className="italic"> between the family and the binder.</span>
          </h2>
          <p className="mt-6 text-base text-[#1c1814]/80 sm:text-lg">
            I'm a Black special educator from Connecticut. MBA, then MAT in Special Education K–12.
            New Haven Public Schools. Hamden. Student teaching across grade bands. Every meeting,
            the same gap — paperwork on the table, possibility just out of reach.
          </p>
          <p className="mt-4 text-base text-[#1c1814]/80 sm:text-lg">
            Transition Forward is the thing I kept reaching for and never had.
          </p>
          <div className="mt-10 flex items-end gap-5">
            <span className="font-serif text-3xl italic tracking-tight text-[#1c1814]/90">
              — The Founder
            </span>
            <span className="mb-1 h-px flex-1 bg-[#1c1814]/20" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Image mosaic with captions + quote overlay                                */
/* -------------------------------------------------------------------------- */

type Tile = {
  src: string;
  caption: string;
  span: string;
  offset?: string;
  ratio?: string;
};

const TILES: Tile[] = [
  { src: studentCenter, caption: "New Haven, CT", span: "md:col-span-5 md:row-span-2", ratio: "aspect-[4/5]" },
  { src: classroomImg, caption: "Hamden, CT", span: "md:col-span-4", offset: "md:mt-12", ratio: "aspect-[4/3]" },
  { src: studentPhoto, caption: "Student voice", span: "md:col-span-3", ratio: "aspect-square" },
  { src: paperworkImg, caption: "Paperwork → possibility", span: "md:col-span-4", offset: "md:-mt-8", ratio: "aspect-[4/3]" },
  { src: familyImg, caption: "Family meeting prep", span: "md:col-span-3", ratio: "aspect-[4/5]" },
];

function MosaicStory() {
  return (
    <section className="relative overflow-hidden bg-[#0b0a09] py-24 text-white sm:py-32">
      <div className="mx-auto max-w-[1500px] px-6">
        <div className="mb-16 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 text-[10px] uppercase tracking-[0.4em] text-white/50">
              Field notes
            </div>
            <h2 className="font-serif text-[clamp(2rem,5vw,4rem)] font-light leading-[1]">
              Classroom <span className="italic text-white/70">to</span> systems.
            </h2>
          </div>
          <p className="max-w-sm text-sm text-white/60">
            A scrapbook from the districts, meetings, and moments that shaped the platform.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          {TILES.map((t, i) => (
            <motion.figure
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.9, delay: i * 0.08, ease: [0.22, 0.61, 0.36, 1] }}
              className={cn("group relative", t.span, t.offset)}
            >
              <div className={cn("overflow-hidden rounded-2xl bg-white/5", t.ratio ?? "aspect-[4/3]")}>
                <img
                  src={t.src}
                  alt={t.caption}
                  className="h-full w-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(.22,.61,.36,1)] group-hover:scale-[1.04]"
                />
              </div>
              <figcaption className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/60">
                <span className="h-px w-4 bg-white/30" />
                {t.caption}
              </figcaption>
            </motion.figure>
          ))}
        </div>

        {/* Quote overlay */}
        <motion.blockquote
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
          className="relative mx-auto mt-24 max-w-4xl text-center"
        >
          <Quote className="mx-auto mb-6 h-8 w-8 text-white/30" />
          <p className="font-serif text-[clamp(1.6rem,3.4vw,2.8rem)] font-light leading-[1.18]">
            "Transition Forward was built from what I kept seeing
            <span className="italic"> between the paperwork and the people </span>
            who needed it most."
          </p>
          <div className="mt-8 text-[10px] uppercase tracking-[0.4em] text-white/50">
            — The Founder
          </div>
        </motion.blockquote>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Split-headline word sections                                              */
/* -------------------------------------------------------------------------- */

const SPLITS = [
  {
    a: "Paperwork",
    b: "Possibility",
    body: "Every IEP, evaluation, and transition page becomes one Pathway Report — clear, sharable, actionable.",
  },
  {
    a: "Classroom",
    b: "Systems",
    body: "Lived district experience baked into the workflow. The tool doesn't fight the meeting — it leads it.",
  },
  {
    a: "Student",
    b: "Voice",
    body: "Strengths and goals from the student themselves, not just the binder. The plan starts with them.",
  },
  {
    a: "Plan",
    b: "Action",
    body: "Next steps with owners, dates, and partners — so the meeting becomes momentum.",
  },
];

function SplitHeadlines() {
  return (
    <section className="bg-[#f4ede3] text-[#1c1814]">
      <div className="mx-auto max-w-[1400px] divide-y divide-[#1c1814]/15 px-6">
        {SPLITS.map((s, i) => (
          <SplitRow key={i} {...s} index={i} />
        ))}
      </div>
    </section>
  );
}

function SplitRow({ a, b, body, index }: { a: string; b: string; body: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const xA = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-6%", "6%"]);
  const xB = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["6%", "-6%"]);

  return (
    <div ref={ref} className="grid items-center gap-6 py-14 md:grid-cols-[1fr_auto_1fr] md:gap-10 md:py-20">
      <motion.div style={{ x: xA }} className="text-left">
        <span className="text-[10px] uppercase tracking-[0.4em] text-[#1c1814]/50">
          0{index + 1} · From
        </span>
        <div className="font-serif text-[clamp(2.4rem,8vw,7rem)] font-light leading-[0.9] tracking-tight">
          {a}
        </div>
      </motion.div>
      <div className="hidden max-w-xs text-center text-sm text-[#1c1814]/70 md:block">{body}</div>
      <motion.div style={{ x: xB }} className="text-right">
        <span className="text-[10px] uppercase tracking-[0.4em] text-[#1c1814]/50">To</span>
        <div className="font-serif text-[clamp(2.4rem,8vw,7rem)] font-light italic leading-[0.9] tracking-tight">
          {b}
        </div>
      </motion.div>
      <p className="text-sm text-[#1c1814]/70 md:hidden">{body}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Journey timeline as a moving pathway                                       */
/* -------------------------------------------------------------------------- */

const JOURNEY = [
  { year: "Then", title: "MBA", note: "Systems thinking — built for orgs, not students." },
  { year: "→", title: "MAT · Special Education K–12", note: "From boardrooms to IEP meetings." },
  { year: "→", title: "Student teaching", note: "Across grade bands, across CT." },
  { year: "→", title: "New Haven Public Schools", note: "Inside the binder. Inside the meeting." },
  { year: "→", title: "Hamden Public Schools", note: "Same patterns. Same gaps. Same families fighting through them." },
  { year: "Now", title: "Transition Forward begins", note: "A pathway, not a packet." },
];

function JourneyPath() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const pathLength = useSpring(scrollYProgress, { stiffness: 80, damping: 22 });

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#0b0a09] py-24 text-white sm:py-32">
      <img src={sunriseImg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b0a09]/70 via-[#0b0a09]/40 to-[#0b0a09]" />

      <div className="relative mx-auto max-w-[1400px] px-6">
        <div className="mb-20 max-w-2xl">
          <div className="mb-4 text-[10px] uppercase tracking-[0.4em] text-white/50">
            The Journey
          </div>
          <h2 className="font-serif text-[clamp(2rem,5vw,4rem)] font-light leading-[1]">
            A path traced through Connecticut classrooms.
          </h2>
        </div>

        <div className="relative">
          {/* Animated pathway line */}
          <svg
            className="pointer-events-none absolute left-6 top-0 hidden h-full w-12 md:block"
            viewBox="0 0 40 1000"
            preserveAspectRatio="none"
          >
            <motion.path
              d="M 20 0 C 0 200, 40 350, 20 500 C 0 650, 40 800, 20 1000"
              fill="none"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="2"
              strokeDasharray="4 6"
              style={{ pathLength: reduce ? 1 : pathLength }}
            />
          </svg>

          <ol className="space-y-12 md:space-y-20 md:pl-24">
            {JOURNEY.map((j, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-15%" }}
                transition={{ duration: 0.8, delay: i * 0.05, ease: [0.22, 0.61, 0.36, 1] }}
                className="relative grid grid-cols-[auto_1fr] items-baseline gap-6 md:gap-10"
              >
                <span className="font-serif text-2xl italic text-white/50 md:text-3xl">
                  {j.year}
                </span>
                <div>
                  <h3 className="font-serif text-2xl font-light leading-tight md:text-4xl">
                    {j.title}
                  </h3>
                  <p className="mt-2 text-sm text-white/65 md:text-base">{j.note}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Transformation — scattered → pathway                                       */
/* -------------------------------------------------------------------------- */

const FRAGMENTS = [
  { label: "IEP paperwork", rot: -8, x: -120, y: -60 },
  { label: "Student strengths", rot: 6, x: 80, y: -100 },
  { label: "Family priorities", rot: -4, x: -180, y: 40 },
  { label: "Educator input", rot: 10, x: 140, y: 60 },
  { label: "Resources", rot: -12, x: -60, y: 120 },
  { label: "Action items", rot: 5, x: 180, y: 140 },
];

function Transformation() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-[#f4ede3] py-28 text-[#1c1814] sm:py-36"
    >
      <div className="mx-auto max-w-[1300px] px-6">
        <div className="mx-auto mb-20 max-w-2xl text-center">
          <div className="mb-4 text-[10px] uppercase tracking-[0.4em] text-[#1c1814]/50">
            The transformation
          </div>
          <h2 className="font-serif text-[clamp(2rem,5vw,4rem)] font-light leading-[1.02]">
            Scattered documents <span className="italic">become</span> a clear pathway.
          </h2>
        </div>

        <div className="relative mx-auto h-[520px] w-full max-w-3xl">
          {FRAGMENTS.map((f, i) => (
            <FragmentCard key={i} fragment={f} index={i} progress={scrollYProgress} reduce={!!reduce} />
          ))}
          {/* Pathway Report — solidifies */}
          <motion.div
            style={{
              opacity: useTransform(scrollYProgress, [0.5, 0.8], [0, 1]),
              scale: useTransform(scrollYProgress, [0.5, 0.8], [0.85, 1]),
            }}
            className="absolute left-1/2 top-1/2 w-[min(420px,90%)] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="overflow-hidden rounded-2xl border border-[#1c1814]/15 bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)]">
              <img src={dashboardImg} alt="The Pathway Report" className="aspect-[16/10] w-full object-cover" />
              <div className="flex items-center justify-between border-t border-[#1c1814]/10 px-5 py-3 text-[10px] uppercase tracking-[0.3em] text-[#1c1814]/70">
                <span>Pathway Report</span>
                <span>Ready</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Closing cinematic CTA                                                      */
/* -------------------------------------------------------------------------- */

function ClosingCTA() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-15%", "15%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.1, 1]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#0b0a09] text-white">
      <motion.div style={{ y, scale }} className="absolute inset-0">
        <img src={ctaImg} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0a09]/85 via-[#0b0a09]/55 to-[#0b0a09]" />
      </motion.div>

      <div className="relative mx-auto flex min-h-[90svh] max-w-[1300px] flex-col items-center justify-center px-6 py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.8 }}
          className="mb-6 text-[10px] uppercase tracking-[0.4em] text-white/60"
        >
          Continue the pathway
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 1, delay: 0.1 }}
          className="font-serif text-[clamp(2.4rem,7vw,6rem)] font-light leading-[0.95]"
        >
          The story keeps going.
          <span className="block italic text-white/75">Walk it with us.</span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-12 w-full max-w-3xl"
        >
          <HeroCTAs align="center">
            <Link to="/platform">
              <Button size="lg" className="inline-flex w-full items-center justify-center gap-2">
                Explore Transition Forward <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/waitlist">
              <Button size="lg" variant="outline" className="inline-flex w-full items-center justify-center border-white/30 bg-white/5 text-white hover:bg-white/10">
                Join the Waitlist
              </Button>
            </Link>
            <Link to="/partners">
              <Button size="lg" variant="outline" className="inline-flex w-full items-center justify-center border-white/30 bg-white/5 text-white hover:bg-white/10">
                Partner With Us
              </Button>
            </Link>
            <Link to="/demo">
              <Button size="lg" variant="outline" className="inline-flex w-full items-center justify-center border-white/30 bg-white/5 text-white hover:bg-white/10">
                Request a Demo
              </Button>
            </Link>
          </HeroCTAs>
        </motion.div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

function AboutPage() {
  const [introDone, setIntroDone] = useState(false);
  // touch unused collage import so it's tree-shaken cleanly without warning
  void collageImg;

  return (
    <SiteShell>
      <AnimatePresence>{!introDone && <Intro onDone={() => setIntroDone(true)} />}</AnimatePresence>
      <article className="bg-[#0b0a09]">
        <CinematicHero />
        <PinnedStory />
        <FounderMessage />
        <MosaicStory />
        <SplitHeadlines />
        <JourneyPath />
        <Transformation />
        <ClosingCTA />
      </article>
    </SiteShell>
  );
}
