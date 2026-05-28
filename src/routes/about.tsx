import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { ArrowRight, FileText, Sparkles, Users, Compass, Sun } from "lucide-react";
import {
  CursorField,
  Magnetic,
  HoverReveal,
  TextMask,
  StickyPin,
  MorphCard,
  FloatingShape,
} from "@/components/effects/ImmersiveEffects";
import { Parallax, Reveal, StickyScrollStory, Marquee } from "@/components/effects/ScrollEffects";
import aboutNarrativeHero from "@/assets/about-narrative-hero.jpg";
import aboutStudentCenter from "@/assets/about-student-center.jpg";
import { toTitleCase } from "@/lib/title-case";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our story — TransitionForward" },
      {
        name: "description",
        content:
          "From paperwork to pathways. The story, mission, and values behind TransitionForward — a transition-planning platform built so students, families, and educators can move forward together.",
      },
      { property: "og:title", content: "From paperwork to pathways — TransitionForward" },
      {
        property: "og:description",
        content:
          "Every student deserves a plan that sounds like the student. The story of why TransitionForward exists.",
      },
      { property: "og:image", content: aboutNarrativeHero },
      { property: "twitter:image", content: aboutNarrativeHero },
    ],
  }),
  component: AboutPage,
});

const scrollScenes = [
  {
    eyebrow: "Scene II — The Realization",
    title: "The plan only matters if the student can see themselves in it.",
    body: "TransitionForward was built from the belief that every student's plan should begin with who they are: their interests, strengths, needs, questions, voice, and future possibilities. The platform exists to make transition planning more human, more organized, and more connected to real life.",
    image: aboutStudentCenter,
    alt: "A student silhouette at the center of a glowing constellation of interests, family, teachers, and opportunities",
  },
  {
    eyebrow: "Scene III — The Mission",
    title: "We help teams move from paperwork to purpose.",
    body: "TransitionForward helps students, families, and educators organize transition goals, student voice, progress, resources, and communication in one easy-to-use platform. With AI-supported recommendations and real-world opportunity matching, the platform turns information into action.",
    image: aboutNarrativeHero,
    alt: "A glowing pathway of light forming from scattered IEP paperwork",
  },
];

const values = [
  {
    icon: FileText,
    title: "Clarity over paperwork",
    body: "Every form, every acronym, every document — translated into plain language a family can actually use.",
    accent: "from-peach/35 to-peach-soft/30",
  },
  {
    icon: Sparkles,
    title: "Student voice, first",
    body: "A plan should sound like the student. We start with interests and strengths, not deficits.",
    accent: "from-sky/35 to-sky-soft/30",
  },
  {
    icon: Users,
    title: "Families informed",
    body: "Families deserve to walk into every meeting prepared — not catching up.",
    accent: "from-peach-soft/40 to-sky-soft/30",
  },
  {
    icon: Compass,
    title: "Real pathways, not just forms",
    body: "Transition planning should lead somewhere. We connect goals to people, programs, and opportunities.",
    accent: "from-sky-soft/40 to-peach/30",
  },
];

const networkNodes = [
  { label: "Student", cx: 50, cy: 50, r: 7, primary: true },
  { label: "Family", cx: 18, cy: 28 },
  { label: "Educator", cx: 82, cy: 28 },
  { label: "University", cx: 12, cy: 68 },
  { label: "Tech School", cx: 88, cy: 68 },
  { label: "Employer", cx: 30, cy: 88 },
  { label: "Community", cx: 70, cy: 88 },
  { label: "Mentor", cx: 50, cy: 12 },
];

