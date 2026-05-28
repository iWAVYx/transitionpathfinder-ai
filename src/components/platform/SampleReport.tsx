import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Users,
  GraduationCap,
  Download,
  Copy,
  Compass,
  HeartHandshake,
  Route as RouteIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { toTitleCase } from "@/lib/title-case";
const sample = {
  name: "Jordan",
  meta: "Grade 11 · Lincoln High School",
  summary:
    "Jordan is a curious, hands-on eleventh grader who lights up around animals, small engines, and helping younger kids. He learns best when he can move, watch a model first, and try it in short steps.",
  strengths: [
    "Patient and calm with animals and younger children",
    "Mechanical curiosity — takes things apart to understand them",
    "Reliable when routines and expectations are clear",
  ],
  thisWeek: [
    "Update the Student Voice profile together at the kitchen table.",
    "Email the school counselor to request a transition meeting.",
    "Tour one animal-care program or workplace.",
  ],
  pathway: {
    title: "Animal Care & Veterinary Support",
    why: "Combines Jordan's love of animals with his hands-on learning style. Connecticut has accessible entry points through technical high schools and community college.",
    roles: ["Veterinary Assistant", "Kennel Technician", "Animal Shelter Aide"],
    steps: [
      "Shadow at a local shelter for two Saturdays",
      "Visit the Vet Tech program at a CT community college open house",
    ],
  },
  plan: [
    { week: 1, action: "Update the Student Voice profile together at the kitchen table." },
    { week: 2, action: "Email the school counselor to request a transition meeting." },
    { week: 3, action: "Tour one animal care program or workplace." },
    { week: 4, action: "Bring the Pathway Report to the next PPT meeting." },
  ],
};

const today = new Date().toLocaleDateString(undefined, {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function SampleReport() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-3xl border border-border/60 bg-card shadow-soft">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-3">
        <div className="inline-flex rounded-xl bg-muted p-1 text-xs font-medium">
          <span className="flex items-center gap-1.5 rounded-lg bg-background px-3 py-1.5 shadow-sm">
            <Users className="h-3.5 w-3.5" /> Family view
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5" /> Educator view
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Copy className="h-3.5 w-3.5" /> Copy link
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Pathway Report
          </p>
          <span className="text-muted-foreground/40">·</span>
          <p className="text-[11px] text-muted-foreground">{today}</p>
          <Badge variant="secondary" className="ml-1 gap-1">
            <ShieldCheck className="h-3 w-3" /> Moderate confidence
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" /> AI-supported · human-led
          </Badge>
        </div>
        <h3 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          A Plan For {toTitleCase(sample.name)}.
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{sample.meta}</p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/80 sm:text-base">
          {sample.summary}
        </p>
      </div>

      {/* Executive summary 3-up */}
      <div className="grid gap-3 px-6 pb-6 sm:grid-cols-3 sm:px-8 sm:pb-8">
        <SummaryCard label="Top strengths">
          <ul className="space-y-1.5 text-sm text-foreground/85">
            {sample.strengths.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="text-primary">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </SummaryCard>
        <SummaryCard label="Best-fit direction">
          <p className="font-display text-lg leading-snug">{sample.pathway.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{sample.pathway.why}</p>
        </SummaryCard>
        <SummaryCard label="Start here this week">
          <ol className="space-y-1.5 text-sm text-foreground/85">
            {sample.thisWeek.map((s, i) => (
              <li key={s} className="flex gap-2">
                <span className="font-semibold text-primary">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </SummaryCard>
      </div>

      {/* Recommended pathway */}
      <div className="border-t border-border/60 p-6 sm:p-8">
        <SectionHeader icon={<RouteIcon className="h-4 w-4" />} title="Recommended pathway" />
        <div className="mt-4 rounded-2xl border border-border/60 bg-background p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="uppercase tracking-wider">Best fit</Badge>
            <h4 className="font-display text-xl font-medium">{toTitleCase(sample.pathway.title)}</h4>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{sample.pathway.why}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <MiniCol label="Example roles" items={sample.pathway.roles} />
            <MiniCol label="First steps" items={sample.pathway.steps} />
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 p-6 sm:p-8">
          <SectionHeader
            icon={<HeartHandshake className="h-4 w-4" />}
            title="A gentle 30-day plan"
          />
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {sample.plan.map((w) => (
              <li
                key={w.week}
                className="rounded-2xl border border-border/60 bg-background p-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  Week {w.week}
                </p>
                <p className="mt-1 text-sm text-foreground">{w.action}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex justify-center border-t border-border/60 p-4">
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? (
            <>
              <ChevronUp className="h-4 w-4" /> Hide the 30-day plan
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" /> See the 30-day plan
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function SummaryCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 pb-2">
      <span className="text-primary">{icon}</span>
      <h4 className="font-display text-lg font-medium tracking-tight">{toTitleCase(title)}</h4>
    </div>
  );
}

function MiniCol({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{label}</p>
      <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Keep export for any legacy references — unused but harmless.
export { SampleReport as PathwaySampleReport };

const _compassRef = Compass; // suppress unused import
void _compassRef;
