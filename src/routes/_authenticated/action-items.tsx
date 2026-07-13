import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2,
  ClipboardCheck,
  Check,
  Circle,
  CircleDashed,
  AlertTriangle,
  CalendarClock,
  Sparkles,
} from "lucide-react";

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

type PriorityFilter = "all" | "high" | "medium" | "low";
type CategoryFilter = "all" | "family" | "educator" | "student" | "school" | "team";

const CATEGORY_LABEL: Record<string, string> = {
  family: "Family",
  educator: "Educator",
  student: "Student",
  school: "School",
  team: "Team",
};

const SOURCE_HINT: Record<string, string> = {
  family: "Family action",
  educator: "Educator action",
  student: "Student action",
  school: "School action",
  team: "Team action",
};

function ActionItemsPage() {
  const loadStudents = useServerFn(listStudents);
  const loadItems = useServerFn(listStudentActionItems);
  const updateItem = useServerFn(updateStudentActionItem);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState<string>("");
  const [items, setItems] = useState<StudentActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");

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

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (priority !== "all" && it.priority !== priority) return false;
      if (category !== "all" && it.category !== category) return false;
      return true;
    });
  }, [items, priority, category]);

  const { overdue, thisWeek, later, done } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const overdue: StudentActionItem[] = [];
    const thisWeek: StudentActionItem[] = [];
    const later: StudentActionItem[] = [];
    const done: StudentActionItem[] = [];

    for (const it of filtered) {
      if (it.status === "completed") {
        done.push(it);
        continue;
      }
      const due = it.due_date ? new Date(`${it.due_date}T00:00:00`) : null;
      if (due && due < today) overdue.push(it);
      else if (due && due <= weekEnd) thisWeek.push(it);
      else later.push(it);
    }

    const byDue = (a: StudentActionItem, b: StudentActionItem) => {
      const da = a.due_date ?? "9999-12-31";
      const db = b.due_date ?? "9999-12-31";
      return da.localeCompare(db);
    };
    overdue.sort(byDue);
    thisWeek.sort(byDue);
    later.sort(byDue);

    return { overdue, thisWeek, later, done };
  }, [filtered]);

  async function cycleStatus(item: StudentActionItem) {
    const next =
      item.status === "not_started"
        ? "in_progress"
        : item.status === "in_progress"
          ? "completed"
          : "not_started";
    setSavingId(item.id);
    try {
      await updateItem({ data: { id: item.id, status: next } });
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: next } : it)),
      );
      toast.success(
        next === "completed"
          ? "Marked complete"
          : next === "in_progress"
            ? "Marked in progress"
            : "Reopened",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  const totalOpen = overdue.length + thisWeek.length + later.length;

  return (
    <SiteShell>
      <main
        data-testid="action-items-page"
        className="mx-auto max-w-5xl px-4 py-8"
      >
        <Breadcrumbs trail={[{ label: "Action Items" }]} />
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">
              Action Items
            </h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            Your next small steps — check them off as you go. Tap the circle to
            cycle Not Started → In Progress → Done.
          </p>
        </header>

        {students.length > 0 && (
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {students.length > 1 && (
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Student
                </label>
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
            )}
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Priority
              </label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as PriorityFilter)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Owner
              </label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as CategoryFilter)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All owners</SelectItem>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

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
        ) : totalOpen + done.length === 0 ? (
          <EmptyState
            title="Nothing matches these filters"
            body="Try clearing priority or owner to see more items."
            cta={{ label: "Clear filters", to: "/action-items" }}
          />
        ) : (
          <div className="space-y-8">
            {overdue.length > 0 && (
              <Section
                title={`Overdue (${overdue.length})`}
                icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
                tone="rose"
                items={overdue}
                savingId={savingId}
                onToggle={cycleStatus}
              />
            )}
            {thisWeek.length > 0 && (
              <Section
                title={`Due This Week (${thisWeek.length})`}
                icon={<CalendarClock className="h-4 w-4 text-amber-600" />}
                tone="amber"
                items={thisWeek}
                savingId={savingId}
                onToggle={cycleStatus}
              />
            )}
            {later.length > 0 && (
              <Section
                title={`Later (${later.length})`}
                icon={<Sparkles className="h-4 w-4 text-primary" />}
                tone="default"
                items={later}
                savingId={savingId}
                onToggle={cycleStatus}
              />
            )}
            {done.length > 0 && (
              <Section
                title={`Completed (${done.length})`}
                icon={<Check className="h-4 w-4 text-emerald-600" />}
                tone="default"
                items={done}
                savingId={savingId}
                onToggle={cycleStatus}
                muted
              />
            )}
          </div>
        )}
      </main>
    </SiteShell>
  );
}

function Section({
  title,
  icon,
  items,
  savingId,
  onToggle,
  muted = false,
  tone = "default",
}: {
  title: string;
  icon?: React.ReactNode;
  items: StudentActionItem[];
  savingId: string | null;
  onToggle: (i: StudentActionItem) => void;
  muted?: boolean;
  tone?: "rose" | "amber" | "default";
}) {
  const border =
    tone === "rose"
      ? "border-rose-200/70 dark:border-rose-500/25"
      : tone === "amber"
        ? "border-amber-200/70 dark:border-amber-500/25"
        : "border-border";
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h2>
      <ul className={`divide-y rounded-lg border ${border} bg-card`}>
        {items.map((it) => {
          const overdue =
            it.status !== "completed" &&
            it.due_date &&
            new Date(`${it.due_date}T00:00:00`) < new Date(new Date().toDateString());
          return (
            <li
              key={it.id}
              className={`flex items-start gap-3 p-4 ${muted ? "opacity-70" : ""}`}
            >
              <button
                onClick={() => onToggle(it)}
                disabled={savingId === it.id}
                aria-label={
                  it.status === "completed"
                    ? "Reopen"
                    : it.status === "in_progress"
                      ? "Mark complete"
                      : "Mark in progress"
                }
                className="mt-0.5 shrink-0 rounded-full border p-1 hover:bg-accent"
              >
                {savingId === it.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : it.status === "completed" ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : it.status === "in_progress" ? (
                  <CircleDashed className="h-4 w-4 text-primary" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div
                  className={`font-medium ${it.status === "completed" ? "line-through" : ""}`}
                >
                  {it.title}
                </div>
                {it.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {it.description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline">
                    {SOURCE_HINT[it.category] ?? it.category}
                  </Badge>
                  <Badge
                    variant={it.priority === "high" ? "destructive" : "secondary"}
                  >
                    {it.priority}
                  </Badge>
                  {it.status === "in_progress" && (
                    <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
                      In progress
                    </Badge>
                  )}
                  {it.related_goal_area && (
                    <Badge variant="outline" className="border-dashed">
                      Goal · {it.related_goal_area}
                    </Badge>
                  )}
                  {it.pathway_report_id && (
                    <Badge className="bg-violet-500/15 text-violet-700 hover:bg-violet-500/15 dark:text-violet-300">
                      From Pathway Report
                    </Badge>
                  )}
                  {it.due_date && (
                    <span
                      className={`${overdue ? "font-medium text-rose-600" : "text-muted-foreground"}`}
                    >
                      Due {it.due_date}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
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