function AboutPage() {
  const otherNodes = networkNodes.filter((n) => !n.primary);

  return (
    <SiteShell>
      {/* ====== SCENE 1 — HERO / THE PROBLEM ====== */}
      <CursorField className="relative">
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-80" />
          <FloatingShape className="absolute -top-10 right-[8%] -z-10 hidden md:block" duration={14}>
            <div className="h-44 w-44 rounded-full bg-peach/40 blur-2xl" />
          </FloatingShape>
          <FloatingShape className="absolute bottom-10 left-[6%] -z-10 hidden md:block" delay={2} duration={18}>
            <div className="h-56 w-56 rounded-full bg-sky/40 blur-2xl" />
          </FloatingShape>

          <div className="mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:px-8 lg:pt-28 lg:pb-24">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Scene I — The Problem
              </p>
            </Reveal>

            <h1 className="mt-6 font-display text-[clamp(2.5rem,7vw,6.5rem)] font-medium leading-[0.98] tracking-tight">
              <Reveal>
                <span className="block">Too many students are handed</span>
              </Reveal>
              <Reveal delay={120}>
                <span className="block">
                  plans that do not feel like{" "}
                  <TextMask className="font-display italic" gradient="linear-gradient(120deg, oklch(0.78 0.12 50), oklch(0.82 0.1 25), oklch(0.78 0.1 220), oklch(0.78 0.12 50))">
                    pathways
                  </TextMask>
                  .
                </span>
              </Reveal>
            </h1>

            <div className="mt-12 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-end">
              <Reveal delay={200}>
                <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Transition planning should be one of the most meaningful parts of the school
                  experience — a moment when a young person begins to picture who they are becoming.
                  Instead, the process often arrives as a stack of forms, technical language, and
                  scattered systems no one fully owns.
                </p>
                <p className="mt-4 max-w-xl font-display text-2xl italic leading-snug text-foreground/80 sm:text-3xl">
                  Paperwork is not a pathway.
                </p>
              </Reveal>

              <Reveal delay={300}>
                <div className="relative">
                  <div className="absolute -inset-4 -z-10 rounded-[2.2rem] bg-gradient-warm opacity-60 blur-2xl" />
                  <Parallax speed={0.15}>
                    <img
                      src={aboutNarrativeHero}
                      alt="Scattered IEP paperwork transforming into a luminous golden pathway leading to the horizon"
                      width={1600}
                      height={1200}
                      className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-lift"
                    />
                  </Parallax>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Marquee — repeated truths */}
        <div className="border-y border-border/50 bg-card/60 backdrop-blur-sm">
          <Marquee speed={45} className="py-5 font-display text-2xl italic text-foreground/70 sm:text-3xl">
            <span className="mx-8">paperwork is not a pathway</span>
            <span className="mx-8 text-primary">·</span>
            <span className="mx-8">a plan should sound like the student</span>
            <span className="mx-8 text-primary">·</span>
            <span className="mx-8">families deserve clarity, not confusion</span>
            <span className="mx-8 text-primary">·</span>
            <span className="mx-8">progress should be visible</span>
            <span className="mx-8 text-primary">·</span>
            <span className="mx-8">the future should feel connected</span>
            <span className="mx-8 text-primary">·</span>
          </Marquee>
        </div>
      </CursorField>

      {/* ====== SCENES 2 + 3 — STICKY SCROLL STORY ====== */}
      <section className="relative">
        <StickyScrollStory
          scenes={scrollScenes.map((s) => ({
            id: s.eyebrow,
            title: (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  {s.eyebrow}
                </p>
                <h2 className="mt-3 font-display text-4xl font-medium leading-[1.04] tracking-tight sm:text-5xl">
                  {toTitleCase(s.title)}
                </h2>
                <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {s.body}
                </p>
              </div>
            ),
            visual: (
              <div className="relative">
                <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-warm opacity-50 blur-2xl" />
                <img
                  src={s.image}
                  alt={s.alt}
                  loading="lazy"
                  width={1400}
                  height={1400}
                  className="aspect-square w-full rounded-[2rem] object-cover shadow-lift"
                />
              </div>
            ),
          }))}
        />
      </section>

      {/* ====== VALUES — HOVER REVEAL CARDS ====== */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            What we believe
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-medium tracking-tight sm:text-5xl">
            {toTitleCase("Four convictions shape every screen.")}
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ icon: Icon, title, body, accent }) => (
            <HoverReveal
              key={title}
              height="240px"
              className={`bg-gradient-to-br ${accent}`}
              front={
                <div className="flex h-[240px] flex-col justify-between p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background/80 text-primary shadow-soft">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-2xl font-medium leading-tight tracking-tight">
                    {title}
                  </h3>
                </div>
              }
              back={
                <div className="flex h-full flex-col justify-end">
                  <p className="text-sm leading-relaxed text-foreground/85">{body}</p>
                </div>
              }
            />
          ))}
        </div>
      </section>

      {/* ====== SCENE 4 — THE NETWORK ====== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background via-sky-soft/20 to-background py-24">
        <FloatingShape className="absolute right-[10%] top-12 hidden md:block" duration={20}>
          <div className="h-32 w-32 rounded-full bg-peach/30 blur-2xl" />
        </FloatingShape>

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Scene IV — The Network
            </p>
            <h2 className="mt-4 font-display text-5xl font-medium leading-[1.02] tracking-tight sm:text-6xl">
              No student moves{" "}
              <TextMask gradient="linear-gradient(120deg, oklch(0.78 0.12 50), oklch(0.78 0.1 220), oklch(0.82 0.1 25))">
                forward alone
              </TextMask>
              .
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              The future is built through connection. TransitionForward is designed to help families
              and schools connect students to the people, programs, and opportunities that can help
              them move forward with confidence.
            </p>
            <p className="mt-4 max-w-xl font-display text-xl italic text-foreground/80">
              Schools. Families. Mentors. Employers. Universities. Community partners. One platform,
              moving in step.
            </p>
          </div>

          {/* Animated network SVG */}
          <div className="relative aspect-square w-full">
            <div className="absolute inset-0 rounded-full bg-gradient-warm opacity-40 blur-3xl" />
            <svg viewBox="0 0 100 100" className="relative h-full w-full">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.12 50)" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="oklch(0.78 0.1 220)" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              {otherNodes.map((n, i) => (
                <line
                  key={i}
                  x1="50"
                  y1="50"
                  x2={n.cx}
                  y2={n.cy}
                  stroke="url(#lineGrad)"
                  strokeWidth="0.35"
                  strokeLinecap="round"
                  className="trust-dash"
                  style={{ animationDelay: `${i * 0.4}s` }}
                />
              ))}
              {networkNodes.map((n, i) => (
                <g key={n.label}>
                  {n.primary && (
                    <circle
                      cx={n.cx}
                      cy={n.cy}
                      r={n.r}
                      fill="oklch(0.78 0.12 50)"
                      opacity="0.35"
                      className="trust-pulse-ring"
                    />
                  )}
                  <circle
                    cx={n.cx}
                    cy={n.cy}
                    r={n.r ?? 3.2}
                    fill={n.primary ? "oklch(0.78 0.12 50)" : "oklch(1 0 0)"}
                    stroke="oklch(0.78 0.1 220)"
                    strokeWidth="0.4"
                    className="trust-float"
                    style={{ animationDelay: `${i * 0.3}s`, transformOrigin: `${n.cx}px ${n.cy}px` }}
                  />
                  <text
                    x={n.cx}
                    y={n.cy + (n.cy > 50 ? 9 : -6)}
                    textAnchor="middle"
                    fontSize="3"
                    fill="oklch(0.22 0.04 250)"
                    className="font-sans"
                    style={{ fontWeight: 600 }}
                  >
                    {n.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </section>

      {/* ====== STICKY PIN — "From paperwork to pathways" ====== */}
      <section className="relative">
        <StickyPin className="h-[180vh]" top="20vh">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Our north star
            </p>
            <h2 className="mt-6 font-display text-[clamp(3rem,10vw,9rem)] font-medium leading-[0.9] tracking-tight">
              From{" "}
              <TextMask>
                paperwork
              </TextMask>{" "}
              to{" "}
              <TextMask gradient="linear-gradient(120deg, oklch(0.78 0.1 220), oklch(0.78 0.12 50))">
                pathways
              </TextMask>
              .
            </h2>
          </div>
        </StickyPin>
      </section>

      {/* ====== SCENE 5 — THE PROMISE ====== */}
      <section className="relative overflow-hidden bg-gradient-hero py-24">
        <FloatingShape className="absolute left-[10%] top-10" duration={16}>
          <Sun className="h-16 w-16 text-peach opacity-50" strokeWidth={1.2} />
        </FloatingShape>
        <FloatingShape className="absolute right-[12%] bottom-12" delay={3} duration={20}>
          <div className="h-40 w-40 rounded-full bg-sky/30 blur-2xl" />
        </FloatingShape>

        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Scene V — The Promise
          </p>
          <Reveal>
            <h2 className="mt-6 font-display text-[clamp(2.5rem,6vw,5.5rem)] font-medium leading-[1.02] tracking-tight">
              A clearer path. A stronger voice. A future that feels possible.
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-8 max-w-3xl text-base leading-relaxed text-foreground/80 sm:text-lg">
              TransitionForward exists to make transition planning clearer, more collaborative, and
              more meaningful — so students are not just prepared to leave high school, but prepared
              to move forward with purpose.
            </p>
          </Reveal>

          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <Magnetic>
              <Link
                to="/platform"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-shadow hover:shadow-soft"
              >
                Explore the platform <ArrowRight className="h-4 w-4" />
              </Link>
            </Magnetic>
            <Magnetic>
              <Link
                to="/waitlist"
                className="inline-flex items-center justify-center rounded-full border border-border bg-background/90 px-7 py-3 text-sm font-semibold backdrop-blur hover:bg-background"
              >
                Join the waitlist
              </Link>
            </Magnetic>
            <Magnetic>
              <Link
                to="/demo"
                className="inline-flex items-center justify-center rounded-full border border-border bg-background/90 px-7 py-3 text-sm font-semibold backdrop-blur hover:bg-background"
              >
                See how it works
              </Link>
            </Magnetic>
          </div>

          <p className="mx-auto mt-14 max-w-xl font-display text-xl italic text-foreground/70">
            One platform. One plan. Forward together.
          </p>
        </div>
      </section>

      {/* Morph card closing */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <MorphCard className="bg-gradient-to-br from-sky-soft/40 via-background to-peach-soft/40">
          <div className="grid items-center gap-10 p-10 md:grid-cols-[1.1fr_1fr] md:p-14">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Built in Connecticut
              </p>
              <h3 className="mt-4 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                {toTitleCase("A plan should sound like the student.")}
              </h3>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                TransitionForward was built by people who have sat on both sides of the PPT table —
                educators who have written the goals, and families who have tried to read them.
                Every feature on this platform was sketched first next to a real student's name.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {["Purpose", "Voice", "Pathways", "Family", "Forward", "Together"].map((w, i) => (
                <div
                  key={w}
                  className="rounded-2xl border border-border/60 bg-background/70 px-3 py-5 font-display text-base italic text-foreground/75 shadow-soft"
                  style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 2}deg)` }}
                >
                  {w}
                </div>
              ))}
            </div>
          </div>
        </MorphCard>
      </section>
    </SiteShell>
  );
}
