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

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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

      {/* Trust strip — three anchor points */}
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border/60 bg-card/70 px-4 py-4 shadow-soft backdrop-blur sm:px-6">
          <div className="grid gap-3 divide-y divide-border/60 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-y-0">
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
        </div>
      </section>


      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
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
}: {
  icon: typeof Lock;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-2 sm:px-5">
      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

