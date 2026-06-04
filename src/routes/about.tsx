import { Link, createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Sparkles, HeartHandshake, Compass, Users, BookOpen } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { photos } from "@/lib/photos";
const aboutHero = photos.about;
const aboutStudent = photos.aboutStudent;
const pathCollege = photos.pathCollege;
const pathCareer = photos.pathCareer;

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
    links: [{ rel: "canonical", href: "/about" }],
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
    <section ref={ref} className="relative isolate -mt-px h-[75svh] min-h-[480px] overflow-hidden">
      <motion.div style={{ scale, y }} className="absolute inset-0 -z-20">
        <img src={aboutHero} alt="Students walking toward an open doorway of light" className="h-full w-full object-cover" />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/50 to-background/20" />
      <motion.div style={{ y: textY }} className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-20 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-xs font-semibold uppercase tracking-[0.28em] text-primary"
        >
          Our story
        </motion.p>
        <h1 className="mt-5 max-w-4xl font-display text-5xl font-medium leading-[1.02] tracking-tight text-foreground sm:text-7xl lg:text-8xl">
          <Word text="We built this for" d={0.1} />
          <br />
          <Word text="the kids who never " d={0.3} />
          <span className="bg-gradient-to-r from-primary via-sky to-peach bg-clip-text italic text-transparent">
            <Word text="got the playbook." d={0.5} />
          </span>
        </h1>
      </motion.div>
    </section>
  );
}

function Word({ text, d = 0 }: { text: string; d?: number }) {
  return (
    <span className="inline-block overflow-hidden align-baseline">
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
    <section ref={ref} className="relative py-16 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">The Promise</p>
        <h2 className="mt-6 font-display text-3xl font-medium leading-[1.15] tracking-tight text-foreground/30 sm:text-5xl lg:text-6xl">
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
        const opacity = useTransform(scrollYProgress, [start * 0.8 + 0.1, end * 0.8 + 0.1], [0.2, 1]);
        return (
          <motion.span key={i} style={{ opacity }} className="text-foreground">
            {w}{" "}
          </motion.span>
        );
      })}
    </span>
  );
}

/* ------------------- CHAPTER SCROLL ------------------- */
const CHAPTERS = [
  {
    n: "01",
    eyebrow: "The beginning",
    title: "It started in a parking lot.",
    body: "A parent sat in her car after a PPT meeting, surrounded by paperwork she couldn't decode. Her son was 16. Nobody could answer her one question: what now?",
    img: aboutStudent,
    tone: "from-sky-soft to-background",
  },
  {
    n: "02",
    eyebrow: "What we heard",
    title: "Everyone was carrying it alone.",
    body: "Students didn't know they had a voice in the room. Families translated documents at midnight. Teachers rebuilt the same plan over and over with no shared memory.",
    img: pathCollege,
    tone: "from-peach-soft to-background",
  },
  {
    n: "03",
    eyebrow: "What we built",
    title: "One plan, four points of view.",
    body: "TransitionForward turns scattered paperwork, student voice, and family priorities into a shared Pathway Report — written in plain language and built to be edited together.",
    img: pathCareer,
    tone: "from-sky-soft to-peach-soft/60",
  },
  {
    n: "04",
    eyebrow: "Where we're headed",
    title: "Every student. A real next step.",
    body: "We're partnering with families, schools, universities, technical programs, and employers — so the path after high school is no longer a guess.",
    img: aboutHero,
    tone: "from-primary/15 to-peach-soft",
  },
];

function ChapterScroll() {
  return (
    <div className="relative">
      {CHAPTERS.map((c, i) => (
        <Chapter key={c.n} chapter={c} index={i} />
      ))}
    </div>
  );
}

function Chapter({ chapter, index }: { chapter: (typeof CHAPTERS)[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.15, 1]);
  const numberOpacity = useTransform(scrollYProgress, [0.1, 0.4], [0, 1]);
  const reversed = index % 2 === 1;

  return (
    <section ref={ref} className={`relative overflow-hidden bg-gradient-to-b ${chapter.tone} py-14 sm:py-20`}>
      <motion.div
        style={{ opacity: numberOpacity }}
        className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 select-none font-display text-[28vw] font-medium leading-none text-foreground/[0.04] sm:text-[20vw]"
      >
        {chapter.n}
      </motion.div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`grid items-center gap-12 lg:grid-cols-12 lg:gap-16 ${reversed ? "lg:[&>*:first-child]:order-2" : ""}`}>
          <motion.div style={{ y }} className="lg:col-span-7">
            <div className="relative aspect-[5/4] overflow-hidden rounded-3xl border border-foreground/10 shadow-lift">
              <motion.img
                style={{ scale: imgScale }}
                src={chapter.img}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute left-5 top-5 rounded-full bg-background/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground backdrop-blur">
                Chapter {chapter.n}
              </div>
            </div>
          </motion.div>

          <div className="lg:col-span-5">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-xs font-semibold uppercase tracking-[0.28em] text-primary"
            >
              {chapter.eyebrow}
            </motion.p>
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-4 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              {chapter.title}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mt-5 text-lg text-muted-foreground"
            >
              {chapter.body}
            </motion.p>
          </div>
        </div>
      </div>
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
          className="flex shrink-0 gap-12 pr-12"
        >
          {[...beliefs, ...beliefs].map((b, i) => (
            <div key={i} className="flex shrink-0 items-center gap-4 font-display text-3xl text-background sm:text-4xl lg:text-5xl">
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
          className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl lg:text-6xl"
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
