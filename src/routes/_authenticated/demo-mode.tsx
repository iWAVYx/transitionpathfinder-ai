import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Lightbulb, Target, BookOpen, Calendar } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DEMO_STUDENT,
  DEMO_PATHWAYS,
  DEMO_NEXT_STEPS,
  DEMO_RESOURCES,
} from "@/lib/demo-fixture";

export const Route = createFileRoute("/_authenticated/demo-mode")({
  head: () => ({ meta: [{ title: "Demo Mode — TransitionForward" }] }),
  component: DemoModePage,
});

function DemoModePage() {
  return (
    <SiteShell>
      <div className="container max-w-5xl py-8 space-y-6">
        <Breadcrumbs items={[{ label: "Demo Mode" }]} />

        <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold">You're in Demo Mode</div>
            <p className="text-muted-foreground">
              This is a read-only sample student. Nothing here is saved to your account, and demo
              data never mixes with your real students.
            </p>
          </div>
        </div>

        {/* Student snapshot */}
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <header className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">
                  {DEMO_STUDENT.first_name} {DEMO_STUDENT.last_name}
                </h1>
                <Badge variant="outline" className="border-primary text-primary">DEMO</Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                Grade {DEMO_STUDENT.grade} · Age {DEMO_STUDENT.age} · {DEMO_STUDENT.pronouns} · {DEMO_STUDENT.diagnosis}
              </p>
            </div>
          </header>

          <div className="grid sm:grid-cols-3 gap-4 pt-2">
            <SnapshotList title="Strengths" items={DEMO_STUDENT.strengths} />
            <SnapshotList title="Interests" items={DEMO_STUDENT.interests} />
            <SnapshotList title="Support Needs" items={DEMO_STUDENT.needs} />
          </div>
        </section>

        {/* Student Voice */}
        <section className="rounded-xl border bg-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Student Voice</h2>
          </div>
          <Quote label="What I want to do after high school">{DEMO_STUDENT.voice.after_high_school}</Quote>
          <Quote label="What I'm good at">{DEMO_STUDENT.voice.good_at}</Quote>
          <Quote label="What kind of support helps me most">{DEMO_STUDENT.voice.support}</Quote>
        </section>

        {/* Pathway recommendations */}
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Recommended Pathways</h2>
          </div>
          <div className="space-y-3">
            {DEMO_PATHWAYS.map((p) => (
              <div key={p.title} className="rounded-lg border p-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-medium">{p.title}</h3>
                  <Badge variant="secondary">Fit: {p.fit}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{p.why}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Next Steps</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(DEMO_NEXT_STEPS).map(([days, steps]) => (
              <div key={days} className="rounded-lg border p-4 space-y-2">
                <div className="text-xs font-semibold text-primary uppercase tracking-wide">
                  {days} days
                </div>
                <ul className="text-sm space-y-1.5 list-disc pl-4">
                  {steps.map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Resources */}
        <section className="rounded-xl border bg-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Recommended Resources</h2>
          </div>
          <ul className="space-y-2">
            {DEMO_RESOURCES.map((r) => (
              <li key={r.title} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span className="font-medium">{r.title}</span>
                <Badge variant="outline">{r.category}</Badge>
              </li>
            ))}
          </ul>
        </section>

        <div className="rounded-xl border bg-card p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-semibold">Ready to do this for a real student?</h3>
            <p className="text-sm text-muted-foreground">Add a student profile to generate a real pathway report.</p>
          </div>
          <Button asChild>
            <Link to="/students">
              Add a student <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}

function SnapshotList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {title}
      </div>
      <ul className="text-sm space-y-1 list-disc pl-4">
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}

function Quote({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-l-4 border-primary/40 bg-muted/40 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      <p className="text-sm italic">"{children}"</p>
    </div>
  );
}
