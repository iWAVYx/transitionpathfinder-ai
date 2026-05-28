import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { ArrowRight, FileText, Sparkles, Users, Compass, Sun } from "lucide-react";
import {
  CursorField,
  Magnetic,
  HoverReveal,
  TextMask,
  FloatingShape,
  Tilt3D,
  TiltLayer,
  HorizontalScroll,
} from "@/components/effects/ImmersiveEffects";
import { Reveal, StickyScrollStory, Marquee } from "@/components/effects/ScrollEffects";
import aboutNarrativeHero from "@/assets/about-narrative-hero.jpg";
import aboutStudentCenter from "@/assets/about-student-center.jpg";
import aboutHero from "@/assets/about-hero.jpg";
import homeFamily from "@/assets/home-family.jpg";
import homeEducator from "@/assets/home-educator.jpg";
import homeStudent from "@/assets/home-student.jpg";
import pathCollege from "@/assets/path-college.jpg";
import pathCareer from "@/assets/path-career.jpg";
import pathTechnical from "@/assets/path-technical.jpg";
import pathLifeskills from "@/assets/path-lifeskills.jpg";
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
    title: "The plan only matters if the student can see themselves in it.",
    body: "TransitionForward begins with who a student is — interests, strengths, questions, voice, and possibilities — and turns that into a plan they can recognize as their own.",
    image: aboutStudentCenter,
    alt: "A student silhouette at the center of a glowing constellation of interests, family, teachers, and opportunities",
  },
  {
    title: "From paperwork into purpose.",
    body: "Goals, student voice, progress, resources, and communication organize themselves around the student — with AI-supported recommendations turning information into action.",
    image: aboutHero,
    alt: "Soft editorial illustration of a student stepping into a sunlit pathway",
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

const pathways = [
  { label: "College", image: pathCollege, copy: "Two-year, four-year, and beyond — mapped to the student's plan." },
  { label: "Career", image: pathCareer, copy: "Employment goals connected to mentors, internships, and on-the-job learning." },
  { label: "Technical", image: pathTechnical, copy: "Trade pathways and CTE programs aligned to interests and strengths." },
  { label: "Life Skills", image: pathLifeskills, copy: "Independent living, community access, and daily routines made visible." },
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
      {/* ====== HERO — EDITORIAL TYPOGRAPHY ====== */}
      <CursorField className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-60" />
        <FloatingShape className="absolute -left-10 top-24 hidden md:block" duration={22}>
          <div className="h-56 w-56 rounded-full bg-peach/25 blur-3xl" />
        </FloatingShape>
        <FloatingShape className="absolute -right-10 bottom-10 hidden md:block" duration={26} delay={2}>
          <div className="h-72 w-72 rounded-full bg-sky/25 blur-3xl" />
        </FloatingShape>

        <section className="relative mx-auto max-w-6xl px-4 pt-28 pb-24 text-center sm:px-6 lg:px-8 lg:pt-40 lg:pb-32">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              Our story
            </p>
          </Reveal>

          <h1 className="mx-auto mt-10 max-w-[18ch] font-display text-[clamp(2.75rem,9vw,8rem)] font-medium leading-[0.92] tracking-tight">
            <Reveal>
              <span className="block text-foreground/40">Paperwork</span>
            </Reveal>
            <Reveal delay={120}>
              <span className="block italic text-muted-foreground/70">becomes</span>
            </Reveal>
            <Reveal delay={240}>
              <TextMask
                className="block font-display"
                gradient="linear-gradient(120deg, oklch(0.78 0.12 50), oklch(0.82 0.1 25), oklch(0.78 0.1 220), oklch(0.78 0.12 50))"
              >
                a pathway.
              </TextMask>
            </Reveal>
          </h1>

          <Reveal delay={360}>
            <p className="mx-auto mt-12 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Transition planning should be the moment a young person begins picturing who they
              are becoming — not a stack of forms no one fully owns. TransitionForward is the
              quiet rewrite of that experience.
            </p>
          </Reveal>

          <Reveal delay={460}>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
              <Magnetic>
                <Link
                  to="/platform"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-shadow hover:shadow-soft"
                >
                  See the platform <ArrowRight className="h-4 w-4" />
                </Link>
              </Magnetic>
              <Magnetic>
                <Link
                  to="/research"
                  className="inline-flex items-center justify-center rounded-full border border-border bg-background/85 px-7 py-3 text-sm font-semibold backdrop-blur hover:bg-background"
                >
                  The research
                </Link>
              </Magnetic>
            </div>
          </Reveal>
        </section>

        {/* Marquee */}
        <div className="border-y border-border/50 bg-card/60 backdrop-blur-sm">
          <Marquee
            speed={45}
            className="py-6 font-display text-2xl italic text-foreground/70 sm:text-3xl"
            items={[
              "paperwork is not a pathway",
              "·",
              "a plan should sound like the student",
              "·",
              "families deserve clarity, not confusion",
              "·",
              "progress should be visible",
              "·",
              "the future should feel connected",
              "·",
            ]}
          />
        </div>
      </CursorField>

      {/* ====== SCENES 2 + 3 — STICKY SCROLL STORY ====== */}
      <section className="relative py-20 lg:py-28">
        <div className="mx-auto mb-12 max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Scene II · The Realization — Scene III · The Mission
          </p>
        </div>
        <StickyScrollStory eyebrow="Our story, scene by scene" panels={scrollScenes} />
      </section>

      {/* ====== HORIZONTAL SIDE-SCROLL — THE PATHWAYS ====== */}
      <section className="relative overflow-hidden border-y border-border/40 bg-gradient-to-b from-background via-peach-soft/15 to-background">
        <div className="mx-auto max-w-7xl px-4 pt-20 pb-8 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Interlude — The Pathways
          </p>
          <h2 className="mt-4 max-w-3xl font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            {toTitleCase("Plans should lead somewhere a student can name.")}
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Scroll sideways through the directions a TransitionForward plan can point toward — and
            the people, programs, and progress that make each one real.
          </p>
        </div>

        <HorizontalScroll height="280vh" trackWidth="280vw">
          <div className="flex items-center gap-8 pl-8 pr-[10vw] sm:gap-12 sm:pl-16">
            {pathways.map((p, i) => (
              <Tilt3D key={p.label} max={8} className="w-[78vw] shrink-0 sm:w-[58vw] lg:w-[42vw]">
                <article className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-lift">
                  <TiltLayer depth={0}>
                    <img
                      src={p.image}
                      alt={`${p.label} pathway illustration`}
                      className="h-[58vh] w-full object-cover"
                    />
                  </TiltLayer>
                  <TiltLayer
                    depth={50}
                    className="pointer-events-none absolute left-6 top-6"
                  >
                    <div className="rounded-full border border-border/60 bg-background/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-soft backdrop-blur">
                      {String(i + 1).padStart(2, "0")} · {p.label}
                    </div>
                  </TiltLayer>
                  <TiltLayer
                    depth={30}
                    className="pointer-events-none absolute inset-x-6 bottom-6"
                  >
                    <div className="rounded-2xl bg-background/90 px-5 py-4 shadow-lift backdrop-blur">
                      <h3 className="font-display text-2xl font-medium tracking-tight">
                        {p.label}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">{p.copy}</p>
                    </div>
                  </TiltLayer>
                </article>
              </Tilt3D>
            ))}
          </div>
        </HorizontalScroll>
      </section>

      {/* ====== VALUES — HOVER REVEAL CARDS ====== */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            What we believe
          </p>
          <h2 className="mt-4 max-w-3xl font-display text-4xl font-medium tracking-tight sm:text-5xl">
            {toTitleCase("Four convictions shape every screen.")}
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ icon: Icon, title, body, accent }) => (
            <HoverReveal
              key={title}
              height="260px"
              className={`bg-gradient-to-br ${accent}`}
              front={
                <div className="flex h-[260px] flex-col justify-between p-7">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background/85 text-primary shadow-soft">
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
      <section className="relative overflow-hidden py-24 lg:py-32">
        <FloatingShape className="absolute right-[10%] top-12 hidden md:block" duration={20}>
          <div className="h-32 w-32 rounded-full bg-peach/30 blur-2xl" />
        </FloatingShape>

        <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-20 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Scene IV — The Network
            </p>
            <h2 className="mt-5 font-display text-5xl font-medium leading-[1.02] tracking-tight sm:text-6xl">
              No student moves{" "}
              <TextMask gradient="linear-gradient(120deg, oklch(0.78 0.12 50), oklch(0.78 0.1 220), oklch(0.82 0.1 25))">
                forward alone
              </TextMask>
              .
            </h2>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              The future is built through connection. TransitionForward helps families and schools
              connect students to the people, programs, and opportunities that move a plan into
              motion.
            </p>
            <p className="mt-5 max-w-xl font-display text-xl italic text-foreground/80">
              Schools. Families. Mentors. Employers. Universities. Community partners. One platform,
              moving in step.
            </p>
          </div>

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
        <StickyPin className="h-[130vh]" top="22vh">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Our north star
            </p>
            <h2 className="mt-8 font-display text-[clamp(3rem,10vw,9rem)] font-medium leading-[0.9] tracking-tight">
              From <TextMask>paperwork</TextMask> to{" "}
              <TextMask gradient="linear-gradient(120deg, oklch(0.78 0.1 220), oklch(0.78 0.12 50))">
                pathways
              </TextMask>
              .
            </h2>
          </div>
        </StickyPin>
      </section>

      {/* ====== SCENE 5 — THE PROMISE ====== */}
      <section className="relative overflow-hidden bg-gradient-hero py-28 lg:py-32">
        <FloatingShape className="absolute left-[10%] top-10" duration={16}>
          <Sun className="h-16 w-16 text-peach opacity-50" strokeWidth={1.2} />
        </FloatingShape>
        <FloatingShape className="absolute right-[12%] bottom-12" delay={3} duration={20}>
          <div className="h-40 w-40 rounded-full bg-sky/30 blur-2xl" />
        </FloatingShape>

        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Scene V — The Promise
          </p>
          <Reveal>
            <h2 className="mt-8 font-display text-[clamp(2.5rem,6vw,5.5rem)] font-medium leading-[1.02] tracking-tight">
              A clearer path. A stronger voice. A future that feels possible.
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-10 max-w-3xl text-base leading-relaxed text-foreground/80 sm:text-lg">
              TransitionForward exists to make transition planning clearer, more collaborative, and
              more meaningful — so students are not just prepared to leave high school, but prepared
              to move forward with purpose.
            </p>
          </Reveal>

          <div className="mt-14 flex flex-wrap justify-center gap-3">
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

          <p className="mx-auto mt-16 max-w-xl font-display text-xl italic text-foreground/70">
            One platform. One plan. Forward together.
          </p>
        </div>
      </section>

    </SiteShell>
  );
}
