import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import {
  BookOpen,
  Heart,
  TrendingUp,
  MapPin,
  ClipboardCheck,
  Archive,
} from "lucide-react";
import familiesHero from "@/assets/families-hero.jpg";

export const Route = createFileRoute("/families")({
  head: () => ({
    meta: [
      { title: "For Families — TransitionForward" },
      { name: "description", content: "Plain-language transition planning for Connecticut families. Understand the IEP, see your child's progress, ask the right questions, and find real resources." },
      { property: "og:title", content: "For Families — TransitionForward" },
      { property: "og:description", content: "Plain-language transition planning for Connecticut families." },
    ],
  }),
  component: FamiliesPage,
});

const cards = [
  { icon: BookOpen, t: "Understand the plan, in plain language", b: "Paste any transition goal and we'll explain what it means, why it matters, and what progress should look like at home." },
  { icon: Heart, t: "Your voice belongs here", b: "A space for your hopes, your concerns, and the questions you want to bring to the next PPT — saved between meetings, not lost in them." },
  { icon: TrendingUp, t: "See real progress", b: "Goals connected to skills, evidence, and the next gentle step — so you can tell if your child is actually moving forward." },
  { icon: MapPin, t: "Find what they actually need", b: "Connecticut-aware resources matched to your child's interests and grade — community colleges, BRS, technical schools, job training, internships." },
  { icon: ClipboardCheck, t: "Walk into PPTs prepared", b: "A printable meeting prep sheet with strengths, concerns, questions, and your family priorities — ready in minutes." },
  { icon: Archive, t: "Hold onto the history", b: "Assessments, work samples, and reflections in one place. Growth over years stays visible — not buried in folders." },
];

function FamiliesPage() {
  return (
    <SiteShell>
      {/* Editorial hero band */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-70" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-16 pb-12 sm:px-6 md:grid-cols-[1.05fr_1fr] lg:px-8 lg:pt-24 lg:pb-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">For families</p>
            <h1 className="mt-3 font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              You're not supposed to figure this out alone.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Transition planning is a lot. Goals written in school-system language, services that
              change every year, decisions that feel enormous. TransitionForward sits next to you
              and gently translates — so you can see what's happening, what to ask, and what to do next.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-lift">Create a Pathway Report</Link>
              <Link to="/waitlist" className="inline-flex items-center justify-center rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-muted">Join the waitlist</Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-warm blur-2xl opacity-60" />
            <img
              src={familiesHero}
              alt="A parent and child reviewing paperwork together at a sunlit table"
              width={1600}
              height={1200}
              className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-lift"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ icon: Icon, t, b }) => (
            <article key={t} className="group rounded-3xl border border-border/60 bg-card p-7 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-sky text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-xl font-medium tracking-tight">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b}</p>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
