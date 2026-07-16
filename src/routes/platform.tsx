import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import {
  Sparkles,
  Mic,
  Users,
  Languages,
  Target,
  Archive,
  ClipboardList,
  MapPin,
  LayoutDashboard,
  ShieldCheck,
  Lock,
  Heart,
  ArrowRight,
} from "lucide-react";
import platformHeroAsset from "@/assets/piecing-puzzle.png.asset.json";
const platformHero = platformHeroAsset.url;
const platformHeroSrcSet = undefined as unknown as string;

import { PerspectiveTabs } from "@/components/platform/PerspectiveTabs";
import { Badge } from "@/components/ui/badge";
import { SHARED_DEMO_STUDENT } from "@/lib/demo/role-previews";
import { ClipboardList as ClipboardIcon, FileText, LayoutDashboard as HubIcon, PawPrint, Gamepad2, Music, ChefHat, ChevronDown } from "lucide-react";
import { LayerDiagram } from "@/components/platform/LayerDiagram";
import {
  Parallax,
  ParallaxImage,
  Reveal,
  ShapeScroll,
  Marquee,
  TextScrollFill,
} from "@/components/effects/ScrollEffects";
import { FloatingShape } from "@/components/effects/ImmersiveEffects";
import {
  DotField,
  Starburst,
  Sparkle,
  CompassRose,
  Squiggle,
  ArcStack,
} from "@/components/effects/Decorations";



import { toTitleCase } from "@/lib/title-case";
import { cn } from "@/lib/utils";

import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
export const Route = createFileRoute("/platform")({
  head: () => ({
    meta: [
      { title: "The Platform | TransitionForward" },
      {
        name: "description",
        content:
          "See TransitionForward from every chair at the table. Family, Student, Educator, and Admin views of one platform that turns scattered transition planning into a single, student centered pathway.",
      },
      { property: "og:title", content: "The Platform | TransitionForward" },
      {
        property: "og:description",
        content:
          "One platform, four perspectives. See what families, students, educators, and admins actually do inside TransitionForward.",
      },
      { property: "og:url", content: "/platform" },
      { property: "og:image", content: platformHero },
    ],
    links: [
      { rel: "canonical", href: "/platform" },
      { rel: "preconnect", href: "https://images.unsplash.com", crossOrigin: "" },
      { rel: "preload", as: "image", href: platformHero, imagesrcset: platformHeroSrcSet, imagesizes: "(min-width: 1024px) 50vw, 100vw", fetchpriority: "high" },
    ],
  }),

  component: PlatformPage,
});

type Tag = "Family" | "Student" | "Educator" | "Admin";

const features: Array<{
  icon: typeof Sparkles;
  title: string;
  body: string;
  tags: Tag[];
}> = [
  {
    icon: Sparkles,
    title: "The Pathway Builder",
    body: "Share strengths, interests, and goals. Our specialist-built formulas deliver a personalized Pathway Report with career directions, life skills, family questions, and a 30 day plan.",
    tags: ["Family", "Student", "Educator"],
  },
  {
    icon: Mic,
    title: "Student Voice Profile",
    body: "A student owned space for strengths, interests, the kind of life they want after high school, and what they want their PPT team to know.",
    tags: ["Student", "Family"],
  },
  {
    icon: Users,
    title: "Family Voice",
    body: "A dedicated home for the hopes, concerns, and questions families bring to the planning table, so input never gets lost between meetings.",
    tags: ["Family", "Educator"],
  },
  {
    icon: Languages,
    title: "Family Friendly Translator",
    body: "Paste a transition goal and we explain what it means, why it matters, what to ask, and what progress should look like at home.",
    tags: ["Family"],
  },
  {
    icon: Target,
    title: "Goal And Progress Tracker",
    body: "A visual chain from Goal to Skill to Evidence to Progress to Next Step. Progress finally lines up with the plan.",
    tags: ["Educator", "Family"],
  },
  {
    icon: Archive,
    title: "Transition Assessment Vault",
    body: "Hold on to interest inventories, work samples, and assessments year over year, so growth becomes visible instead of lost.",
    tags: ["Educator", "Family"],
  },
  {
    icon: ClipboardList,
    title: "PPT Meeting Prep",
    body: "Parent questions, student talking points, teacher notes, an agenda, and a plain language summary, ready before you walk in the room.",
    tags: ["Family", "Educator", "Student"],
  },
  {
    icon: MapPin,
    title: "Resource And Opportunity Match",
    body: "Connecticut aware matches: community colleges, technical high schools, BRS, job training, and internships, tuned to interest, location, and grade.",
    tags: ["Family", "Student"],
  },
  {
    icon: LayoutDashboard,
    title: "Educator Dashboard",
    body: "A snapshot for each student: progress notes, family input, upcoming meetings, and expert-drafted language the teacher reviews and approves.",
    tags: ["Educator", "Admin"],
  },
];

