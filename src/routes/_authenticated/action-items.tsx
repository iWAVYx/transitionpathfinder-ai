import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ClipboardCheck, Check, Circle } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listStudents, type Student } from "@/lib/students.functions";
import {
  listStudentActionItems,
  updateStudentActionItem,
  type StudentActionItem,
} from "@/lib/action-items.functions";

export const Route = createFileRoute("/_authenticated/action-items")({
  head: () => ({
    meta: [
      { title: "Action Items — TransitionForward" },
      {
        name: "description",
        content:
          "Your next small steps — what's due, what's in progress, what's done.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/action-items">
      <ActionItemsPage />
    </RoleGuard>
  ),
});

function ActionItemsPage() {
  const loadStudents = useServerFn(listStudents);
  const loadItems = useServerFn(listStudentActionItems);
  const updateItem = useServerFn(updateStudentActionItem);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState<string>("");
  const [items, setItems] = useState<StudentActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    loadStudents()
      .then(({ students }) => {
        setStudents(students);
        if (students[0]) setStudentId(students[0].id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [loadStudents]);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    loadItems({ data: { student_id: studentId } })
      .then(({ items }) => setItems(items))
      .catch(() => toast.error("Could not load action items"))
      .finally(() => setLoading(false));
  }, [studentId, loadItems]);

  const { open, done } = useMemo(() => {
    const open: StudentActionItem[] = [];
    const done: StudentActionItem[] = [];
    for (const it of items) {
      if (it.status === "completed") done.push(it);
      else open.push(it);
    }
    return { open, done };
  }, [items]);

  async function toggleComplete(item: StudentActionItem) {
    const nextStatus = item.status === "completed" ? "not_started" : "completed";
    setSavingId(item.id);
    try {
      await updateItem({ data: { id: item.id, status: nextStatus } });
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: nextStatus } : it)),
      );
      toast.success(nextStatus === "completed" ? "Marked complete" : "Reopened");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <SiteShell>
      <main data-testid="action-items-page" className="mx-auto max-w-4xl px-4 py-8">
        <Breadcrumbs trail={[{ label: "Action Items" }]} />
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">Action Items</h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            Your next small steps — check them off as you go.
          </p>
        </header>

        {students.length > 1 ? (
          <div className="mb-6 max-w-sm">
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            title="No student connected yet"
            body="Once a student is linked to your account, their action items appear here."
            cta={{ label: "Go to dashboard", to: "/dashboard" }}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="No action items yet"
            body="Your team creates action items from your Pathway Report and meeting prep. Come back after your next meeting."
            cta={{ label: "Open my pathway", to: "/pathway" }}
          />
        ) : (
          <div className="space-y-8">
            <Section title={`Open (${open.length})`} items={open} savingId={savingId} onToggle={toggleComplete} />
            {done.length > 0 && (
              <Section title={`Completed (${done.length})`} items={done} savingId={savingId} onToggle={toggleComplete} muted />
            )}
          </div>
        )}
      </main>
    </SiteShell>
  );
}

function Section({
  title,
  items,
  savingId,
  onToggle,
  muted = false,
}: {
  title: string;
  items: StudentActionItem[];
  savingId: string | null;
  onToggle: (i: StudentActionItem) => void;
  muted?: boolean;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <ul className="divide-y rounded-lg border bg-card">
        {items.map((it) => (
          <li key={it.id} className={`flex items-start gap-3 p-4 ${muted ? "opacity-70" : ""}`}>
            <button
              onClick={() => onToggle(it)}
              disabled={savingId === it.id}
              aria-label={it.status === "completed" ? "Mark incomplete" : "Mark complete"}
              className="mt-0.5 shrink-0 rounded-full border p-1 hover:bg-accent"
            >
              {savingId === it.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : it.status === "completed" ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div className={`font-medium ${it.status === "completed" ? "line-through" : ""}`}>
                {it.title}
              </div>
              {it.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">{it.description}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{it.category}</Badge>
                <Badge variant={it.priority === "high" ? "destructive" : "secondary"}>
                  {it.priority}
                </Badge>
                {it.due_date && (
                  <span className="text-muted-foreground">Due {it.due_date}</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { label: string; to: string };
}) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Button asChild className="mt-4">
        <Link to={cta.to}>{cta.label}</Link>
      </Button>
    </div>
  );
}
