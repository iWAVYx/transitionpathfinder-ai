import { cn } from "@/lib/utils";
import { Sparkles, Info } from "lucide-react";

export type PlainLanguageSection = {
  label: string;
  original?: string; // dense IEP language
  plain: string; // plain-language rendering
};

const DEFAULT: PlainLanguageSection[] = [
  {
    label: "Postsecondary Employment Goal",
    original:
      "Upon completion of secondary education, the student will engage in competitive integrated employment aligned with articulated vocational interests supported by identified accommodations.",
    plain: "After school, you want a real, paid job that fits what you're good at — with the supports you need to do it well.",
  },
  {
    label: "Independent Living Goal",
    original:
      "Student will demonstrate functional independence in community mobility utilizing available public transportation systems with fading prompts.",
    plain: "You'll learn to ride the bus on your own, with less help over time.",
  },
];

interface Props {
  sections?: PlainLanguageSection[];
  className?: string;
}

export function PlainLanguageCard({ sections = DEFAULT, className }: Props) {
  return (
    <section
      aria-label="Plain-language translation"
      className={cn("rounded-3xl border bg-card p-5 shadow-soft sm:p-6", className)}
    >
      <header className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        <div>
          <h3 className="font-display text-lg">What This Means</h3>
          <p className="text-sm text-muted-foreground">
            Every IEP / transition line, translated into plain language.
          </p>
        </div>
      </header>

      <ul className="space-y-3">
        {sections.map((s) => (
          <li key={s.label} className="rounded-2xl border bg-background/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-2 text-sm font-medium leading-relaxed">{s.plain}</p>
            {s.original && (
              <details className="mt-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer select-none font-medium hover:text-foreground">
                  Show Original Language
                </summary>
                <p className="mt-1.5 rounded-md bg-muted/60 p-2 italic">{s.original}</p>
              </details>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        AI-generated summary — always review with your team before signing.
      </p>
    </section>
  );
}
