import { Link, createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Sparkles, HeartHandshake, Compass, Users, BookOpen } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { photos, srcSetFor } from "@/lib/photos";
import { toTitleCase } from "@/lib/title-case";
const aboutHero = photos.about;
const aboutHeroSrcSet = srcSetFor("about");
const aboutStudent = photos.aboutStudent;
const aboutStudentSrcSet = srcSetFor("aboutStudent");
const pathCollege = photos.pathCollege;
const pathCollegeSrcSet = srcSetFor("pathCollege");
const pathCareer = photos.pathCareer;
const pathCareerSrcSet = srcSetFor("pathCareer");


export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our story — TransitionForward" },
      {
        name: "description",
        content:
          "Why TransitionForward exists — a cinematic, scroll-told story of moving students with disabilities from paperwork to pathways, together.",
      },
      { property: "og:title", content: "Our story — TransitionForward" },
      {
        property: "og:description",
        content:
          "Why TransitionForward exists — a cinematic, scroll-told story of moving students with disabilities from paperwork to pathways, together.",
      },
      { property: "og:url", content: "/about" },
      { property: "og:image", content: aboutHero },
    ],
    links: [
      { rel: "canonical", href: "/about" },
      { rel: "preconnect", href: "https://images.unsplash.com", crossOrigin: "" },
      { rel: "preload", as: "image", href: aboutHero, imagesrcset: aboutHeroSrcSet, imagesizes: "100vw", fetchpriority: "high" },
    ],
  }),
  component: AboutPage,
});


function AboutPage() {
  return (
    <SiteShell>
      <AboutHero />
      <Manifesto />
      <ChapterScroll />
      <BeliefsMarquee />
      <ClosingCTA />
    </SiteShell>
  );
}

/* ------------------- HERO ------------------- */
function AboutHero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 220]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -80]);

  return (
    <section ref={ref} className="relative isolate -mt-px min-h-[88svh] overflow-hidden sm:min-h-[78svh]">
      <motion.div style={{ scale, y }} className="absolute inset-0 -z-20">
        <img src={aboutHero} srcSet={aboutHeroSrcSet} sizes="100vw" alt="Students walking toward an open doorway of light" fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/50 to-background/20" />
      <motion.div style={{ y: textY }} className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-6 pb-12 sm:px-8 sm:pb-20 lg:px-10">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-xs"
        >
          Our Story
        </motion.p>
        <h1 className="mt-4 max-w-4xl font-display text-[1.85rem] font-medium leading-[1.15] tracking-tight text-foreground sm:mt-5 sm:text-6xl sm:leading-[1.05] md:text-7xl lg:text-8xl">
          <Phrase text="We built this for" startDelay={0.1} />
          <br />
          <Phrase text="&nbsp;the kids who never" startDelay={0.3} />{" "}
          <span className="bg-gradient-to-r from-primary via-sky to-peach bg-clip-text italic text-transparent">
            <Phrase text="got the playbook." startDelay={0.5} />
          </span>
        </h1>
      </motion.div>
    </section>
  );
}

function Phrase({ text, startDelay = 0 }: { text: string; startDelay?: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          {i > 0 && " "}
          <Word text={w} d={startDelay + i * 0.06} />
        </span>
      ))}
    </>
  );
}

