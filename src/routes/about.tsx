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
import { ArrowRight, MapPin } from "lucide-react";
import { toTitleCase } from "@/lib/title-case";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";

// Imagery — reused project assets, cropped via aspect wrappers per project rules.
import heroImgAsset from "@/assets/raising-hands-class.png.asset.json";
const heroImg = heroImgAsset.url;
import studentCenter from "@/assets/about-student-center.jpg";
import founderImg from "@/assets/home-educator.jpg";
import paperworkImg from "@/assets/iep-upload.jpg";
import classroomImg from "@/assets/educators-hero-v2.jpg";
import familyImg from "@/assets/families-hero-v2.jpg";
import pathwayImg from "@/assets/pathway-hero.jpg";
import dashboardImg from "@/assets/dashboard-hero.jpg";
import ctaImgAsset from "@/assets/school-crossing.png.asset.json";
import stickyNotesBgAsset from "@/assets/sticky-notes-bg.png.asset.json";
const ctaImg = ctaImgAsset.url;
const stickyNotesBg = stickyNotesBgAsset.url;
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

      {/* Headline */}
      <motion.div
        style={{ y: titleY, opacity }}
        className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col justify-end px-4 pb-10 pt-16 sm:justify-start sm:px-6 sm:pb-12 sm:pt-20"
      >
        <div className="mb-3 flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-white/60 sm:mb-6">
          <span className="h-px w-8 bg-white/40" />
          A founder story
          <span className="h-px w-8 bg-white/40" />
        </div>
        <h1 className="font-serif text-[clamp(2.8rem,10vw,10rem)] font-light leading-[0.95] tracking-tight">
          <SplitReveal text="From paperwork" />
          <span className="block italic text-white/80">
            <SplitReveal text="to possibility." delay={0.25} />
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-white/75 sm:mt-8 sm:text-lg">
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
        <span key={i} className="mr-[0.25em] inline-block overflow-hidden pb-[0.18em] align-bottom">
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
    <section ref={ref} className="relative bg-[#0b0a09] text-white" style={{ height: "250vh" }}>
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
      <div className="relative mx-auto grid max-w-[1300px] gap-12 px-6 py-16 md:grid-cols-[5fr_6fr] md:gap-20 md:py-20">
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


/* -------------------------------------------------------------------------- */
/*  Split-headline word sections                                              */
/* -------------------------------------------------------------------------- */


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

// Squiggly path that weaves edge-to-edge through the entire Journey section.
// viewBox is intentionally tall; preserveAspectRatio="none" stretches it to the
// section so the curve fills the whole background regardless of breakpoint.
const SQUIGGLE_D =
  "M -40 60 C 200 20, 320 220, 540 180 S 880 60, 1040 200 S 820 460, 560 440 S 160 520, 80 720 S 380 900, 640 860 S 980 980, 880 1180 S 420 1280, 240 1140 S -80 1320, 60 1480";

