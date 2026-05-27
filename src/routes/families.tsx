import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";

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

function FamiliesPage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">For families</p>
        <h1 className="mt-3 font-display text-5xl font-medium tracking-tight sm:text-6xl">You're not supposed to figure this out alone.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Transition planning is a lot. Goals written in school-system language, services that
          change every year, decisions that feel enormous. TransitionForward sits next to you
          and gently translates — so you can see what's happening, what to ask, and what to do next.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {[
            { t: "Understand the plan, in plain language", b: "Paste any transition goal and we'll explain what it means, why it matters, and what progress should look like at home." },
            { t: "Your voice belongs here", b: "A space for your hopes, your concerns, and the questions you want to bring to the next PPT — saved between meetings, not lost in them." },
            { t: "See real progress", b: "Goals connected to skills, evidence, and the next gentle step — so you can tell if your child is actually moving forward." },
            { t: "Find what they actually need", b: "Connecticut-aware resources matched to your child's interests and grade — community colleges, BRS, technical schools, job training, internships." },
            { t: "Walk into PPTs prepared", b: "A printable meeting prep sheet with strengths, concerns, questions, and your family priorities — ready in minutes." },
            { t: "Hold onto the history", b: "Assessments, work samples, and reflections in one place. Growth over years stays visible — not buried in folders." },
          ].map((c) => (
            <div key={c.t} className="rounded-3xl border border-border/60 bg-card p-7 shadow-soft">
              <h3 className="font-display text-xl font-medium tracking-tight">{c.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.b}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-3">
          <Link to="/login" className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift">Create a Pathway Report</Link>
          <Link to="/waitlist" className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold hover:bg-muted">Join the waitlist</Link>
        </div>
      </section>
    </SiteShell>
  );
}
