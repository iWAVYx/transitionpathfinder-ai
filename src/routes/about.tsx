import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import classroomImg from "@/assets/about-chapter-02-classroom.png.asset.json";
import familyImg from "@/assets/families-hero-v2.jpg";
import patternImg from "@/assets/about-chapter-03-pattern.png.asset.json";
import pathwayImg from "@/assets/pathway-hero.jpg";
import dashboardImg from "@/assets/dashboard-hero.jpg";
import ctaImgAsset from "@/assets/school-crossing.png.asset.json";
import stickyNotesBgAsset from "@/assets/sticky-notes-bg.png.asset.json";
import binderImgAsset from "@/assets/about-chapter-01-binder.png.asset.json";
import buildImgAsset from "@/assets/about-chapter-04-build.png.asset.json";
const ctaImg = ctaImgAsset.url;
const stickyNotesBg = stickyNotesBgAsset.url;
const binderImg = binderImgAsset.url;
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
          "Transition Forward helps every stakeholder walk ahead of, beside, and behind the student as they move toward life after school.",
      },
      { property: "og:title", content: "About — Transition Forward CT" },
      {
        property: "og:description",
        content:
          "A shared place for students, families, educators, districts, and partners to prepare, collaborate, and preserve the record of a student's path forward.",
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
          About Transition Forward
          <span className="h-px w-8 bg-white/40" />
        </div>
        <h1 className="font-serif text-[clamp(2rem,9vw,10rem)] font-light leading-[0.95] tracking-tight">
          <SplitReveal text="A Clearer Way" />
          <span className="block italic text-white/80">
            <SplitReveal text="To Move Forward." delay={0.25} />
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-white/75 sm:mt-8 sm:text-lg">
          Transition Forward was built for the moments when planning for life after school
          feels too important to be scattered across emails, PDFs, meetings, and memory. It
          gives students, families, educators, schools, districts, and partners a shared
          place to prepare, collaborate, and keep track of the steps that shape a student's
          future.
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
    image: binderImg,
    place: "New Haven, CT",
  },
  {
    label: "Chapter 02 · The Classroom",
    title: "The classroom showed me what the paperwork couldn't.",
    body: "Hamden. New Haven. Student Teaching. The plan on the page rarely matched the student in the room — their strengths, their voice, the family at the table.",
    image: classroomImg.url,
    place: "Hamden, CT",
  },
  {
    label: "Chapter 03 · The Pattern",
    title: "I kept seeing the same gap, in district after district.",
    body: "Paperwork without a path. Brilliant families and educators doing heroic work to translate documents into next steps that should have been obvious.",
    image: patternImg.url,
    place: "Connecticut",
  },
  {
    label: "Chapter 04 · The Build",
    title: "So I built what the binder was missing.",
    body: "Transition Forward turns the paperwork into a plan — a Pathway Report families, educators, and partners can actually use together.",
    image: buildImgAsset.url,
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
            Why This Exists
          </div>
          <h2 className="font-serif text-[clamp(2rem,4.6vw,3.6rem)] font-light leading-[1.05]">
            Transition planning depends on the right people
            <span className="italic"> having the right context at the right time.</span>
          </h2>
          <p className="mt-6 text-base text-[#1c1814]/80 sm:text-lg">
            I saw how easily student voice, family knowledge, documents, goals, services,
            and next steps become separated from one another. Families needed clarity.
            Educators needed organization. Districts needed visibility. Partners needed a
            clear way to connect opportunities to students. And students needed more than
            compliance paperwork — they needed a plan they could see themselves in.
          </p>
          <p className="mt-4 text-base text-[#1c1814]/80 sm:text-lg">
            Transition Forward grew from the belief that planning should be easier to
            understand, easier to share, and easier to act on.
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
  { year: "→", title: "Student Teaching", note: "Across grade bands, across CT." },
  { year: "→", title: "New Haven Public Schools", note: "Inside the binder. Inside the meeting." },
  { year: "→", title: "Hamden Public Schools", note: "Same patterns. Same gaps. Same families fighting through them." },
  { year: "Now", title: "Transition Forward Begins", note: "A pathway, not a packet." },
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

      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center md:mx-0 md:mb-12 md:text-left">
          <div className="mb-4 text-[10px] uppercase tracking-[0.4em] text-white/50">
            The Journey
          </div>
          <h2 className="font-serif text-[clamp(1.75rem,5vw,4rem)] font-light leading-[1.05]">
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
                className={`relative mx-auto grid max-w-md grid-cols-1 items-baseline gap-2 text-center sm:grid-cols-[auto_1fr] sm:gap-6 sm:text-left md:mx-0 md:max-w-[60%] md:gap-10 ${
                  i % 2 === 1 ? "md:ml-auto md:text-right" : ""
                }`}
              >
                <span className="font-serif text-xl italic text-white/50 sm:text-2xl md:text-3xl">
                  {j.year}
                </span>
                <div>
                  <h3 className="font-serif text-xl font-light leading-tight sm:text-2xl md:text-4xl">
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
  { label: toTitleCase("IEP paperwork"), rot: -9, x: -0.77, y: -0.7, color: "#fff48a", pin: "#e23b3b" },
  { label: toTitleCase("Student strengths"), rot: 6, x: 0, y: -0.7, color: "#ffb3c1", pin: "#2b6cb0" },
  { label: toTitleCase("Family priorities"), rot: -5, x: 0.77, y: -0.7, color: "#a8e6cf", pin: "#d97706" },
  { label: toTitleCase("Educator input"), rot: 8, x: -0.77, y: 0.7, color: "#b5d8ff", pin: "#7c3aed" },
  { label: toTitleCase("Resources"), rot: -7, x: 0, y: 0.7, color: "#ffd59e", pin: "#0f766e" },
  { label: toTitleCase("Action items"), rot: 6, x: 0.77, y: 0.7, color: "#e0bbff", pin: "#be185d" },
];

