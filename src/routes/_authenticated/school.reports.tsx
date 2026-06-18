import { createFileRoute, Link } from "@tanstack/react-router";
import { withRoleGuard } from "@/components/withRoleGuard";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileText, ExternalLink, Loader2 } from "lucide-react";

import { SchoolPageShell, useSchoolDashboard } from "@/components/school/SchoolPageShell";
import { Button } from "@/components/ui/button";
import { listSchoolReports, type SchoolReportRow } from "@/lib/school-admin.functions";

export const Route = createFileRoute("/_authenticated/school/reports")({
  head: () => ({ meta: [{ title: "School Reports — TransitionForward" }] }),
  component: withRoleGuard(["school_admin", "admin"], SchoolReportsPage),
});

function SchoolReportsPage() {
  const { data, loading, orgId, reload } = useSchoolDashboard();
  return (
    <SchoolPageShell
      path="/school/reports"
      title="School Reports"
      subtitle="Pathway reports created by your team, across all students in your organization."
      data={data}
      loading={loading}
      orgId={orgId}
      onSwitchOrg={(id) => reload(id)}
    >
      {(org) => <ReportsList orgId={org.id} />}
    </SchoolPageShell>
  );
}

function ReportsList({ orgId }: { orgId: string }) {
  const fetchReports = useServerFn(listSchoolReports);
  const [rows, setRows] = useState<SchoolReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { reports } = await fetchReports({ data: { organization_id: orgId } });
        setRows(reports);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
        <FileText className="mx-auto h-7 w-7 text-muted-foreground" />
        <h3 className="mt-3 font-display text-lg">No Pathway Reports Yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          When staff create Pathway Reports for students in your organization, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card shadow-soft">
      <ul className="divide-y">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="text-sm font-medium">{r.student_name}</p>
              <p className="text-xs text-muted-foreground">
                Created {new Date(r.created_at).toLocaleDateString()}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/reports/$reportId" params={{ reportId: r.id }}>
                Open <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
