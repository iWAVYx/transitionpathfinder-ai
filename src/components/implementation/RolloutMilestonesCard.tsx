import { CheckCircle2, Circle, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type RolloutMilestone = {
  key: string;
  label: string;
  detail: string;
  done: boolean;
  target?: string; // ISO date suggestion
};

export function RolloutMilestonesCard({
  scope,
  milestones,
}: {
  scope: "district" | "school";
  milestones: RolloutMilestone[];
}) {
  const completed = milestones.filter((m) => m.done).length;
  const pct = milestones.length === 0 ? 0 : Math.round((completed / milestones.length) * 100);

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-primary" />
          <h2 className="font-medium">Rollout Milestones</h2>
        </div>
        <Badge variant="secondary">
          {completed} of {milestones.length} complete
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Key implementation steps for a {scope === "district" ? "district" : "school"} rollout of TransitionForward.
      </p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-[width]" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <ol className="mt-4 space-y-3">
        {milestones.map((m, i) => (
          <li key={m.key} className="flex items-start gap-3 rounded-xl border p-3">
            <span className="mt-0.5">
              {m.done ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium">
                  <span className="mr-2 text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  {m.label}
                </div>
                {m.target && !m.done && (
                  <span className="text-xs text-muted-foreground">Target: {m.target}</span>
                )}
                {m.done && (
                  <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Complete</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{m.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
