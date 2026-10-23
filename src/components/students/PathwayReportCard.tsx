import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileText, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLatestReportForStudent, regeneratePathwayReport } from "@/lib/pathway.functions";

type LatestReport = {
  id: string;
  created_at: string;
  summary: string | null;
  is_report_owner?: boolean;
};

/**
 * Single Pathway Report surface on the student detail page.
 * Consolidates the "Generate / Open / Refresh" loop into one card so
 * families and educators don't bounce between IepUpload, the report list,
 * and the v2 panels to get to the latest plan.
 */
type Props = {
  studentId: string;
  studentFirstName: string | null;
  canCreateReport?: boolean;
};

export function PathwayReportCard(props: Props) {
  return <StudentReportReader key={props.studentId} {...props} />;
}

function StudentReportReader({ studentId, studentFirstName, canCreateReport = false }: Props) {
  const active = useRef(false);
  const refreshStarted = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const fetchLatest = useServerFn(getLatestReportForStudent);
  const regenerate = useServerFn(regeneratePathwayReport);
  const navigate = useNavigate();

  const [latest, setLatest] = useState<LatestReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    setLatest(null);
    fetchLatest({ data: { student_id: studentId } })
      .then((r) => {
        if (cancelled) return;
        if (r.loadFailed) throw new Error("Report unavailable");
        setLatest(r.report ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setLatest(null);
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, fetchLatest, loadAttempt]);

  async function handleRefresh() {
    if (!active.current || !latest || latest.is_report_owner !== true || refreshStarted.current)
      return;
    refreshStarted.current = true;
    setRefreshing(true);
    try {
      const res = await regenerate({ data: { report_id: latest.id } });
      if (!active.current) return;
      toast.success(`Refreshed Pathway Report (v${res.version_number}).`);
      navigate({ to: "/reports/$reportId", params: { reportId: latest.id } });
    } catch (err) {
      if (active.current) toast.error(err instanceof Error ? err.message : "Couldn't refresh.");
    } finally {
      refreshStarted.current = false;
      if (active.current) setRefreshing(false);
    }
  }

  const createdOn = latest
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
            {studentFirstName ? `${studentFirstName}'s Pathway Report` : "Pathway Report"}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            The flagship planning document for this student — pulls in goals, documents, voice,
            readiness, and partner matches into one family-friendly plan.
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
        ) : loadFailed ? (
          <div role="alert" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              We couldn't load this student's report. Please try again.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setLoading(true);
                setLoadAttempt((attempt) => attempt + 1);
              }}
            >
              Reload Report
            </Button>
          </div>
        ) : latest ? (
          <>
            <p className="text-sm text-muted-foreground">
              Created <span className="font-medium text-foreground">{createdOn}</span>.
              {latest.is_report_owner === true
                ? " Refreshing uses the student's current goals, documents and voice entries."
                : " You can open the report. Only its creator can refresh it."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/reports/$reportId" params={{ reportId: latest.id }}>
                  <FileText className="h-4 w-4" /> Open Pathway Report
                </Link>
              </Button>
              {latest.is_report_owner === true && (
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  aria-label="Refresh Pathway Report"
                >
                  <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                  {refreshing ? "Refreshing…" : "Refresh Report"}
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {canCreateReport === true
                ? "No Pathway Report is available here yet. Create one from this student's profile, goals and uploaded documents."
                : "No Pathway Report is available in this view. A team member with editing access can help with next steps."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {canCreateReport === true && (
                <Button asChild>
                  <Link to="/pathway">
                    <Sparkles className="h-4 w-4" /> Generate Pathway Report
                  </Link>
                </Button>
              )}
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
