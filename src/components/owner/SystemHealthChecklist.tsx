import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, AlertTriangle, CircleDashed, Clock, Loader2, Save } from "lucide-react";
import {
  listSystemHealthChecklist,
  updateSystemHealthChecklistItem,
  type SystemHealthChecklistItem,
  type ChecklistStatus,
  type ChecklistPriority,
} from "@/lib/owner/system-health-checklist.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_META: Record<ChecklistStatus, { label: string; chip: string; Icon: typeof CheckCircle2 }> = {
  working: { label: "Working", chip: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30", Icon: CheckCircle2 },
  needs_attention: { label: "Needs Attention", chip: "bg-amber-500/10 text-amber-700 border-amber-500/30", Icon: AlertTriangle },
  not_connected: { label: "Not Connected", chip: "bg-muted text-muted-foreground border-border", Icon: CircleDashed },
  coming_soon: { label: "Coming Soon", chip: "bg-sky-500/10 text-sky-700 border-sky-500/30", Icon: Clock },
};

const PRIORITY_META: Record<ChecklistPriority, string> = {
  low: "text-muted-foreground",
  medium: "text-foreground",
  high: "text-amber-700 dark:text-amber-300",
  critical: "text-rose-700 dark:text-rose-300",
};

type Draft = { status: ChecklistStatus; notes: string; priority: ChecklistPriority; action_needed: string };

type StatusFilter = "all" | ChecklistStatus;

export function ManualChecklistSection() {
  const list = useServerFn(listSystemHealthChecklist);
  const update = useServerFn(updateSystemHealthChecklistItem);
  const [items, setItems] = useState<SystemHealthChecklistItem[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    list().then((r) => {
      setItems(r.items);
      const seeded: Record<string, Draft> = {};
      for (const it of r.items) {
        seeded[it.id] = {
          status: it.status,
          notes: it.notes ?? "",
          priority: it.priority,
          action_needed: it.action_needed ?? "",
        };
      }
      setDraft(seeded);
    });
  }, [list]);

  async function save(item: SystemHealthChecklistItem) {
    const d = draft[item.id];
    if (!d) return;
    setSavingId(item.id);
    try {
      const res = await update({
        data: {
          id: item.id,
          status: d.status,
          notes: d.notes,
          priority: d.priority,
          action_needed: d.action_needed,
        },
      });
      setItems((prev) => prev?.map((p) => (p.id === item.id ? res.item : p)) ?? prev);
    } finally {
      setSavingId(null);
    }
  }

  const summary = useMemo(() => {
    if (!items) return null;
    const counts: Record<ChecklistStatus, number> = {
      working: 0, needs_attention: 0, not_connected: 0, coming_soon: 0,
    };
    for (const it of items) counts[it.status]++;
    return counts;
  }, [items]);

  if (!items) {
    return (
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Manual checklist
        </h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </section>
    );
  }

  const visible = filter === "all" ? items : items.filter((i) => i.status === filter);
  const groups = visible.reduce<Record<string, SystemHealthChecklistItem[]>>((acc, it) => {
    (acc[it.category] ||= []).push(it);
    return acc;
  }, {});

  const filterChips: Array<{ key: StatusFilter; label: string; count: number }> = [
    { key: "all", label: "All", count: items.length },
    { key: "working", label: "Working", count: summary?.working ?? 0 },
    { key: "needs_attention", label: "Needs Attention", count: summary?.needs_attention ?? 0 },
    { key: "not_connected", label: "Not Connected", count: summary?.not_connected ?? 0 },
    { key: "coming_soon", label: "Coming Soon", count: summary?.coming_soon ?? 0 },
  ];

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Manual checklist
        </h2>
        <p className="text-xs text-muted-foreground">
          Persistent QA status for every demo-readiness item. Status, priority, notes, and action
          needed all save to the database and survive page refresh.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {filterChips.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition " +
                (filter === c.key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:text-foreground")
              }
            >
              {c.label} <span className="opacity-70">({c.count})</span>
            </button>
          ))}
        </div>
      </header>

      {Object.entries(groups).map(([cat, rows]) => (
        <div key={cat} className="rounded-lg border border-border bg-background">
          <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {cat}
          </div>
          <ul className="divide-y divide-border">
            {rows.map((item) => {
              const d = draft[item.id] ?? {
                status: item.status,
                notes: item.notes ?? "",
                priority: item.priority,
                action_needed: item.action_needed ?? "",
              };
              const meta = STATUS_META[d.status];
              const Icon = meta.Icon;
              const dirty =
                d.status !== item.status ||
                (d.notes ?? "") !== (item.notes ?? "") ||
                d.priority !== item.priority ||
                (d.action_needed ?? "") !== (item.action_needed ?? "");
              return (
                <li key={item.id} className="px-4 py-3 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="font-medium text-sm">{item.label}</span>
                        <Badge variant="outline" className={meta.chip}>{meta.label}</Badge>
                        <span className={"text-[10px] uppercase tracking-wide " + PRIORITY_META[d.priority]}>
                          {d.priority}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {item.route && <span>Route: <code>{item.route}</code></span>}
                        {item.backend_table && <span>Table: <code>{item.backend_table}</code></span>}
                        {item.last_checked_at && (
                          <span>Checked {new Date(item.last_checked_at).toLocaleString()}</span>
                        )}
                      </div>
                      {(item.pass_criteria || item.fail_criteria || item.reference) && (
                        <div className="mt-2 space-y-1 rounded-md border border-border/60 bg-muted/30 p-2 text-xs">
                          {item.pass_criteria && (
                            <p>
                              <span className="font-semibold text-emerald-700 dark:text-emerald-300">Pass:</span>{" "}
                              <span className="text-muted-foreground">{item.pass_criteria}</span>
                            </p>
                          )}
                          {item.fail_criteria && (
                            <p>
                              <span className="font-semibold text-rose-700 dark:text-rose-300">Fail:</span>{" "}
                              <span className="text-muted-foreground">{item.fail_criteria}</span>
                            </p>
                          )}
                          {item.reference && (
                            <p className="text-[11px] text-muted-foreground/80">
                              <span className="font-semibold">Ref:</span> {item.reference}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={d.status}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, [item.id]: { ...d, status: e.target.value as ChecklistStatus } }))
                        }
                        className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                      >
                        <option value="working">Working</option>
                        <option value="needs_attention">Needs Attention</option>
                        <option value="not_connected">Not Connected</option>
                        <option value="coming_soon">Coming Soon</option>
                      </select>
                      <select
                        value={d.priority}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, [item.id]: { ...d, priority: e.target.value as ChecklistPriority } }))
                        }
                        className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                      <Button
                        size="sm"
                        variant={dirty ? "default" : "outline"}
                        disabled={!dirty || savingId === item.id}
                        onClick={() => save(item)}
                      >
                        {savingId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <textarea
                      value={d.notes}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, [item.id]: { ...d, notes: e.target.value } }))
                      }
                      placeholder="Notes…"
                      rows={2}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                    />
                    <textarea
                      value={d.action_needed}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, [item.id]: { ...d, action_needed: e.target.value } }))
                      }
                      placeholder="Action needed…"
                      rows={2}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
