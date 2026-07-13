import { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, GraduationCap, Heart, User } from "lucide-react";

type RoleKey = "family" | "educator" | "student";

export type RoleActionItem = {
  id: string;
  label: string;
  detail?: string;
  done?: boolean;
};

const DEFAULT_PLANS: Record<RoleKey, RoleActionItem[]> = {
  family: [
    { id: "f1", label: "Review Report With Student", detail: "Read the 'What This Means' section together." },
    { id: "f2", label: "Sign Consent For School Sharing", detail: "Confirms educators can see updates." },
    { id: "f3", label: "Book Vocational Rehab Intake", detail: "Suggested partner match is Bureau of Rehabilitation Services." },
    { id: "f4", label: "Bring 3 Questions To Next PPT", detail: "Meeting Prep has a starter list." },
  ],
  educator: [
    { id: "e1", label: "Update Transition Goals In IEP", detail: "Reflect new employment goal from Student Voice." },
    { id: "e2", label: "Schedule Job-Coach Consult", detail: "For the culinary opportunity currently in Applied." },
    { id: "e3", label: "Confirm Assessment Data Is Attached", detail: "Cognitive + adaptive results support the readiness score." },
    { id: "e4", label: "Send Meeting Agenda To Family", detail: "Uses the current agenda builder." },
  ],
  student: [
    { id: "s1", label: "Record One Voice Response This Week", detail: "Even a short answer sharpens the plan." },
    { id: "s2", label: "Try The Suggested Job Shadow", detail: "Vet clinic short-term shadow is a strong match." },
    { id: "s3", label: "Practice One Self-Advocacy Question", detail: "Pick one to ask at your next meeting." },
  ],
};

const ROLE_META: Record<RoleKey, { label: string; Icon: typeof Heart }> = {
  family: { label: "Family", Icon: Heart },
  educator: { label: "Educator", Icon: GraduationCap },
  student: { label: "Student", Icon: User },
};

interface Props {
  plans?: Partial<Record<RoleKey, RoleActionItem[]>>;
  defaultRole?: RoleKey;
  className?: string;
}

export function RoleActionPlan({ plans, defaultRole = "family", className }: Props) {
  const merged: Record<RoleKey, RoleActionItem[]> = {
    family: plans?.family ?? DEFAULT_PLANS.family,
    educator: plans?.educator ?? DEFAULT_PLANS.educator,
    student: plans?.student ?? DEFAULT_PLANS.student,
  };
  const [role, setRole] = useState<RoleKey>(defaultRole);
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    Object.values(merged).forEach((list) =>
      list.forEach((i) => {
        if (i.done) initial[i.id] = true;
      }),
    );
    return initial;
  });

  const items = merged[role];
  const done = items.filter((i) => checked[i.id]).length;

  return (
    <section
      aria-label="Role-specific action plan"
      className={cn("rounded-3xl border bg-card p-5 shadow-soft sm:p-6", className)}
    >
      <header className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-display text-lg">Role Action Plan</h3>
          <p className="text-sm text-muted-foreground">
            The next moves for each person on the plan.
          </p>
        </div>
        <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {done}/{items.length} done
        </span>
      </header>

      <div role="tablist" aria-label="Role" className="mb-3 inline-flex overflow-hidden rounded-full border text-xs">
        {(Object.keys(ROLE_META) as RoleKey[]).map((k) => {
          const M = ROLE_META[k];
          const active = role === k;
          return (
            <button
              key={k}
              role="tab"
              aria-selected={active}
              onClick={() => setRole(k)}
              className={cn(
                "inline-flex items-center gap-1 px-3 py-1.5 font-medium transition",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <M.Icon className="h-3.5 w-3.5" aria-hidden />
              {M.label}
            </button>
          );
        })}
      </div>

      <ul className="space-y-2">
        {items.map((i) => {
          const isDone = !!checked[i.id];
          return (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => setChecked((c) => ({ ...c, [i.id]: !c[i.id] }))}
                aria-pressed={isDone}
                className="flex w-full items-start gap-2 rounded-2xl border bg-background/60 p-3 text-left transition hover:border-primary/40"
              >
                {isDone ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <div className="min-w-0">
                  <p className={cn("text-sm font-semibold", isDone && "text-muted-foreground line-through")}>
                    {i.label}
                  </p>
                  {i.detail && <p className="mt-0.5 text-xs text-muted-foreground">{i.detail}</p>}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
