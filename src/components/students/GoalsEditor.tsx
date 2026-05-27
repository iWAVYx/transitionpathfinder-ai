import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Target, Loader2, Trash2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createGoal,
  updateGoalStatus,
  deleteGoal,
  type Goal,
} from "@/lib/students.functions";

const CATEGORIES = [
  "academic",
  "life-skills",
  "career",
  "college",
  "transportation",
  "communication",
  "general",
] as const;

const STATUSES = [
  { value: "not-started", label: "Not started" },
  { value: "in-progress", label: "In progress" },
  { value: "met", label: "Met" },
  { value: "paused", label: "Paused" },
] as const;

const STATUS_TONE: Record<string, string> = {
  "not-started": "bg-muted text-foreground",
  "in-progress": "bg-primary/15 text-primary",
  met: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  paused: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

export function GoalsEditor({
  studentId,
  studentFirstName,
  goals,
  onChange,
}: {
  studentId: string;
  studentFirstName: string | null;
  goals: Goal[];
  onChange: () => void | Promise<void>;
}) {
  const create = useServerFn(createGoal);
  const updateStatus = useServerFn(updateGoalStatus);
  const remove = useServerFn(deleteGoal);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("general");
  const [measurable, setMeasurable] = useState("");
  const [targetDate, setTargetDate] = useState("");

  function resetForm() {
    setTitle("");
    setDescription("");
    setCategory("general");
    setMeasurable("");
    setTargetDate("");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await create({
        data: {
          student_id: studentId,
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          status: "not-started",
          measurable_criteria: measurable.trim() || undefined,
          target_date: targetDate || undefined,
        },
      });
      toast.success("Goal added.");
      resetForm();
      setOpen(false);
      await onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save goal.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(g: Goal, next: string) {
    setBusyId(g.id);
    try {
      await updateStatus({ data: { id: g.id, status: next as any } });
      await onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update goal.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(g: Goal) {
    if (!confirm(`Delete "${g.title}"?`)) return;
    setBusyId(g.id);
    try {
      await remove({ data: { id: g.id } });
      await onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete goal.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Goals</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Saved goals for {studentFirstName ?? "this student"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-muted-foreground" />
          <Button size="sm" variant={open ? "ghost" : "default"} onClick={() => setOpen((v) => !v)}>
            {open ? "Cancel" : (<><Plus className="h-4 w-4" /> Add goal</>)}
          </Button>
        </div>
      </div>

      {open && (
        <form
          onSubmit={handleAdd}
          className="mt-5 grid gap-3 rounded-xl border bg-background p-4"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="goal-title">Title</Label>
            <Input
              id="goal-title"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Use public bus independently to school"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="goal-target">Target date (optional)</Label>
              <Input
                id="goal-target"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="goal-desc">Description (optional)</Label>
            <Textarea
              id="goal-desc"
              rows={2}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="goal-measure">How we'll measure it (optional)</Label>
            <Textarea
              id="goal-measure"
              rows={2}
              maxLength={1000}
              value={measurable}
              onChange={(e) => setMeasurable(e.target.value)}
              placeholder="e.g. Rides the bus 4 out of 5 school days for one month."
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save goal"}
            </Button>
          </div>
        </form>
      )}

      {goals.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          No goals yet. Add one above or upload an IEP to extract a starting set.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {goals.map((g) => (
            <li key={g.id} className="rounded-xl border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{g.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    {g.category}
                    {g.target_date ? ` · target ${new Date(g.target_date).toLocaleDateString()}` : ""}
                  </p>
                  {g.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{g.description}</p>
                  )}
                  {g.measurable_criteria && (
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      How we'll measure: {g.measurable_criteria}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[g.status] ?? "bg-muted"}`}
                  >
                    {STATUSES.find((s) => s.value === g.status)?.label ?? g.status}
                  </span>
                  <Select
                    value={g.status}
                    onValueChange={(v) => handleStatus(g, v)}
                    disabled={busyId === g.id}
                  >
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(g)} disabled={busyId === g.id}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
