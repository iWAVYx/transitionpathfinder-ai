import { createFileRoute, Link } from "@tanstack/react-router";
import { BackToDashboard } from "@/components/dashboard/BackToDashboard";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckSquare, Loader2, Check, Circle } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listCaseloadActionItems,
  type CaseloadActionRow,
} from "@/lib/educator.functions";
import { updateStudentActionItem } from "@/lib/action-items.functions";

export const Route = createFileRoute("/_authenticated/educator/action-items")({
  head: () => ({
    meta: [
      { title: "Caseload Action Items — TransitionForward" },
      {
        name: "description",
        content:
          "Next steps assigned across your caseload — track completion by student and category.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/educator/action-items">
      <EducatorActionItemsPage />
    </RoleGuard>
  ),
});

function EducatorActionItemsPage() {
  const load = useServerFn(listCaseloadActionItems);
  const update = useServerFn(updateStudentActionItem);
  const [items, setItems] = useState<CaseloadActionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    load()
      .then(({ items }) => setItems(items))
      .finally(() => setLoading(false));
  }, [load]);

  const { open, done } = useMemo(() => {
    const open: CaseloadActionRow[] = [];
    const done: CaseloadActionRow[] = [];
    for (const it of items) {
      if (it.status === "completed") done.push(it);
      else open.push(it);
    }
    return { open, done };
  }, [items]);

  async function toggle(item: CaseloadActionRow) {
    const nextStatus =
      item.status === "completed" ? "not_started" : "completed";
    setSavingId(item.id);
    try {
      await update({ data: { id: item.id, status: nextStatus } });
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: nextStatus } : it,
        ),
      );
      toast.success(
        nextStatus === "completed" ? "Marked complete" : "Reopened",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <SiteShell>
      <main
        data-testid="educator-action-items-page"
        className="mx-auto max-w-5xl px-4 py-8"
      >
        <Breadcrumbs trail={[{ label: "Caseload Action Items" }]} />
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <CheckSquare className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">
              Caseload Action Items
            </h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            Every open next step across your caseload — assigned to family,
            student, or team.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No action items yet"
            body="Create action items from any student page or meeting prep — they'll show up here."
            cta={{ label: "Open caseload", to: "/caseload" }}
          />
        ) : (
          <div className="space-y-8">
            <Section
              title={`Open (${open.length})`}
              items={open}
              onToggle={toggle}
              savingId={savingId}
            />
            {done.length > 0 && (
              <div>
                <button
                  className="mb-2 text-sm text-muted-foreground hover:underline"
                  onClick={() => setShowCompleted((v) => !v)}
                >
                  {showCompleted ? "Hide" : "Show"} completed ({done.length})
                </button>
                {showCompleted && (
                  <Section
                    title=""
                    items={done}
                    onToggle={toggle}
                    savingId={savingId}
                    muted
                  />
                )}
              </div>
            )}
          </div>
        )}
        <div className="mt-8">
          <BackToDashboard />
        </div>
      </main>
    </SiteShell>
  );
}

function Section({
  title,
  items,
  onToggle,
  savingId,
  muted = false,
}: {
  title: string;
  items: CaseloadActionRow[];
  onToggle: (i: CaseloadActionRow) => void;
  savingId: string | null;
  muted?: boolean;
}) {
  return (
    <section>
      {title && (
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      )}
      <ul className="divide-y rounded-lg border bg-card">
        {items.map((it) => (
          <li
            key={it.id}
            className={`flex items-start gap-3 p-4 ${muted ? "opacity-70" : ""}`}
          >
            <button
              onClick={() => onToggle(it)}
              disabled={savingId === it.id}
              aria-label={
                it.status === "completed" ? "Mark incomplete" : "Mark complete"
              }
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
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/students/$studentId"
                  params={{ studentId: it.student_id }}
                  className="text-sm font-medium hover:underline"
                >
                  {it.student_name}
                </Link>
                <Badge variant="outline">{it.category}</Badge>
                <Badge
                  variant={it.priority === "high" ? "destructive" : "secondary"}
                >
                  {it.priority}
                </Badge>
                {it.due_date && (
                  <span className="text-xs text-muted-foreground">
                    Due {it.due_date}
                  </span>
                )}
              </div>
              <div
                className={`mt-1 font-medium ${it.status === "completed" ? "line-through" : ""}`}
              >
                {it.title}
              </div>
              {it.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {it.description}
                </p>
              )}
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
