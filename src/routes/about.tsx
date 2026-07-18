import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useSpring,
  AnimatePresence,
} from "motion/react";
import {
  ArrowRight,
  MapPin,
  CalendarClock,
  Handshake,
  Presentation,
  BookMarked,
  Gauge,
  LayoutDashboard,
  Mic,
  Users,
  Target,
  ListChecks,
  FileText,
  History,
  ClipboardList,
  ShieldCheck,
  NotebookPen,
  Database,
  Lock,
  Eye,
  Scale,
  FileCheck,
  type LucideIcon,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

import ctaImgAsset from "@/assets/school-crossing.png.asset.json";

import binderImgAsset from "@/assets/about-chapter-01-binder.png.asset.json";
import buildImgAsset from "@/assets/about-chapter-04-build.png.asset.json";
const ctaImg = ctaImgAsset.url;

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
    <section ref={ref} className="relative bg-[#0b0a09] text-white" style={{ height: "200vh" }}>
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
      <div className="relative mx-auto grid max-w-[1300px] gap-10 px-6 py-12 md:grid-cols-[5fr_6fr] md:gap-16 md:py-16">
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
          <div className="mb-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-[#1c1814]/60">
            <span className="h-px w-8 bg-[#1c1814]/30" />
            Why This Exists
          </div>
          <h2 className="font-serif text-[clamp(2rem,4.6vw,3.6rem)] font-light leading-[1.05]">
            Transition planning depends on the right people
            <span className="italic"> having the right context at the right time.</span>
          </h2>
          <p className="mt-5 text-base text-[#1c1814]/80 sm:text-lg">
            I saw how easily student voice, family knowledge, documents, goals, services,
            and next steps become separated from one another. Families needed clarity.
            Educators needed organization. Districts needed visibility. Partners needed a
            clear way to connect opportunities to students. And students needed more than
            compliance paperwork — they needed a plan they could see themselves in.
          </p>
          <p className="mt-3 text-base text-[#1c1814]/80 sm:text-lg">
            Transition Forward grew from the belief that planning should be easier to
            understand, easier to share, and easier to act on.
          </p>
          <div className="mt-8 flex items-end gap-5">
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

function ScrollPathBackground({ targetRef }: { targetRef: React.RefObject<HTMLElement | null> }) {
  const pathRef = useRef<SVGPathElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: targetRef,
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
    <div className="pointer-events-none absolute inset-0 z-0">
      <img src={sunriseImg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
      {/* Darker overlay so the path reads as ambient texture behind text */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b0a09]/85 via-[#0b0a09]/70 to-[#0b0a09]" />
      <svg
        className="absolute inset-0 h-full w-full opacity-40 sm:opacity-60"
        viewBox="0 0 1000 1500"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d={SQUIGGLE_D}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.5"
          strokeDasharray="4 8"
          vectorEffect="non-scaling-stroke"
        />
        <motion.path
          ref={pathRef}
          d={SQUIGGLE_D}
          fill="none"
          stroke="rgba(255,220,160,0.5)"
          strokeWidth="1.75"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ pathLength }}
        />
        <motion.g style={{ x: arrowX, y: arrowY, rotate: arrowR }}>
          <circle r="10" fill="rgba(255,220,160,0.14)" />
          <circle r="4" fill="#ffd9a0" />
          <path d="M 1 -5 L 11 0 L 1 5 Z" fill="#ffd9a0" />
        </motion.g>
      </svg>
    </div>
  );
}

