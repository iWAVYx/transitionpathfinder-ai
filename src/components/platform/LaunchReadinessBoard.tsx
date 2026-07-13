import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ProgressRing } from "@/components/effects/ProgressRing";
import { CheckCircle2, AlertTriangle, Circle } from "lucide-react";

type Status = "done" | "attention" | "todo";
type Group = "Data" | "Access" | "Comms" | "Compliance";

export interface ReadinessItem {
  key: string;
  group: Group;
  label: string;
  status: Status;
  risk?: string;
  owner?: string;
}

const SAMPLE: ReadinessItem[] = [
  { key: "seed", group: "Data", label: "CT Seed Data v2 Loaded", status: "done", owner: "Data ops" },
  { key: "rls", group: "Access", label: "RLS Matrix Verified", status: "done", owner: "Security" },
  { key: "2fa", group: "Access", label: "2FA Enforced For Admins", status: "attention", risk: "3 admins have not enrolled.", owner: "Security" },
  { key: "welcome", group: "Comms", label: "Welcome Email Live", status: "done", owner: "Comms" },
  { key: "sla", group: "Comms", label: "Incident SLA Doc Signed", status: "todo", owner: "Ops" },
  { key: "a11y", group: "Compliance", label: "WCAG AA Audit", status: "attention", risk: "2 contrast failures on demo hub.", owner: "Design" },
  { key: "priv", group: "Compliance", label: "Family Privacy Notice", status: "done", owner: "Legal" },
];

const STATUS_META: Record<Status, { icon: React.ComponentType<{ className?: string }>; tone: string; label: string }> = {
  done: { icon: CheckCircle2, tone: "text-primary", label: "Ready" },
  attention: { icon: AlertTriangle, tone: "text-destructive tf-status-pulse", label: "Attention" },
  todo: { icon: Circle, tone: "text-muted-foreground", label: "To Do" },
};

interface Props {
  items?: ReadinessItem[];
  className?: string;
}

export function LaunchReadinessBoard({ items = SAMPLE, className }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const pct = useMemo(() => {
    const done = items.filter((i) => i.status === "done").length;
    return Math.round((done / (items.length || 1)) * 100);
  }, [items]);
  const groups: Group[] = ["Data", "Access", "Comms", "Compliance"];

  return (
    <section aria-label="Launch readiness" className={cn("rounded-3xl border bg-card p-5 shadow-soft sm:p-6", className)}>
      <header className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-lg">Launch Readiness</h3>
          <p className="text-sm text-muted-foreground">Track everything that has to be true before we ship.</p>
        </div>
        <ProgressRing value={pct} label="Overall" sublabel="ready" />
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => {
          const rows = items.filter((i) => i.group === g);
          return (
            <div key={g} className="rounded-2xl border bg-background p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g}</h4>
              <ul className="space-y-1.5">
                {rows.map((r) => {
                  const M = STATUS_META[r.status];
                  const Icon = M.icon;
                  const open = openKey === r.key;
                  return (
                    <li key={r.key}>
                      <button
                        type="button"
                        onClick={() => setOpenKey(open ? null : r.key)}
                        className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-expanded={open}
                      >
                        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", M.tone)} />
                        <span className="flex-1">
                          <span className="block font-medium">{r.label}</span>
                          <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">{M.label}{r.owner ? ` · ${r.owner}` : ""}</span>
                          {open && r.risk ? (
                            <span className="mt-1 block rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive animate-fade-in">
                              {r.risk}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