const tagStyles: Record<Tag, string> = {
  Family: "bg-peach-soft text-foreground/80",
  Student: "bg-sky-soft text-foreground/80",
  Educator: "bg-primary/10 text-primary",
  Admin: "bg-muted text-foreground/80",
};

type Feature = (typeof features)[number];

function ToolCard({ icon: Icon, title, body, tags }: Feature) {
  const ref = useRef<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();

  const handleMove = (e: ReactMouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rx = ((y / rect.height) - 0.5) * -6;
    const ry = ((x / rect.width) - 0.5) * 6;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  };

  const toggle = () => setExpanded((v) => !v);

  return (
    <article
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={isMobile ? toggle : undefined}
      role={isMobile ? "button" : undefined}
      tabIndex={isMobile ? 0 : undefined}
      aria-expanded={isMobile ? expanded : undefined}
      aria-label={isMobile ? `${expanded ? "Collapse" : "Expand"} ${toTitleCase(title)} description` : undefined}
      onKeyDown={
        isMobile
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle();
              }
            }
          : undefined
      }
      style={{
        transform: "perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))",
        transformStyle: "preserve-3d",
        transition: "transform 200ms ease-out, box-shadow 200ms ease-out",
      }}
      className={cn(
        "group relative flex h-full w-full flex-col justify-start overflow-hidden rounded-2xl border border-border/60 bg-card p-2.5 shadow-soft transition-all duration-300 hover:shadow-lift sm:justify-between sm:p-3",
        isMobile && "cursor-pointer active:scale-[0.98]",
        isMobile && expanded && "shadow-[0_4px_20px_-4px_hsl(var(--foreground)/0.08)]"
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(220px circle at var(--mx,50%) var(--my,50%), hsl(var(--primary) / 0.18), transparent 60%)",
        }}
      />
      {/* Oversized corner logo fills empty space */}
      <Icon
        className="pointer-events-none absolute -bottom-4 -right-4 h-16 w-16 text-primary/10 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary/15 sm:h-24 sm:w-24"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-sky text-primary-foreground shadow-lift sm:h-9 sm:w-9">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {tags.map((t) => (
            <span
              key={t}
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:text-[11px] ${tagStyles[t]}`}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="relative mt-1 flex flex-col gap-0.5 text-center">
        <h3 className="line-clamp-2 min-h-[2.5rem] font-display text-base font-bold leading-tight tracking-tight text-ellipsis sm:min-h-[3.5rem] sm:text-xl sm:leading-snug">
          {toTitleCase(title)}
        </h3>
        <div
          className={cn(
            "overflow-hidden transition-[max-height] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] sm:max-h-[40rem] sm:transition-none",
            expanded ? "max-h-[40rem]" : "max-h-[3.5rem]"
          )}
        >
          <p
            className={cn(
              "text-xs leading-snug text-muted-foreground sm:text-sm",
              expanded ? "sm:line-clamp-4" : "line-clamp-3 sm:line-clamp-4"
            )}
          >
            {body}
          </p>
        </div>
      </div>
      <div className="relative mt-2 flex items-center justify-center sm:hidden">
        <ChevronDown
          className={cn(
            "h-4 w-4 text-primary transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            expanded && "rotate-180"
          )}
          aria-hidden
        />
      </div>
    </article>
  );
}

function PlatformPage() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-70" />
        <ShapeScroll
          className="absolute -left-32 -top-24 -z-10 h-[42rem] w-[42rem] mix-blend-multiply"
          spin={220}
          scale={1}
          tilt={45}
          drift={130}
          gradientFrom="hsl(210 90% 70%)"
          gradientTo="hsl(280 80% 70%)"
        />
        <ShapeScroll
          className="absolute -right-28 top-40 -z-10 hidden h-[30rem] w-[30rem] mix-blend-multiply lg:block"
          spin={-180}
          scale={0.9}
          tilt={35}
          drift={-100}
          gradientFrom="hsl(20 90% 72%)"
          gradientTo="hsl(340 85% 72%)"
        />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-16 pb-12 sm:px-6 md:grid-cols-[1.05fr_1fr] lg:px-8 lg:pt-24 lg:pb-16">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              The Platform
            </p>
            <h1 className="mt-3 font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              One Platform. Four Perspectives.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Transition planning has too many chairs at the table and not enough shared
              language. TransitionForward gives families, students, educators, and admins their
              own view of the same plan, so everyone is finally working from the same page.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center [&>*]:w-full sm:[&>*]:w-auto">
              <Link
                to="/login"
                search={{}}
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-lift"
              >
                Create A Pathway Report
              </Link>
              <a
                href="#perspectives"
                className="inline-flex items-center justify-center rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-muted"
              >
                Tour The Platform
              </a>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="relative">
              <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-warm blur-2xl opacity-60" />
              <Parallax speed={-0.15}>
                <ParallaxImage
                  src={platformHero}
                  srcSet={platformHeroSrcSet}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  eager
                  alt="Student working on a laptop in a library"
                  width={1600}
                  height={1200}
                  speed={0.4}
                  className="aspect-[4/3] w-full rounded-[2rem] shadow-lift object-cover object-center"
                />

              </Parallax>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Voices band */}
      <section aria-label="Platform voices" className="border-y border-border/40 bg-muted/30 py-6">
        <Marquee
          speed={80}
          items={[
            "“Finally — one place for the whole team.”",
            "“The student voice section changed the meeting.”",
            "“PPT prep went from 3 hours to 20 minutes.”",
            "“The right tool, in the right chair, every time.”",
            "“It speaks all four languages: family, student, educator, admin.”",
          ].map((q, i) => (
            <span key={i} className="font-display text-xl italic text-foreground/75 sm:text-2xl">
              {q}
              <span className="mx-6 inline-block text-primary/40">✦</span>
            </span>
          ))}
        />
      </section>

      {/* Text-fill mission */}
      <section className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <CompassRose className="absolute left-2 top-6 hidden h-20 w-20 text-primary/25 lg:block" />
        <Starburst className="absolute right-2 top-6 hidden h-16 w-16 text-secondary-foreground/30 lg:block" />
        <FloatingShape className="absolute left-1/2 top-2 -translate-x-1/2 h-6 w-6 text-primary/60" delay={0.3}>
          <Sparkle className="h-full w-full" />
        </FloatingShape>
        <Squiggle className="absolute inset-x-0 bottom-4 mx-auto h-5 w-72 text-primary/30" />
        <TextScrollFill
          className="text-center font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl"
          text="Four perspectives. One pathway. Every tool tuned to the chair you're sitting in."
        />
      </section>

      {/* Perspective switcher */}
      <section id="perspectives" className="relative mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <DotField className="absolute right-0 top-0 -z-10 hidden h-40 w-40 text-primary/15 md:block" />
        <ArcStack className="absolute -left-10 bottom-0 -z-10 hidden h-56 w-56 text-secondary-foreground/25 lg:block" />
        <div className="mx-auto mb-10 max-w-2xl text-center">

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            See It From Every Chair
          </p>
          <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
            The Same Plan, Built for Who You Are.

          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Pick a role to see the screens, the tools, and a short day in the life.
          </p>
        </div>
        <PerspectiveTabs />
      </section>

      {/* Live demo */}
      <section className="bg-muted/40 py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" /> Live demo
              </Badge>
              <Badge variant="outline" className="gap-1">
                <ShieldCheck className="h-3 w-3" /> Fictional student · no real data
              </Badge>
            </div>
            <h2 className="mt-4 font-display text-4xl font-medium tracking-tight sm:text-5xl">
              See Exactly How It Works.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Walk through a complete planning experience using{" "}
              <strong>{SHARED_DEMO_STUDENT.full_name}</strong>, a fictional {SHARED_DEMO_STUDENT.grade} student at{" "}
              {SHARED_DEMO_STUDENT.school}. No account, no setup.
            </p>
          </div>

          {/* Student card */}
          <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Meet the demo student
                </p>
                <h3 className="mt-2 font-display text-3xl">{toTitleCase(SHARED_DEMO_STUDENT.full_name)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {SHARED_DEMO_STUDENT.pronouns} · Grade {SHARED_DEMO_STUDENT.grade} · {SHARED_DEMO_STUDENT.school}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {SHARED_DEMO_STUDENT.disability_category} · Graduating {SHARED_DEMO_STUDENT.graduation_year}
                </p>
              </div>
              <Badge variant="outline" className="gap-1">
                Case manager: {SHARED_DEMO_STUDENT.case_manager}
              </Badge>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm sm:justify-start">
                <Gamepad2 className="h-4 w-4 text-primary" /> Video game design
              </div>
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm sm:justify-start">
                <PawPrint className="h-4 w-4 text-primary" /> Animals (especially dogs)
              </div>
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm sm:justify-start">
                <Music className="h-4 w-4 text-primary" /> Music production
              </div>
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm sm:justify-start">
                <ChefHat className="h-4 w-4 text-primary" /> Cooking with family
              </div>
            </div>
            <p className="mt-6 rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm italic leading-relaxed text-foreground/80">
              "{SHARED_DEMO_STUDENT.quote}"
              <span className="mt-2 block not-italic text-xs text-muted-foreground">
                — In Jordan's voice (from the intake)
              </span>
            </p>
          </div>

          {/* Demo steps */}
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <DemoStep
              step="1"
              icon={<ClipboardIcon className="h-5 w-5" />}
              title="Sample intake"
              body="The guided transition-planning interview the family completed — strengths, interests, concerns, and student voice."
              to="/demo/intake"
            />
            <DemoStep
              step="2"
              icon={<FileText className="h-5 w-5" />}
              title="Pathway Report"
              body="The full report families and educators receive — pathways, IEP translation, PPT prep, and a 30-day plan."
              to="/demo/report"
            />
            <DemoStep
              step="3"
              icon={<HubIcon className="h-5 w-5" />}
              title="Student Hub"
              body="The ongoing workspace where Jordan's family, case manager, and team track goals and documents over time."
              to="/demo/student"
            />
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/demo"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
            >
              Open the full demo <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>


      {/* Tool library */}
      <section className="relative overflow-hidden mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Parallax speed={0.18} className="pointer-events-none absolute inset-x-0 top-8 -z-10 flex justify-center">
          <div className="h-80 w-80 rounded-full bg-gradient-sky opacity-25 blur-3xl" />
        </Parallax>
        <Parallax speed={-0.12} className="pointer-events-none absolute right-4 bottom-12 -z-10">
          <div className="h-56 w-56 rounded-full bg-peach-soft opacity-50 blur-3xl" />
        </Parallax>

        <div className="mx-auto mb-5 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            The Full Toolkit
          </p>
          <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Nine Tools, One Connected Pathway.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Every tool below is tagged with who uses it most. Nothing lives in a silo.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl auto-rows-fr justify-center gap-1.5 grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal
              key={f.title}
              delay={i * 60}
              y={20}
              className={`h-full ${i === features.length - 1 ? "col-span-2 place-self-center w-[calc(50%_-_0.1875rem)] lg:col-span-1 lg:w-full" : ""}`}
            >
              <ToolCard {...f} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Layered diagram */}
      <section className="relative overflow-hidden py-14">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-60" />
        <div
          className="absolute inset-0 -z-10 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              How It Fits Together
            </p>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
              Three Quiet Layers, Working as One.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Organize what's true about your student. Generate a Pathway you can act on.
              Connect it to real opportunities here in Connecticut.
            </p>
          </div>
          <LayerDiagram />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 shadow-soft sm:p-14">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-peach-soft opacity-60 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-12 h-72 w-72 rounded-full bg-sky-soft opacity-50 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Your Next Step
            </p>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Ready to See Your Student on the Page?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Create a free account and share a little about your student. You will have a real
              Pathway Report in your inbox before the next PPT meeting.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center [&>*]:w-full sm:[&>*]:w-auto">
              <Link
                to="/login"
                search={{}}
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
              >
                Create A Pathway Report <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
              <Link
                to="/waitlist"
                className="inline-flex items-center justify-center rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold hover:bg-background"
              >
                Join The Waitlist
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip — three anchor points, footer-sized */}
      <section className="mx-auto max-w-5xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-2 sm:grid-cols-3">
          <TrustCard
            icon={Lock}
            title="Private By Default"
            body="Owned by the families and students it belongs to."
          />
          <TrustCard
            icon={ShieldCheck}
            title="FERPA Aware"
            body="Role based access with a clear audit trail."
          />
          <TrustCard
            icon={Heart}
            title="Built In Connecticut"
            body="Tuned to CT colleges, BRS, and how PPTs run here."
          />
        </div>
      </section>


    </SiteShell>
  );
}

function DemoStep({
  step,
  icon,
  title,
  body,
  to,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group block rounded-3xl border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Step {step}
        </span>
      </div>
      <h3 className="mt-4 font-display text-xl">{toTitleCase(title)}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
        Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}




function TrustCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Lock;
  title: string;
  body: string;
}) {
  return (
    <article className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 shadow-soft">
      <div className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-3 w-3" />
      </div>
      <p className="text-[11px] leading-tight text-muted-foreground">
        <span className="font-semibold text-foreground">{title}.</span> {body}
      </p>
    </article>
  );
}
