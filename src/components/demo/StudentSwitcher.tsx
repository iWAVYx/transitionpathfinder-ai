import { Check, ChevronDown, GraduationCap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  DEMO_PROFILES,
  DEMO_PROFILE_ORDER,
  type DemoProfileId,
} from "@/lib/demo/demo-profiles";
import { useDemoStudent } from "@/lib/demo/use-demo-student";

const PRODUCT_LABEL: Record<string, string> = {
  transitionforward: "TransitionForward",
  bridgeforward: "BridgeForward",
};

export function StudentSwitcher({
  className = "",
  compact = false,
  size = "default",
}: {
  className?: string;
  compact?: boolean;
  size?: "default" | "lg";
}) {
  const { profile, profileId, setProfile } = useDemoStudent();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSelect = (id: DemoProfileId) => {
    setProfile(id);
    setOpen(false);
  };

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Demo student: ${profile.displayName}. Change student.`}
        className={`inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 font-semibold text-foreground shadow-sm transition-colors hover:border-primary hover:bg-primary/10 ${
          size === "lg"
            ? "px-4 py-2 text-sm"
            : "px-3 py-1.5 text-xs"
        }`}
      >
        <span aria-hidden className={`leading-none ${size === "lg" ? "text-lg" : "text-base"}`}>
          {profile.emoji}
        </span>
        <span className="flex flex-col items-start leading-tight">
          <span className={`font-medium uppercase tracking-wider text-muted-foreground ${size === "lg" ? "text-[11px]" : "text-[10px]"}`}>
            Demo student
          </span>
          <span className={`font-semibold text-foreground ${size === "lg" ? "text-sm" : "text-xs"}`}>
            {compact ? profile.shortName : profile.displayName}
            <span className={`ml-1.5 hidden font-normal text-muted-foreground sm:inline ${size === "lg" ? "text-[11px]" : "text-[10px]"}`}>
              · {profile.demographics.gradeLabel}
            </span>
          </span>
        </span>
        <ChevronDown
          className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""} ${size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select a demo student"
          className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] origin-top-right rounded-2xl border border-border bg-popover p-2 shadow-lg animate-in fade-in-0 zoom-in-95"
        >
          <div className="flex items-center gap-1.5 px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <GraduationCap className="h-3 w-3" />
            Fictional demo profiles
          </div>
          <ul className="space-y-1">
            {DEMO_PROFILE_ORDER.map((id) => {
              const p = DEMO_PROFILES[id];
              const active = id === profileId;
              return (
                <li key={id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => handleSelect(id)}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span aria-hidden className="mt-0.5 text-xl leading-none">
                      {p.emoji}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground">
                          {p.displayName}
                        </span>
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {PRODUCT_LABEL[p.product] ?? p.product}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {p.tagline}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/80">
                        {p.demographics.townRegion}
                      </span>
                    </span>
                    {active && (
                      <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 border-t border-border/60 px-2 pt-2 text-[10px] leading-relaxed text-muted-foreground">
            All three profiles are fictional. Data never leaves your browser
            during the signed-out demo.
          </p>
        </div>
      )}
    </div>
  );
}
