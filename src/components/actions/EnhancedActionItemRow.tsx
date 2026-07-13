import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Clock3, Flag, Link2, User2 } from "lucide-react";

export type ActionStatus = "not_started" | "in_progress" | "blocked" | "done";
export type ActionPriority = "low" | "medium" | "high";

export type EnhancedActionItem = {
  id: string;
  title: string;
  owner: string;
  ownerRole: string;
  dueDate?: string;
  status: ActionStatus;
  priority: ActionPriority;
  source: string;
  relatedGoal?: string;
  nextStep?: string;
};

const STATUS_META: Record<ActionStatus, { label: string; cls: string; Icon: typeof Circle }> = {
  not_started: { label: "Not Started", cls: "bg-muted text-foreground", Icon: Circle },
  in_progress: { label: "In Progress", cls: "bg-sky-soft text-ink", Icon: Clock3 },
  blocked: { label: "Blocked", cls: "bg-destructive/10 text-destructive", Icon: Flag },
  done: { label: "Done", cls: "bg-emerald-100 text-emerald-900", Icon: CheckCircle2 },
};

const PRIORITY_META: Record<ActionPriority, { label: string; cls: string }> = {
  low: { label: "Low", cls: "text-muted-foreground" },
  medium: { label: "Med", cls: "text-amber-700" },
  high: { label: "High", cls: "text-destructive font-semibold" },
};

interface Props {
  item: EnhancedActionItem;
  onUpdate?: (item: EnhancedActionItem) => void;
  className?: string;
}

export function EnhancedActionItemRow({ item, onUpdate, className }: Props) {
  const s = STATUS_META[item.status];
  const p = PRIORITY_META[item.priority];

  const cycleStatus = () => {
    if (!onUpdate) return;
    const order: ActionStatus[] = ["not_started", "in_progress", "blocked", "done"];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    onUpdate({ ...item, status: next });
  };

  return (
    <li
      className={cn(
        "rounded-2xl border bg-background/60 p-3 transition hover:border-primary/40",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", s.cls)}
            >
              <s.Icon className="h-3 w-3" aria-hidden />
              {s.label}
            </span>
            <span className={cn("text-[11px] uppercase tracking-wider", p.cls)}>
              {p.label} Priority
            </span>
            {item.dueDate && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock3 className="h-3 w-3" aria-hidden />
                Due {item.dueDate}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-semibold">{item.title}</p>

          <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <div className="inline-flex items-center gap-1">
              <User2 className="h-3 w-3" aria-hidden />
              <dt className="sr-only">Owner</dt>
              <dd>
                <span className="font-medium text-foreground">{item.owner}</span>
                <span className="ml-1">· {item.ownerRole}</span>
              </dd>
            </div>
            <div className="inline-flex items-center gap-1">
              <Link2 className="h-3 w-3" aria-hidden />
              <dt className="sr-only">Source</dt>
              <dd>Source: <span className="font-medium text-foreground">{item.source}</span></dd>
            </div>
            {item.relatedGoal && (
              <div className="inline-flex items-center gap-1">
                <Flag className="h-3 w-3" aria-hidden />
                <dt className="sr-only">Related Goal</dt>
                <dd>Goal: <span className="font-medium text-foreground">{item.relatedGoal}</span></dd>
              </div>
            )}
          </dl>

          {item.nextStep && (
            <p className="mt-2 rounded-md bg-muted/60 px-2 py-1 text-xs">
              <span className="font-semibold">Next Step:</span> {item.nextStep}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={cycleStatus}
            className="rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-primary/60 hover:text-primary"
          >
            Update
          </button>
        </div>
      </div>
    </li>
  );
}