function JourneyPath() {
  const ref = useRef<HTMLElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 22 });
  const pathLength = useTransform(progress, (v) => (reduce ? 1 : v));

  // Sample (x, y, angle) along the path so the arrow rides the squiggle.
  const [len, setLen] = useState(0);
  useEffect(() => {
    if (pathRef.current) setLen(pathRef.current.getTotalLength());
  }, []);

  const arrowX = useTransform(progress, (v) => {
    const p = pathRef.current;
    if (!p || !len) return -100;
    return p.getPointAtLength(Math.max(0.01, v) * len).x;
  });
  const arrowY = useTransform(progress, (v) => {
    const p = pathRef.current;
    if (!p || !len) return -100;
    return p.getPointAtLength(Math.max(0.01, v) * len).y;
  });
  const arrowR = useTransform(progress, (v) => {
    const p = pathRef.current;
    if (!p || !len) return 0;
    const t = Math.max(0.01, v) * len;
    const a = p.getPointAtLength(Math.max(0, t - 1));
    const b = p.getPointAtLength(Math.min(len, t + 1));
    return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  });

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#0b0a09] py-16 text-white md:py-20">
      <img src={sunriseImg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b0a09]/70 via-[#0b0a09]/40 to-[#0b0a09]" />

      {/* Full-background squiggly pathway with a traveling arrow. */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1000 1500"
        preserveAspectRatio="none"
        aria-hidden
      >
        {/* faint full trail */}
        <path
          d={SQUIGGLE_D}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="2"
          strokeDasharray="4 8"
          vectorEffect="non-scaling-stroke"
        />
        {/* progress trail drawn by scroll */}
        <motion.path
          ref={pathRef}
          d={SQUIGGLE_D}
          fill="none"
          stroke="rgba(255,220,160,0.85)"
          strokeWidth="2.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ pathLength }}
        />
        {/* traveling arrow head */}
        <motion.g style={{ x: arrowX, y: arrowY, rotate: arrowR }}>
          <circle r="14" fill="rgba(255,220,160,0.18)" />
          <circle r="6" fill="#ffd9a0" />
          <path d="M 2 -7 L 16 0 L 2 7 Z" fill="#ffd9a0" />
        </motion.g>
      </svg>

      <div className="relative mx-auto max-w-[1400px] px-6">
        <div className="mb-12 max-w-2xl">
          <div className="mb-4 text-[10px] uppercase tracking-[0.4em] text-white/50">
            The Journey
          </div>
          <h2 className="font-serif text-[clamp(2rem,5vw,4rem)] font-light leading-[1]">
            A path traced through Connecticut classrooms.
          </h2>
        </div>

        <div className="relative">
          <ol className="space-y-12 md:space-y-20">
            {JOURNEY.map((j, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-15%" }}
                transition={{ duration: 0.8, delay: i * 0.05, ease: [0.22, 0.61, 0.36, 1] }}
                className={`relative grid grid-cols-[auto_1fr] items-baseline gap-6 md:gap-10 ${
                  i % 2 === 1 ? "md:ml-auto md:max-w-[60%] md:text-right" : "md:max-w-[60%]"
                }`}
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
  { label: toTitleCase("IEP paperwork"), rot: -10, x: -340, y: 60, color: "#fff48a", pin: "#e23b3b" },
  { label: toTitleCase("Student strengths"), rot: 8, x: 340, y: 60, color: "#ffb3c1", pin: "#2b6cb0" },
  { label: toTitleCase("Family priorities"), rot: -5, x: -360, y: 240, color: "#a8e6cf", pin: "#d97706" },
  { label: toTitleCase("Educator input"), rot: 11, x: 360, y: 240, color: "#b5d8ff", pin: "#7c3aed" },
  { label: toTitleCase("Resources"), rot: -12, x: -210, y: 420, color: "#ffd59e", pin: "#0f766e" },
  { label: toTitleCase("Action items"), rot: 6, x: 210, y: 420, color: "#e0bbff", pin: "#be185d" },
];

function useScatterScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setScale(0.32);
      else if (w < 1024) setScale(0.55);
      else setScale(1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return scale;
}

function FragmentCard({
  fragment,
  index,
  progress,
  reduce,
}: {
  fragment: (typeof FRAGMENTS)[number];
  index: number;
  progress: MotionValue<number>;
  reduce: boolean;
}) {
  const scatterScale = useScatterScale();
  // Fragments stay scattered while the headline reads, converge slowly through
  // the middle of the pin, then dim as the Pathway Report takes the stage.
  const p = useTransform(progress, [0.1, 0.4], [0, 1]);
  const x = useTransform(p, [0, 1], [reduce ? 0 : fragment.x * scatterScale, 0]);
  const y = useTransform(p, [0, 1], [reduce ? 0 : (fragment.y - 160) * scatterScale, index * 12 - 30]);
  const rot = useTransform(p, [0, 1], [reduce ? 0 : fragment.rot * Math.min(scatterScale * 1.4, 1), 0]);
  const opacity = useTransform(p, [0, 0.75, 1], [1, 1, 0.12]);

  // Pin falls out, staggered per card, once the notes have settled.
  const fallStart = 0.5 + index * 0.03;
  const fallEnd = fallStart + 0.18;
  const pinY = useTransform(progress, [fallStart, fallEnd], [0, reduce ? 0 : 480]);
  const pinRot = useTransform(progress, [fallStart, fallEnd], [0, reduce ? 0 : (index % 2 === 0 ? 220 : -240)]);
  const pinX = useTransform(progress, [fallStart, fallEnd], [0, reduce ? 0 : (index % 2 === 0 ? 28 : -34)]);
  const pinOpacity = useTransform(progress, [fallStart, fallEnd - 0.02, fallEnd], [1, 1, 0]);

  // Subtle 3D tilt — reduced on smaller screens
  const tiltScale = Math.min(scatterScale * 1.5, 1);
  const tiltX = (index % 2 === 0 ? 1 : -1) * 6 * tiltScale;
  const tiltY = (index % 3 === 0 ? -1 : 1) * 8 * tiltScale;
  return (
    <motion.div
      style={{
        x,
        y,
        rotate: rot,
        rotateX: tiltX,
        rotateY: tiltY,
        opacity,
        backgroundColor: fragment.color,
        transformPerspective: 1000,
        transformStyle: "preserve-3d",
        boxShadow:
          "0 18px 24px -8px rgba(0,0,0,0.30), 0 4px 8px -2px rgba(0,0,0,0.18), inset 0 -10px 16px -12px rgba(0,0,0,0.18)",
      }}
      className="absolute left-1/2 top-1/2 flex h-[170px] w-[210px] -translate-x-1/2 -translate-y-1/2 items-center justify-center px-4 py-4 text-center font-serif text-sm font-medium leading-snug text-[#1c1814]/85 sm:h-[210px] sm:w-[260px] sm:px-5 sm:py-5 sm:text-base sm:leading-snug md:h-[250px] md:w-[310px] md:py-6 md:text-lg"
    >
      <span className="relative z-10">{fragment.label}</span>
      {/* Pushpin — sits above the note, falls out on scroll */}
      <motion.span
        aria-hidden="true"
        style={{
          x: pinX,
          y: pinY,
          rotate: pinRot,
          opacity: pinOpacity,
          backgroundColor: fragment.pin,
        }}
        className="pointer-events-none absolute left-1/2 top-2 z-20 h-3.5 w-3.5 -translate-x-1/2 rounded-full shadow-[inset_-1.5px_-1.5px_2px_rgba(0,0,0,0.35),inset_1.5px_1.5px_2px_rgba(255,255,255,0.55),0_3px_4px_rgba(0,0,0,0.35)] sm:h-4 sm:w-4 md:h-[18px] md:w-[18px]"
      />
    </motion.div>
  );
}


function Transformation() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const rawOpacity = useTransform(scrollYProgress, [0.40, 0.55, 0.92, 1], [0, 1, 1, 0.85]);
  const rawScale = useTransform(scrollYProgress, [0.40, 0.92], [0.55, 1.45]);
  const opacity = useSpring(rawOpacity, { stiffness: 80, damping: 20, mass: 0.8 });
  const scale = useSpring(rawScale, { stiffness: 60, damping: 15, mass: 0.8 });

  return (
    <section
      ref={ref}
      className="relative text-[#1c1814]"
      style={{ height: reduce ? "auto" : "220vh" }}
    >
      <div className="sticky top-0 flex min-h-screen w-full items-center overflow-hidden py-20">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${stickyNotesBg})` }}
        />
        <div aria-hidden className="absolute inset-0 bg-[#f4ede3]/80" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-[#f4ede3]/100 via-[#f4ede3]/95 to-[#f4ede3]/60" />
        <div className="relative z-10 mx-auto w-full max-w-[1300px] px-6">
          <div className="relative mx-auto mb-12 max-w-2xl text-center md:mb-16">
            <div className="mb-4 text-[10px] uppercase tracking-[0.4em] text-[#1c1814]/50">
              The transformation
            </div>
            <h2 className="font-serif text-[clamp(2rem,5vw,4rem)] font-light leading-[1.02]">
              Scattered documents <span className="italic">become</span> a clear pathway.
            </h2>
          </div>

          <div className="relative mx-auto h-[70vh] w-full max-w-[1350px] sm:h-[78vh] md:h-[85vh]">
            {FRAGMENTS.map((f, i) => (
              <FragmentCard key={i} fragment={f} index={i} progress={scrollYProgress} reduce={!!reduce} />
            ))}
            <motion.div
              style={{ opacity, scale }}
              className="absolute left-1/2 top-1/2 w-[min(560px,92%)] -translate-x-1/2 -translate-y-1/2"
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

      <div className="relative mx-auto flex min-h-[70svh] max-w-[1300px] flex-col items-center justify-center px-6 py-16 text-center md:py-20">
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
          className="mt-10 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:justify-center"
        >
          <Link to="/platform" className="sm:flex-1">
            <Button size="lg" className="inline-flex w-full items-center justify-center gap-2">
              Explore Transition Forward <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/waitlist" className="sm:flex-1">
            <Button
              size="lg"
              variant="outline"
              className="inline-flex w-full items-center justify-center border-white/30 bg-white/5 text-white hover:bg-white/10"
            >
              Join the Waitlist
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

function AboutPage() {
  // touch unused imports so they're tree-shaken cleanly without warning
  void collageImg;
  void studentCenter;
  void studentPhoto;

  return (
    <SiteShell>
      <article className="bg-[#0b0a09]">
        <CinematicHero />
        <PinnedStory />
        <FounderMessage />
        <JourneyPath />
        <Transformation />
        <ClosingCTA />
      </article>
    </SiteShell>
  );
}
