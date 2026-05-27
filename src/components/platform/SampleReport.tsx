import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const sample = {
  name: "Jordan",
  summary:
    "Jordan is a curious, hands-on eleventh grader who lights up around animals, small engines, and helping younger kids. He learns best when he can move, watch a model first, and try it in short steps.",
  strengths: [
    "Patient and calm with animals and younger children",
    "Mechanical curiosity, takes things apart to understand them",
    "Reliable when routines and expectations are clear",
  ],
  pathway: {
    title: "Animal Care And Veterinary Support",
    why: "Combines Jordan's love of animals with his hands-on learning style, and Connecticut has accessible entry points through technical high schools and community college.",
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

export function SampleReport() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-3xl border border-border/60 bg-card shadow-soft">
      <div className="bg-gradient-hero rounded-t-3xl p-6 sm:p-8">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Sample Pathway Report
        </p>
        <h3 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          A Plan For {sample.name}.
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-foreground/80 sm:text-base">
          {sample.summary}
        </p>
      </div>

      <div className="grid gap-6 p-6 sm:p-8">
        <Section title="Strengths To Lead With">
          <ul className="space-y-2 text-sm text-muted-foreground">
            {sample.strengths.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Career Pathway To Explore">
          <div className="rounded-2xl border border-border/60 bg-background/60 p-5">
            <h4 className="font-display text-xl font-medium">{sample.pathway.title}</h4>
            <p className="mt-2 text-sm text-muted-foreground">{sample.pathway.why}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  Example Roles
                </p>
                <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                  {sample.pathway.roles.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  First Steps
                </p>
                <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                  {sample.pathway.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Section>

        {open && (
          <Section title="A Gentle 30 Day Plan">
            <ol className="grid gap-3 sm:grid-cols-2">
              {sample.plan.map((w) => (
                <li
                  key={w.week}
                  className="rounded-2xl border border-border/60 bg-background/60 p-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Week {w.week}
                  </p>
                  <p className="mt-1 text-sm text-foreground">{w.action}</p>
                </li>
              ))}
            </ol>
          </Section>
        )}

        <Button
          variant="outline"
          onClick={() => setOpen((o) => !o)}
          className="w-full sm:w-auto"
        >
          {open ? (
            <>
              <ChevronUp className="h-4 w-4" /> Hide The Rest
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" /> See The 30 Day Plan
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-display text-lg font-medium tracking-tight">{title}</h4>
      <div className="mt-3">{children}</div>
    </div>
  );
}
