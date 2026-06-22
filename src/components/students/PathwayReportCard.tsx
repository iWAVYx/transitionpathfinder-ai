import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileText, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getLatestReportForStudent,
  regeneratePathwayReport,
} from "@/lib/pathway.functions";

type LatestReport = {
  id: string;
  created_at: string;
  summary: string | null;
};

/**
 * Single Pathway Report surface on the student detail page.
 * Consolidates the "Generate / Open / Refresh" loop into one card so
 * families and educators don't bounce between IepUpload, the report list,
 * and the v2 panels to get to the latest plan.
 */
export function PathwayReportCard({
  studentId,
  studentFirstName,
}: {
  studentId: string;
  studentFirstName: string | null;
}) {
  const fetchLatest = useServerFn(getLatestReportForStudent);
  const regenerate = useServerFn(regeneratePathwayReport);
  const navigate = useNavigate();

  const [latest, setLatest] = useState<LatestReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLatest({ data: { student_id: studentId } })
      .then((r) => {
        if (cancelled) return;
        setLatest(r.report ?? null);
      })
      .catch(() => {
        if (!cancelled) setLatest(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, fetchLatest]);

  async function handleRefresh() {
    if (!latest) return;
    setRefreshing(true);
    try {
      const res = await regenerate({ data: { report_id: latest.id } });
      toast.success(`Refreshed Pathway Report (v${res.version_number}).`);
      navigate({ to: "/reports/$reportId", params: { reportId: latest.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't refresh.");
    } finally {
      setRefreshing(false);
    }
  }

  const lastUpdated = latest
    ? new Date(latest.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <section
      aria-labelledby="pathway-report-card-heading"
      className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Pathway Report
          </p>
          <h2
            id="pathway-report-card-heading"
            className="mt-1 font-display text-2xl font-medium tracking-tight"
          >
            {studentFirstName
              ? `${studentFirstName}'s Pathway Report`
              : "Pathway Report"}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            The flagship planning document for this student — pulls in goals,
            documents, voice, readiness, and partner matches into one
            family-friendly plan.
          </p>
        </div>
        <div
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20"
        >
          <FileText className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">Checking for a report…</p>
        ) : latest ? (
          <>
            <p className="text-sm text-muted-foreground">
              Last updated <span className="font-medium text-foreground">{lastUpdated}</span>.
              Refreshing pulls in any new goals, documents, or voice entries
              since then.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/reports/$reportId" params={{ reportId: latest.id }}>
                  <FileText className="h-4 w-4" /> Open Pathway Report
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label="Refresh Pathway Report"
              >
                <RefreshCw
                  className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                />
                {refreshing ? "Refreshing…" : "Refresh Report"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              No Pathway Report yet. Generate one from this student's profile,
              goals, and any uploaded IEP — it takes about a minute.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/pathway">
                  <Sparkles className="h-4 w-4" /> Generate Pathway Report
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/reports">View All Reports</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
