import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/platform")({
  head: () => ({
    meta: [
      { title: "The Platform — TransitionForward" },
      { name: "description", content: "Eight tools that turn scattered transition planning into a single, student-centered pathway: AI Pathway Builder, Student Voice, Family Portal, Goal Tracker, Assessment Vault, PPT Prep, Resource Match, and Educator Dashboard." },
      { property: "og:title", content: "The Platform — TransitionForward" },
      { property: "og:description", content: "Eight tools that turn scattered transition planning into a single, student-centered pathway." },
    ],
  }),
  component: PlatformPage,
});

const features = [
  { title: "AI Pathway Builder", body: "Share strengths, interests, and goals. We generate a personalized Pathway Report — career directions, life skills, family questions, and a 30-day plan." },
  { title: "Student Voice Profile", body: "A student-owned space: strengths, interests, the kind of life they want after high school, and what they want their PPT team to know." },
  { title: "Family Voice", body: "A dedicated home for the hopes, concerns, and questions families bring to the planning table — so input never gets lost between meetings." },
  { title: "Family-Friendly Translator", body: "Paste a transition goal and we explain what it means, why it matters, what to ask, and what progress should look like at home." },
  { title: "Goal & Progress Tracker", body: "A visual chain: Goal → Skill → Evidence → Progress → Next Step. Progress finally lines up with the plan." },
  { title: "Transition Assessment Vault", body: "Hold on to interest inventories, work samples, and assessments year over year — so growth becomes visible instead of lost." },
  { title: "PPT Meeting Prep", body: "Parent questions, student talking points, teacher notes, an agenda, and a plain-language summary — ready before you walk in the room." },
  { title: "Resource & Opportunity Match", body: "Connecticut-aware matches: community colleges, technical high schools, BRS, job training, internships — tuned to interest, location, and grade." },
  { title: "Educator Dashboard", body: "A snapshot for each student: progress notes, family input, upcoming meetings, and AI-drafted language the teacher reviews and approves." },
];

function PlatformPage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">The platform</p>
        <h1 className="mt-3 font-display text-5xl font-medium tracking-tight sm:text-6xl">From paperwork to pathways.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          TransitionForward is built around three layers: the organization layer that holds the
          information, the AI layer that turns it into a real plan, and the partnership layer
          that connects students to actual opportunities. Here's what that looks like in practice.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-3xl border border-border/60 bg-card p-7 shadow-soft transition-all hover:shadow-lift">
              <h3 className="font-display text-xl font-medium tracking-tight">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-3xl bg-gradient-hero p-10 shadow-soft sm:p-14">
          <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Try the signature feature.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Create a free account and share a little about your student. We'll generate a
            personalized Pathway Report you can take to your next PPT meeting.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/login" className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift">
              Create a Pathway Report
            </Link>
            <Link to="/waitlist" className="inline-flex items-center justify-center rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold hover:bg-background">
              Join the waitlist
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
