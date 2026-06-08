import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Circle, ChevronRight, ListChecks, ChevronDown } from "lucide-react";

import {
  getOnboardingChecklist,
  setOnboardingStep,
  type RoleSurface,
} from "@/lib/onboarding-checklist.functions";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  label: string;
  hint?: string;
  to?: string;
  completed: boolean;
};

const SURFACE_TITLES: Record<RoleSurface, string> = {
  family: "Get started — Family",
  student: "Get started — Student",
  educator: "Get started — Educator",
  school_admin: "Get started — School Admin",
  district_admin: "Get started — District Admin",
  partner: "Get started — Partner",
  admin: "Get started — Admin Hub",
};

export function OnboardingChecklist({
  surface,
  className,
  defaultOpen = true,
}: {
  surface: RoleSurface;
  className?: string;
  defaultOpen?: boolean;
}) {
  const fetchChecklist = useServerFn(getOnboardingChecklist);
  const updateStep = useServerFn(setOnboardingStep);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    let alive = true;
    fetchChecklist({ data: { surface } })
      .then((r) => alive && setSteps(r.steps))
      .catch(() => alive && setSteps([]));
    return () => {
      alive = false;
    };
  }, [fetchChecklist, surface]);

  async function toggle(step: Step) {
    setPending((p) => ({ ...p, [step.id]: true }));
    const next = !step.completed;
    setSteps((prev) => prev?.map((s) => (s.id === step.id ? { ...s, completed: next } : s)) ?? prev);
    try {
      await updateStep({ data: { surface, stepId: step.id, completed: next } });
    } catch {
      setSteps((prev) => prev?.map((s) => (s.id === step.id ? { ...s, completed: !next } : s)) ?? prev);
    } finally {
      setPending((p) => {
        const n = { ...p };
        delete n[step.id];
        return n;
      });
    }
  }

  if (!steps || steps.length === 0) return null;
  const done = steps.filter((s) => s.completed).length;
  const total = steps.length;
  const allDone = done === total;
  if (allDone && !open) return null;

  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <ListChecks className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{SURFACE_TITLES[surface]}</span>
          <span className="text-xs text-muted-foreground">
            {done} of {total} done
          </span>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-180")}
        />
      </button>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>

      {open && (
        <ul className="mt-4 space-y-1.5">
          {steps.map((s) => {
            const Icon = s.completed ? CheckCircle2 : Circle;
            return (
              <li
                key={s.id}
                className="flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/60"
              >
                <button
                  type="button"
                  onClick={() => toggle(s)}
                  disabled={Boolean(pending[s.id])}
                  className="mt-0.5 shrink-0"
                  aria-label={s.completed ? "Mark step as not done" : "Mark step as done"}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      s.completed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                    )}
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm",
                        s.completed && "line-through text-muted-foreground",
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  {s.hint && (
                    <p className="text-xs text-muted-foreground">{s.hint}</p>
                  )}
                </div>
                {s.to && (
                  <Link
                    to={s.to}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Go <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