function Word({ text, d = 0 }: { text: string; d?: number }) {
  return (
    <span className="inline-block overflow-hidden pb-1 align-bottom">
      <motion.span
        initial={{ y: "100%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.9, delay: d, ease: [0.65, 0, 0.35, 1] }}
        className="inline-block"
      >
        {text}
      </motion.span>
    </span>
  );
}



/* ------------------- MANIFESTO ------------------- */
function Manifesto() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  // Fill text from left to right based on scroll
  return (
    <section ref={ref} className="relative py-14 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary sm:text-xs">The Promise</p>
        <h2 className="mt-5 font-display text-[1.75rem] font-medium leading-[1.2] tracking-tight text-foreground/30 sm:mt-6 sm:text-4xl md:text-5xl lg:text-6xl">
          <FillReveal scrollYProgress={scrollYProgress}>
            Transition planning shouldn't be a binder, an inbox, and a hope.
            It should be a clear, kind, shared plan — built around the student.
          </FillReveal>
        </h2>
      </div>
    </section>
  );
}

function FillReveal({
  children,
  scrollYProgress,
}: {
  children: string;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const words = children.split(" ");
  return (
    <span>
      {words.map((w, i) => {
        const start = i / words.length;
        const end = start + 1 / words.length;
        const opacity = useTransform(scrollYProgress, [start * 0.45 + 0.1, end * 0.45 + 0.1], [0.2, 1]);
        return (
          <motion.span key={i} style={{ opacity }} className="text-foreground">
            {w}{" "}
          </motion.span>
        );
      })}
    </span>
  );
}

/* ------------------- CHAPTER SCROLL (book-like) ------------------- */
const CHAPTERS = [
  {
    n: "I",
    label: "Chapter One",
    eyebrow: "The beginning",
    title: "It started in a parking lot.",
    opener:
      "A parent sat in her car after a PPT meeting, surrounded by paperwork she couldn't decode.",
    paragraphs: [
      "Her son was sixteen. The folder on the passenger seat was thick with acronyms — IEP, PPT, BIP, FAPE — and thin on the one thing she actually needed: a clear next step.",
      "She turned the key. She didn't drive. She just sat there, watching other parents leave the building with the same quiet, overwhelmed look. Nobody could answer her one question.",
    ],
    pullQuote: "What now?",
    img: aboutStudent,
    imgSrcSet: aboutStudentSrcSet,

    tone: "from-sky-soft to-background",
  },
  {
    n: "II",
    label: "Chapter Two",
    eyebrow: "What we heard",
    title: "Everyone was carrying it alone.",
    opener:
      "We listened to families, students, and teachers for a year. The story rhymed everywhere we went.",
    paragraphs: [
      "Students didn't know they had a voice in the room — meetings happened around them, not with them. Families translated dense documents at midnight, hoping they hadn't missed something that mattered.",
      "Teachers and case managers rebuilt the same plan, again and again, with no shared memory between them. Everyone wanted the student to move forward. No one had the map.",
    ],
    pullQuote: "Everyone wanted the student to move forward. No one had the map.",
    img: pathCollege,
    imgSrcSet: pathCollegeSrcSet,

    tone: "from-peach-soft to-background",
  },
  {
    n: "III",
    label: "Chapter Three",
    eyebrow: "What we built",
    title: "One plan, four points of view.",
    opener:
      "TransitionForward turns scattered paperwork, student voice, and family priorities into one shared Pathway Report.",
    paragraphs: [
      "It is written in plain language. It is built to be edited together. Students, families, educators, and partners each see the same plan from their own angle — and each can add to it.",
      "AI helps with the heavy lifting: extracting goals from an IEP, suggesting resources, drafting talking points. Humans still decide. The student is still the author.",
    ],
    pullQuote: "AI assists. Humans decide. The student is the author.",
    img: pathCareer,
    imgSrcSet: pathCareerSrcSet,

    tone: "from-sky-soft to-peach-soft/60",
  },
  {
    n: "IV",
    label: "Chapter Four",
    eyebrow: "Where we're headed",
    title: "Every student. A real next step.",
    opener:
      "We're partnering with families, schools, universities, technical programs, and employers.",
    paragraphs: [
      "So the path after high school is no longer a guess. So the parking-lot moment becomes a starting line instead of a dead end.",
      "There is a generation of students whose plans deserve to be more than a binder. This is the book we're writing with them — and you are invited to turn the page.",
    ],
    pullQuote: "Forward, together.",
    img: aboutHero,
    imgSrcSet: aboutHeroSrcSet,

    tone: "from-primary/15 to-peach-soft",
  },
];

function ChapterScroll() {
  return (
    <div className="relative">
      <ReadingRail />
      {CHAPTERS.map((c, i) => (
        <Chapter key={c.n} chapter={c} index={i} total={CHAPTERS.length} />
      ))}
    </div>
  );
}

function ReadingRail() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0.15, 0.85], [0, 1]);
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed left-0 right-0 top-0 z-40 h-[2px] origin-left bg-gradient-to-r from-primary via-sky to-peach"
    />
  );
}

