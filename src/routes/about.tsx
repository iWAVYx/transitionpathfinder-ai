import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  FileText,
  Compass,
  Calendar,
  Users,
  GraduationCap,
  Building2,
  Heart,
  MapPin,
  Briefcase,
  BookOpen,
  Target,
  ShieldCheck,
  HandHeart,
  School,
  UserRound,
  Network,
  CheckCircle2,
  Quote,
  ChevronDown,
  Sparkles,
  Route as RouteIcon,
  Lightbulb,
  Layers,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Assets
import heroImg from "@/assets/about-cinematic.jpg";
import heroWash from "@/assets/about-hero-wash.jpg";
import heroTopo from "@/assets/about-hero-topo.png";
import heroCollage from "@/assets/about-hero-collage.png";
import founderImg from "@/assets/home-educator.jpg";
import paperworkImg from "@/assets/iep-upload.jpg";
import classroomImg from "@/assets/educators-hero-v2.jpg";
import familyImg from "@/assets/families-hero-v2.jpg";
import studentImg from "@/assets/home-student-photo.jpg";
import pathwayImg from "@/assets/pathway-hero.jpg";
import dashboardImg from "@/assets/dashboard-hero.jpg";
import ctMapImg from "@/assets/framework-bg-topo.jpg";
import ctaImg from "@/assets/home-road.jpg";
import platformImg from "@/assets/platform-hero-v2.jpg";
import resourcesImg from "@/assets/resources-hero-v2.jpg";
import partnersImg from "@/assets/partners-hero.jpg";
import frameworkImg from "@/assets/framework-bg-sunrise.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Transition Forward CT" },
      {
        name: "description",
        content:
          "Built from the classroom. Designed for the future. Transition Forward CT turns confusing paperwork into clear pathways for students receiving special education services.",
      },
      { property: "og:title", content: "About — Transition Forward CT" },
      {
        property: "og:description",
        content:
          "The founder story and mission behind Transition Forward CT — from MBA to MAT to a platform that moves students from paperwork to possibility.",
      },
      { property: "og:image", content: heroImg },
      { property: "twitter:card", content: "summary_large_image" },
      { property: "twitter:image", content: heroImg },
    ],
  }),
  component: AboutPage,
});

/* -------------------------------------------------------------------------- */
/*  Tiny primitives                                                            */
/* -------------------------------------------------------------------------- */

function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 0.61, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  HERO                                                                       */
/* -------------------------------------------------------------------------- */

