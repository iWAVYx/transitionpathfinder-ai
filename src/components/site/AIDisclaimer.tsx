import { Sparkles } from "lucide-react";

type Props = {
  variant?: "inline" | "banner";
  className?: string;
};

/**
 * Consistent disclaimer shown on any surface that displays AI-generated
 * guidance (pathway reports, PPT prep, share links). Keep the language
 * warm but unambiguous: AI is a planning aid, not a substitute for the
 * IEP team, legal advice, or official school determinations.
 */
export function AIDisclaimer({ variant = "inline", className = "" }: Props) {
  const base =
    "flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/50 p-4 text-[13px] leading-relaxed text-muted-foreground";
  const sized = variant === "banner" ? "sm:p-5 sm:text-sm" : "";
  return (
    <aside
      role="note"
      aria-label="About AI-generated suggestions"
      className={`${base} ${sized} ${className}`}
    >
      <span
        aria-hidden
        className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Sparkles className="h-3.5 w-3.5" />
      </span>
      <div>
        <p className="font-semibold text-foreground">
          AI-supported, human-led.
        </p>
        <p className="mt-1">
          Suggestions on this page are generated to help families and teams
          plan together. They are not legal advice, a clinical evaluation, or
          an official PPT/IEP determination. Always review with your student's
          team before acting.
        </p>
      </div>
    </aside>
  );
}
