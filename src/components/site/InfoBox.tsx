import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "What does this mean?" expandable explainer.
 * Use for special-ed jargon (IEP, PPT, transition goals, etc.).
 */
export function InfoBox({
  label = "What does this mean?",
  children,
  className,
  defaultOpen = false,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left font-medium text-foreground"
      >
        <span className="inline-flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" aria-hidden />
          {label}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
      )}
    </div>
  );
}
