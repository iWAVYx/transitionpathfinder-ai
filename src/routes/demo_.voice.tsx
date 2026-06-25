import { createFileRoute } from "@tanstack/react-router";
import { Mic, Sparkles, ShieldCheck } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import {
  DemoStepBar,
  DemoStepFooter,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { Badge } from "@/components/ui/badge";
import { getDemoStudent } from "@/lib/demo-data";
import type { DemoStudentId } from "@/lib/demo-data";
import { DEMO_VOICE } from "@/lib/demo-extras";
import { toTitleCase } from "@/lib/title-case";

export const Route = createFileRoute("/demo_/voice")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "Student Voice — TransitionForward demo" },
      {
        name: "description",
        content:
          "See how a student's own answers shape the Pathway Report, action plan, and meeting prep.",
      },
      { property: "og:title", content: "Student Voice — TransitionForward demo" },
      {
        property: "og:description",
        content:
          "Sample Student Voice prompts and responses, and how each one affects recommendations.",
      },
      { property: "og:url", content: "/demo/voice" },
    ],
    links: [{ rel: "canonical", href: "/demo/voice" }],
  }),
  component: DemoVoicePage,
});

function DemoVoicePage() {
  const { s = "maya" } = Route.useSearch() as { s?: DemoStudentId };
  const bundle = getDemoStudent(s);
  const prompts = DEMO_VOICE[s];
  const first = bundle.profile.first_name;

  return (
    <SiteShell>
      <div className="demo-shell">
        <DemoStepBar current="voice" student={s} />
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Mic className="h-3 w-3" /> Student Voice
          </Badge>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Sample answers — fictional student
          </Badge>
        </div>
        <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
          {toTitleCase(first)}'s Voice, in {toTitleCase(first)}'s words.
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Student Voice is the foundation of every Pathway Report. Each answer below
          shows the exact recommendation it shapes — so families and educators can see
          why the plan looks the way it does.
        </p>

        <div className="mt-10 space-y-5">
          {prompts.map((p, i) => (
            <article
              key={p.prompt}
              className="rounded-3xl border bg-card p-6 shadow-soft sm:p-7"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Prompt {i + 1}
              </p>
              <h2 className="mt-1 font-display text-xl">{p.prompt}</h2>
              <blockquote className="mt-4 rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm italic leading-relaxed text-foreground/85">
                "{p.response}"
                <span className="mt-2 block not-italic text-xs text-muted-foreground">
                  — sample response in {first}'s voice
                </span>
              </blockquote>
              <p className="mt-4 flex items-start gap-2 text-sm text-foreground/80">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span className="font-semibold">How this affects recommendations:</span>{" "}
                  {p.affects}
                </span>
              </p>
            </article>
          ))}
        </div>

        <DemoStepFooter current="voice" student={s} />
      </section>
      </div>
    </SiteShell>
  );
}
