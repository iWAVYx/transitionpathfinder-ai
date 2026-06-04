import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckSquare, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listStudentActionItems,
  createStudentActionItem,
  updateStudentActionItem,
  deleteStudentActionItem,
  type StudentActionItem,
} from "@/lib/action-items.functions";

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  blocked: "Blocked",
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-primary/10 text-primary",
  low: "bg-muted text-muted-foreground",
};

const CATEGORY_LABELS: Record<string, string> = {
  family: "Family",
  educator: "Educator",
  student: "Student",
  school: "School",
  team: "Team",
};

export function ActionItemsPanel({ studentId }: { studentId: string }) {
  const list = useServerFn(listStudentActionItems);
  const create = useServerFn(createStudentActionItem);
  const update = useServerFn(updateStudentActionItem);
  const remove = useServerFn(deleteStudentActionItem);

  const [items, setItems] = useState<StudentActionItem[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftCategory, setDraftCategory] = useState<string>("family");
  const [draftPriority, setDraftPriority] = useState<string>("medium");
  const [draftDue, setDraftDue] = useState("");
  const [saving, setSaving] = useState(false);

  async function reload() {
    const r = await list({ data: { student_id: studentId } });
    setItems(r.items);
  }

  useEffect(() => {
    reload().catch(() => setItems([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function onAdd() {
    if (!draftTitle.trim()) return;
    setSaving(true);
    try {
      await create({
        data: {
          student_id: studentId,
          title: draftTitle.trim(),
          category: draftCategory as never,
          priority: draftPriority as never,
          due_date: draftDue || undefined,
        },
      });
      setDraftTitle("");
      setDraftDue("");
      setAdding(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function onStatusChange(id: string, status: string) {
    try {
      await update({ data: { id, status: status as never } });
      await reload();
    } catch {
      toast.error("Could not update.");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this action item?")) return;
    try {
      await remove({ data: { id } });
      await reload();
    } catch {
      toast.error("Could not delete.");
    }
  }

  const completed = (items ?? []).filter((i) => i.status === "completed").length;
  const total = items?.length ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl">Action Items</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Concrete next steps for the family, educator, and student. Track progress between
            meetings.
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl">{pct}%</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {completed} of {total} done
          </p>
        </div>
      </div>

      {total > 0 && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className="mt-5">
        {!adding ? (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" /> Add action item
          </Button>
        ) : (
          <div className="space-y-2 rounded-xl border bg-background p-4">
            <Input
              autoFocus
              placeholder="What needs to happen? (e.g. Call BRS to open a case)"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Select value={draftCategory} onValueChange={setDraftCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={draftPriority} onValueChange={setDraftPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High priority</SelectItem>
                  <SelectItem value="medium">Medium priority</SelectItem>
                  <SelectItem value="low">Low priority</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={draftDue} onChange={(e) => setDraftDue(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
              <Button size="sm" onClick={onAdd} disabled={saving || !draftTitle.trim()}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {items === null && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}

      {items !== null && items.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          No action items yet. Add the first concrete next step above.
        </p>
      )}

      {items !== null && items.length > 0 && (
        <ul className="mt-5 space-y-2">
          {items.map((a) => {
            const isDone = a.status === "completed";
            return (
              <li
                key={a.id}
                className={`rounded-xl border bg-background p-4 transition-opacity ${
                  isDone ? "opacity-60" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          PRIORITY_STYLES[a.priority] ?? PRIORITY_STYLES.medium
                        }`}
                      >
                        {a.priority}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {CATEGORY_LABELS[a.category] ?? a.category}
                      </span>
                      {a.due_date && (
                        <span className="text-[10px] text-muted-foreground">
                          Due {new Date(a.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className={`mt-1.5 text-sm font-medium ${isDone ? "line-through" : ""}`}>
                      {a.title}
                    </p>
                    {a.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <select
                      aria-label="Status"
                      value={a.status}
                      onChange={(e) => onStatusChange(a.id, e.target.value)}
                      className="rounded-full border bg-card px-2 py-1 text-[11px]"
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(a.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
