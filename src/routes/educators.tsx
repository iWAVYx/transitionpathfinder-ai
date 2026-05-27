import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import {
  User,
  Target,
  Sparkles,
  ClipboardList,
  MessageCircle,
  FileDown,
} from "lucide-react";
import educatorsHero from "@/assets/educators-hero-v2.jpg";

export const Route = createFileRoute("/educators")({
  head: () => ({
    meta: [
      { title: "For Educators | TransitionForward" },
      { name: "description", content: "Less Paperwork, More Student Support. Pathway-driven transition goal tracking, PPT meeting prep, expert-drafted language, and family friendly communication built for Connecticut special educators." },
      { property: "og:title", content: "For Educators | TransitionForward" },
      { property: "og:description", content: "Less Paperwork, More Student Support, built for CT special educators." },
    ],
  }),
  component: EducatorsPage,
});

const cards = [
  { icon: User, t: "Student Transition Snapshot", b: "Strengths, interests, goals, supports, and family input. One screen per student, always current." },
  { icon: Target, t: "Goal and Progress Alignment", b: "Goal to skill to evidence to next step. Progress reports finally match what the goal actually says." },
  { icon: Sparkles, t: "AI Drafted, Teacher Approved", b: "Pathway recommendations, meeting summaries, and family friendly translations drafted for you to edit. Nothing leaves your hands without your review." },
  { icon: ClipboardList, t: "PPT Prep, Ready to Print", b: "Agenda, strengths summary, concerns, requested next steps, and a plain language meeting summary template, generated in one click." },
  { icon: MessageCircle, t: "Family Communication Log", b: "Notes, questions, and responses in one place, so context does not live in your inbox." },
  { icon: FileDown, t: "Exportable PDF Summaries", b: "Hand families something they can actually read. Hand admins something that documents the work you are already doing." },
];

function EducatorsPage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-70" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-16 pb-12 sm:px-6 md:grid-cols-[1.05fr_1fr] lg:px-8 lg:pt-24 lg:pb-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">For Educators</p>
            <h1 className="mt-3 font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              Built to Give You Your Evenings Back.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              TransitionForward is not another system of record. It is a quiet companion that organizes
              transition planning, surfaces student and family input, and drafts the language you
              already write, so you can review, edit, and approve instead of starting from scratch.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-lift">Try the Pathway Builder</Link>
              <Link to="/waitlist" className="inline-flex items-center justify-center rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-muted">Bring It to Your School</Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-warm blur-2xl opacity-60" />
            <img
              src={educatorsHero}
              alt="Illustrated teacher desk at golden hour with a constellation of sticky notes wired to a glowing lightbulb"
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