function Hero() {
  const { scrollY } = useScroll();
  const reduce = useReducedMotion();
  // Layered parallax: bg moves slow w/ ken-burns zoom, mid orbs faster,
  // copy lifts and fades as user scrolls, vignette deepens.
  const bgY = useTransform(scrollY, [0, 800], [0, 180]);
  const bgScale = useTransform(scrollY, [0, 800], [1.08, 1.18]);
  const midY = useTransform(scrollY, [0, 800], [0, 90]);
  const copyY = useTransform(scrollY, [0, 800], [0, -40]);
  const copyOpacity = useTransform(scrollY, [0, 500, 800], [1, 1, 0.4]);
  const vignette = useTransform(scrollY, [0, 600], [0.35, 0.75]);
  const collageY = useTransform(scrollY, [0, 600], [0, -50]);
  const topoY = useTransform(scrollY, [0, 800], [0, 120]);
  const washScale = useTransform(scrollY, [0, 800], [1.05, 1.15]);
  const collageBgY = useTransform(scrollY, [0, 800], [0, -90]);

  const lineEase = [0.22, 0.61, 0.36, 1] as const;
  const lineInitial = reduce ? false : { y: "110%", opacity: 0 };
  const lineAnimate = { y: "0%", opacity: 1 };

  return (
    <section className="relative isolate min-h-[92vh] overflow-hidden bg-[#1a1410]">
      {/* Layer 1 — painterly warm wash (base) with ken-burns */}
      <motion.div
        style={reduce ? undefined : { y: bgY, scale: washScale }}
        className="absolute inset-0 -z-20 will-change-transform"
        aria-hidden
      >
        <img
          src={heroWash}
          alt=""
          className="h-full w-full object-cover object-[30%_center]"
        />
      </motion.div>

      {/* Layer 2 — original cinematic photo, softened and blended in */}
      <motion.div
        style={reduce ? undefined : { y: bgY, scale: bgScale }}
        className="absolute inset-0 -z-20 mix-blend-soft-light opacity-60 will-change-transform"
        aria-hidden
      >
        <img
          src={heroImg}
          alt=""
          className="h-full w-full object-cover object-center"
        />
      </motion.div>

      {/* Layer 3 — topographic line overlay, drifts with scroll */}
      <motion.div
        style={reduce ? undefined : { y: topoY }}
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] mix-blend-overlay"
        aria-hidden
      >
        <img
          src={heroTopo}
          alt=""
          className="h-full w-full object-cover"
        />
      </motion.div>

      {/* Layer 4 — torn-paper collage shapes, opposite drift for depth */}
      <motion.div
        style={reduce ? undefined : { y: collageBgY }}
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-multiply dark:mix-blend-screen dark:opacity-20"
        aria-hidden
      >
        <img
          src={heroCollage}
          alt=""
          className="h-full w-full scale-110 object-cover object-center"
        />
      </motion.div>

      {/* Layer 5 — warm color wash gradients tying the palette together */}
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-background/10 via-background/40 to-background"
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_18%_30%,rgba(255,196,120,0.30),transparent_55%),radial-gradient(ellipse_at_82%_72%,rgba(64,116,148,0.28),transparent_60%),radial-gradient(ellipse_at_55%_95%,rgba(196,92,76,0.22),transparent_55%)]"
        aria-hidden
      />
      <motion.div
        style={reduce ? undefined : { opacity: vignette }}
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(20,12,8,0.65)_100%)]"
        aria-hidden
      />
      {/* Layer 6 — film grain */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.09] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
        aria-hidden
      />

      {/* Layer 7 — floating midground orbs tuned to the wash palette */}
      {!reduce && (
        <motion.div
          style={{ y: midY }}
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden
        >
          <div className="absolute left-[6%] top-[14%] h-80 w-80 rounded-full bg-amber-300/25 blur-3xl" />
          <div className="absolute right-[4%] top-[50%] h-[28rem] w-[28rem] rounded-full bg-teal-500/20 blur-3xl" />
          <div className="absolute left-[42%] top-[72%] h-72 w-72 rounded-full bg-rose-400/20 blur-3xl" />
          <div className="absolute left-[30%] top-[8%] h-48 w-48 rounded-full bg-orange-300/20 blur-3xl" />
        </motion.div>
      )}

      <motion.div
        style={reduce ? undefined : { y: copyY, opacity: copyOpacity }}
        className="container mx-auto px-6 pb-28 pt-32 sm:pt-40 md:pb-36 md:pt-48"
      >
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          {/* Copy with line-by-line mask reveals */}
          <div className="max-w-2xl">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: lineEase }}
            >
              <SectionEyebrow>Our Story</SectionEyebrow>
            </motion.div>

            <h1 className="mt-6 font-display text-4xl font-black leading-[1.02] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={lineInitial}
                  animate={lineAnimate}
                  transition={{ duration: 0.95, delay: 0.15, ease: lineEase }}
                >
                  Built from the
                </motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={lineInitial}
                  animate={lineAnimate}
                  transition={{ duration: 0.95, delay: 0.3, ease: lineEase }}
                >
                  Classroom.
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-2">
                <motion.span
                  className="block bg-gradient-to-r from-primary via-amber-500 to-orange-500 bg-clip-text text-transparent"
                  initial={lineInitial}
                  animate={lineAnimate}
                  transition={{ duration: 0.95, delay: 0.5, ease: lineEase }}
                >
                  Designed for the Future.
                </motion.span>
              </span>
            </h1>

            <div className="mt-7 overflow-hidden">
              <motion.p
                initial={reduce ? false : { y: "100%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.75, ease: lineEase }}
                className="max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
              >
                Transition Forward helps students receiving special education
                services, families, educators, and school teams move from
                confusing paperwork to clear, personalized pathways.
              </motion.p>
            </div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.95, ease: lineEase }}
              className="mt-9 flex flex-wrap gap-3"
            >
              <Button asChild size="lg" className="group shadow-lg shadow-primary/20">
                <Link to="/platform">
                  Explore the Platform
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="backdrop-blur">
                <Link to="/waitlist">Join the Waitlist</Link>
              </Button>
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.15 }}
              className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Rooted in Connecticut
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Student-centered
              </div>
              <div className="flex items-center gap-2">
                <HandHeart className="h-4 w-4 text-primary" /> Built by an educator
              </div>
            </motion.div>
          </div>

          {/* Visual collage — drifts opposite to copy for depth */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.5, ease: lineEase }}
            className="relative hidden lg:block"
          >
            <motion.div
              style={reduce ? undefined : { y: collageY }}
              className="relative aspect-[4/5] w-full"
            >
              <div className="absolute inset-0 overflow-hidden rounded-[2rem] border border-border/60 shadow-2xl ring-1 ring-white/10">
                <img
                  src={pathwayImg}
                  alt="Student pathway planning"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/25 via-transparent to-amber-500/15" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
              </div>

              {/* Floating Pathway Report card */}
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.8, ease: lineEase }}
                className="absolute -left-8 bottom-10 w-64 rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                  <FileText className="h-4 w-4" /> Pathway Report
                </div>
                <div className="mt-2 text-sm font-semibold">Maya, Grade 11</div>
                <div className="mt-3 space-y-1.5">
                  {["Self-Advocacy", "Workforce", "Independent Living"].map(
                    (l, i) => (
                      <div key={l} className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{l}</span>
                          <span>{[82, 64, 73][i]}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${[82, 64, 73][i]}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 1.3 + i * 0.15, duration: 1 }}
                            className="h-full rounded-full bg-gradient-to-r from-primary to-amber-500"
                          />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </motion.div>

              {/* Floating compass — gentle idle float */}
              <motion.div
                initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                animate={
                  reduce
                    ? { opacity: 1 }
                    : { opacity: 1, scale: 1, y: [0, -8, 0] }
                }
                transition={
                  reduce
                    ? { duration: 0.4 }
                    : {
                        opacity: { delay: 1.1, duration: 0.6 },
                        scale: { delay: 1.1, duration: 0.6 },
                        y: { repeat: Infinity, duration: 6, ease: "easeInOut" },
                      }
                }
                className="absolute -right-6 top-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card/95 shadow-xl backdrop-blur"
              >
                <Compass className="h-9 w-9 text-primary" />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="mt-16 flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-muted-foreground"
        >
          <span className="h-px w-10 bg-muted-foreground/40" />
          Scroll
          <motion.span
            animate={reduce ? undefined : { y: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </motion.span>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  FOUNDER STORY                                                              */
/* -------------------------------------------------------------------------- */

function FounderStory() {
  const [open, setOpen] = useState(false);
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-amber-50/30 to-background dark:via-amber-950/10">
      <div
        className="absolute inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage: `url(${frameworkImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="container mx-auto px-6 py-20 md:py-28">
        <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-16">
          {/* Image */}
          <Reveal>
            <div className="relative">
              <div className="aspect-[4/5] overflow-hidden rounded-[2rem] border border-border/60 shadow-xl">
                <img
                  src={founderImg}
                  alt="Founder, special educator in Connecticut"
                  className="h-full w-full object-cover object-center"
                />
              </div>
              <div className="absolute -bottom-6 -right-4 hidden max-w-[14rem] rounded-2xl border border-border bg-card p-4 shadow-lg sm:block">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Founder
                </div>
                <div className="mt-1 text-base font-bold">
                  CT Special Educator
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  MBA · MAT in Special Education K–12
                </div>
              </div>
            </div>
          </Reveal>

          {/* Story */}
          <Reveal delay={0.1}>
            <SectionEyebrow>Founder–Market Fit</SectionEyebrow>
            <h2 className="mt-4 font-display text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
              Built From the <br />
              <span className="text-primary">Inside</span> of This Work.
            </h2>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                Transition Forward is deeply connected to my personal,
                academic, and professional journey. My path into special
                education wasn't an accident — it was shaped by business
                training, classroom experience, community awareness, and a
                growing understanding that students receiving special education
                services need more than systems that document their needs.{" "}
                <span className="font-semibold text-foreground">
                  They need systems that help them move forward.
                </span>
              </p>
              <p>
                Before entering the classroom, I completed my{" "}
                <span className="font-semibold text-foreground">MBA</span> —
                learning systems, operations, strategy, data, user experience,
                and how organizations solve real problems. Then I completed my{" "}
                <span className="font-semibold text-foreground">
                  MAT in Special Education K–12
                </span>{" "}
                with a full student teaching year across{" "}
                <span className="font-semibold text-foreground">
                  New Haven and Hamden Public Schools
                </span>
                .
              </p>
              <p>
                As a Black male special educator from Connecticut, this work is
                also personal. Many students — especially from historically
                underserved communities — need adults and systems that see more
                than their paperwork: their ability, their voice, their
                interests, their family context, and their future.
              </p>
            </div>

            <button
              onClick={() => setOpen((o) => !o)}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              {open ? "Hide" : "Read"} the Full Founder–Market Fit
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  open && "rotate-180",
                )}
              />
            </button>
            <motion.div
              initial={false}
              animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
              transition={{ duration: 0.4 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-4 border-l-2 border-primary/40 pl-4 text-sm leading-relaxed text-muted-foreground">
                <p>
                  Throughout my student teaching, I worked with students who
                  were creative, funny, capable, thoughtful, and full of
                  potential — even when the systems around them didn't always
                  make their next steps feel clear. I also saw the weight
                  educators and case managers carry every day: planning
                  lessons, supporting IEP goals, tracking progress, preparing
                  for meetings, communicating with families, managing
                  documents, and trying to make sure students aren't only
                  passing classes, but preparing for life after high school.
                </p>
                <p>
                  My time in New Haven and Hamden helped me understand that
                  transition planning is not just a compliance requirement. It
                  is one of the most important parts of special education
                  because it asks a powerful question:{" "}
                  <span className="font-semibold text-foreground">
                    what kind of future is this student being prepared for?
                  </span>
                </p>
                <p>
                  In classrooms and meetings, I saw families who care deeply
                  but don't always have the language, tools, or clarity to
                  navigate the process. I saw students with goals written into
                  their plans who still needed help understanding what those
                  goals meant in real life. I saw educators who knew what
                  students needed but didn't have one clear system to connect
                  documents, goals, resources, action steps, and opportunities.
                </p>
                <p className="font-semibold text-foreground">
                  That is the gap Transition Forward is built to address.
                </p>
                <p>
                  Transition Forward combines my business background with my
                  special education training. My MBA helps me think about the
                  platform as a scalable, sustainable, user-centered service.
                  My MAT and student teaching keep it grounded in the real
                  needs of students, families, teachers, case managers,
                  schools, and districts.
                </p>
                <p>
                  This is not just a technology idea to me. It is a response to
                  what I have seen — built to help students feel seen, families
                  feel less overwhelmed, educators turn their work into clearer
                  action, schools and districts understand where students are
                  in the process, and community partners become part of the
                  pathway. Most importantly, it is built to help students
                  receiving special education services move from{" "}
                  <span className="font-semibold text-foreground">
                    paperwork to possibility.
                  </span>
                </p>
              </div>
            </motion.div>

          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  TIMELINE                                                                   */
/* -------------------------------------------------------------------------- */

const TIMELINE = [
  {
    label: "MBA",
    title: "Systems, Strategy, Sustainability",
    icon: Briefcase,
  },
  {
    label: "MAT",
    title: "Special Education K–12",
    icon: GraduationCap,
  },
  {
    label: "Student Teaching",
    title: "New Haven & Hamden Public Schools",
    icon: School,
  },
  {
    label: "The Gap",
    title: "Families & teams need clearer tools",
    icon: Lightbulb,
  },
  {
    label: "The Response",
    title: "Transition Forward",
    icon: Sparkles,
  },
];

function Timeline() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div className="container mx-auto px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>The Journey</SectionEyebrow>
          <h2 className="mt-4 font-display text-3xl font-black sm:text-4xl md:text-5xl">
            From MBA to MAT to Transition Forward
          </h2>
        </Reveal>

        <div className="relative mt-14">
          {/* Animated line */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            className="absolute left-6 right-6 top-8 hidden h-0.5 origin-left rounded-full bg-gradient-to-r from-primary via-amber-500 to-orange-500 md:block"
          />
          {/* Vertical line for mobile */}
          <div className="absolute bottom-0 left-6 top-0 w-0.5 bg-gradient-to-b from-primary via-amber-500 to-orange-500 md:hidden" />

          <div className="grid gap-6 md:grid-cols-5 md:gap-4">
            {TIMELINE.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.label} delay={i * 0.08}>
                  <div className="relative pl-16 md:pl-0">
                    <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card shadow-md md:relative md:mx-auto md:mb-5 md:h-16 md:w-16">
                      <Icon className="h-5 w-5 text-primary md:h-7 md:w-7" />
                    </div>
                    <div className="md:text-center">
                      <div className="text-xs font-bold uppercase tracking-widest text-primary">
                        {step.label}
                      </div>
                      <div className="mt-1 text-sm font-semibold leading-snug">
                        {step.title}
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  PROBLEM / SOLUTION                                                         */
/* -------------------------------------------------------------------------- */

const PROBLEMS = [
  "Transition planning feels confusing",
  "Families need clarity, not jargon",
  "Students need their voice heard",
  "Educators need better tools",
  "Resources are scattered everywhere",
];

const SOLUTIONS = [
  { label: "Student Profile", icon: UserRound },
  { label: "IEP Upload & Review", icon: FileText },
  { label: "Student Voice", icon: HandHeart },
  { label: "Pathway Report", icon: Compass },
  { label: "Resource Library", icon: BookOpen },
  { label: "Partner Network", icon: Network },
  { label: "Calendar & Meeting Prep", icon: Calendar },
];

function ProblemSolution() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      {/* Soft wash sitting on the background, no boxes */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 30%, oklch(0.72 0.14 25 / 0.08), transparent 60%), radial-gradient(55% 45% at 80% 70%, oklch(0.78 0.13 60 / 0.10), transparent 60%)",
        }}
      />

      <div className="container mx-auto max-w-6xl px-6">
        <div className="grid gap-x-16 gap-y-20 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
          {/* Problem — editorial, no card */}
          <Reveal>
            <div className="relative">
              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-red-600/80 dark:text-red-400/80">
                <span className="h-px w-8 bg-red-500/60" />
                The Problem
              </div>
              <h3 className="mt-5 font-display text-4xl font-black leading-[1.05] sm:text-5xl">
                Paperwork
                <br />
                <span className="italic text-muted-foreground/70">
                  without a path.
                </span>
              </h3>
              <div className="mt-8 max-w-md space-y-4 border-l border-red-500/30 pl-5 text-[15px] leading-relaxed text-muted-foreground">
                {PROBLEMS.map((p) => (
                  <p key={p}>{p}.</p>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Connecting rule — replaces the visual divide between two boxes */}
          <div
            aria-hidden
            className="hidden lg:flex h-full w-px items-center justify-center"
          >
            <div className="h-3/4 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
          </div>

          {/* Response — same editorial register, warm side */}
          <Reveal delay={0.1}>
            <div className="relative lg:pt-12">
              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-primary">
                <span className="h-px w-8 bg-primary/60" />
                The Response
              </div>
              <h3 className="mt-5 font-display text-4xl font-black leading-[1.05] sm:text-5xl">
                A platform
                <br />
                <span className="italic text-primary">built for the plan.</span>
              </h3>

              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-[15px] text-foreground/80">
                {SOLUTIONS.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <span
                      key={s.label}
                      className="inline-flex items-center gap-1.5"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <span>{s.label}</span>
                      {i < SOLUTIONS.length - 1 && (
                        <span className="ml-3 h-1 w-1 rounded-full bg-border" />
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  FLOW                                                                       */
/* -------------------------------------------------------------------------- */

const FLOW = [
  { label: "Paperwork", icon: FileText },
  { label: "Clarity", icon: Lightbulb },
  { label: "Pathway", icon: RouteIcon },
  { label: "Action", icon: Target },
  { label: "Future", icon: Sparkles },
];

function PaperworkToPossibility() {
  return (
    <section className="relative overflow-hidden bg-[#0d1117] py-28 text-white md:py-36">
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `url(${frameworkImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 0%, oklch(0.72 0.14 60 / 0.18), transparent 70%), radial-gradient(60% 50% at 50% 100%, oklch(0.55 0.18 25 / 0.15), transparent 70%)",
        }}
      />

      <div className="container relative mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-amber-300/90">
            <span className="h-px w-8 bg-amber-300/60" />
            The Flow
            <span className="h-px w-8 bg-amber-300/60" />
          </div>
          <h2 className="mt-5 font-display text-4xl font-black leading-[1.05] sm:text-5xl md:text-6xl">
            From Paperwork{" "}
            <span className="italic text-amber-300/90">to Possibility.</span>
          </h2>
          <p className="mt-5 text-white/60">
            Five steps. One continuous path — clearer, faster, together.
          </p>
        </Reveal>

        {/* Continuous path */}
        <div className="relative mt-20">
          {/* Horizontal line (desktop) */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-7 hidden md:block"
          >
            <div className="mx-[8%] h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
          </div>
          {/* Vertical line (mobile) */}
          <div
            aria-hidden
            className="absolute bottom-0 left-7 top-0 w-px bg-gradient-to-b from-transparent via-amber-300/30 to-transparent md:hidden"
          />

          <div className="grid gap-10 md:grid-cols-5 md:gap-4">
            {FLOW.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.label} delay={i * 0.1}>
                  <div className="relative pl-20 md:pl-0 md:text-center">
                    {/* Node */}
                    <div className="absolute left-0 top-0 md:relative md:left-auto md:mx-auto">
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-amber-300/30 bg-[#0d1117] shadow-[0_0_0_6px_rgba(13,17,23,1)]">
                        <Icon className="h-5 w-5 text-amber-300" />
                      </div>
                    </div>
                    <div className="md:mt-6">
                      <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300/70">
                        Step 0{i + 1}
                      </div>
                      <div className="mt-1 font-display text-xl font-black">
                        {step.label}
                      </div>
                      <div className="mt-2 text-sm leading-relaxed text-white/55 md:mx-auto md:max-w-[14rem]">
                        {
                          [
                            "Upload the IEP and meet the student.",
                            "Translate documents into plain language.",
                            "Generate the personalized pathway.",
                            "Action items, partners, meeting prep.",
                            "College, career, independent life.",
                          ][i]
                        }
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  AUDIENCES                                                                  */
/* -------------------------------------------------------------------------- */

const AUDIENCES = [
  {
    key: "students",
    label: "Students",
    icon: GraduationCap,
    image: studentImg,
    blurb: "Understand your goals, voice, supports, and next steps.",
  },
  {
    key: "families",
    label: "Families",
    icon: Heart,
    image: familyImg,
    blurb: "Prepare for meetings, decode documents, and support follow-through.",
  },
  {
    key: "educators",
    label: "Educators",
    icon: Users,
    image: classroomImg,
    blurb: "Organize planning, reports, resources, and action items in one place.",
  },
  {
    key: "schools",
    label: "Schools",
    icon: School,
    image: dashboardImg,
    blurb: "See transition planning progress and support your teams.",
  },
  {
    key: "districts",
    label: "Districts",
    icon: Building2,
    image: platformImg,
    blurb: "Track implementation, readiness trends, and resource engagement.",
  },
  {
    key: "partners",
    label: "Partners",
    icon: Network,
    image: partnersImg,
    blurb: "Connect real programs, services, and opportunities to students.",
  },
  {
    key: "funders",
    label: "Funders",
    icon: HandHeart,
    image: resourcesImg,
    blurb: "Support a scalable, mission-driven transition planning platform.",
  },
];

function Audiences() {
  const [active, setActive] = useState(AUDIENCES[0].key);
  const current = AUDIENCES.find((a) => a.key === active) ?? AUDIENCES[0];
  const Icon = current.icon;

  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div className="container mx-auto px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>Built for Everyone Around the Student</SectionEyebrow>
          <h2 className="mt-4 font-display text-3xl font-black sm:text-4xl md:text-5xl">
            One Platform. Seven Points of View.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 lg:flex-col">
            {AUDIENCES.map((a) => {
              const I = a.icon;
              const isActive = a.key === active;
              return (
                <button
                  key={a.key}
                  onClick={() => setActive(a.key)}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border bg-card hover:border-primary/40 hover:bg-card/80",
                  )}
                >
                  <I className="h-4 w-4 shrink-0" />
                  <span>{a.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active panel */}
          <motion.div
            key={current.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-lg"
          >
            <div className="grid md:grid-cols-2">
              <div className="relative aspect-[4/3] md:aspect-auto">
                <img
                  src={current.image}
                  alt={current.label}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/40" />
              </div>
              <div className="flex flex-col justify-center p-8 md:p-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-amber-500/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-5 font-display text-2xl font-black sm:text-3xl">
                  For {current.label}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  {current.blurb}
                </p>
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Learn more <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  MISSION + VALUES                                                           */
/* -------------------------------------------------------------------------- */

const VALUES = [
  { icon: HandHeart, label: "Student Voice", desc: "Students at the center, always." },
  { icon: Lightbulb, label: "Clarity", desc: "Plain language over paperwork jargon." },
  { icon: ShieldCheck, label: "Equity", desc: "Every student gets a real plan." },
  { icon: Target, label: "Action", desc: "Insights that turn into next steps." },
  { icon: Users, label: "Collaboration", desc: "Families, teams, partners aligned." },
  { icon: Sparkles, label: "Dignity", desc: "Respect woven into every interaction." },
];

function MissionValues() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-primary/5 to-background py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <Reveal>
            <SectionEyebrow>Mission</SectionEyebrow>
            <h2 className="mt-4 font-display text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
              Turn Transition Planning into a{" "}
              <span className="text-primary">Clear, Personalized Pathway.</span>
            </h2>
            <div className="mt-6 rounded-2xl border-l-4 border-primary bg-card/60 p-5 backdrop-blur">
              <Quote className="h-5 w-5 text-primary" />
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                Transition Forward helps students receiving special education
                services, families, educators, and school teams turn transition
                planning into a clear, personalized, and actionable pathway.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <SectionEyebrow>Values</SectionEyebrow>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {VALUES.map((v) => {
                const Icon = v.icon;
                return (
                  <div
                    key={v.label}
                    className="group rounded-2xl border border-border/60 bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-amber-500/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="mt-3 text-sm font-bold">{v.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {v.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  PRODUCT PREVIEW                                                            */
/* -------------------------------------------------------------------------- */

const PRODUCTS = [
  { label: "Pathway Report", icon: Compass, image: pathwayImg },
  { label: "Student Profile", icon: UserRound, image: studentImg },
  { label: "IEP Upload", icon: FileText, image: paperworkImg },
  { label: "Resource Library", icon: BookOpen, image: resourcesImg },
  { label: "Partner Network", icon: Network, image: partnersImg },
  { label: "Calendar", icon: Calendar, image: classroomImg },
  { label: "Action Items", icon: CheckCircle2, image: dashboardImg },
  { label: "Meeting Prep", icon: Layers, image: familyImg },
];

function ProductPreview() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div className="container mx-auto px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>What's Inside</SectionEyebrow>
          <h2 className="mt-4 font-display text-3xl font-black sm:text-4xl md:text-5xl">
            Everything the Team Needs, in One Place.
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {PRODUCTS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.label} delay={i * 0.05}>
                <div className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <img
                    src={p.image}
                    alt={p.label}
                    className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="mt-3 text-sm font-bold text-white">
                      {p.label}
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  CT OPPORTUNITY                                                             */
/* -------------------------------------------------------------------------- */

const CT_PINS = [
  { name: "Workforce Programs", icon: Briefcase, top: "32%", left: "28%" },
  { name: "Adult Services", icon: HandHeart, top: "48%", left: "55%" },
  { name: "Training Pathways", icon: GraduationCap, top: "62%", left: "38%" },
  { name: "Community Supports", icon: Heart, top: "40%", left: "72%" },
  { name: "Schools & Districts", icon: School, top: "70%", left: "60%" },
];

function CTOpportunity() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <Reveal>
            <SectionEyebrow>Connecticut First</SectionEyebrow>
            <h2 className="mt-4 font-display text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
              Rooted in Connecticut.
              <br />
              <span className="text-primary">Built to Scale.</span>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              We start where we know the families, the schools, and the
              programs. Every pathway connects to real Connecticut workforce
              programs, adult services, training, and community supports.
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-3">
              {CT_PINS.map((p) => {
                const I = p.icon;
                return (
                  <li
                    key={p.name}
                    className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm font-medium"
                  >
                    <I className="h-4 w-4 text-primary" />
                    {p.name}
                  </li>
                );
              })}
            </ul>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="relative aspect-[5/4] overflow-hidden rounded-[2rem] border border-border/60 shadow-xl">
              <img
                src={ctMapImg}
                alt="Connecticut opportunity map"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-amber-500/20" />
              <div className="absolute inset-0 bg-background/40" />
              {/* Pins */}
              {CT_PINS.map((p, i) => (
                <motion.div
                  key={p.name}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.12, type: "spring" }}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ top: p.top, left: p.left }}
                >
                  <div className="relative">
                    <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/50" />
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-lg">
                      <MapPin className="h-4 w-4" />
                    </div>
                  </div>
                </motion.div>
              ))}
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-border/60 bg-background/90 px-4 py-3 backdrop-blur">
                <div className="text-xs font-bold uppercase tracking-widest text-primary">
                  Connecticut
                </div>
                <div className="text-sm font-semibold">
                  Workforce · Schools · Services · Community
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  CTA                                                                        */
/* -------------------------------------------------------------------------- */

function FinalCTA() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img
          src={ctaImg}
          alt=""
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-primary/60" />
      </div>

      <div className="container mx-auto px-6 py-24 text-white md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/90 backdrop-blur">
              <Sparkles className="h-3 w-3 text-amber-300" />
              THE TRANSITION FORWARD
            </div>
            <h2 className="mt-5 font-display text-4xl font-black leading-tight sm:text-5xl md:text-6xl">
              Help Build the Future of <br />
              <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 bg-clip-text text-transparent">
                Transition Planning.
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base text-white/80 sm:text-lg">
              Join Transition Forward as we build a clearer bridge between
              Students, Families, Educators, Schools, Districts, and Real-World
              Opportunities.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-white/90">
                <Link to="/waitlist">Join the Waitlist</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white">
                <Link to="/platform">Explore the Platform</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white">
                <Link to="/partners">Partner With Us</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white">
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  PAGE                                                                       */
/* -------------------------------------------------------------------------- */

function AboutPage() {
  return (
    <SiteShell>
      <Hero />
      <FounderStory />
      <ProblemSolution />
      <MissionValues />
      <PaperworkToPossibility />
      <FinalCTA />
    </SiteShell>
  );
}