function JourneyPath() {
  const ref = useRef<HTMLElement>(null);

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#0b0a09] py-12 text-white md:py-16">
      <ScrollPathBackground targetRef={ref} />

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="mx-auto mb-8 max-w-2xl text-center md:mx-0 md:mb-10 md:text-left">
          <div className="mb-4 text-[10px] uppercase tracking-[0.4em] text-white/50">
            The Journey
          </div>
          <h2 className="font-serif text-[clamp(1.75rem,5vw,4rem)] font-light leading-[1.05]">
            A path traced through Connecticut classrooms.
          </h2>
        </div>

        <div className="relative">
          <ol className="space-y-8 md:space-y-12">
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
/*  Interactive walkthrough — Ahead / Beside / Behind in the app               */
/* -------------------------------------------------------------------------- */

type StanceKey = "ahead" | "beside" | "behind";

type WalkAction = {
  icon: LucideIcon;
  title: string;
  body: string;
  to: string;
  cta: string;
};

type WalkStance = {
  key: StanceKey;
  kicker: string;
  title: string;
  lead: string;
  accent: string;
  actions: WalkAction[];
};

const WALKTHROUGH: WalkStance[] = [
  {
    key: "ahead",
    kicker: "Ahead",
    title: "Prepare The Path Before The Student Needs It",
    lead:
      "Get options, deadlines, materials, and readiness signals in place before the next meeting or transition step arrives.",
    accent: "#ffd9a0",
    actions: [
      {
        icon: BookMarked,
        title: "Draft The Pathway Report",
        body: "Assemble strengths, preferences, goals, and options into a report the family and team can actually use.",
        to: "/demo/report",
        cta: "Open Pathway Report",
      },
      {
        icon: Handshake,
        title: "Line Up Partner Opportunities",
        body: "Match students to community partner programs, jobs, and services before deadlines slip.",
        to: "/demo/opportunities",
        cta: "Browse Opportunities",
      },
      {
        icon: Presentation,
        title: "Prep The Next Meeting",
        body: "Build the agenda, gather materials, and stage talking points ahead of the PPT or IEP conversation.",
        to: "/demo/meeting",
        cta: "Open Meeting Prep",
      },
      {
        icon: Gauge,
        title: "Track Readiness Gaps Early",
        body: "See which students are missing assessments, signatures, or planning steps before it becomes a scramble.",
        to: "/demo/next",
        cta: "View Readiness Gaps",
      },
    ],
  },
  {
    key: "beside",
    kicker: "Beside",
    title: "Move Through The Plan Together",
    lead:
      "Work with the student, family, and team inside a shared workspace where goals, meetings, and next steps stay connected.",
    accent: "#a8e6cf",
    actions: [
      {
        icon: LayoutDashboard,
        title: "Run The Transition Workspace",
        body: "One place to see the student's stage, materials, contributors, and what needs attention this week.",
        to: "/demo/hub",
        cta: "Open Workspace",
      },
      {
        icon: Mic,
        title: "Capture Student Voice",
        body: "Record preferences, interests, questions, and goals in the student's own words — and keep them visible.",
        to: "/demo/voice",
        cta: "Open Student Voice",
      },
      {
        icon: Users,
        title: "Hold And Document Meetings",
        body: "Schedule, take shared notes, and turn conversations into action items without a separate doc.",
        to: "/demo/meeting",
        cta: "Open Meetings",
      },
      {
        icon: Target,
        title: "Set Measurable Goals",
        body: "Write goals with the student, revise them as things change, and keep progress attached to the plan.",
        to: "/demo/plan",
        cta: "Open Goals",
      },
      {
        icon: ListChecks,
        title: "Coordinate Action Items",
        body: "Assign next steps with owners and due dates so nobody leaves the room unclear on what happens next.",
        to: "/demo/next",
        cta: "Open Action Items",
      },
    ],
  },
  {
    key: "behind",
    kicker: "Behind",
    title: "Preserve The Record Behind Every Decision",
    lead:
      "Keep uploads, notes, reports, and access history intact so the story of the student's plan is never lost.",
    accent: "#b5d8ff",
    actions: [
      {
        icon: FileText,
        title: "Review Documents & Signatures",
        body: "See every IEP, evaluation, and consent form in one place — versioned, searchable, and share-ready.",
        to: "/demo/documents",
        cta: "Open Documents",
      },
      {
        icon: History,
        title: "See Access & Activity History",
        body: "Know who viewed, uploaded, or shared what — a clear audit trail for families, districts, and partners.",
        to: "/demo/family",
        cta: "Open Activity History",
      },
      {
        icon: ClipboardList,
        title: "Preserve Progress & Reports",
        body: "Snapshot growth over time so future meetings and future teams inherit the full picture.",
        to: "/demo/report",
        cta: "Open Reports",
      },
      {
        icon: ShieldCheck,
        title: "Manage Consent & Sharing",
        body: "Grant, revoke, and review permissions so the right people see the right parts of the record.",
        to: "/demo/family",
        cta: "Open Consent",
      },
      {
        icon: NotebookPen,
        title: "Keep Meeting Notes & Follow-Ups",
        body: "Retain notes and decisions so nothing is re-litigated at the next meeting or the next transition.",
        to: "/demo/educator",
        cta: "Open Notes",
      },
    ],
  },
];

function AheadBesideBehindWalkthrough() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState<StanceKey>("ahead");
  const stance = WALKTHROUGH.find((s) => s.key === active) ?? WALKTHROUGH[0];

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#0b0a09] text-white">
      <ScrollPathBackground targetRef={ref} />
      <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 text-[10px] uppercase tracking-[0.4em] text-white/50">
            Walk Through It
          </div>
          <h2 className="font-serif text-[clamp(1.9rem,5vw,4rem)] font-light leading-[1.05]">
            Ahead, Beside, Behind.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl whitespace-pre-wrap text-base text-white/70 sm:text-lg">
            {"Transition Forward helps every stakeholder walk ahead of, beside, and behind the student as they move toward life after school. Three stances. One shared path.\n\nPick a stance to see the actual work — and jump straight to the screen where it lives."}
          </p>
        </div>

        {/* Tab switcher */}
        <div
          role="tablist"
          aria-label="Ahead, Beside, Behind"
          className="mx-auto mt-10 flex w-full max-w-2xl flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 sm:flex-row"
        >
          {WALKTHROUGH.map((s) => {
            const isActive = s.key === active;
            return (
              <button
                key={s.key}
                role="tab"
                aria-selected={isActive}
                aria-controls={`walkthrough-panel-${s.key}`}
                id={`walkthrough-tab-${s.key}`}
                onClick={() => setActive(s.key)}
                className={`relative flex-1 rounded-xl px-5 py-3 text-left transition-colors sm:text-center ${
                  isActive ? "text-[#0b0a09]" : "text-white/70 hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="walkthrough-pill"
                    className="absolute inset-0 rounded-xl"
                    style={{ backgroundColor: s.accent }}
                    transition={{ type: "spring", stiffness: 280, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-between gap-3 sm:justify-center">
                  <span
                    className="text-[10px] uppercase tracking-[0.4em]"
                    style={{ opacity: isActive ? 0.7 : 0.55 }}
                  >
                    {s.kicker}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <div
          role="tabpanel"
          id={`walkthrough-panel-${stance.key}`}
          aria-labelledby={`walkthrough-tab-${stance.key}`}
          className="mt-8 md:mt-12"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={stance.key}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
              className="grid gap-8 md:grid-cols-[5fr_7fr] md:gap-12"
            >
              <div className="md:sticky md:top-24 md:self-start">
                <div
                  className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.4em]"
                  style={{ borderColor: `${stance.accent}55`, color: stance.accent }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: stance.accent }}
                  />
                  {stance.kicker}
                </div>
                <h3 className="font-serif text-[clamp(1.75rem,3.6vw,2.75rem)] font-light leading-[1.1]">
                  {stance.title}
                </h3>
                <p className="mt-4 text-base text-white/70">{stance.lead}</p>
                <div
                  aria-hidden
                  className="mt-8 h-px w-16"
                  style={{ backgroundColor: stance.accent, opacity: 0.6 }}
                />
              </div>

              <ol className="space-y-3">
                {stance.actions.map((a, i) => {
                  const Icon = a.icon;
                  return (
                    <motion.li
                      key={a.title}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: 0.05 + i * 0.06,
                        ease: [0.22, 0.61, 0.36, 1],
                      }}
                    >
                      <Link
                        to={a.to}
                        className="group relative flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/25 hover:bg-white/[0.06] sm:p-6"
                      >
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                          style={{
                            backgroundColor: `${stance.accent}22`,
                            color: stance.accent,
                          }}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <h4 className="font-serif text-lg font-light leading-tight text-white sm:text-xl">
                              {a.title}
                            </h4>
                            <span
                              className="hidden shrink-0 text-[10px] uppercase tracking-[0.3em] text-white/40 sm:inline"
                            >
                              0{i + 1}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-white/70 sm:text-[15px]">
                            {a.body}
                          </p>
                          <div
                            className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] transition-transform group-hover:translate-x-1"
                            style={{ color: stance.accent }}
                          >
                            {a.cta}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </Link>
                    </motion.li>
                  );
                })}
              </ol>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-white/45 md:mt-14">
          Screens open in an interactive demo with sample data — the student remains at the center
          of everything you see.
        </p>
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
      <div className="relative mx-auto grid max-w-[1300px] gap-10 px-6 py-16 md:grid-cols-[6fr_5fr] md:gap-16 md:py-20">
        <div className="flex flex-col justify-center">
          <div className="mb-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-[#1c1814]/60">
            <span className="h-px w-8 bg-[#1c1814]/30" />
            The Student At The Center
          </div>
          <h2 className="font-serif text-[clamp(2rem,4.6vw,3.6rem)] font-light leading-[1.05]">
            The student is not a profile in a system.
            <span className="italic"> They are the reason for it.</span>
          </h2>
          <p className="mt-5 text-base text-[#1c1814]/80 sm:text-lg">
            Their strengths, preferences, interests, goals, questions, and next steps
            should shape the plan — not the other way around. Transition Forward is built
            to help students understand their own path, participate in planning, and see
            their future as something they can move toward with support.
          </p>
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
  const ref = useRef<HTMLElement>(null);
  const CT_PILLARS = [
    {
      icon: ShieldCheck,
      title: "CT-Aware by Design",
      body:
        "Built around Connecticut's PPT and transition planning context — age of majority, transition assessments, and post-secondary goals — so the record matches what the process actually asks of a team.",
    },
    {
      icon: FileCheck,
      title: "Records That Travel",
      body:
        "Documents, notes, goals, meetings, and action items are organized around the student so the plan is not rebuilt from scratch every meeting.",
    },
    {
      icon: Users,
      title: "Team Around the Student",
      body:
        "Families, educators, districts, and partners each see the right level of detail so they can prepare ahead, walk beside, and follow up behind.",
    },
  ];

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#0b0a09] text-white">
      <ScrollPathBackground targetRef={ref} />
      <div className="relative mx-auto max-w-[1300px] px-6 py-20 md:py-24">
        {/* CT-Aware */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
            Built With Care
          </div>
          <h2 className="font-serif text-[clamp(2.2rem,5vw,4.5rem)] font-light leading-[1.05]">
            Built for Connecticut transition planning,
            <span className="italic"> not just any planning tool.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-white/70 sm:text-lg">
            Transition planning in Connecticut is more than a checklist. It is the work of
            turning PPT conversations, transition assessments, and student voice into a coherent
            path forward. TransitionForward keeps the record close to the student, the team
            aligned, and the next steps clear — without replacing district legal obligations or
            official IEP systems.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {CT_PILLARS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-sm transition-colors hover:bg-white/[0.05]"
              >
                <Icon className="mb-3 h-6 w-6 text-white/70" />
                <h3 className="font-serif text-xl">{item.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/60">{item.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
            CT-Aware · Records-First · Student-Centered
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  CT-aware FAQ — records, permissions, audit history                         */
/* -------------------------------------------------------------------------- */

type FAQEntry = {
  icon: LucideIcon;
  question: string;
  answer: React.ReactNode;
};

const FAQ_ITEMS: FAQEntry[] = [
  {
    icon: Database,
    question: "What records does TransitionForward keep?",
    answer: (
      <>
        TransitionForward keeps the student-centered records that help a team
        plan together: documents and evaluations, transition goals and progress
        notes, meeting preparation and follow-up notes, student voice entries,
        calendar events and deadlines, action items with owners, pathway
        reports, partner opportunity records, and a history of who accessed or
        changed what. Every record is tied to a specific student and is only
        visible to users with permission to that student's record.
      </>
    ),
  },
  {
    icon: FileCheck,
    question: "Who owns the student data?",
    answer: (
      <>
        The student and their family are the reason for the record. The school
        district remains the custodian of the official education record it
        creates and maintains. TransitionForward provides a workspace that
        supports the district's recordkeeping; it does not take ownership of
        the underlying education record or replace the district's official
        systems.
      </>
    ),
  },
  {
    icon: Eye,
    question: "Who can see what inside the platform?",
    answer: (
      <>
        Access is scoped by role and by student. A user can only see records
        for students they are connected to through their role — family members
        for their own student, educators and case managers for students on
        their caseload, school and district staff for students in their
        organization, and partners only when a specific student connection has
        been approved. Row-level security and role-based policies enforce
        these boundaries in the database itself.
      </>
    ),
  },
  {
    icon: Lock,
    question: "How do permissions and consent work?",
    answer: (
      <>
        Families control sharing and consent for their student's workspace
        record. They can invite or remove contributors, set what each role can
        see, and revoke access at any time. Every permission grant, change, or
        revocation is logged in the activity history so the story of who had
        access — and when — stays clear.
      </>
    ),
  },
  {
    icon: History,
    question: "What does the activity history capture?",
    answer: (
      <>
        The audit trail captures meaningful actions: document uploads, views,
        and downloads; sharing invitations and revocations; goal and note
        edits; meeting scheduling and updates; and report generation. It is
        designed to help families, educators, and district staff understand
        the record behind the plan, not to monitor every keystroke or
        classroom conversation.
      </>
    ),
  },
  {
    icon: Scale,
    question: "Does TransitionForward replace our district's IEP system?",
    answer: (
      <>
        No. TransitionForward is a collaborative workspace that supports
        transition planning, recordkeeping, and team communication. It works
        alongside your district's official IEP system and processes, not in
        place of them. Districts remain responsible for their own IEP
        documentation, compliance practices, and official records.
      </>
    ),
  },
  {
    icon: ShieldCheck,
    question: "Is TransitionForward legally compliant?",
    answer: (
      <>
        TransitionForward is designed to support secure, role-based
        recordkeeping and clear audit history, which are important practices in
        special education transition planning. However, legal compliance is
        specific to each district's policies, procedures, and obligations. We
        do not claim that using TransitionForward guarantees compliance with
        any federal, state, or district law or regulation. Districts retain
        responsibility for their own compliance. Read more in our{" "}
        <Link to="/privacy" className="underline underline-offset-4 hover:text-[#1c1814]">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link to="/terms" className="underline underline-offset-4 hover:text-[#1c1814]">
          Terms of Service
        </Link>
        .
      </>
    ),
  },
];

function CTAwareFAQ() {
  return (
    <section className="relative overflow-hidden bg-[#f4ede3] text-[#1c1814]">
      <div className="relative mx-auto max-w-[1100px] px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.4em] text-[#1c1814]/60">
            <span className="h-px w-8 bg-[#1c1814]/30" />
            Trust, Records, And Transparency
            <span className="h-px w-8 bg-[#1c1814]/30" />
          </div>
          <h2 className="font-serif text-[clamp(1.9rem,4.6vw,3.4rem)] font-light leading-[1.05]">
            How The Record Is Kept,
            <span className="italic"> And Who Holds The Key.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-[#1c1814]/80 sm:text-lg">
            Transition planning depends on trust. Here is how we approach
            recordkeeping, permissions, and audit history — with Connecticut
            transition teams and families in mind.
          </p>
        </div>

        <Accordion type="single" collapsible className="mt-10 md:mt-12">
          {FAQ_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <AccordionItem
                key={item.question}
                value={`faq-${i}`}
                className="border-[#1c1814]/10"
              >
                <AccordionTrigger className="py-5 text-left hover:no-underline">
                  <span className="flex items-start gap-4">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1c1814]/8 text-[#1c1814]/80">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-serif text-lg font-light leading-snug sm:text-xl">
                      {item.question}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pl-[52px]">
                  <p className="max-w-3xl text-[15px] leading-relaxed text-[#1c1814]/80">
                    {item.answer}
                  </p>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <div className="mx-auto mt-10 max-w-2xl text-center text-sm text-[#1c1814]/70 md:mt-12">
          Have a question about security, privacy, or how we support districts?{" "}
          <Link
            to="/trust-and-safety"
            className="underline underline-offset-4 hover:text-[#1c1814]"
          >
            Read our Trust & Safety overview
          </Link>{" "}
          or{" "}
          <Link to="/contact" className="underline underline-offset-4 hover:text-[#1c1814]">
            contact us
          </Link>
          .
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

      <div className="relative mx-auto flex min-h-[60svh] max-w-[1300px] flex-col items-center justify-center px-6 py-16 text-center md:py-20">
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
        <AheadBesideBehindWalkthrough />
        <FounderMessage />
        <JourneyPath />

        <StudentCentered />
        
        <EcosystemAndCare />
        <CTAwareFAQ />
        <ClosingCTA />
      </article>
    </SiteShell>
  );
}
