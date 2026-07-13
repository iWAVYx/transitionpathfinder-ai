import { useState } from "react";
import { cn } from "@/lib/utils";
import { GripVertical, Plus, Trash2, Clock } from "lucide-react";

export type AgendaItem = {
  id: string;
  title: string;
  minutes: number;
  owner: string;
};

const DEFAULT: AgendaItem[] = [
  { id: "a1", title: "Welcome And Introductions", minutes: 5, owner: "Case Manager" },
  { id: "a2", title: "Review Student Voice And Priorities", minutes: 10, owner: "Student" },
  { id: "a3", title: "Progress On Current Goals", minutes: 10, owner: "Educator" },
  { id: "a4", title: "Readiness Gaps And Next Steps", minutes: 10, owner: "Case Manager" },
  { id: "a5", title: "Partner Opportunities And Decisions", minutes: 10, owner: "Family" },
  { id: "a6", title: "Action Items And Follow-Up", minutes: 5, owner: "Case Manager" },
];

interface Props {
  initial?: AgendaItem[];
  className?: string;
}

export function AgendaBuilder({ initial = DEFAULT, className }: Props) {
  const [items, setItems] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);

  const total = items.reduce((s, i) => s + i.minutes, 0);

  const update = (id: string, patch: Partial<AgendaItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const add = () =>
    setItems((prev) => [
      ...prev,
      { id: `a${Date.now()}`, title: "New Agenda Item", minutes: 5, owner: "Case Manager" },
    ]);

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setItems((prev) => {
      const from = prev.findIndex((i) => i.id === dragId);
      const to = prev.findIndex((i) => i.id === targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragId(null);
  };

  return (
    <section
      aria-label="Meeting agenda builder"
      className={cn("rounded-3xl border bg-card p-5 shadow-soft sm:p-6", className)}
    >
      <header className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-display text-lg">Agenda Builder</h3>
          <p className="text-sm text-muted-foreground">
            Drag to reorder. Set minutes and owner for each item.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
          <Clock className="h-3 w-3" aria-hidden />
          {total} min planned
        </span>
      </header>

      <ol className="space-y-2">
        {items.map((i, idx) => (
          <li
            key={i.id}
            draggable
            onDragStart={() => setDragId(i.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(i.id)}
            className={cn(
              "flex flex-wrap items-center gap-2 rounded-2xl border bg-background/60 p-2 transition",
              dragId === i.id && "opacity-50",
            )}
          >
            <button
              type="button"
              aria-label={`Reorder ${i.title}`}
              className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted"
            >
              <GripVertical className="h-4 w-4" aria-hidden />
            </button>
            <span className="w-5 text-right text-xs font-medium text-muted-foreground">{idx + 1}.</span>
            <input
              type="text"
              value={i.title}
              onChange={(e) => update(i.id, { title: e.target.value })}
              aria-label="Agenda item title"
              className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <input
                type="number"
                min={1}
                max={90}
                value={i.minutes}
                onChange={(e) => update(i.id, { minutes: Math.max(1, Number(e.target.value) || 0) })}
                aria-label={`${i.title} minutes`}
                className="w-14 rounded-md border bg-background px-2 py-1 text-right text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              min
            </label>
            <input
              type="text"
              value={i.owner}
              onChange={(e) => update(i.id, { owner: e.target.value })}
              aria-label={`${i.title} owner`}
              className="w-32 rounded-md border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="button"
              onClick={() => remove(i.id)}
              aria-label={`Remove ${i.title}`}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={add}
        className="mt-3 inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/50 hover:text-primary"
      >
        <Plus className="h-3 w-3" aria-hidden />
        Add Agenda Item
      </button>
    </section>
  );
}
