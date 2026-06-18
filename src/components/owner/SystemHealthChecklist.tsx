import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  CircleDashed,
  Clock,
  Loader2,
  Save,
  RotateCcw,
} from "lucide-react";
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

const DRAFT_KEY = "owner.systemHealth.checklistDrafts.v1";
const FILTER_KEY = "owner.systemHealth.checklistFilter.v1";

function readDrafts(): Record<string, Draft> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Draft>) : {};
  } catch {
    return {};
  }
}
function writeDrafts(d: Record<string, Draft>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* ignore quota */
  }
}

export function ManualChecklistSection() {
  const list = useServerFn(listSystemHealthChecklist);
  const update = useServerFn(updateSystemHealthChecklistItem);
  const [items, setItems] = useState<SystemHealthChecklistItem[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [filter, setFilter] = useState<StatusFilter>("all");

  // Restore persisted filter once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const f = window.localStorage.getItem(FILTER_KEY) as StatusFilter | null;
    if (f) setFilter(f);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FILTER_KEY, filter);
  }, [filter]);

  useEffect(() => {
    list().then((r) => {
      setItems(r.items);
      const persisted = readDrafts();
      const seeded: Record<string, Draft> = {};
      for (const it of r.items) {
        seeded[it.id] = persisted[it.id] ?? {
          status: it.status,
          notes: it.notes ?? "",
          priority: it.priority,
          action_needed: it.action_needed ?? "",
        };
      }
      setDraft(seeded);
    });
  }, [list]);

  function setItemDraft(id: string, patch: Partial<Draft>) {
    setDraft((p) => {
      const next = { ...p, [id]: { ...p[id], ...patch } };
      writeDrafts(next);
      return next;
    });
  }

  function isDirty(item: SystemHealthChecklistItem, d: Draft) {
    return (
      d.status !== item.status ||
      (d.notes ?? "") !== (item.notes ?? "") ||
      d.priority !== item.priority ||
      (d.action_needed ?? "") !== (item.action_needed ?? "")
    );
  }

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
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  function resetItem(item: SystemHealthChecklistItem) {
    setItemDraft(item.id, {
      status: item.status,
      notes: item.notes ?? "",
      priority: item.priority,
      action_needed: item.action_needed ?? "",
    });
  }

  const dirtyItems = useMemo(() => {
    if (!items) return [];
    return items.filter((i) => draft[i.id] && isDirty(i, draft[i.id]));
  }, [items, draft]);

  async function saveAllDirty() {
    if (!dirtyItems.length) return;
    setSavingAll(true);
    const results = await Promise.allSettled(
      dirtyItems.map((item) =>
        update({
          data: {
            id: item.id,
            status: draft[item.id].status,
            notes: draft[item.id].notes,
            priority: draft[item.id].priority,
            action_needed: draft[item.id].action_needed,
          },
        }),
      ),
    );
    const ok: SystemHealthChecklistItem[] = [];
    let failed = 0;
    results.forEach((r) => {
      if (r.status === "fulfilled") ok.push(r.value.item);
      else failed++;
    });
    if (ok.length) {
      setItems((prev) =>
        prev?.map((p) => ok.find((o) => o.id === p.id) ?? p) ?? prev,
      );
    }
    setSavingAll(false);
    if (failed === 0) toast.success(`Saved ${ok.length} item${ok.length === 1 ? "" : "s"}`);
    else if (ok.length === 0) toast.error(`Failed to save ${failed}`);
    else toast.warning(`Saved ${ok.length}, ${failed} failed`);
  }

  const summary = useMemo(() => {
    if (!items) return null;
    const counts: Record<ChecklistStatus, number> = {
      working: 0,
      needs_attention: 0,
      not_connected: 0,
      coming_soon: 0,
    };
    for (const it of items) counts[it.status]++;
    return counts;
  }, [items]);

  if (!items) {
    return (
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Manual Checklist
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
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Manual Checklist
          </h2>
          <p className="text-xs text-muted-foreground">
            Persistent QA status for every demo-readiness item. Edits autosave to your browser and
            sync to the database when you save.
          </p>
        </div>
        <div className="shrink-0">
          <Button
            size="sm"
            variant={dirtyItems.length ? "default" : "outline"}
            onClick={saveAllDirty}
            disabled={!dirtyItems.length || savingAll}
          >
            {savingAll ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save all{dirtyItems.length ? ` (${dirtyItems.length})` : ""}
          </Button>
        </div>
      </header>

      <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
        {filterChips.map((c) => (
          <button
            key={c.key}
            type="button"
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

      {Object.entries(groups).map(([cat, rows]) => (
        <div key={cat} className="overflow-hidden rounded-lg border border-border bg-background">
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
              const dirty = isDirty(item, d);
              return (
                <li key={item.id} className="space-y-2 px-3 py-3 sm:px-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">{item.label}</span>
                        <Badge variant="outline" className={meta.chip}>
                          {meta.label}
                        </Badge>
                        <span
                          className={
                            "text-[10px] uppercase tracking-wide " + PRIORITY_META[d.priority]
                          }
                        >
                          {d.priority}
                        </span>
                        {dirty && (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
                            Unsaved
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {item.route && (
                          <span className="truncate">
                            Route: <code className="break-all">{item.route}</code>
                          </span>
                        )}
                        {item.backend_table && (
                          <span className="truncate">
                            Table: <code className="break-all">{item.backend_table}</code>
                          </span>
                        )}
                        {item.last_checked_at && (
                          <span>Checked {new Date(item.last_checked_at).toLocaleString()}</span>
                        )}
                      </div>
                      {(item.pass_criteria || item.fail_criteria || item.reference) && (
                        <div className="mt-2 space-y-1 rounded-md border border-border/60 bg-muted/30 p-2 text-xs">
                          {item.pass_criteria && (
                            <p>
                              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                                Pass:
                              </span>{" "}
                              <span className="text-muted-foreground">{item.pass_criteria}</span>
                            </p>
                          )}
                          {item.fail_criteria && (
                            <p>
                              <span className="font-semibold text-rose-700 dark:text-rose-300">
                                Fail:
                              </span>{" "}
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
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant={dirty ? "default" : "outline"}
                        disabled={!dirty || savingId === item.id || savingAll}
                        onClick={() => save(item)}
                        title="Save changes"
                      >
                        {savingId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      {dirty && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={savingId === item.id || savingAll}
                          onClick={() => resetItem(item)}
                          title="Discard unsaved changes"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Status
                      <select
                        value={d.status}
                        onChange={(e) =>
                          setItemDraft(item.id, { status: e.target.value as ChecklistStatus })
                        }
                        className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs font-normal normal-case text-foreground"
                      >
                        <option value="working">Working</option>
                        <option value="needs_attention">Needs Attention</option>
                        <option value="not_connected">Not Connected</option>
                        <option value="coming_soon">Coming Soon</option>
                      </select>
                    </label>
                    <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Priority
                      <select
                        value={d.priority}
                        onChange={(e) =>
                          setItemDraft(item.id, { priority: e.target.value as ChecklistPriority })
                        }
                        className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs font-normal normal-case text-foreground"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Notes
                      <textarea
                        value={d.notes}
                        onChange={(e) => setItemDraft(item.id, { notes: e.target.value })}
                        placeholder="What did you observe?"
                        rows={2}
                        className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs font-normal normal-case text-foreground"
                      />
                    </label>
                    <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Action needed / fix in progress
                      <textarea
                        value={d.action_needed}
                        onChange={(e) =>
                          setItemDraft(item.id, { action_needed: e.target.value })
                        }
                        placeholder="What's the next step or fix in progress?"
                        rows={2}
                        className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs font-normal normal-case text-foreground"
                      />
                    </label>
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
