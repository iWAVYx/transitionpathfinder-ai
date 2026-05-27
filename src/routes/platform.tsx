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
} from "lucide-react";
import platformHero from "@/assets/platform-hero-v2.jpg";

export const Route = createFileRoute("/platform")({
  head: () => ({
    meta: [
      { title: "The Platform | TransitionForward" },
      { name: "description", content: "Eight tools that turn scattered transition planning into a single, student centered pathway: AI Pathway Builder, Student Voice, Family Portal, Goal Tracker, Assessment Vault, PPT Prep, Resource Match, and Educator Dashboard." },
      { property: "og:title", content: "The Platform | TransitionForward" },
      { property: "og:description", content: "Eight tools that turn scattered transition planning into a single, student centered pathway." },
    ],
  }),
  component: PlatformPage,
});

const features = [
  { icon: Sparkles, title: "AI Pathway Builder", body: "Share strengths, interests, and goals. We generate a personalized Pathway Report with career directions, life skills, family questions, and a 30 day plan." },
  { icon: Mic, title: "Student Voice Profile", body: "A student owned space for strengths, interests, the kind of life they want after high school, and what they want their PPT team to know." },
  { icon: Users, title: "Family Voice", body: "A dedicated home for the hopes, concerns, and questions families bring to the planning table, so input never gets lost between meetings." },
  { icon: Languages, title: "Family Friendly Translator", body: "Paste a transition goal and we explain what it means, why it matters, what to ask, and what progress should look like at home." },
  { icon: Target, title: "Goal and Progress Tracker", body: "A visual chain from Goal to Skill to Evidence to Progress to Next Step. Progress finally lines up with the plan." },
  { icon: Archive, title: "Transition Assessment Vault", body: "Hold on to interest inventories, work samples, and assessments year over year, so growth becomes visible instead of lost." },
  { icon: ClipboardList, title: "PPT Meeting Prep", body: "Parent questions, student talking points, teacher notes, an agenda, and a plain language summary, ready before you walk in the room." },
  { icon: MapPin, title: "Resource and Opportunity Match", body: "Connecticut aware matches: community colleges, technical high schools, BRS, job training, and internships, tuned to interest, location, and grade." },
  { icon: LayoutDashboard, title: "Educator Dashboard", body: "A snapshot for each student: progress notes, family input, upcoming meetings, and AI drafted language the teacher reviews and approves." },
];

function PlatformPage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-70" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-16 pb-12 sm:px-6 md:grid-cols-[1.05fr_1fr] lg:px-8 lg:pt-24 lg:pb-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">The Platform</p>
            <h1 className="mt-3 font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              From Paperwork to Pathways.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Three layers, working quietly together: the organization layer that holds the
              information, the AI layer that turns it into a real plan, and the partnership layer
              that connects students to actual opportunities.
            </p>
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

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <article key={title} className="group rounded-3xl border border-border/60 bg-card p-7 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-sky text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-xl font-medium tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>

        <div className="mt-16 overflow-hidden rounded-3xl bg-gradient-hero p-10 shadow-soft sm:p-14">
          <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Try the Signature Feature.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Create a free account and share a little about your student. We will generate a
            personalized Pathway Report you can take to your next PPT meeting.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/login" className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift">
              Create a Pathway Report
            </Link>
            <Link to="/waitlist" className="inline-flex items-center justify-center rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold hover:bg-background">
              Join the Waitlist
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