const BASE_CARD_W = 580;
const BASE_CARD_H = 470;
const GROUP_Y_OFFSET = 80; // shift note cluster down so heading stays legible above it
const MOBILE_BREAKPOINT = 480;

// Fixed tiled positions for the mobile cluster (overlapping, minimal blank space).
const MOBILE_NOTES: Array<{ left?: number; right?: number; top: number; rot: number }> = [
  { left: 0.05, top: 0.08, rot: -3 },
  { right: 0.05, top: 0.08, rot: 4 },
  { left: 0.05, top: 0.38, rot: -2 },
  { right: 0.05, top: 0.38, rot: 2 },
  { left: 0.05, top: 0.68, rot: -1 },
  { right: 0.05, top: 0.68, rot: 3 },
];

function useScatterLayout(containerRef: React.RefObject<HTMLElement | null>) {
  const [layout, setLayout] = useState({
    scale: 1,
    isMobile: false,
    width: 0,
    height: 0,
  });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const isMobile = w < MOBILE_BREAKPOINT;
      const padX = 12;
      const padY = 16;
      const halfW = w / 2;
      const halfH = h / 2;

      let scale: number;
      if (isMobile) {
        // Tiled overlapping 2x3 cluster: cards fill the width with intentional overlap.
        const maxReachX = BASE_CARD_W * 0.45 + BASE_CARD_W / 2;
        const maxReachY = BASE_CARD_H * 0.34 + BASE_CARD_H / 2;
        const scaleX = (halfW - padX) / maxReachX;
        const scaleY = (halfH - padY - Math.abs(GROUP_Y_OFFSET)) / maxReachY;
        scale = Math.max(0.32, Math.min(0.52, scaleX, scaleY));
      } else {
        const maxReachX = BASE_CARD_W * (0.77 + 0.5);
        const maxReachY = BASE_CARD_H * (0.7 + 0.5);
        const scaleX = (halfW - padX) / maxReachX;
        const scaleY = (halfH - padY - Math.abs(GROUP_Y_OFFSET)) / maxReachY;
        scale = Math.max(0.18, Math.min(1.1, scaleX, scaleY));
      }

      setLayout({
        scale: Number.isFinite(scale) ? scale : 0.5,
        isMobile,
        width: w,
        height: h,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);
  return layout;
}


function FragmentCard({
  fragment,
  index,
  progress,
  reduce,
  containerRef,
}: {
  fragment: (typeof FRAGMENTS)[number];
  index: number;
  progress: MotionValue<number>;
  reduce: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  const { scale: scatterScale, isMobile, width: containerW, height: containerH } =
    useScatterLayout(containerRef);

  // Fragments stay scattered longer while the headline reads, then converge
  // through the middle of the pin, then dim as the Pathway Report takes the stage.
  const p = useTransform(progress, [0.25, 0.55], [0, 1]);

  const startX = useMemo(() => {
    if (reduce) return 0;
    if (isMobile && containerW > 0) {
      const m = MOBILE_NOTES[index];
      const cardW = BASE_CARD_W * scatterScale;
      if (m.left != null) {
        return (m.left * containerW + cardW / 2) - containerW / 2;
      }
      return (containerW - (m.right ?? 0) * containerW - cardW / 2) - containerW / 2;
    }
    return fragment.x * scatterScale * BASE_CARD_W;
  }, [reduce, isMobile, containerW, scatterScale, fragment, index]);

  const startY = useMemo(() => {
    if (reduce) return 0;
    if (isMobile && containerH > 0) {
      const m = MOBILE_NOTES[index];
      const cardH = BASE_CARD_H * scatterScale;
      return (m.top * containerH + cardH / 2) - containerH / 2 + GROUP_Y_OFFSET;
    }
    return fragment.y * scatterScale * BASE_CARD_H + GROUP_Y_OFFSET;
  }, [reduce, isMobile, containerH, scatterScale, fragment, index]);

  const startRot = useMemo(() => {
    if (reduce) return 0;
    if (isMobile) return MOBILE_NOTES[index].rot;
    return fragment.rot * Math.min(scatterScale * 1.4, 1);
  }, [reduce, isMobile, scatterScale, fragment, index]);

  const x = useTransform(p, (latest) => startX * (1 - latest));
  const y = useTransform(p, (latest) => startY * (1 - latest));
  const rot = useTransform(p, (latest) => startRot * (1 - latest));
  const opacity = useTransform(p, [0, 0.75, 1], [1, 1, 0.12]);

  // Pin falls out, staggered per card, once the notes have settled.
  const fallStart = 0.65 + index * 0.03;
  const fallEnd = fallStart + 0.18;
  const pinY = useTransform(progress, [fallStart, fallEnd], [0, reduce ? 0 : 480 * scatterScale]);
  const pinRot = useTransform(progress, [fallStart, fallEnd], [0, reduce ? 0 : (index % 2 === 0 ? 220 : -240)]);
  const pinX = useTransform(progress, [fallStart, fallEnd], [0, reduce ? 0 : (index % 2 === 0 ? 28 : -34)]);
  const pinOpacity = useTransform(progress, [fallStart, fallEnd - 0.02, fallEnd], [1, 1, 0]);

  // Subtle 3D tilt — reduced on smaller screens
  const tiltScale = Math.min(scatterScale * 1.5, 1);
  const tiltX = (index % 2 === 0 ? 1 : -1) * 6 * tiltScale;
  const tiltY = (index % 3 === 0 ? -1 : 1) * 8 * tiltScale;

  const width = BASE_CARD_W * scatterScale;
  const height = BASE_CARD_H * scatterScale;
  const fontSize = Math.max(16, 51 * scatterScale);

  return (
    <motion.div
      style={{
        x,
        y,
        rotate: rot,
        rotateX: tiltX,
        rotateY: tiltY,
        opacity,
        width,
        height,
        backgroundColor: fragment.color,
        transformPerspective: 1000,
        transformStyle: "preserve-3d",
        boxShadow:
          "0 18px 24px -8px rgba(0,0,0,0.30), 0 4px 8px -2px rgba(0,0,0,0.18), inset 0 -10px 16px -12px rgba(0,0,0,0.18)",
      }}
      className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center px-4 py-4 text-center font-hand font-semibold leading-snug text-[#1c1814]/85"
    >
      <span style={{ fontSize }} className="relative z-10">
        {fragment.label}
      </span>
      {/* Pushpin — sits above the note, falls out on scroll */}
      <motion.span
        aria-hidden="true"
        style={{
          x: pinX,
          y: pinY,
          rotate: pinRot,
          opacity: pinOpacity,
          backgroundColor: fragment.pin,
          width: Math.max(10, 27 * scatterScale),
          height: Math.max(10, 27 * scatterScale),
        }}
        className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full shadow-[inset_-1.5px_-1.5px_2px_rgba(0,0,0,0.35),inset_1.5px_1.5px_2px_rgba(255,255,255,0.55),0_3px_4px_rgba(0,0,0,0.35)]"
      />
    </motion.div>
  );
}



function Transformation() {
  const ref = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const rawOpacity = useTransform(scrollYProgress, [0.55, 0.70, 0.92, 1], [0, 1, 1, 0.85]);
  const rawScale = useTransform(scrollYProgress, [0.55, 0.92], [0.55, 1.45]);
  const opacity = useSpring(rawOpacity, { stiffness: 80, damping: 20, mass: 0.8 });
  const scale = useSpring(rawScale, { stiffness: 60, damping: 15, mass: 0.8 });

  return (
    <section
      ref={ref}
      className={`relative text-[#1c1814] ${reduce ? "h-auto" : "h-[130vh] md:h-[190vh]"}`}
    >
      <div className="sticky top-0 flex h-[100svh] min-h-[100svh] w-full items-center overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${stickyNotesBg})` }}
        />
        <div aria-hidden className="absolute inset-0 bg-[#f4ede3]/40" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-[32%] bg-gradient-to-b from-[#f4ede3]/98 via-[#f4ede3]/85 to-[#f4ede3]/30" />
        <div className="relative z-30 mx-auto flex h-full w-full flex-col px-4 sm:px-6">
          <div className="relative z-30 mx-auto mt-8 w-full max-w-2xl shrink-0 px-4 pt-5 pb-4 text-center sm:mt-12 sm:pt-6 sm:pb-5">
            <div className="mb-2 text-[10px] uppercase tracking-[0.4em] text-[#1c1814]/60">
              The Transformation
            </div>
            <h2 className="font-serif text-[clamp(1.25rem,2.4vw,2rem)] font-light leading-[1.2] text-balance">
              Scattered documents <span className="italic">become</span> a clear pathway.
            </h2>
          </div>


          <div
            ref={containerRef}
            className="relative min-h-0 flex-1 w-full pb-3 sm:pb-5"
          >

            {FRAGMENTS.map((f, i) => (
              <FragmentCard key={i} fragment={f} index={i} progress={scrollYProgress} reduce={!!reduce} containerRef={containerRef} />
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
/*  Ahead · Beside · Behind — signature framework                              */
/* -------------------------------------------------------------------------- */

const STANCES = [
  {
    kicker: "Ahead",
    title: "Preparing The Path",
    body:
      "Support planning before the next meeting, deadline, opportunity, or transition step arrives — resources, pathway options, documents, calendars, partner opportunities, and readiness signals ready when the student needs them.",
    accent: "#ffd9a0",
    glyph: (
      <svg viewBox="0 0 80 80" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="40" cy="40" r="6" />
        <path d="M40 34 L40 12" />
        <path d="M32 20 L40 12 L48 20" />
        <path d="M20 60 Q40 48 60 60" opacity="0.5" />
      </svg>
    ),
  },
  {
    kicker: "Beside",
    title: "Moving Together",
    body:
      "Bring students, families, educators, case managers, schools, districts, and partners into a shared workspace where goals, preferences, documents, meetings, and next steps stay connected — role by role, without losing the whole picture.",
    accent: "#a8e6cf",
    glyph: (
      <svg viewBox="0 0 80 80" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="40" cy="40" r="6" />
        <circle cx="18" cy="40" r="4" />
        <circle cx="62" cy="40" r="4" />
        <path d="M22 40 L34 40" />
        <path d="M46 40 L58 40" />
        <path d="M14 58 Q40 48 66 58" opacity="0.5" />
      </svg>
    ),
  },
  {
    kicker: "Behind",
    title: "Keeping The Record",
    body:
      "Preserve the decisions, uploads, reports, notes, progress, permissions, and evidence that help everyone understand what happened, why it mattered, and what comes next — so nothing important gets lost between transitions.",
    accent: "#b5d8ff",
    glyph: (
      <svg viewBox="0 0 80 80" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="40" cy="40" r="6" />
        <path d="M40 46 L40 68" />
        <path d="M32 60 L40 68 L48 60" />
        <rect x="24" y="14" width="32" height="18" rx="2" opacity="0.6" />
        <path d="M30 22 L50 22" opacity="0.6" />
      </svg>
    ),
  },
];

function AheadBesideBehind() {
  return (
    <section className="relative overflow-hidden bg-[#0b0a09] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,220,160,0.10),transparent_60%)]" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 text-[10px] uppercase tracking-[0.4em] text-white/50">
            The Framework
          </div>
          <h2 className="font-serif text-[clamp(2rem,6vw,5rem)] font-light leading-[1.02]">
            Ahead,{" "}
            <span className="italic text-white/80">Beside,</span>{" "}
            Behind.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base text-white/70 sm:text-lg">
            Transition Forward helps every stakeholder walk ahead of, beside, and behind
            the student as they move toward life after school. Three stances. One shared
            path.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:mt-20 md:grid-cols-3 md:gap-8">
          {STANCES.map((s, i) => (
            <motion.article
              key={s.kicker}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 0.8, delay: i * 0.12, ease: [0.22, 0.61, 0.36, 1] }}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm md:p-10"
            >
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-px"
                style={{ background: `linear-gradient(to right, transparent, ${s.accent}, transparent)` }}
              />
              <div style={{ color: s.accent }} className="mb-6">
                {s.glyph}
              </div>
              <div className="text-[10px] uppercase tracking-[0.45em]" style={{ color: s.accent }}>
                {s.kicker}
              </div>
              <h3 className="mt-3 font-serif text-3xl font-light leading-tight md:text-4xl">
                {s.title}
              </h3>
              <p className="mt-5 text-[15px] leading-relaxed text-white/70">
                {s.body}
              </p>
              <div
                aria-hidden
                className="mt-8 h-px w-12"
                style={{ background: s.accent, opacity: 0.6 }}
              />
            </motion.article>
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-2xl text-center text-sm italic text-white/55 md:mt-20">
          The student remains at the center. Every stance exists to help them move forward
          with more clarity than they had yesterday.
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Student-Centered — the reason the platform exists                          */
/* -------------------------------------------------------------------------- */

function StudentCentered() {
  return (
    <section className="relative overflow-hidden bg-[#f4ede3] text-[#1c1814]">
      <div className="relative mx-auto grid max-w-[1300px] gap-12 px-6 py-20 md:grid-cols-[6fr_5fr] md:gap-20 md:py-28">
        <div className="flex flex-col justify-center">
          <div className="mb-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-[#1c1814]/60">
            <span className="h-px w-8 bg-[#1c1814]/30" />
            The Student At The Center
          </div>
          <h2 className="font-serif text-[clamp(2rem,4.6vw,3.6rem)] font-light leading-[1.05]">
            The student is not a profile in a system.
            <span className="italic"> They are the reason for it.</span>
          </h2>
          <p className="mt-6 text-base text-[#1c1814]/80 sm:text-lg">
            Their strengths, preferences, interests, goals, questions, and next steps
            should shape the plan — not the other way around. Transition Forward is built
            to help students understand their own path, participate in planning, and see
            their future as something they can move toward with support.
          </p>
          <ul className="mt-8 grid grid-cols-1 gap-x-8 gap-y-3 text-[15px] text-[#1c1814]/75 sm:grid-cols-2">
            {[
              "Student voice and preferences",
              "Interests and pathway options",
              "Goals and next steps",
              "Confidence and agency",
              "Family and team support",
              "A plan the student can read",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1c1814]/50" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="aspect-[4/5] overflow-hidden rounded-[2rem] bg-black/5">
            <img
              src={studentPhoto}
              alt="A Connecticut student preparing for what comes next"
              className="h-full w-full object-cover object-[50%_25%]"
            />
          </div>
          <div className="absolute -bottom-4 right-6 rounded-full bg-[#1c1814] px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-[#f4ede3] shadow-lg">
            The Path Is Theirs
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Collaboration + Ecosystem + CT-Aware — one editorial band                  */
/* -------------------------------------------------------------------------- */

function EcosystemAndCare() {
  const stakeholders = [
    "Students",
    "Families",
    "Educators & Case Managers",
    "School Administrators",
    "District Administrators",
    "Community Partners",
  ];
  const surfaces = [
    "Transition Workspace",
    "Pathway Report",
    "Role Dashboards",
    "Document Uploads",
    "Meeting Preparation",
    "Calendars",
    "Partner Opportunities",
    "Resources",
    "Permissions & Recordkeeping",
    "District & School Visibility",
  ];

  return (
    <section className="relative overflow-hidden bg-[#0b0a09] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(168,230,207,0.08),transparent_55%)]" />
      <div className="relative mx-auto max-w-[1300px] px-6 py-20 md:py-28">
        {/* Collaboration */}
        <div className="grid gap-12 md:grid-cols-[5fr_6fr] md:gap-20">
          <div>
            <div className="mb-5 text-[10px] uppercase tracking-[0.4em] text-white/50">
              A Shared Workspace
            </div>
            <h2 className="font-serif text-[clamp(1.9rem,4.4vw,3.4rem)] font-light leading-[1.05]">
              Planning works best when information
              <span className="italic"> does not live in separate places.</span>
            </h2>
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-base text-white/75 sm:text-lg">
              Transition Forward connects documents, meetings, notes, uploads, calendars,
              resources, opportunities, role dashboards, and pathway reports so each
              person can contribute from their role without losing the whole picture.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {stakeholders.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-[11px] uppercase tracking-[0.15em] text-white/75"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-16 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent md:my-24" />

        {/* Ecosystem */}
        <div className="grid gap-12 md:grid-cols-[5fr_6fr] md:gap-20">
          <div>
            <div className="mb-5 text-[10px] uppercase tracking-[0.4em] text-white/50">
              One Ecosystem
            </div>
            <h2 className="font-serif text-[clamp(1.9rem,4.4vw,3.4rem)] font-light leading-[1.05]">
              Not a stack of features.
              <span className="italic"> A shared path forward.</span>
            </h2>
            <p className="mt-6 text-base text-white/70">
              Each surface exists to make the next step easier to prepare for, act on, and
              remember.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[15px] text-white/75 sm:grid-cols-2">
            {surfaces.map((s) => (
              <div key={s} className="flex items-start gap-3 border-l border-white/10 pl-4">
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="my-16 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent md:my-24" />

        {/* CT-Aware */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 text-[10px] uppercase tracking-[0.4em] text-white/50">
            Built With Care
          </div>
          <h2 className="font-serif text-[clamp(1.9rem,4.4vw,3.4rem)] font-light leading-[1.05]">
            Designed with awareness of what
            <span className="italic"> transition planning actually requires.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base text-white/70 sm:text-lg">
            Transition Forward is designed to support special education transition
            planning, secure recordkeeping, role-based access, document handling, audit
            history, and the need for clear evidence behind decisions and next steps. It
            helps teams organize their work and makes planning easier to review — it does
            not replace district legal obligations or official IEP systems.
          </p>
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
            CT-Aware · Records-First · Student-Centered
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
          The Path Belongs to the Student
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 1, delay: 0.1 }}
          className="font-serif text-[clamp(2.4rem,7vw,6rem)] font-light leading-[0.95]"
        >
          The Work Is Shared.
          <span className="mt-8 block italic text-white/75">The Path Is Theirs.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-8 max-w-2xl text-base text-white/70 sm:text-lg"
        >
          Transition Forward is built for the student preparing for what comes next, the
          family trying to understand the process, the educator carrying the details, the
          district trying to support many students well, and the partner ready to open a
          door.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-10 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:justify-center"
        >
          <Link to="/platform" className="sm:flex-1">
            <Button size="lg" className="inline-flex w-full items-center justify-center gap-2">
              See How It Works <ArrowRight className="h-4 w-4" />
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

  return (
    <SiteShell>
      <article className="bg-[#0b0a09]">
        <CinematicHero />
        <PinnedStory />
        <FounderMessage />
        <AheadBesideBehind />
        <JourneyPath />
        <StudentCentered />
        <Transformation />
        <EcosystemAndCare />
        <ClosingCTA />
      </article>
    </SiteShell>
  );
}
