import { createFileRoute, Link } from "@tanstack/react-router";
import { BackToDashboard } from "@/components/dashboard/BackToDashboard";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { NotebookPen, Loader2, Search } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  listCaseloadNotes,
  type CaseloadNoteRow,
} from "@/lib/educator.functions";

export const Route = createFileRoute("/_authenticated/educator/notes")({
  head: () => ({
    meta: [
      { title: "Case Notes — TransitionForward" },
      {
        name: "description",
        content:
          "Quick notes across your caseload — timestamped, searchable, and tied to each student.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/educator/notes">
      <EducatorNotesPage />
    </RoleGuard>
  ),
});

function EducatorNotesPage() {
  const load = useServerFn(listCaseloadNotes);
  const [notes, setNotes] = useState<CaseloadNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    load()
      .then(({ notes }) => setNotes(notes))
      .finally(() => setLoading(false));
  }, [load]);

  const filtered = useMemo(() => {
    if (!q.trim()) return notes;
    const needle = q.trim().toLowerCase();
    return notes.filter(
      (n) =>
        n.content.toLowerCase().includes(needle) ||
        n.student_name.toLowerCase().includes(needle),
    );
  }, [notes, q]);

  return (
    <SiteShell>
      <main
        data-testid="educator-notes-page"
        className="mx-auto max-w-4xl px-4 py-8"
      >
        <Breadcrumbs trail={[{ label: "Case Notes" }]} />
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <NotebookPen className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">
              Case Notes
            </h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            Recent notes across your caseload. Open a student to add a new note.
          </p>
        </header>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notes or students…"
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading notes…
          </div>
        ) : notes.length === 0 ? (
          <EmptyState
            title="No notes yet"
            body="Add case notes from any student page — they'll roll up here for quick review."
            cta={{ label: "Open caseload", to: "/caseload" }}
          />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No notes match "{q}".
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((n) => (
              <li key={n.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    to="/students/$id"
                    params={{ id: n.student_id }}
                    className="text-sm font-medium hover:underline"
                  >
                    {n.student_name}
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{n.visibility}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {n.content}
                </p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8">
          <BackToDashboard />
        </div>
      </main>
    </SiteShell>
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
