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
import platformHero from "@/assets/platform-hero-v2.jpg";
import { PerspectiveTabs } from "@/components/platform/PerspectiveTabs";
import { SampleReport } from "@/components/platform/SampleReport";
import { LayerDiagram } from "@/components/platform/LayerDiagram";

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

function PlatformPage() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-70" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-16 pb-12 sm:px-6 md:grid-cols-[1.05fr_1fr] lg:px-8 lg:pt-24 lg:pb-16">
          <div>
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
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
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
          </div>
          <div className="relative">
            <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-warm blur-2xl opacity-60" />
            <img
              src={platformHero}
              alt="Isometric illustration of three stacked translucent layers: filing cabinets, a constellation of connections, and a sunlit neighborhood map"
              width={1600}
              height={1200}
              className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-lift"
            />
          </div>
        </div>
      </section>

      {/* Perspective switcher */}
      <section id="perspectives" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            See It From Every Chair
          </p>
          <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
            The Same Plan, Built For Who You Are.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Pick a role to see the screens, the tools, and a short day in the life.
          </p>
        </div>
        <PerspectiveTabs />
      </section>

      {/* Signature deep dive */}
      <section className="bg-muted/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              The Signature Feature
            </p>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
              From Intake To A Plan In Minutes.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Three short steps. A real Pathway Report at the end. Here is one we'd generate
              for a student named Jordan.
            </p>
          </div>

          <div className="mb-10 grid gap-4 md:grid-cols-3">
            <Step
              n={1}
              title="Share The Story"
              body="A short intake captures strengths, interests, supports, and the three voices: student, family, and educator."
            />
            <Step
              n={2}
              title="Our Formulas Read The Whole Picture"
              body="Specialist-designed Pathway formulas weight student voice first, honor differences gently, and stay Connecticut aware."
            />
            <Step
              n={3}
              title="A Pathway Report You Can Bring To PPT"
              body="Career Pathways, life skills, family questions, and a gentle 30 day plan, in plain language."
            />
          </div>

          <SampleReport />

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
            >
              Try It With Your Student <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Tool library */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            The Full Toolkit
          </p>
          <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Nine Tools, One Connected Pathway.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Every tool below is tagged with who uses it most. Nothing lives in a silo.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 md:[&>article:last-child]:col-span-2 md:[&>article:last-child]:w-1/2 md:[&>article:last-child]:justify-self-center lg:[&>article:last-child]:col-span-1 lg:[&>article:last-child]:w-auto">
          {features.map(({ icon: Icon, title, body, tags }) => (
            <article
              key={title}
              className="group rounded-3xl border border-border/60 bg-card p-7 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-sky text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-xl font-medium tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tagStyles[t]}`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Layered diagram */}
      <section className="relative overflow-hidden py-24">
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
              Three Quiet Layers, Working As One.
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
              Ready To See Your Student On The Page?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Create a free account and share a little about your student. You will have a real
              Pathway Report in your inbox before the next PPT meeting.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/login"
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

      {/* Trust strip — three anchor points, at the bottom */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <TrustCard
            icon={Lock}
            title="Private By Default"
            body="Owned by the families and students it belongs to."
            graphic="vault"
            accent="bg-peach-soft"
          />
          <TrustCard
            icon={ShieldCheck}
            title="FERPA Aware"
            body="Role based access with a clear audit trail."
            graphic="shield"
            accent="bg-sky-soft"
          />
          <TrustCard
            icon={Heart}
            title="Built In Connecticut"
            body="Tuned to CT colleges, BRS, and how PPTs run here."
            graphic="map"
            accent="bg-primary/10"
          />
        </div>
      </section>




    </SiteShell>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="relative rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-display text-lg font-semibold text-primary-foreground">
        {n}
      </div>
      <h3 className="mt-4 font-display text-xl font-medium tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function TrustCard({
  icon: Icon,
  title,
  body,
  graphic,
  accent,
}: {
  icon: typeof Lock;
  title: string;
  body: string;
  graphic: "vault" | "shield" | "map";
  accent: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full ${accent} opacity-60 blur-2xl`}
        aria-hidden
      />
      <div className="relative flex h-28 items-center justify-center">
        <TrustGraphic kind={graphic} />
      </div>
      <div className="relative mt-4 flex items-start gap-3">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">{body}</p>
        </div>
      </div>
    </article>
  );
}

function TrustGraphic({ kind }: { kind: "vault" | "shield" | "map" }) {
  if (kind === "vault") {
    // Padlock + concentric rings
    return (
      <svg viewBox="0 0 200 110" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="vaultG" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.85" />
            <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="55" r="48" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.15" strokeDasharray="3 5" />
        <circle cx="100" cy="55" r="34" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.25" />
        <path d="M85 50 v-6 a15 15 0 0 1 30 0 v6" fill="none" stroke="hsl(var(--primary))" strokeWidth="3.5" strokeLinecap="round" />
        <rect x="78" y="50" width="44" height="32" rx="6" fill="url(#vaultG)" />
        <circle cx="100" cy="66" r="3.5" fill="hsl(var(--primary-foreground))" />
        <rect x="98.5" y="68" width="3" height="8" rx="1.5" fill="hsl(var(--primary-foreground))" />
      </svg>
    );
  }
  if (kind === "shield") {
    // Shield with checkmark + audit lines
    return (
      <svg viewBox="0 0 200 110" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="shieldG" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.85" />
            <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <g opacity="0.35">
          <line x1="20" y1="30" x2="60" y2="30" stroke="hsl(var(--foreground))" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
          <line x1="20" y1="42" x2="50" y2="42" stroke="hsl(var(--foreground))" strokeOpacity="0.2" strokeWidth="2" strokeLinecap="round" />
          <line x1="140" y1="70" x2="180" y2="70" stroke="hsl(var(--foreground))" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
          <line x1="150" y1="82" x2="180" y2="82" stroke="hsl(var(--foreground))" strokeOpacity="0.2" strokeWidth="2" strokeLinecap="round" />
        </g>
        <path
          d="M100 18 L130 30 V58 C130 78 116 92 100 100 C84 92 70 78 70 58 V30 Z"
          fill="url(#shieldG)"
          stroke="hsl(var(--primary))"
          strokeOpacity="0.4"
          strokeWidth="1.5"
        />
        <path d="M86 58 L97 69 L116 49" fill="none" stroke="hsl(var(--primary-foreground))" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // map: stylized Connecticut with pin
  return (
    <svg viewBox="0 0 200 110" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="mapG" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.75" />
          <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <g opacity="0.3" stroke="hsl(var(--foreground))" strokeOpacity="0.2" strokeWidth="1">
        <line x1="0" y1="30" x2="200" y2="30" />
        <line x1="0" y1="60" x2="200" y2="60" />
        <line x1="0" y1="90" x2="200" y2="90" />
        <line x1="50" y1="0" x2="50" y2="110" />
        <line x1="100" y1="0" x2="100" y2="110" />
        <line x1="150" y1="0" x2="150" y2="110" />
      </g>
      {/* Simplified Connecticut silhouette */}
      <path
        d="M40 38 L160 34 L162 58 L150 60 L150 78 L120 80 L118 72 L70 74 L55 78 L42 70 Z"
        fill="url(#mapG)"
        stroke="hsl(var(--primary))"
        strokeOpacity="0.5"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Pin */}
      <g transform="translate(108 44)">
        <path d="M0 0 C8 0 14 6 14 14 C14 24 0 38 0 38 C0 38 -14 24 -14 14 C-14 6 -8 0 0 0 Z" fill="hsl(var(--primary))" />
        <circle cx="0" cy="14" r="5" fill="hsl(var(--primary-foreground))" />
      </g>
    </svg>
  );
}