function Chapter({
  chapter,
  index,
  total,
}: {
  chapter: (typeof CHAPTERS)[number];
  index: number;
  total: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  const rotateYDesktop = useTransform(scrollYProgress, [0, 0.5, 1], [10, 0, -8]);
  const pageOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.5, 1, 1, 0.6]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.18, 1.02]);
  const imgYDesktop = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const numberOpacity = useTransform(scrollYProgress, [0.1, 0.45], [0, 1]);
  const reversed = index % 2 === 1;

  // Disable 3D rotation on mobile (causes horizontal overflow + jitter) and parallax Y offset.
  const rotateY = isMobile ? 0 : rotateYDesktop;
  const imgY = isMobile ? 0 : imgYDesktop;

  const serif = "Georgia, 'Iowan Old Style', 'Apple Garamond', serif";

  return (
    <section
      ref={ref}
      className={`relative overflow-hidden bg-gradient-to-b ${chapter.tone} py-14 sm:py-20 lg:py-28`}
      style={{ perspective: "1600px" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 30%, rgba(0,0,0,0.6) 0.5px, transparent 0.6px), radial-gradient(circle at 75% 65%, rgba(0,0,0,0.5) 0.5px, transparent 0.6px)",
          backgroundSize: "3px 3px, 5px 5px",
        }}
      />

      <motion.div
        style={{ opacity: numberOpacity }}
        className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 select-none font-display text-[40vw] font-medium leading-none tracking-tighter text-foreground/[0.05] sm:-top-6 sm:text-[26vw] lg:text-[18vw]"
      >
        {chapter.n}
      </motion.div>

      <motion.div
        style={{ rotateY, opacity: pageOpacity, transformStyle: "preserve-3d" }}
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="mb-7 flex items-center gap-2 sm:mb-10 sm:gap-4">
          <span className="h-px flex-1 bg-foreground/15" />
          <span className="font-display text-[9px] uppercase tracking-[0.3em] text-foreground/60 sm:text-[11px] sm:tracking-[0.4em]">
            {chapter.label} · {String(index + 1).padStart(2, "0")} of{" "}
            {String(total).padStart(2, "0")}
          </span>
          <span className="h-px flex-1 bg-foreground/15" />
        </div>

        <div
          className={`grid items-start gap-8 sm:gap-10 lg:grid-cols-12 lg:gap-16 ${
            reversed ? "lg:[&>*:first-child]:order-2" : ""
          }`}
        >
          <motion.div style={{ y: imgY }} className="lg:col-span-6">
            <figure className="relative aspect-[4/3] overflow-hidden rounded-sm border border-foreground/10 shadow-lift sm:aspect-[4/5]">
              <motion.img
                style={{ scale: imgScale }}
                src={chapter.img}
                srcSet={chapter.imgSrcSet}
                sizes="(min-width: 1024px) 50vw, 100vw"
                loading="lazy"
                decoding="async"
                alt=""
                className="h-full w-full object-cover sepia-[0.08] saturate-[0.95]"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-transparent" />
              <figcaption className="absolute bottom-3 left-4 right-4 font-display text-[10px] italic tracking-wide text-background/90 sm:bottom-4 sm:left-5 sm:right-5 sm:text-[11px]">
                Plate {String(index + 1).padStart(2, "0")} — {chapter.eyebrow}.
              </figcaption>
            </figure>
          </motion.div>

          <div className="lg:col-span-6">
            <p className="font-display text-[10px] uppercase tracking-[0.3em] text-primary sm:text-[11px] sm:tracking-[0.4em]">
              {toTitleCase(chapter.eyebrow)}
            </p>
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-3 font-display text-[2rem] font-medium leading-[1.1] tracking-tight text-foreground sm:mt-4 sm:text-4xl md:text-5xl lg:text-[3.25rem]"
            >
              {chapter.title}
            </motion.h3>

            <div className="mt-5 flex items-center gap-3 text-foreground/40 sm:mt-6">
              <span className="h-px w-8 bg-foreground/30 sm:w-10" />
              <span className="text-xs">❦</span>
              <span className="h-px w-8 bg-foreground/30 sm:w-10" />
            </div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="mt-5 text-[1.05rem] leading-[1.7] text-foreground/85 first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-display first-letter:text-[3rem] first-letter:font-medium first-letter:leading-[0.85] first-letter:text-primary sm:mt-6 sm:text-[1.15rem] sm:leading-[1.75] sm:first-letter:mr-3 sm:first-letter:text-[3.75rem]"
              style={{ fontFamily: serif }}
            >
              {chapter.opener}
            </motion.p>

            {chapter.paragraphs.map((p, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="mt-4 text-[1rem] leading-[1.75] text-foreground/75 sm:mt-5 sm:text-[1.05rem] sm:leading-[1.8]"
                style={{ fontFamily: serif }}
              >
                {p}
              </motion.p>
            ))}

            <motion.blockquote
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-7 border-l-2 border-primary/70 pl-4 font-display text-xl italic leading-snug text-foreground/90 sm:mt-8 sm:pl-5 sm:text-2xl md:text-3xl"
            >
              “{chapter.pullQuote}”
            </motion.blockquote>

            <div className="mt-8 flex items-center justify-between font-display text-[9px] uppercase tracking-[0.3em] text-foreground/40 sm:mt-10 sm:text-[10px] sm:tracking-[0.35em]">
              <span>TransitionForward</span>
              <span>— {index + 1} —</span>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ------------------- BELIEFS MARQUEE ------------------- */
