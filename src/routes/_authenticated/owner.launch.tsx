import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CheckCircle2, Circle, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listChecklist,
  updateChecklistItem,
} from "@/lib/validation/validation.functions";

export const Route = createFileRoute("/_authenticated/owner/launch")({
  head: () => ({ meta: [{ title: "Launch Readiness — Admin Hub" }] }),
  component: Page,
});

const STATUSES = ["not_started", "in_progress", "complete", "blocked"] as const;
const ICONS = {
  not_started: Circle,
  in_progress: Clock,
  complete: CheckCircle2,
  blocked: AlertCircle,
};

function Page() {
  const list = useServerFn(listChecklist);
  const upd = useServerFn(updateChecklistItem);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    list()
      .then((r) => setRows(r.rows))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const r of rows) {
      if (!m.has(r.category)) m.set(r.category, []);
      m.get(r.category)!.push(r);
    }
    return [...m.entries()];
  }, [rows]);

  const stats = useMemo(() => {
    const total = rows.length;
    const done = rows.filter((r) => r.status === "complete").length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [rows]);

  async function update(id: string, patch: any) {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    try {
      await upd({ data: { id, ...patch } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <OwnerShell
      title="Launch Readiness Checklist"
      description={`${stats.done}/${stats.total} complete (${stats.pct}%)`}
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([cat, items]) => (
            <section key={cat} className="rounded-lg border border-border bg-background">
              <header className="border-b border-border px-4 py-3 text-sm font-semibold">
                {cat}{" "}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {items.filter((i) => i.status === "complete").length}/{items.length}
                </span>
              </header>
              <ul className="divide-y divide-border">
                {items.map((r) => {
                  const Icon = ICONS[r.status as keyof typeof ICONS] ?? Circle;
                  return (
                    <li key={r.id} className="space-y-2 px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon
                            className={
                              "h-4 w-4 " +
                              (r.status === "complete"
                                ? "text-green-600"
                                : r.status === "blocked"
                                  ? "text-destructive"
                                  : r.status === "in_progress"
                                    ? "text-primary"
                                    : "text-muted-foreground")
                            }
                          />
                          <span className={r.status === "complete" ? "line-through opacity-70" : ""}>
                            {r.item_title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={r.status}
                            onValueChange={(v) => update(r.id, { status: v })}
                          >
                            <SelectTrigger className="h-8 w-[150px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s.replace(/_/g, " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            className="h-8 w-[140px] text-xs"
                            placeholder="Owner"
                            defaultValue={r.owner ?? ""}
                            onBlur={(e) => {
                              if ((e.target.value ?? "") !== (r.owner ?? ""))
                                update(r.id, { owner: e.target.value });
                            }}
                          />
                        </div>
                      </div>
                      <Textarea
                        rows={1}
                        placeholder="Notes"
                        defaultValue={r.notes ?? ""}
                        onBlur={(e) => {
                          if ((e.target.value ?? "") !== (r.notes ?? ""))
                            update(r.id, { notes: e.target.value });
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </OwnerShell>
  );
}
