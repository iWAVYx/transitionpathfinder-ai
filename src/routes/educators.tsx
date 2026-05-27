import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/educators")({
  head: () => ({
    meta: [
      { title: "For Educators — TransitionForward" },
      { name: "description", content: "Less paperwork, more student support. Transition goal tracking, PPT meeting prep, AI-drafted language, and family-friendly communication built for CT special educators." },
      { property: "og:title", content: "For Educators — TransitionForward" },
      { property: "og:description", content: "Less paperwork, more student support — built for CT special educators." },
    ],
  }),
  component: EducatorsPage,
});

function EducatorsPage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">For educators</p>
        <h1 className="mt-3 font-display text-5xl font-medium tracking-tight sm:text-6xl">Built to give you your evenings back.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          TransitionForward isn't another system of record. It's a quiet companion that organizes
          transition planning, surfaces student and family input, and drafts the language you
          already write — so you can review, edit, and approve instead of starting from scratch.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {[
            { t: "Student transition snapshot", b: "Strengths, interests, goals, supports, and family input — one screen per student, always current." },
            { t: "Goal & progress alignment", b: "Goal → skill → evidence → next step. Progress reports finally match what the goal actually says." },
            { t: "AI-drafted, teacher-approved", b: "Pathway recommendations, meeting summaries, and family-friendly translations drafted for you to edit. Nothing leaves your hands without your review." },
            { t: "PPT prep, ready to print", b: "Agenda, strengths summary, concerns, requested next steps, and a plain-language meeting summary template — generated in one click." },
            { t: "Family communication log", b: "Notes, questions, and responses in one place — so context doesn't live in your inbox." },
            { t: "Exportable PDF summaries", b: "Hand families something they can actually read. Hand admins something that documents the work you're already doing." },
          ].map((c) => (
            <div key={c.t} className="rounded-3xl border border-border/60 bg-card p-7 shadow-soft">
              <h3 className="font-display text-xl font-medium tracking-tight">{c.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.b}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-3">
          <Link to="/login" className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift">Try the Pathway Builder</Link>
          <Link to="/waitlist" className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold hover:bg-muted">Bring it to your school</Link>
        </div>
      </section>
    </SiteShell>
  );
}
