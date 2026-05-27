import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Sparkles, FolderOpen } from "lucide-react";
import { deleteReport, listMyReports } from "@/lib/pathway.functions";

type Row = {
  id: string;
  created_at: string;
  student_first_name: string;
  grade_band: string | null;
};

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "My Pathway Reports — TransitionForward" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const router = useRouter();
  const list = useServerFn(listMyReports);
  const del = useServerFn(deleteReport);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    list().then((r) => setRows(r.reports)).catch(() => setRows([]));
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

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Your library</p>
            <h1 className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">My Pathway Reports</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Every report you generate is saved here. Open one to revisit it, print it, or bring it
              into your next PPT meeting prep.
            </p>
          </div>
          <Button onClick={() => router.navigate({ to: "/pathway" })}>Create a new report</Button>
        </div>

        <div className="mt-10">
          {rows === null && <p className="text-sm text-muted-foreground">Loading your reports…</p>}
          {rows !== null && rows.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border/60 bg-muted/30 p-10 text-center">
              <p className="font-display text-2xl">No reports yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your first Pathway Report and it'll show up here.
              </p>
              <Button asChild className="mt-6">
                <Link to="/pathway">Create a Pathway Report</Link>
              </Button>
            </div>
          )}
          {rows !== null && rows.length > 0 && (
            <ul className="grid gap-3">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-soft"
                >
                  <Link to="/reports/$reportId" params={{ reportId: r.id }} className="min-w-0 flex-1">
                    <p className="font-display text-xl font-medium tracking-tight">
                      {r.student_first_name}
                      {r.grade_band ? (
                        <span className="ml-2 text-xs font-normal uppercase tracking-wider text-muted-foreground">
                          {r.grade_band}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Created {new Date(r.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </Link>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/reports/$reportId" params={{ reportId: r.id }}>Open</Link>
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