function BeliefsMarquee() {
  const beliefs = [
    { icon: Sparkles, text: "Student voice belongs in every meeting." },
    { icon: HeartHandshake, text: "Families deserve plain language." },
    { icon: Compass, text: "A goal without a next step is a wish." },
    { icon: Users, text: "No one moves forward alone." },
    { icon: BookOpen, text: "AI assists. Humans decide." },
  ];
  return (
    <section className="relative overflow-hidden bg-foreground py-14 text-background">
      <p className="mx-auto mb-10 max-w-7xl px-4 text-xs font-semibold uppercase tracking-[0.28em] text-background/60 sm:px-6 lg:px-8">
        What we believe
      </p>
      <div className="flex overflow-hidden">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="flex shrink-0 gap-6 pr-6 sm:gap-12 sm:pr-12"
        >
          {[...beliefs, ...beliefs].map((b, i) => (
            <div key={i} className="flex shrink-0 items-center gap-3 font-display text-xl text-background sm:gap-4 sm:text-3xl md:text-4xl lg:text-5xl">
              <b.icon className="h-6 w-6 text-peach" />
              {b.text}
              <span className="text-background/30">·</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------- CLOSING CTA ------------------- */
function ClosingCTA() {
  return (
    <section className="relative isolate overflow-hidden py-16 sm:py-20">
      <div className="absolute inset-0 -z-10 bg-gradient-hero" />
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-[2.25rem] font-medium tracking-tight text-foreground sm:text-5xl lg:text-6xl"
        >
          Forward, together.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-5 text-lg text-foreground/70"
        >
          Help us build the platform every transition plan deserves.
        </motion.p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/waitlist" className="inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-sm font-semibold text-background shadow-lift hover:scale-[1.02]">
            Join the waitlist <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/research" className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background/60 px-7 py-3.5 text-sm font-semibold text-foreground backdrop-blur hover:bg-background">
            See the research
          </Link>
        </div>
      </div>
    </section>
  );
}
