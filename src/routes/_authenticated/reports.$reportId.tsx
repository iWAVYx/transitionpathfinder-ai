import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { SiteShell } from "@/components/site/SiteShell";
import { ReportView } from "@/components/pathway/ReportView";
import { Button } from "@/components/ui/button";
import { getReport, type PathwayReport } from "@/lib/pathway.functions";

export const Route = createFileRoute("/_authenticated/reports/$reportId")({
  head: () => ({ meta: [{ title: "Pathway Report — TransitionForward" }] }),
  component: ReportDetailPage,
});

function ReportDetailPage() {
  const { reportId } = Route.useParams();
  const fetchReport = useServerFn(getReport);
  const navigate = useNavigate();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ok"; name: string; report: PathwayReport }
  >({ kind: "loading" });

  useEffect(() => {
    fetchReport({ data: { id: reportId } })
      .then((r) => setState({ kind: "ok", name: r.student_first_name, report: r.report }))
      .catch((e) => setState({ kind: "error", message: e instanceof Error ? e.message : "Not found" }));
  }, [fetchReport, reportId]);

  if (state.kind === "loading") {
    return (
      <SiteShell>
        <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground">Loading the report…</p>
        </section>
      </SiteShell>
    );
  }

  if (state.kind === "error") {
    return (
      <SiteShell>
        <section className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Hm.</p>
          <h1 className="mt-2 font-display text-3xl">We couldn't open that report.</h1>
          <p className="mt-3 text-sm text-muted-foreground">{state.message}</p>
          <Button asChild className="mt-6">
            <Link to="/reports">Back to my reports</Link>
          </Button>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <ReportView
        name={state.name}
        report={state.report}
        onReset={() => navigate({ to: "/reports" })}
        resetLabel="Back to my reports"
      />
    </SiteShell>
  );
}
