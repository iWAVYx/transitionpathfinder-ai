import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileText, FolderOpen, Search, Sparkles, CheckCircle2, Clock } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listAllDocuments, type CrossDocumentRow } from "@/lib/cross-docs.functions";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — TransitionForward" }] }),
  component: DocumentsHubPage,
});

type StatusKey = "needs-review" | "summarized" | "all";

function statusFor(d: CrossDocumentRow): "summarized" | "needs-review" {
  return d.has_summary ? "summarized" : "needs-review";
}

function DocumentsHubPage() {
  const fetchAll = useServerFn(listAllDocuments);
  const [rows, setRows] = useState<CrossDocumentRow[] | null>(null);
  const [filter, setFilter] = useState<StatusKey>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetchAll()
      .then((r) => setRows(r.documents))
      .catch(() => setRows([]));
  }, [fetchAll]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((d) => {
      if (filter !== "all" && statusFor(d) !== filter) return false;
      if (q && !`${d.title} ${d.student_first_name}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
  }, [rows, filter, q]);

  const summarized = rows?.filter((d) => d.has_summary).length ?? 0;
  const needsReview = (rows?.length ?? 0) - summarized;

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Documents" }]} />
      </div>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Your documents
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight">
            Every IEP, evaluation, and plan — in one calm place.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Documents you upload on each student page show up here too, so you can quickly find
            anything across your roster. Status reflects whether we've turned the document into
            structured goals yet.
          </p>
        </header>

        {/* Status summary */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <StatChip
            label="All documents"
            value={rows?.length ?? 0}
            active={filter === "all"}
            onClick={() => setFilter("all")}
            icon={<FolderOpen className="h-4 w-4" />}
          />
          <StatChip
            label="Needs review"
            value={needsReview}
            active={filter === "needs-review"}
            onClick={() => setFilter("needs-review")}
            icon={<Clock className="h-4 w-4" />}
          />
          <StatChip
            label="Summarized"
            value={summarized}
            active={filter === "summarized"}
            onClick={() => setFilter("summarized")}
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title or student…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border bg-card shadow-soft">
          {rows === null ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading documents…</p>
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y">
              {filtered.map((d) => {
                const status = statusFor(d);
                return (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.student_first_name} ·{" "}
                          <span className="capitalize">{d.doc_type}</span> ·{" "}
                          {new Date(d.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={status} />
                      <Button asChild size="sm" variant="outline">
                        <Link
                          to="/students/$studentId"
                          params={{ studentId: d.student_id }}
                        >
                          Open student
                        </Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </SiteShell>
  );
}

function StatChip({
  label,
  value,
  active,
  onClick,
  icon,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-2xl border p-4 text-left shadow-soft transition-colors ${
        active ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40"
      }`}
    >
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl">{value}</p>
      </div>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        {icon}
      </span>
    </button>
  );
}

function StatusBadge({ status }: { status: "summarized" | "needs-review" }) {
  if (status === "summarized") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
        <Sparkles className="h-3 w-3" /> Summarized
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Clock className="h-3 w-3" /> Needs review
    </span>
  );
}

function EmptyState() {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <FolderOpen className="h-6 w-6" />
      </div>
      <h2 className="mt-4 font-display text-xl">No documents yet.</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Start by opening a student and uploading their current IEP or transition assessment.
        We'll keep everything private and only visible to the people you invite.
      </p>
      <Button asChild className="mt-5">
        <Link to="/students">Go to my students</Link>
      </Button>
    </div>
  );
}
