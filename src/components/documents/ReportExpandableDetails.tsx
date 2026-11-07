import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Share screen detail controls while retaining every supplied field in print. */
export function ReportExpandableDetails({ audience, defaultOpen = false, className, kind, children }: {
  audience: "student" | "family" | "educator";
  defaultOpen?: boolean;
  className?: string;
  kind: "recommendation" | "demo-option";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || audience === "educator");
  const id = useId();
  useEffect(() => { setOpen(defaultOpen || audience === "educator"); }, [audience, defaultOpen]);
  return <>
    <button type="button" onClick={() => setOpen(value => !value)}
      className="print:hidden mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      aria-expanded={open} aria-controls={id}>
      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      {open ? "Hide Details" : "Show Details"}
    </button>
    <div id={id} data-report-expandable-details
      data-report-recommendation-details={kind === "recommendation" ? true : undefined}
      data-demo-option-details={kind === "demo-option" ? true : undefined}
      className={cn(className, !open && "hidden print:block")}>{children}</div>
  </>;
}
