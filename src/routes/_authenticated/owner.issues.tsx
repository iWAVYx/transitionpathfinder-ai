import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listIssues,
  upsertIssue,
  deleteIssue,
} from "@/lib/validation/validation.functions";

export const Route = createFileRoute("/_authenticated/owner/issues")({
  head: () => ({ meta: [{ title: "Product Issues — Admin Hub" }] }),
  component: Page,
});

const PRIORITIES = ["P0", "P1", "P2", "P3"] as const;
const STATUSES = ["new", "triaged", "in_progress", "fixed", "wont_fix", "archived"] as const;
const PRIO_COLORS: Record<string, string> = {
  P0: "bg-destructive/15 text-destructive",
  P1: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  P2: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  P3: "bg-muted text-muted-foreground",
};

function Page() {
  const list = useServerFn(listIssues);
  const upsert = useServerFn(upsertIssue);
  const del = useServerFn(deleteIssue);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prio, setPrio] = useState("all");
  const [status, setStatus] = useState("all");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    affected_role: "",
    affected_feature: "",
    priority: "P2" as (typeof PRIORITIES)[number],
    status: "new" as (typeof STATUSES)[number],
    admin_notes: "",
  });

  useEffect(() => {
    list()
      .then((r) => setRows(r.rows))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (prio === "all" || r.priority === prio) && (status === "all" || r.status === status),
      ),
    [rows, prio, status],
  );

  async function update(id: string, patch: any) {
    const orig = rows.find((r) => r.id === id);
    if (!orig) return;
    try {
      const { row } = await upsert({ data: { ...orig, ...patch } });
      setRows((p) => p.map((r) => (r.id === id ? row : r)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function add() {
    if (!form.title.trim()) return toast.error("Title required");
    try {
      const { row } = await upsert({ data: form as any });
      setRows((p) => [row, ...p]);
      setAdding(false);
      setForm({
        title: "",
        description: "",
        affected_role: "",
        affected_feature: "",
        priority: "P2",
        status: "new",
        admin_notes: "",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    try {
      await del({ data: { id } });
      setRows((p) => p.filter((r) => r.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <OwnerShell
      title="Product Issues"
      description={`${rows.length} tracked issues (P0 blocks signup/data; P1 breaks major feature; P2 confusing; P3 polish)`}
      actions={
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> {adding ? "Cancel" : "New issue"}
        </Button>
      }
    >
      {adding && (
        <div className="mb-4 grid gap-2 rounded-lg border border-border bg-background p-4 sm:grid-cols-2">
          <Input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div className="flex gap-2">
            <Select
              value={form.priority}
              onValueChange={(v) => setForm({ ...form, priority: v as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as any })}
            >
              <SelectTrigger>
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
          </div>
          <Input
            placeholder="Affected role"
            value={form.affected_role}
            onChange={(e) => setForm({ ...form, affected_role: e.target.value })}
          />
          <Input
            placeholder="Affected feature"
            value={form.affected_feature}
            onChange={(e) => setForm({ ...form, affected_feature: e.target.value })}
          />
          <Textarea
            className="sm:col-span-2"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Button size="sm" onClick={add}>
              Save issue
            </Button>
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={prio} onValueChange={setPrio}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-border bg-background p-6 text-sm text-muted-foreground">
          No issues match.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-lg border border-border bg-background p-4 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span
                    className={
                      "mr-2 inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold " +
                      (PRIO_COLORS[r.priority] ?? "bg-muted")
                    }
                  >
                    {r.priority}
                  </span>
                  <span className="font-medium">{r.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  {r.affected_feature && <Badge variant="outline">{r.affected_feature}</Badge>}
                  <Badge>{r.status}</Badge>
                </div>
              </div>
              {r.description && (
                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{r.description}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select value={r.priority} onValueChange={(v) => update(r.id, { priority: v })}>
                  <SelectTrigger className="h-8 w-[100px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={r.status} onValueChange={(v) => update(r.id, { status: v })}>
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
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea
                className="mt-2"
                rows={2}
                placeholder="Admin notes"
                defaultValue={r.admin_notes ?? ""}
                onBlur={(e) => {
                  if ((e.target.value ?? "") !== (r.admin_notes ?? ""))
                    update(r.id, { admin_notes: e.target.value });
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </OwnerShell>
  );
}
