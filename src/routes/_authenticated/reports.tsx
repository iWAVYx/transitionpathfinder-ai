import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Sparkles, FolderOpen, Search, UserCircle2, FileText, Rows3, LayoutGrid } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { deleteReport, listMyReports, type ReportListRow } from "@/lib/pathway.functions";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "My Pathway Reports — TransitionForward" }] }),
  component: () => (<RoleGuard path="/reports"><ReportsPage /></RoleGuard>),
});

type SortKey = "newest" | "oldest" | "name";

function ReportsPage() {
  const router = useRouter();
  const list = useServerFn(listMyReports);
  const del = useServerFn(deleteReport);
  const [rows, setRows] = useState<ReportListRow[] | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [filter, setFilter] = useState<"all" | "linked" | "unlinked">("all");

  useEffect(() => {
    list()
      .then((r) => setRows(r.reports))
      .catch(() => setRows([]));
  }, [list]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this Pathway Report? This cannot be undone.")) return;
    setPendingId(id);
    try {
      await del({ data: { id } });
      setRows((curr) => (curr ?? []).filter((r) => r.id !== id));
      toast.success("Report deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete.");
    } finally {
      setPendingId(null);
    }
  };

  const filtered = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (filter === "linked" && !r.student_id) return false;
      if (filter === "unlinked" && r.student_id) return false;
      if (!needle) return true;
      return (
        r.student_first_name.toLowerCase().includes(needle) ||
        (r.linked_student_name ?? "").toLowerCase().includes(needle) ||
        (r.summary ?? "").toLowerCase().includes(needle)
      );
    });
    if (sort === "oldest") {
      out = [...out].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    } else if (sort === "name") {
      out = [...out].sort((a, b) => a.student_first_name.localeCompare(b.student_first_name));
    } else {
      out = [...out].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
    return out;
  }, [rows, q, sort, filter]);

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Breadcrumbs trail={[{ label: "My Pathway Reports" }]} />
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Your library</p>
            <h1 className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">My Pathway Reports</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Every report you generate is saved here. Open one to revisit it, share it, or link it to
              a student in your roster.
            </p>
          </div>
          <Button onClick={() => router.navigate({ to: "/pathway" })}>
            <Sparkles className="mr-2 h-4 w-4" aria-hidden />
            Create a new report
          </Button>
        </div>

        {/* Controls */}
        {rows !== null && rows.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or keyword…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="all">All reports</option>
              <option value="linked">Linked to a student</option>
              <option value="unlinked">Unlinked</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">By name</option>
            </select>
            <p className="ml-auto text-xs text-muted-foreground">
              {filtered.length} of {rows.length}
            </p>
          </div>
        )}

        <div className="mt-6">
          {rows === null && <p className="text-sm text-muted-foreground">Loading your reports…</p>}
          {rows !== null && rows.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border/60 bg-gradient-hero/40 p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-background/80 text-primary shadow-soft">
                <FolderOpen className="h-7 w-7" aria-hidden />
              </div>
              <p className="mt-4 font-display text-2xl">No reports yet — that's okay.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Your library is quiet for now. When you create a Pathway Report, it'll live here so
                you can open it before any PPT meeting.
              </p>
              <Button asChild className="mt-6">
                <Link to="/pathway">Next: create your first report →</Link>
              </Button>
            </div>
          )}
          {rows !== null && rows.length > 0 && filtered.length === 0 && (
            <p className="rounded-2xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              No reports match those filters.
            </p>
          )}
          {filtered.length > 0 && (
            <ul className="grid gap-3">
              {filtered.map((r) => (
                <li
                  key={r.id}
                  className="group rounded-2xl border border-border/60 bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <Link
                      to="/reports/$reportId"
                      params={{ reportId: r.id }}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <p className="font-display text-xl font-medium tracking-tight">
                          {r.student_first_name}
                        </p>
                        {r.grade_band && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            {r.grade_band}
                          </span>
                        )}
                        {r.linked_student_name && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            <UserCircle2 className="h-3 w-3" />
                            {r.linked_student_name}
                          </span>
                        )}
                      </div>
                      {r.summary && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {r.summary}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        Created{" "}
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </Link>
                    <div className="flex shrink-0 gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to="/reports/$reportId" params={{ reportId: r.id }}>
                          Open
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pendingId === r.id}
                        onClick={() => handleDelete(r.id)}
                      >
                        {pendingId === r.id ? "Deleting…" : "Delete"}
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
